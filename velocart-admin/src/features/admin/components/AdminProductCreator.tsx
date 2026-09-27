import React,{ useState,useEffect } from 'react';
import { motion,AnimatePresence } from 'framer-motion';
import { Package,Image as ImageIcon,Plus,Trash2,Save,Tag,Box,ArrowLeft,Loader2,UploadCloud,X,CheckCircle2,AlertCircle,Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL='http://localhost:5176/api';
const getAuthHeaders=() => ({ headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });

export default function AdminProductCreator() {
    const navigate=useNavigate();
    const [isLoading,setIsLoading]=useState(false);
    
    // Toast State
    const [toast,setToast]=useState<{message: string,type: 'success' | 'error'} | null>(null);

    // NEW: Category Modal States
    const [isCategoryModalOpen,setIsCategoryModalOpen]=useState(false);
    const [isCreatingCategory,setIsCreatingCategory]=useState(false);
    const [newCategory,setNewCategory]=useState({ name: '',description: '' });

    const [categories,setCategories]=useState<any[]>([]);
    const [product,setProduct]=useState({ name: '',brand: '',description: '',categoryId: '' });
    const [variants,setVariants]=useState<any[]>([{ sku: '',weightOrSize: '',price: '',stockQuantity: '' }]);
    const [images,setImages]=useState<File[]>([]);

    useEffect(() => {
        axios.get(`${API_URL}/catalog/categories`).then(res => {
            setCategories(res.data);
            if(res.data.length > 0) setProduct(prev => ({ ...prev,categoryId: res.data[0].id }));
        });
    },[]);

    const showToast=(message: string,type: 'success' | 'error') => {
        setToast({ message,type });
        setTimeout(() => setToast(null),4000);
    };

    // NEW: Handle Dynamic Category Creation
    const handleCreateCategory=async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingCategory(true);
        try {
            const res=await axios.post(`${API_URL}/admin/products/categories`,newCategory,getAuthHeaders());
            const createdCat=res.data;
            
            setCategories([...categories,createdCat]); // Update dropdown instantly
            setProduct({ ...product,categoryId: createdCat.id }); // Auto-select new category
            
            showToast(`Category "${createdCat.name}" added to taxonomy!`,'success');
            setIsCategoryModalOpen(false);
            setNewCategory({ name: '',description: '' });
        } catch (err: any) {
            showToast(err.response?.data?.message || "Failed to create category.",'error');
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const handleAddVariant=() => setVariants([...variants,{ sku: '',weightOrSize: '',price: '',stockQuantity: '' }]);
    const handleRemoveVariant=(index: number) => { if(variants.length > 1) setVariants(variants.filter((_,i) => i !== index)); };
    const handleVariantChange=(index: number,field: string,value: any) => {
        const newVariants=[...variants];
        newVariants[index]={ ...newVariants[index],[field]: value };
        setVariants(newVariants);
    };

    const handleImageChange=(e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files) {
            const selected=Array.from(e.target.files);
            if(images.length + selected.length > 5) return showToast('Maximum 5 images allowed.','error');
            setImages([...images,...selected]);
        }
    };

    const handleSubmit=async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const createRes=await axios.post(`${API_URL}/admin/products`,{ ...product,categoryId: parseInt(product.categoryId as string),variants },getAuthHeaders());
            const newProductId=createRes.data.productId;
            if(images.length > 0) {
                const formData=new FormData();
                images.forEach(img => formData.append('images',img));
                await axios.post(`${API_URL}/admin/products/${newProductId}/images`,formData,{ headers: { ...getAuthHeaders().headers,'Content-Type': 'multipart/form-data' } });
            }
            showToast('Product successfully published to the catalog!','success');
            setProduct({ name: '',brand: '',description: '',categoryId: categories[0]?.id || '' });
            setVariants([{ sku: '',weightOrSize: '',price: '',stockQuantity: '' }]);
            setImages([]);
        } catch (err: any) {
            showToast(err.response?.data?.message || "Failed to create product.",'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex">
            
            {/* Custom Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0,y: -50 }} animate={{ opacity: 1,y: 0 }} exit={{ opacity: 0,y: -50 }} className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NEW: Category Creation Modal */}
            <AnimatePresence>
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCategoryModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9,opacity: 0 }} animate={{ scale: 1,opacity: 1 }} exit={{ scale: 0.9,opacity: 0 }} className="relative bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">New Category</h2>
                                    <p className="text-sm text-gray-500 mt-1">Expand your storefront taxonomy.</p>
                                </div>
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><X size={20}/></button>
                            </div>
                            
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Category Name</label>
                                    <input required type="text" value={newCategory.name} onChange={(e) => setNewCategory({...newCategory,name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" placeholder="e.g. Snacks & Biscuits" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <textarea value={newCategory.description} onChange={(e) => setNewCategory({...newCategory,description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl h-24 resize-none focus:ring-2 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" placeholder="Short internal description..." />
                                </div>
                                <button type="submit" disabled={isCreatingCategory} className="w-full py-3 bg-[#050505] text-[#D4AF37] font-bold rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4">
                                    {isCreatingCategory ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Create Category
                                </button>
                            </form>
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
                    <button onClick={() => navigate('/admin/catalog')} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all"><Box size={18} /> Catalog Manager</button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 text-[#D4AF37] rounded-xl font-bold transition-all"><Plus size={18} /> New Product</button>
                    <button onClick={() => navigate('/catalog')} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all mt-8 border border-white/10"><Store size={18} /> Storefront View</button>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => navigate('/admin/catalog')} className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-gray-600"><ArrowLeft size={20} /></button>
                        <div><h1 className="text-3xl font-bold text-gray-900">Product Creator</h1><p className="text-gray-500 text-sm mt-1">Deploy new inventory to the global catalog.</p></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4"><Tag size={18} className="text-[#D4AF37]" /> Core Identity</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Product Name</label>
                                    <input required type="text" value={product.name} onChange={(e) => setProduct({...product,name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" />
                                </div>
                                <div>
                                    {/* NEW: Category Label + Add Button */}
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="block text-sm font-bold text-gray-700">Category</label>
                                        <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="text-xs font-bold text-[#D4AF37] hover:text-yellow-600 transition-colors flex items-center gap-1">
                                            <Plus size={12} strokeWidth={3} /> Add New
                                        </button>
                                    </div>
                                    <select required value={product.categoryId} onChange={(e) => setProduct({...product,categoryId: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37] outline-none cursor-pointer text-gray-900 placeholder:text-gray-400">
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        {categories.length === 0 && <option value="" disabled>No categories available...</option>}
                                    </select>
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Brand</label>
                                <input required type="text" value={product.brand} onChange={(e) => setProduct({...product,brand: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Detailed Description</label>
                                <textarea required value={product.description} onChange={(e) => setProduct({...product,description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl h-32 resize-none focus:ring-2 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" />
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4"><ImageIcon size={18} className="text-[#D4AF37]" /> Media Assets (Max 5)</h2>
                            <div className="flex flex-wrap gap-4 mb-4">
                                {images.map((img,i) => (
                                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                        <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setImages(images.filter((_,idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-md hover:bg-red-500"><X size={14}/></button>
                                    </div>
                                ))}
                                {images.length < 5 && (
                                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37] cursor-pointer bg-gray-50">
                                        <UploadCloud size={24} /><span className="text-xs font-bold mt-1">Upload</span>
                                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Box size={18} className="text-[#D4AF37]" /> Variants & Inventory</h2>
                                <button type="button" onClick={handleAddVariant} className="text-sm font-bold text-[#D4AF37] bg-yellow-50 px-3 py-1.5 rounded-lg hover:bg-yellow-100 flex items-center gap-1"><Plus size={14}/> Add Variant</button>
                            </div>
                            <div className="space-y-4">
                                <AnimatePresence>
                                    {variants.map((v,index) => (
                                        <motion.div initial={{ opacity: 0,height: 0 }} animate={{ opacity: 1,height: 'auto' }} exit={{ opacity: 0,height: 0 }} key={index} className="grid grid-cols-12 gap-4 items-end bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                            <div className="col-span-3"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unique SKU</label><input required type="text" value={v.sku} onChange={(e) => handleVariantChange(index,'sku',e.target.value.toUpperCase())} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:ring-1 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" /></div>
                                            <div className="col-span-3"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Size / Type</label><input required type="text" value={v.weightOrSize} onChange={(e) => handleVariantChange(index,'weightOrSize',e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" /></div>
                                            <div className="col-span-3"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price (LKR)</label><input required type="number" min="1" step="0.01" value={v.price} onChange={(e) => handleVariantChange(index,'price',e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" /></div>
                                            <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Stock</label><input required type="number" min="0" value={v.stockQuantity} onChange={(e) => handleVariantChange(index,'stockQuantity',e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#D4AF37] outline-none text-gray-900 placeholder:text-gray-400" /></div>
                                            <div className="col-span-1 flex justify-center pb-2"><button type="button" onClick={() => handleRemoveVariant(index)} disabled={variants.length === 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={18} /></button></div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => navigate('/admin/catalog')} className="px-6 py-3 font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm">Cancel</button>
                            <button type="submit" disabled={isLoading} className="px-8 py-3 bg-[#050505] text-white font-bold rounded-xl shadow-lg hover:bg-black flex items-center gap-2 disabled:opacity-70">
                                {isLoading ? <Loader2 size={18} className="animate-spin text-[#D4AF37]" /> : <Save size={18} className="text-[#D4AF37]" />} Deploy Product
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}