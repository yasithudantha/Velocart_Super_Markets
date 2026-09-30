import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, ShoppingCart, Loader2, Bot,  CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5176') + '/api';

interface ProposedItem {
    ProductVariantId: number;
    ProductName?: string; // NEW: Accept the name from the AI
    Quantity: number;
}

interface ChatMessage {
    id: string;
    sender: 'USER' | 'AI';
    text: string;
    proposedCart?: ProposedItem[];
    isApproved?: boolean;
}

export default function StorefrontAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'welcome',
        sender: 'AI',
        text: "Hi! I'm your VeloCart AI Assistant. I can help you find products, check your points, or build a cart to fit your budget. What are you looking for today?"
    }]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'USER', text: inputText };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/CustomerAgent/chat`, {
                message: userMsg.text
            }, getAuthHeader());

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'AI',
                text: response.data.reply || "I couldn't process that request.",
                proposedCart: response.data.proposedCart?.length > 0 ? response.data.proposedCart : undefined,
                isApproved: false
            };
            
            setMessages(prev => [...prev, aiMsg]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                sender: 'AI',
                text: "Sorry, I'm having trouble connecting to the VeloCart systems right now. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveCart = async (messageId: string, items: ProposedItem[]) => {
        setActionLoading(messageId);
        try {
            // Add each proposed item to the cart using the existing CartController endpoint
            const addPromises = items.map(item => 
                axios.post(`${API_URL}/Cart/add`, {
                    productVariantId: item.ProductVariantId,
                    quantity: item.Quantity
                }, getAuthHeader())
            );
            
            await Promise.all(addPromises);
            
            // Mark this specific proposal as approved in the chat history
            setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, isApproved: true } : msg
            ));
            
            // Dispatch a custom event to force the CartDrawer/Header to refresh cart count
            window.dispatchEvent(new Event('cartUpdated'));
            
        } catch (error) {
            alert("Failed to add items to cart. They might be out of stock.");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <AnimatePresence>
                {isOpen ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-[#121212] border border-[#D4AF37]/30 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl w-[380px] h-[600px] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-[#1A1A1A] border-b border-white/10 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#D4AF37]/20 p-2 rounded-lg"><Bot className="text-[#D4AF37]" size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-white leading-tight">VeloCart Assistant</h3>
                                    <p className="text-xs text-[#D4AF37] font-semibold">Agentic AI Powered</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.sender === 'USER' ? 'bg-[#D4AF37] text-black rounded-tr-sm font-medium' : 'bg-[#1A1A1A] border border-white/10 text-gray-200 rounded-tl-sm'}`}>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    </div>
                                    
                                    {/* INTERACTIVE AI CART PROPOSAL UI */}
                                    {msg.sender === 'AI' && msg.proposedCart && (
                                        <div className="mt-2 w-[90%] bg-black/60 border border-[#D4AF37]/30 rounded-xl p-3 shadow-lg">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                                <ShoppingCart size={14} className="text-[#D4AF37]" />
                                                <span className="text-xs font-bold text-white uppercase tracking-wider">AI Proposed Cart</span>
                                            </div>
                                            <div className="space-y-2 mb-3">
                                                {msg.proposedCart.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs text-gray-300 bg-white/5 p-2 rounded-lg">
                                                        {/* Render the Product Name, fallback to ID if missing */}
                                                        <span className="font-bold text-white truncate pr-2">
                                                            {item.ProductName || `Product ID: ${item.ProductVariantId}`}
                                                        </span>
                                                        <span className="bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded font-mono shrink-0">
                                                            Qty: {item.Quantity}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {msg.isApproved ? (
                                                <div className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-green-500/30">
                                                    <CheckCircle2 size={14} /> Added to Cart!
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleApproveCart(msg.id, msg.proposedCart!)}
                                                    disabled={actionLoading === msg.id}
                                                    className="w-full py-2 bg-[#D4AF37] text-black hover:bg-yellow-500 transition-colors rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {actionLoading === msg.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve & Update Cart
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start">
                                    <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-gray-400">
                                        <Loader2 size={16} className="animate-spin text-[#D4AF37]" /> AI is thinking...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[#1A1A1A] border-t border-white/10">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="e.g. Find me a cheap rice brand..." 
                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-colors disabled:opacity-50"
                                />
                                <button 
                                    type="submit" 
                                    disabled={isLoading || !inputText.trim()}
                                    className="bg-[#D4AF37] text-black p-3 rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="bg-[#D4AF37] text-black p-4 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-110 transition-transform flex items-center justify-center group"
                    >
                        <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}