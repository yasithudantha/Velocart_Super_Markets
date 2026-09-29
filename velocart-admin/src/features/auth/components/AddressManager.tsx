import { useState, useEffect } from 'react';
import { MapPin, Home, Briefcase, Plus, Edit2, Trash2, CheckCircle, X, Loader2, AlertCircle } from 'lucide-react';
import { getAddresses, addAddress, updateAddress, deleteAddress } from '../api/addressApi';

interface Address {
    id: number;
    addressType: string;
    streetLine1: string;
    streetLine2: string | null;
    city: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
}

import { motion, AnimatePresence } from 'framer-motion';

export default function AddressManager() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // NEW: Premium UI States
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const initialForm = { addressType: 'Home', streetLine1: '', streetLine2: '', city: '', postalCode: '', country: 'Sri Lanka', isDefault: false };
    const [formData, setFormData] = useState(initialForm);

    const fetchAddresses = async () => {
        setIsLoading(true);
        try {
            const data = await getAddresses();
            setAddresses(data);
        } catch (err: any) {
            setError("Failed to load addresses.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, []);

    const handleOpenAdd = () => {
        setFormData(initialForm);
        setEditingId(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (addr: Address) => {
        setFormData({
            addressType: addr.addressType,
            streetLine1: addr.streetLine1,
            streetLine2: addr.streetLine2 || '',
            city: addr.city,
            postalCode: addr.postalCode,
            country: addr.country,
            isDefault: addr.isDefault
        });
        setEditingId(addr.id);
        setIsFormOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteAddress(deleteId);
            showToast("Address deleted successfully.", "success");
            fetchAddresses();
        } catch (err) {
            showToast("Failed to delete address.", "error");
        } finally {
            setDeleteId(null);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            if (editingId) {
                await updateAddress(editingId, formData);
            } else {
                await addAddress(formData);
            }
            setIsFormOpen(false);
            fetchAddresses();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save address.");
        } finally {
            setIsSaving(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'home': return <Home size={20} />;
            case 'office': return <Briefcase size={20} />;
            default: return <MapPin size={20} />;
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
    }

    return (
        <div className="mt-10 border-t border-white/10 pt-8 relative">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-display font-bold text-white">Delivery Addresses</h2>
                    <p className="text-gray-400 text-xs mt-1">Manage where your smart carts will be delivered.</p>
                </div>
                {!isFormOpen && (
                    <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 text-sm font-semibold">
                        <Plus size={16} /> Add New
                    </button>
                )}
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}

            {isFormOpen ? (
                <div className="p-6 rounded-xl bg-black/40 border border-white/10 relative">
                    <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                    <h3 className="text-white font-semibold mb-4">{editingId ? 'Edit Address' : 'Add New Address'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Address Type</label>
                                <select value={formData.addressType} onChange={e => setFormData({...formData, addressType: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm bg-black/50 text-white border border-white/10">
                                    <option value="Home">Home</option>
                                    <option value="Office">Office</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                    <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="w-4 h-4 rounded bg-black/50 border border-white/20 accent-primary" />
                                    Make Default Delivery Address
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Street Line 1 *</label>
                            <input required value={formData.streetLine1} onChange={e => setFormData({...formData, streetLine1: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm" placeholder="123 Smart Ave" />
                        </div>
                        
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Street Line 2 (Optional)</label>
                            <input value={formData.streetLine2} onChange={e => setFormData({...formData, streetLine2: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm" placeholder="Apt, Suite, Building" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">City *</label>
                                <input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Postal Code *</label>
                                <input required value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Country</label>
                                <input required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="glass-input w-full py-2.5 px-3 rounded-lg text-sm" />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-lg text-sm bg-primary text-black font-semibold shadow-glow hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center gap-2">
                                {isSaving && <Loader2 size={16} className="animate-spin" />} {editingId ? 'Update' : 'Save'} Address
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.length === 0 ? (
                        <p className="text-gray-500 text-sm col-span-2 text-center py-6 border border-dashed border-white/10 rounded-xl">No addresses found. Add one to complete your profile.</p>
                    ) : (
                        addresses.map((addr) => (
                            <div key={addr.id} className={`p-5 rounded-xl border ${addr.isDefault ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-black/40'} relative group transition-all hover:bg-white/5`}>
                                {addr.isDefault && (
                                    <div className="absolute -top-3 -right-2 bg-primary text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-glow flex items-center gap-1">
                                        <CheckCircle size={10} /> DEFAULT
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <div className={`mt-1 p-3 rounded-full h-fit ${addr.isDefault ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'}`}>
                                        {getIcon(addr.addressType)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold text-sm mb-1">{addr.addressType}</h3>
                                        <p className="text-gray-400 text-sm leading-snug">
                                            {addr.streetLine1}<br/>
                                            {addr.streetLine2 && <>{addr.streetLine2}<br/></>}
                                            {addr.city}, {addr.postalCode}<br/>
                                            {addr.country}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenEdit(addr)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => setDeleteId(addr.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* DELETE ADDRESS MODAL */}
            <AnimatePresence>
                {deleteId && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative">
                            <button onClick={() => setDeleteId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                            <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mb-6"><AlertCircle size={32} /></div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Address?</h3>
                            <p className="text-gray-400 text-sm mb-8">Are you sure you want to delete this address? This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors">Yes, Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}