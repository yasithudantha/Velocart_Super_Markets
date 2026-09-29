import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag, AlertCircle, Loader2, CheckCircle2, PackageCheck, CreditCard, Banknote, Lock, Award, Star, MapPin, User, Mail, Phone, Edit2 } from 'lucide-react';
import { getCart, updateCartItem, removeCartItem, checkoutOrder } from '../api/catalogApi';
import { getLoyaltyDashboard } from "../../Loyalty/api/loyaltyApi";
import { getUserProfile } from "../../auth/api/userApi";
import { getAddresses } from "../../auth/api/addressApi";

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const [step, setStep]=useState<'CART' | 'CHECKOUT' | 'RECEIPT'>('CART');
    
    const [cart, setCart]=useState<any>(null);
    const [userProfile, setUserProfile]=useState<any>(null);
    const [isLoading, setIsLoading]=useState(false);
    const [updatingItemId, setUpdatingItemId]=useState<number | null>(null);

    // EXACT Address Structure matching your image
    const [isEditingAddress, setIsEditingAddress]=useState(false);
    const [addressForm, setAddressForm]=useState({
        streetLine1: '',
        streetLine2: '',
        city: '',
        postalCode: '',
        country: 'Sri Lanka'
    });

    const [paymentMethod, setPaymentMethod]=useState<'CARD' | 'COD'>('CARD');
    const [idempotencyKey, setIdempotencyKey]=useState<string>('');
    const [gatewayStatus, setGatewayStatus]=useState<string>('');

    const [userPointsBalance, setUserPointsBalance]=useState<number>(0);
    const [pointsToRedeem, setPointsToRedeem]=useState<number>(0);

    const [isCheckingOut, setIsCheckingOut]=useState(false);
    const [checkoutSuccess, setCheckoutSuccess]=useState<any>(null);
    const [checkoutError, setCheckoutError]=useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('CART');
            setCheckoutSuccess(null);
            setCheckoutError('');
            setGatewayStatus('');
            setPointsToRedeem(0);
            setIsEditingAddress(false);
            setIdempotencyKey(crypto.randomUUID());
            fetchCart();
            fetchUserLoyaltyPoints();
            fetchProfileAndAddress();
        }
    }, [isOpen]);

    const fetchCart=async () => {
        setIsLoading(true);
        try { setCart(await getCart()); } catch (error) {} finally { setIsLoading(false); }
    };

    const fetchUserLoyaltyPoints=async () => {
        try {
            const token=localStorage.getItem('token') || '';
            const loyaltyData=await getLoyaltyDashboard(token);
            setUserPointsBalance(loyaltyData.currentPointsBalance || 23000); 
        } catch (error) {}
    };

    const fetchProfileAndAddress=async () => { 
        try { 
            setUserProfile(await getUserProfile()); 
            const addresses=await getAddresses();
            const targetAddress=addresses.find((a: any) => a.isDefault) || addresses[0];
            
            if (targetAddress) {
                setAddressForm({
                    streetLine1: targetAddress.streetLine1 || '',
                    streetLine2: targetAddress.streetLine2 || '',
                    city: targetAddress.city || '',
                    postalCode: targetAddress.postalCode || '',
                    country: targetAddress.country || 'Sri Lanka'
                });
            } else {
                setIsEditingAddress(true); // Force edit if no address exists
            }
        } catch(e) {} 
    };

    const getFormattedAddress=() => {
        return `${addressForm.streetLine1}${addressForm.streetLine2 ? ', ' + addressForm.streetLine2 : ''}, ${addressForm.city}, ${addressForm.postalCode}, ${addressForm.country}`;
    };

    const handleUpdateQuantity=async (itemId: number, newQty: number, availableStock: number) => {
        if (newQty < 1 || newQty > availableStock) return;
        setUpdatingItemId(itemId);
        try { await updateCartItem(itemId, newQty); await fetchCart(); } catch (error) {} finally { setUpdatingItemId(null); }
    };

    const handleRemoveItem=async (itemId: number) => {
        setUpdatingItemId(itemId);
        try { await removeCartItem(itemId); await fetchCart(); } catch (error) {} finally { setUpdatingItemId(null); }
    };

    const handleCheckout=async () => {
        if (isEditingAddress) {
            setCheckoutError("Please save your delivery address before placing the order.");
            return;
        }

        setIsCheckingOut(true);
        setCheckoutError('');
        
        try {
            // Concatenate structured fields into the single string the C# backend expects
            const finalDeliveryAddress=getFormattedAddress();

            const response=await checkoutOrder(
                finalDeliveryAddress, 
                cart.grandTotal, 
                paymentMethod,
                idempotencyKey,
                pointsToRedeem 
            );
            
            if (response.stripeUrl) {
                setGatewayStatus('Redirecting to Stripe Sandbox...');
                window.location.href=response.stripeUrl; 
                return;
            }

            setGatewayStatus('');
            setCheckoutSuccess(response);
            setStep('RECEIPT');
            setCart(null);
        } catch (error: any) {
            setGatewayStatus('');
            setCheckoutError(error.response?.data?.message || error.response?.data || "An error occurred during checkout.");
            setStep('CART');
            fetchCart(); 
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={!isCheckingOut ? onClose : undefined} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />

                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
                        // FIXED: Enforcing strict h-full and flex layout to pin the footer
                        className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-[#0B1F33] border-l border-white/10 shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#121212] flex-shrink-0">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                {step === 'RECEIPT' ? <PackageCheck className="text-green-400" /> : <ShoppingBag className="text-[#D4AF37]" />}
                                {step === 'CART' && "Your Cart"}
                                {step === 'CHECKOUT' && "Review & Delivery"}
                                {step === 'RECEIPT' && "Order Confirmed"}
                            </h2>
                            <button disabled={isCheckingOut} onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400 transition-colors disabled:opacity-50"><X size={20} /></button>
                        </div>

                        {gatewayStatus ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#050505]">
                                <Loader2 size={64} className="animate-spin text-[#D4AF37] mb-6" />
                                <h3 className="text-xl font-bold text-white mb-2">{gatewayStatus}</h3>
                                <p className="text-gray-500 text-sm">Please do not close this window or press back.</p>
                                <div className="mt-8 flex items-center gap-2 text-xs font-bold text-green-500/70 uppercase tracking-widest bg-green-500/10 px-4 py-2 rounded-full"><Lock size={12} /> 256-bit Secure Connection</div>
                            </div>
                        ) : step === 'RECEIPT' && checkoutSuccess ? (
                            <div className="flex-1 overflow-y-auto p-6 bg-[#050505]">
                                <div className="text-center mb-8">
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                                        <CheckCircle2 size={48} className="text-green-400" />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Payment Successful</h3>
                                    <p className="text-gray-400 text-sm mt-1">We've sent the digital receipt to your email.</p>
                                </div>
                                <div className="bg-[#121212] border border-white/10 p-6 rounded-2xl w-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-[#D4AF37] text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg">PAID</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Order Number</div>
                                    <div className="text-xl font-display font-bold text-[#D4AF37] mb-4">{checkoutSuccess.orderNumber}</div>
                                    <div className="space-y-3 text-sm text-gray-300 border-b border-white/5 pb-4 mb-4">
                                        <div className="flex justify-between"><span>Subtotal</span><span>Rs. {checkoutSuccess.subtotal?.toFixed(2)}</span></div>
                                        {checkoutSuccess.discountAmount > 0 && <div className="flex justify-between text-[#D4AF37]"><span>Promotions</span><span>-Rs. {checkoutSuccess.discountAmount?.toFixed(2)}</span></div>}
                                        {checkoutSuccess.loyaltyDiscountApplied > 0 && <div className="flex justify-between text-green-400"><span>Loyalty Redeemed</span><span>-Rs. {checkoutSuccess.loyaltyDiscountApplied?.toFixed(2)}</span></div>}
                                        <div className="flex justify-between"><span>VAT / Taxes</span><span>Rs. {checkoutSuccess.taxAmount?.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span>Delivery Fee</span><span>Rs. {checkoutSuccess.deliveryFee?.toFixed(2)}</span></div>
                                    </div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400 uppercase tracking-wider text-sm font-bold">Grand Total</span><span className="text-2xl font-bold text-white">Rs. {checkoutSuccess.grandTotal?.toFixed(2)}</span></div>
                                </div>
                                <button onClick={onClose} className="mt-8 w-full py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all">Continue Shopping</button>
                            </div>
                        ) : step === 'CHECKOUT' ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                    
                                    {/* ADDRESS CARD WITH INLINE FORM OVERHAUL */}
                                    <div className="bg-[#121212] border border-white/10 p-5 rounded-2xl">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2"><MapPin size={16} className="text-[#D4AF37]"/> Delivery Details</h3>
                                            {!isEditingAddress && (
                                                <button onClick={() => setIsEditingAddress(true)} className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"><Edit2 size={12}/> Edit</button>
                                            )}
                                        </div>
                                        
                                        {!isEditingAddress && (
                                            <div className="space-y-3 mb-4">
                                                <div className="flex items-center gap-3 text-sm text-gray-300"><User size={14} className="text-gray-500"/> {userProfile?.fullName || 'Guest User'}</div>
                                                <div className="flex items-center gap-3 text-sm text-gray-300"><Phone size={14} className="text-gray-500"/> {userProfile?.phoneNumber || 'N/A'}</div>
                                                <div className="flex items-center gap-3 text-sm text-gray-300"><Mail size={14} className="text-gray-500"/> {userProfile?.email || 'N/A'}</div>
                                            </div>
                                        )}

                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Confirm Delivery Address</div>
                                        
                                        {isEditingAddress ? (
                                            <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-white/5 mt-2">
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Street Line 1 *</label>
                                                    <input required value={addressForm.streetLine1} onChange={e => setAddressForm({...addressForm, streetLine1: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm bg-[#1A1A1A] border-white/10 text-white" placeholder="123 Smart Ave" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Street Line 2 (Optional)</label>
                                                    <input value={addressForm.streetLine2} onChange={e => setAddressForm({...addressForm, streetLine2: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm bg-[#1A1A1A] border-white/10 text-white" placeholder="Apt, Suite, Building" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">City *</label>
                                                        <input required value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm bg-[#1A1A1A] border-white/10 text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Postal Code *</label>
                                                        <input required value={addressForm.postalCode} onChange={e => setAddressForm({...addressForm, postalCode: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm bg-[#1A1A1A] border-white/10 text-white" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Country</label>
                                                    <input required value={addressForm.country} onChange={e => setAddressForm({...addressForm, country: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm bg-[#1A1A1A] border-white/10 text-white" />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={() => setIsEditingAddress(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancel</button>
                                                    <button onClick={() => setIsEditingAddress(false)} disabled={!addressForm.streetLine1 || !addressForm.city} className="px-4 py-2 text-xs font-bold bg-[#D4AF37] text-black rounded-lg disabled:opacity-50">Save Address</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-black border border-white/10 rounded-xl p-3 text-sm text-gray-300">
                                                {getFormattedAddress()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Loyalty Points Input */}
                                    <div className="bg-[#121212] border border-white/10 p-4 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Award size={14} className="text-[#D4AF37]" /> Loyalty Rewards</span>
                                            <span className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1"><Star size={12} fill="currentColor" /> {userPointsBalance.toLocaleString()} pts</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="number" min="0" max={userPointsBalance} value={pointsToRedeem === 0 ? '' : pointsToRedeem} onChange={(e) => setPointsToRedeem(Math.max(0, parseInt(e.target.value) || 0))} placeholder="Points to spend" className="glass-input flex-1 py-2 px-3 rounded-lg text-sm bg-black text-white border border-white/10 focus:border-[#D4AF37] outline-none" />
                                            <button type="button" onClick={() => setPointsToRedeem(userPointsBalance)} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 rounded-lg border border-white/10 transition-colors">Max</button>
                                        </div>
                                        {pointsToRedeem > 0 && (<p className="text-[11px] text-green-400 flex items-center gap-1">✓ Applying {pointsToRedeem} points (-Rs. {pointsToRedeem}.00 estimated discount)</p>)}
                                    </div>

                                    {/* Payment Method */}
                                    <div className="bg-[#121212] border border-white/10 p-5 rounded-2xl">
                                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Payment Method</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => setPaymentMethod('CARD')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'CARD' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-white/5'}`}><CreditCard size={24} /><span className="text-xs font-bold">Credit/Debit</span></button>
                                            <button onClick={() => setPaymentMethod('COD')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'COD' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-white/5'}`}><Banknote size={24} /><span className="text-xs font-bold">Cash on Delivery</span></button>
                                        </div>
                                    </div>
                                </div>

                                {/* FIXED: Pinned Action Footer */}
                                <div className="p-6 bg-[#121212] border-t border-white/10 flex-shrink-0">
                                    <div className="flex justify-between items-center mb-4"><span className="text-gray-400">Grand Total</span><span className="text-2xl font-display font-bold text-[#D4AF37]">Rs. {Math.max(0, (cart.grandTotal - pointsToRedeem)).toFixed(2)}</span></div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setStep('CART')} className="px-6 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10">Back</button>
                                        <button onClick={handleCheckout} disabled={isCheckingOut || isEditingAddress || !addressForm.streetLine1} className="flex-1 py-4 flex justify-center items-center gap-2 bg-[#D4AF37] text-black font-bold text-lg rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                            {isCheckingOut ? <Loader2 size={20} className="animate-spin" /> : paymentMethod === 'CARD' ? "Pay Securely" : "Place Order"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                {checkoutError && (
                                    <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 flex-shrink-0">
                                        <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                                        <p className="text-sm text-red-400">{checkoutError}</p>
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                    {isLoading && !cart ? (
                                        <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-[#D4AF37]" size={40} /></div>
                                    ) : cart?.items?.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <ShoppingBag size={64} className="mb-4 opacity-20" />
                                            <p className="text-lg font-bold">Your cart is empty</p>
                                        </div>
                                    ) : (
                                        cart?.items?.map((item: any) => (
                                            <div key={item.id} className={`flex gap-4 p-4 rounded-2xl border transition-all ${item.isAvailable ? 'bg-[#121212] border-white/5' : 'bg-red-500/5 border-red-500/20 opacity-75 grayscale-[0.5]'}`}>
                                                <div className="w-20 h-20 bg-white/5 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-white leading-tight pr-2">{item.productName}</h3>
                                                            <button onClick={() => handleRemoveItem(item.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                                                                {updatingItemId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                            </button>
                                                        </div>
                                                        <div className="text-xs text-[#D4AF37] font-bold tracking-wider mt-1">{item.brand} • {item.variantName}</div>
                                                    </div>

                                                    {!item.isAvailable ? (
                                                        <div className="flex items-center gap-1 text-xs text-red-400 font-bold mt-2 bg-red-400/10 w-fit px-2 py-1 rounded">
                                                            <AlertCircle size={12} /> Unavailable
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-end mt-2">
                                                            <div className="font-bold text-lg text-white">Rs. {(item.unitPrice * item.quantity).toFixed(2)}</div>
                                                            <div className="flex items-center bg-black border border-white/10 rounded-lg p-0.5">
                                                                <button disabled={item.quantity <= 1 || updatingItemId === item.id || isCheckingOut} onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.availableStock)} className="w-7 h-7 flex items-center justify-center rounded-md bg-[#1A1A1A] hover:bg-[#2A2A2A] disabled:opacity-50 text-white"><Minus size={14} /></button>
                                                                <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
                                                                <button disabled={item.quantity >= item.availableStock || updatingItemId === item.id || isCheckingOut} onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.availableStock)} className="w-7 h-7 flex items-center justify-center rounded-md bg-[#1A1A1A] hover:bg-[#2A2A2A] disabled:opacity-50 text-white"><Plus size={14} /></button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* FIXED: Pinned Action Footer */}
                                {cart?.items?.length > 0 && (
                                    <div className="p-6 bg-[#121212] border-t border-white/10 flex-shrink-0">
                                        <div className="space-y-2 mb-4 pb-4 border-b border-white/5 text-sm text-gray-400">
                                            <div className="flex justify-between"><span>Subtotal</span><span className="text-white">Rs. {cart.subtotal?.toFixed(2)}</span></div>
                                            {cart.discountAmount > 0 && <div className="flex justify-between text-[#D4AF37]"><span>Promotions & Discounts</span><span>-Rs. {cart.discountAmount?.toFixed(2)}</span></div>}
                                            <div className="flex justify-between"><span>Taxes / VAT</span><span className="text-white">Rs. {cart.taxAmount?.toFixed(2)}</span></div>
                                            <div className="flex justify-between"><span>Delivery Estimate</span><span className="text-white">Rs. {cart.deliveryFee?.toFixed(2)}</span></div>
                                        </div>
                                        <div className="flex justify-between items-center mb-4"><span className="text-gray-400 text-lg">Total</span><span className="text-3xl font-display font-bold text-[#D4AF37]">Rs. {cart.grandTotal?.toFixed(2)}</span></div>
                                        <button disabled={isCheckingOut || !cart.items.some((i:any) => i.isAvailable)} onClick={() => setStep('CHECKOUT')} className="w-full py-4 flex justify-center items-center gap-2 bg-[#D4AF37] text-black font-bold text-lg rounded-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] disabled:opacity-50 transition-all">
                                            Proceed to Checkout
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}