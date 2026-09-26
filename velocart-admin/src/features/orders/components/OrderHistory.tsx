import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Calendar, MapPin, CreditCard, Star, ArrowLeft, Loader2, X, CheckCircle2, RotateCcw, Truck, AlertTriangle, CheckCircle, FileText, Download, Banknote, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getOrderHistory, submitReview, reorderItems, cancelOrder, chooseRefundMethod } from '../api/catalogApi';

// API helpers for the new Delivery Management endpoints
const API_URL = 'http://localhost:5176/api';
const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function OrderHistory() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [reorderingId, setReorderingId] = useState<number | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Review Modal States (Preserved)
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewProduct, setReviewProduct] = useState<{id: number, name: string} | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const [reviewError, setReviewError] = useState('');

    // NEW: Delivery & Complaint Modal States
    const [deliveryDetailsModal, setDeliveryDetailsModal] = useState<any | null>(null);
    const [complaintModalOrderId, setComplaintModalOrderId] = useState<number | null>(null);
    const [complaintForm, setComplaintForm] = useState({ subject: '', description: '' });

    const [receiptModalData, setReceiptModalData] = useState<any | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data = await getOrderHistory(); 
            setOrders(data);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    // --- EXISTING ACTIONS ---

    const handleReorder = async (orderId: number) => {
        setReorderingId(orderId);
        try {
            const response = await reorderItems(orderId);
            alert(response.message); 
            navigate('/catalog'); // Redirecting to catalog so they can see their updated cart
        } catch (err: any) {
            alert(err.toString());
        } finally {
            setReorderingId(null);
        }
    };

    const handleCancelOrder = async (orderId: number) => {
        if (!window.confirm("Are you sure you want to cancel this order?")) return;
        setCancellingId(orderId);
        try {
            const response = await cancelOrder(orderId);
            alert(response.message);
            fetchOrders(); 
        } catch (err: any) {
            alert(err.message || err.toString());
        } finally {
            setCancellingId(null);
        }
    };

    const handleOpenReview = (productId: number, productName: string) => {
        setReviewProduct({ id: productId, name: productName });
        setRating(5); setComment(''); setReviewSuccess(false); setReviewError(''); setIsReviewOpen(true);
    };

    const handleSubmitReview = async () => {
        if (!reviewProduct) return;
        setIsSubmittingReview(true); setReviewError('');
        try {
            await submitReview(reviewProduct.id, rating, comment);
            setReviewSuccess(true);
            setTimeout(() => { setIsReviewOpen(false); setReviewSuccess(false); }, 2000);
        } catch (err: any) {
            setReviewError(err.toString());
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // --- NEW DELIVERY MANAGEMENT ACTIONS ---

    const handleConfirmReceipt = async (orderId: number) => {
        if (!window.confirm("Confirm that you have received your order successfully?")) return;
        setActionLoading(orderId);
        try {
            await axios.post(`${API_URL}/orders/${orderId}/confirm-receipt`, {}, getAuthHeader());
            fetchOrders();
        } catch (err: any) { alert(err.response?.data?.message || "Failed to confirm receipt."); } 
        finally { setActionLoading(null); }
    };

    const handleViewDelivery = async (orderId: number) => {
        setActionLoading(orderId);
        try {
            const res = await axios.get(`${API_URL}/orders/${orderId}/delivery-details`, getAuthHeader());
            setDeliveryDetailsModal(res.data);
        } catch (err: any) { alert(err.response?.data?.message || "Delivery details not available yet."); } 
        finally { setActionLoading(null); }
    };

   const handleSubmitComplaint = async () => {
        if (!complaintForm.subject || !complaintForm.description) return alert("Please fill out all fields.");
        try {
            await axios.post(`${API_URL}/orders/${complaintModalOrderId}/complaints`, complaintForm, getAuthHeader());
            setComplaintModalOrderId(null);
            setComplaintForm({ subject: '', description: '' });
            
            // THE FIX: Use custom state instead of native browser alert
            setSuccessMessage("Complaint submitted successfully. Our Delivery Manager will review it shortly.");
            setTimeout(() => setSuccessMessage(''), 4000); // Auto-hide after 4 seconds
            fetchOrders(); // Refresh to show complaint
        } catch (err: any) { alert(err.response?.data?.message || "Failed to submit complaint."); }
    };

    // --- NEW: INTERACTIVE REFUND METHOD CHOICE ---
    const handleChooseRefund = async (complaintId: number, method: string) => {
        setActionLoading(complaintId);
        try {
            const response = await chooseRefundMethod(complaintId, method);
            setSuccessMessage(response.message);
            setTimeout(() => setSuccessMessage(''), 4000);
            fetchOrders();
        } catch (err: any) {
            alert(err.toString());
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewReceipt = async (orderId: number) => {
        setActionLoading(orderId);
        try {
            const res = await axios.get(`${API_URL}/orders/${orderId}/invoice`, getAuthHeader());
            setReceiptModalData(res.data);
        } catch (err: any) { alert(err.response?.data?.message || "Failed to load receipt."); } 
        finally { setActionLoading(null); }
    };

    const handleDownloadReceipt = () => {
        window.print(); // The cleanest way to allow users to save as PDF without heavy libraries
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'VALIDATING': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'CONFIRMED': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'DELIVERING': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'DELIVERED': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'CANCELLED': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (isLoading) return <div className="min-h-screen bg-[#050505] flex justify-center items-center"><Loader2 className="animate-spin text-[#D4AF37]" size={48} /></div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 relative">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/catalog')} className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors mb-8 hide-on-print">
                    <ArrowLeft size={20} /> Back to Catalog
                </button>

                <div className="mb-8 border-b border-white/10 pb-6 flex justify-between items-end hide-on-print">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-wide flex items-center gap-3">
                            <Package className="text-[#D4AF37]" size={36} /> My Orders
                        </h1>
                        <p className="text-gray-400 mt-2">View your past purchases, track deliveries, and manage your history.</p>
                    </div>
                </div>

                {error && <div className="p-4 mb-8 rounded-xl bg-red-500/20 text-red-400 hide-on-print">{error}</div>}

                {orders.length === 0 ? (
                    <div className="text-center py-20 bg-[#121212] border border-white/5 rounded-3xl hide-on-print">
                        <Package size={64} className="mx-auto text-gray-600 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">No orders yet</h2>
                        <p className="text-gray-400">When you place an order, it will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-6 hide-on-print">
                        {orders.map((order, index) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                                key={order.id} 
                                className={`bg-[#121212] border border-white/10 rounded-3xl overflow-hidden ${order.orderStatus === 'CANCELLED' ? 'opacity-70 grayscale-[0.5]' : ''}`}
                            >
                                {/* Order Header */}
                                <div className="bg-white/5 p-6 border-b border-white/10 flex flex-wrap justify-between items-center gap-4">
                                    <div>
                                        <div className="text-sm text-gray-400 uppercase tracking-wider mb-1">Order Number</div>
                                        <div className="text-xl font-bold text-[#D4AF37]">{order.orderNumber}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-6 items-center">
                                        <div>
                                            <div className="text-sm text-gray-400 uppercase tracking-wider mb-1">Date</div>
                                            <div className="flex items-center gap-2 font-semibold"><Calendar size={16} className="text-gray-500"/> {new Date(order.orderDate).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-400 uppercase tracking-wider mb-1">Total</div>
                                            <div className="flex items-center gap-2 font-bold"><CreditCard size={16} className="text-gray-500"/> Rs. {order.grandTotal.toFixed(2)}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="text-sm text-gray-400 uppercase tracking-wider mb-1">Status</div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.orderStatus)}`}>
                                                    {order.orderStatus}
                                                </div>
                                            </div>
                                            {/* NEW: View Receipt Button */}
                                            <button 
                                                disabled={actionLoading === order.id} onClick={() => handleViewReceipt(order.id)}
                                                className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors border border-white/10" title="View Receipt"
                                            >
                                                {actionLoading === order.id ? <Loader2 size={18} className="animate-spin"/> : <FileText size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Body */}
                                <div className="p-6">
                                    <div className="flex items-start gap-2 mb-6 text-sm text-gray-400">
                                        <MapPin size={16} className="text-gray-500 mt-0.5 shrink-0" />
                                        <span>Delivered to: <strong className="text-gray-300">{order.deliveryAddress}</strong> via {order.deliveryMethod}</span>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        {order.items.map((item: any) => (
                                            <div key={item.id} className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-bold text-gray-500">
                                                        {item.quantity}x
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white">{item.productName}</h4>
                                                        <div className="text-xs text-gray-500">{item.variantName} • Paid Rs. {item.unitPrice.toFixed(2)} each</div>
                                                    </div>
                                                </div>
                                                
                                                {/* Write Review is only available if Delivered */}
                                                {order.orderStatus === 'DELIVERED' && item.productId ? (
                                                    <button 
                                                        onClick={() => handleOpenReview(item.productId, item.productName)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-[#D4AF37] hover:text-black text-gray-300 text-sm font-bold rounded-lg transition-all shadow-lg"
                                                    >
                                                        <Star size={16} /> Write Review
                                                    </button>
                                                ) : (
                                                    <div className="text-sm font-bold text-gray-300">
                                                        Rs. {(item.quantity * item.unitPrice).toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* --- NEW: COMPLAINT & REFUND UI SECTION --- */}
                                    {order.complaints && order.complaints.length > 0 && (
                                        <div className="mb-6 space-y-3">
                                            {order.complaints.map((comp: any) => (
                                                <div key={comp.id} className={`p-4 rounded-xl border ${comp.status === 'RESOLUTION_OFFERED' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/10'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-white flex items-center gap-2">
                                                            <AlertTriangle size={16} className={comp.status === 'RESOLUTION_OFFERED' ? 'text-orange-400' : 'text-gray-400'}/>
                                                            Ticket: {comp.subject}
                                                        </h4>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${comp.status === 'RESOLUTION_OFFERED' ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-white/10 text-gray-400'}`}>
                                                            {comp.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    
                                                    {comp.status === 'RESOLUTION_OFFERED' && comp.refundStatus === 'Pending_Customer_Choice' && (
                                                        <div className="mt-4 pt-4 border-t border-orange-500/20">
                                                            <p className="text-sm text-gray-300 mb-2"><strong>AI Resolution:</strong> {comp.resolutionNotes}</p>
                                                            <p className="text-sm text-orange-300 font-bold mb-4">Refund Approved: Rs. {comp.refundAmount.toFixed(2)}</p>
                                                            
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <button 
                                                                    disabled={actionLoading === comp.id}
                                                                    onClick={() => handleChooseRefund(comp.id, 'OriginalPayment')}
                                                                    className="p-3 bg-black/50 hover:bg-black border border-white/10 rounded-xl flex items-center gap-3 transition-colors text-left"
                                                                >
                                                                    <div className="bg-gray-800 p-2 rounded-lg text-white"><CreditCard size={20}/></div>
                                                                    <div>
                                                                        <div className="font-bold text-sm text-white">Refund to Card</div>
                                                                        <div className="text-xs text-gray-400">Takes 3-5 business days</div>
                                                                    </div>
                                                                </button>
                                                                <button 
                                                                    disabled={actionLoading === comp.id}
                                                                    onClick={() => handleChooseRefund(comp.id, 'LoyaltyPoints')}
                                                                    className="p-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-xl flex items-center gap-3 transition-colors text-left"
                                                                >
                                                                    <div className="bg-[#D4AF37] p-2 rounded-lg text-black"><Award size={20}/></div>
                                                                    <div>
                                                                        <div className="font-bold text-sm text-[#D4AF37]">Convert to Points</div>
                                                                        <div className="text-xs text-[#D4AF37]/70">Instant + 10% Bonus Value!</div>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {comp.refundStatus === 'Processing' && (
                                                        <div className="mt-2 text-xs text-blue-400 font-bold flex items-center gap-2">
                                                            <Loader2 size={12} className="animate-spin"/> Your card refund is being processed by our team.
                                                        </div>
                                                    )}
                                                    
                                                    {comp.refundStatus === 'Completed' && (
                                                        <div className="mt-2 text-xs text-green-400 font-bold flex items-center gap-2">
                                                            <CheckCircle2 size={12}/> Refund Completed.
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* DYNAMIC WORKFLOW BUTTONS */}
                                    <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-white/5">
                                        
                                        <button 
                                            disabled={reorderingId === order.id} onClick={() => handleReorder(order.id)}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                                        >
                                            {reorderingId === order.id ? <Loader2 size={16} className="animate-spin"/> : <RotateCcw size={16} />} Reorder Items
                                        </button>

                                        {/* STRICT CANCEL RULE: Hidden once Confirmed */}
                                        {(order.orderStatus === 'PENDING' || order.orderStatus === 'VALIDATING') && (
                                            <button 
                                                disabled={cancellingId === order.id} onClick={() => handleCancelOrder(order.id)}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                                            >
                                                {cancellingId === order.id ? <Loader2 size={16} className="animate-spin"/> : <X size={16} />} Cancel Order
                                            </button>
                                        )}

                                        {/* DELIVERY DETAILS: Visible once Delivering or Delivered */}
                                        {(order.orderStatus === 'DELIVERING' || order.orderStatus === 'DELIVERED') && (
                                            <button 
                                                disabled={actionLoading === order.id} onClick={() => handleViewDelivery(order.id)} 
                                                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                                            >
                                                {actionLoading === order.id ? <Loader2 size={16} className="animate-spin"/> : <Truck size={16} />} View Delivery Info
                                            </button>
                                        )}

                                        {/* CUSTOMER CONFIRMATION LOOP: Visible only when Delivered but not yet confirmed */}
                                        {order.orderStatus === 'DELIVERED' && !order.isCustomerConfirmed && (
                                            <>
                                                <button onClick={() => setComplaintModalOrderId(order.id)} className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                                                    <AlertTriangle size={16} /> Report Problem
                                                </button>
                                                <button disabled={actionLoading === order.id} onClick={() => handleConfirmReceipt(order.id)} className="px-4 py-2 bg-[#D4AF37] hover:bg-yellow-500 text-black rounded-xl text-sm font-bold shadow-glow transition-colors flex items-center gap-2">
                                                    {actionLoading === order.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16} />} Confirm Receipt
                                                </button>
                                            </>
                                        )}

                                        {/* Completion Tag */}
                                        {order.isCustomerConfirmed && (
                                            <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold flex items-center gap-2">
                                                <CheckCircle size={16} /> Order Completed
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ============================================================== */}
            {/* EXISTING REVIEW MODAL                                          */}
            {/* ============================================================== */}
            <AnimatePresence>
                {isReviewOpen && reviewProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReviewOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-[#121212] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-10">
                            <button onClick={() => setIsReviewOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={24} /></button>
                            
                            {reviewSuccess ? (
                                <div className="text-center py-10">
                                    <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-white mb-2">Review Submitted!</h3>
                                    <p className="text-gray-400">Thank you for your verified purchase feedback.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 text-[#D4AF37] font-bold mb-2 uppercase tracking-widest text-xs">
                                        <Star size={14} fill="currentColor" /> Verified Purchase
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-6 leading-tight">Review {reviewProduct.name}</h2>
                                    
                                    {reviewError && <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{reviewError}</div>}

                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-400 mb-3">Rating</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button key={star} onClick={() => setRating(star)} className={`transition-all hover:scale-110 ${rating >= star ? 'text-[#D4AF37]' : 'text-gray-600'}`}>
                                                    <Star size={36} fill={rating >= star ? 'currentColor' : 'none'} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <label className="block text-sm font-bold text-gray-400 mb-3">Your Experience (Optional)</label>
                                        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you like or dislike?" className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#D4AF37] transition-colors h-32 resize-none" />
                                    </div>

                                    <button disabled={isSubmittingReview} onClick={handleSubmitReview} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex justify-center items-center gap-2">
                                        {isSubmittingReview ? <Loader2 size={20} className="animate-spin" /> : "Submit Verified Review"}
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ============================================================== */}
            {/* NEW DELIVERY DETAILS MODAL                                     */}
            {/* ============================================================== */}
            <AnimatePresence>
                {deliveryDetailsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeliveryDetailsModal(null)}></motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-lg w-full z-10">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-3"><Truck className="text-blue-400"/> Delivery Tracking</h2>
                                <button onClick={() => setDeliveryDetailsModal(null)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                            </div>
                            {deliveryDetailsModal.message ? (
                                <p className="text-gray-400">{deliveryDetailsModal.message}</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                        <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Tracking Number</label>
                                        <div className="font-mono text-white text-lg">{deliveryDetailsModal.deliveryNumber || 'Pending Assignment'}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                            <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Est. Date</label>
                                            <div className="text-white font-bold">{deliveryDetailsModal.estimatedDeliveryDate ? new Date(deliveryDetailsModal.estimatedDeliveryDate).toLocaleDateString() : 'TBD'}</div>
                                        </div>
                                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                            <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Est. Time</label>
                                            <div className="text-white font-bold">{deliveryDetailsModal.estimatedDeliveryTime || 'TBD'}</div>
                                        </div>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                        <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Assigned Driver</label>
                                        <div className="text-white font-bold">{deliveryDetailsModal.assignedDriverName || 'Assigning...'}</div>
                                        {deliveryDetailsModal.assignedDriverContact && <div className="text-sm text-gray-400 mt-1">{deliveryDetailsModal.assignedDriverContact}</div>}
                                    </div>
                                    {deliveryDetailsModal.deliveryNotes && (
                                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-blue-400 text-sm">
                                            <span className="font-bold block mb-1">Update from Delivery Team:</span>
                                            {deliveryDetailsModal.deliveryNotes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ============================================================== */}
            {/* NEW COMPLAINT MODAL                                            */}
            {/* ============================================================== */}
            <AnimatePresence>
                {complaintModalOrderId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setComplaintModalOrderId(null)}></motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-lg w-full z-10">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-3"><AlertTriangle className="text-orange-400"/> Report a Problem</h2>
                                <button onClick={() => setComplaintModalOrderId(null)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                            </div>
                            <p className="text-sm text-gray-400 mb-6">If your order was marked as delivered but you haven't received it, or if items are damaged, please provide details below.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Subject</label>
                                    <select value={complaintForm.subject} onChange={e => setComplaintForm({...complaintForm, subject: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-400 outline-none appearance-none">
                                        <option value="">Select an issue...</option>
                                        <option value="Order Not Received">Order Not Received</option>
                                        <option value="Missing Items">Missing Items</option>
                                        <option value="Damaged Items">Damaged Items</option>
                                        <option value="Wrong Items Delivered">Wrong Items Delivered</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Details</label>
                                    <textarea rows={4} value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})} placeholder="Please provide specific details..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-400 outline-none"></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button onClick={() => setComplaintModalOrderId(null)} className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleSubmitComplaint} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">Submit Report</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* NEW RECEIPT MODAL */}
                {receiptModalData && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 printable-modal">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm hide-on-print" onClick={() => setReceiptModalData(null)}></motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white text-black rounded-xl p-8 max-w-2xl w-full z-10 shadow-2xl relative">
                            
                            <div className="flex justify-between items-start mb-8 border-b pb-4 hide-on-print">
                                <h2 className="text-2xl font-bold text-black flex items-center gap-2"><FileText /> Digital Receipt</h2>
                                <div className="flex gap-2">
                                    <button onClick={handleDownloadReceipt} className="p-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg transition-colors"><Download size={20}/></button>
                                    <button onClick={() => setReceiptModalData(null)} className="p-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg transition-colors"><X size={20}/></button>
                                </div>
                            </div>

                            {/* Printable Receipt Content */}
                            <div id="receipt-content">
                                <div className="text-center mb-6">
                                    <h1 className="text-3xl font-black text-[#D4AF37] tracking-widest uppercase">Velocart</h1>
                                    <p className="text-gray-500 text-sm mt-1">Official E-Commerce Receipt</p>
                                </div>
                                <div className="flex justify-between text-sm mb-6">
                                    <div>
                                        <p className="text-gray-500 uppercase text-xs font-bold">Billed To</p>
                                        <p className="font-bold">{receiptModalData.customerName}</p>
                                        <p>{receiptModalData.customerEmail}</p>
                                        <p className="max-w-xs">{receiptModalData.customerAddress}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-500 uppercase text-xs font-bold">Order Details</p>
                                        <p className="font-bold"># {receiptModalData.orderNumber}</p>
                                        <p>{new Date(receiptModalData.orderDate).toLocaleDateString()}</p>
                                        <p className="font-bold mt-1 text-green-600">{receiptModalData.paymentStatus}</p>
                                    </div>
                                </div>

                                <table className="w-full text-sm mb-6">
                                    <thead>
                                        <tr className="border-y border-gray-200 text-left">
                                            <th className="py-3 px-2 text-gray-500 uppercase font-bold text-xs">Item Description</th>
                                            <th className="py-3 px-2 text-center text-gray-500 uppercase font-bold text-xs">Qty</th>
                                            <th className="py-3 px-2 text-right text-gray-500 uppercase font-bold text-xs">Price</th>
                                            <th className="py-3 px-2 text-right text-gray-500 uppercase font-bold text-xs">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {receiptModalData.items.map((item:any, idx:number) => (
                                            <tr key={idx}>
                                                <td className="py-3 px-2 font-semibold">{item.productName} <span className="text-gray-400 block text-xs">{item.variantName}</span></td>
                                                <td className="py-3 px-2 text-center">{item.quantity}</td>
                                                <td className="py-3 px-2 text-right text-gray-600">Rs. {item.unitPrice.toFixed(2)}</td>
                                                <td className="py-3 px-2 text-right font-bold">Rs. {item.total.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="flex justify-end text-sm">
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>Rs. {receiptModalData.subtotal.toFixed(2)}</span></div>
                                        {receiptModalData.discountAmount > 0 && <div className="flex justify-between text-[#D4AF37]"><span>Promotions</span><span>-Rs. {receiptModalData.discountAmount.toFixed(2)}</span></div>}
                                        {receiptModalData.loyaltyDiscountAmount > 0 && <div className="flex justify-between text-green-600"><span>Loyalty (-{receiptModalData.loyaltyPointsUsed} pts)</span><span>-Rs. {receiptModalData.loyaltyDiscountAmount.toFixed(2)}</span></div>}
                                        <div className="flex justify-between text-gray-600"><span>VAT / Taxes</span><span>Rs. {receiptModalData.taxAmount.toFixed(2)}</span></div>
                                        <div className="flex justify-between text-gray-600"><span>Delivery</span><span>Rs. {receiptModalData.deliveryFee.toFixed(2)}</span></div>
                                        <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-black mt-2">
                                            <span>Grand Total</span><span>Rs. {receiptModalData.grandTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            {/* NEW CUSTOM SUCCESS MODAL */}
            <AnimatePresence>
                {successMessage && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSuccessMessage('')}></motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-[#121212] border border-green-500/30 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative">
                            <button onClick={() => setSuccessMessage('')} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                            <div className="mx-auto w-16 h-16 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Success</h3>
                            <p className="text-gray-400 text-sm mb-8">{successMessage}</p>
                            <button onClick={() => setSuccessMessage('')} className="w-full px-4 py-3 rounded-xl font-bold bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors">
                                OK
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CSS specific to printing */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .printable-modal, .printable-modal * { visibility: visible; }
                    .printable-modal { position: absolute; left: 0; top: 0; width: 100%; height: 100%; box-shadow: none; background: white; }
                    .hide-on-print { display: none !important; }
                }
            `}</style>

        </div>
    );
}