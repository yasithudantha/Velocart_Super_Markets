import { useEffect, useState } from 'react';
import { Package, Plus, Trash2, Edit, Box, Loader2, Search, X, CheckCircle2, AlertCircle, Save, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5176') + '/api';
const getAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });

export default function AdminCatalog() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [deleteModal, setDeleteModal] = useState<{id: number, name: string} | null>(null);
    const [editModal, setEditModal] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchProducts();
        axios.get(`${API_URL}/catalog/categories`).then(res => setCategories(res.data));
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/products`, getAuthHeaders());
            setProducts(res.data);
        } catch (err) {
            showToast("Failed to fetch products", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        try {
            await axios.delete(`${API_URL}/admin/products/${deleteModal.id}`, getAuthHeaders());
            setProducts(products.filter(p => p.id !== deleteModal.id));
            showToast(`Product "${deleteModal.name}" deleted permanently.`, 'success');
        } catch (err) {
            showToast("Failed to delete product.", 'error');
        } finally {
            setDeleteModal(null);
        }
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await axios.put(`${API_URL}/admin/products/${editModal.id}`, {
                name: editModal.name, 
                brand: editModal.brand, 
                description: editModal.description, 
                categoryId: editModal.categoryId, 
                isActive: editModal.isActive, 
                variants: editModal.variants
            }, getAuthHeaders());
            
            showToast("Product updated successfully!", 'success');
            setEditModal(null);
            fetchProducts(); 
        } catch (err: any) {
            showToast(err.response?.data?.message || "Failed to update product.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex">
            {/* Custom Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Modal */}
            <AnimatePresence>
                {deleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto"><AlertCircle size={32} className="text-red-500" /></div>
                            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Delete Product?</h2>
                            <p className="text-center text-gray-500 mb-8">This will permanently delete <strong>{deleteModal.name}</strong>, including all variants and images. This cannot be undone.</p>
                            <div className="flex gap-4">
                                <button onClick={() => setDeleteModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Yes, Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal (FIXED NULL BINDINGS) */}
            <AnimatePresence>
                {editModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative bg-[#F8F9FA] rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
                                <div><h2 className="text-2xl font-bold text-gray-900">Edit Product</h2><p className="text-gray-500 text-sm">Update "{editModal.name}"</p></div>
                                <button onClick={() => setEditModal(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <form id="editForm" onSubmit={handleEditSave} className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Product Name</label><input required type="text" value={editModal.name || ''} onChange={(e) => setEditModal({...editModal, name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-900 placeholder:text-gray-400" /></div>
                                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Brand</label><input required type="text" value={editModal.brand || ''} onChange={(e) => setEditModal({...editModal, brand: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-900 placeholder:text-gray-400" /></div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                            <select value={editModal.categoryId || ''} onChange={(e) => setEditModal({...editModal, categoryId: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-900 placeholder:text-gray-400">
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3 mt-6">
                                            <input type="checkbox" checked={editModal.isActive || false} onChange={(e) => setEditModal({...editModal, isActive: e.target.checked})} className="w-5 h-5 accent-[#D4AF37]" />
                                            <label className="font-bold text-gray-700">Product is Visible in Storefront</label>
                                        </div>
                                        <div className="col-span-2"><label className="block text-sm font-bold text-black-700 mb-1 text-gray-900">Description</label><textarea required value={editModal.description || ''} onChange={(e) => setEditModal({...editModal, description: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl h-24 outline-none text-gray-900 placeholder:text-gray-400" /></div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Variants (Prices & Stock)</h3>
                                        {editModal.variants.map((v:any, idx:number) => (
                                            <div key={idx} className="grid grid-cols-12 gap-3 mb-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400">
                                                <div className="col-span-3"><label className="block text-xs font-bold text-gray-500 mb-1">SKU</label><input disabled={v.id !== 0} type="text" value={v.sku || ''} onChange={(e) => {const nv = [...editModal.variants]; nv[idx].sku = e.target.value.toUpperCase(); setEditModal({...editModal, variants: nv});}} className="w-full px-2 py-1.5 border rounded-md text-sm outline-none disabled:opacity-50" /></div>
                                                <div className="col-span-3"><label className="block text-xs font-bold text-gray-500 mb-1">Size/Type</label><input type="text" value={v.weightOrSize || ''} onChange={(e) => {const nv = [...editModal.variants]; nv[idx].weightOrSize = e.target.value; setEditModal({...editModal, variants: nv});}} className="w-full px-2 py-1.5 border rounded-md text-sm outline-none" /></div>
                                                <div className="col-span-3"><label className="block text-xs font-bold text-gray-500 mb-1">Price</label><input type="number" value={v.price || ''} onChange={(e) => {const nv = [...editModal.variants]; nv[idx].price = e.target.value === '' ? '' : parseFloat(e.target.value); setEditModal({...editModal, variants: nv});}} className="w-full px-2 py-1.5 border rounded-md text-sm outline-none" /></div>
                                                <div className="col-span-3"><label className="block text-xs font-bold text-gray-500 mb-1">Stock</label><input type="number" value={v.stockQuantity || ''} onChange={(e) => {const nv = [...editModal.variants]; nv[idx].stockQuantity = e.target.value === '' ? '' : parseInt(e.target.value); setEditModal({...editModal, variants: nv});}} className="w-full px-2 py-1.5 border rounded-md text-sm outline-none" /></div>
                                            </div>
                                        ))}
                                    </div>
                                </form>
                            </div>
                            <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4">
                                <button onClick={() => setEditModal(null)} className="px-6 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                                <button type="submit" form="editForm" disabled={isSaving} className="px-8 py-3 bg-[#050505] text-[#D4AF37] font-bold rounded-xl hover:bg-black flex items-center gap-2 disabled:opacity-70">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="w-64 bg-[#050505] text-white p-6 hidden md:flex flex-col">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-8 h-8 bg-[#D4AF37] rounded-lg flex items-center justify-center"><Package size={18} className="text-black" /></div>
                    <span className="font-display font-bold text-xl tracking-wide">Workspace</span>
                </div>
                <div className="space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 text-[#D4AF37] rounded-xl font-bold transition-all"><Box size={18} /> Catalog Manager</button>
                    <button onClick={() => navigate('/admin/products/new')} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all"><Plus size={18} /> New Product</button>
                    <button onClick={() => navigate('/catalog')} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all mt-8 border border-white/10"><Store size={18} /> Storefront View</button>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div><h1 className="text-3xl font-bold text-gray-900">Catalog Manager</h1><p className="text-gray-500 text-sm mt-1">Manage, edit, and remove inventory.</p></div>
                        <button onClick={() => navigate('/admin/products/new')} className="px-6 py-3 bg-[#050505] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-black transition-all flex items-center gap-2"><Plus size={18} className="text-[#D4AF37]" /> Create Product</button>
                    </div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-3">
                        <Search size={20} className="text-gray-400" />
                        <input type="text" placeholder="Search by product name or brand..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full outline-none text-gray-700 bg-transparent" />
                    </div>

                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64"><Loader2 size={40} className="animate-spin text-[#D4AF37]" /></div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">No products found in the catalog.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                        <th className="p-4 font-bold">Product</th><th className="p-4 font-bold">Category</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((p) => (
                                        <tr key={p.id} className={`border-b border-gray-50 transition-colors ${!p.isActive ? 'bg-gray-50/50 grayscale-[0.5] opacity-70' : 'hover:bg-gray-50/50'}`}>
                                            <td className="p-4 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                                    {p.images && p.images.length > 0 ? <img src={p.images.find((i:any) => i.isPrimary)?.imageUrl || p.images[0].imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 text-gray-300" />}
                                                </div>
                                                <div><div className="font-bold text-gray-900">{p.name}</div><div className="text-xs text-gray-500 font-bold">{p.brand} • {p.variants?.length || 0} Variants</div></div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 font-medium">{p.categoryName}</td>
                                            <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                                            <td className="p-4">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditModal(p)} className="p-2 text-gray-400 hover:text-[#D4AF37] bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all"><Edit size={16} /></button>
                                                    <button onClick={() => setDeleteModal({id: p.id, name: p.name})} className="p-2 text-gray-400 hover:text-red-500 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}