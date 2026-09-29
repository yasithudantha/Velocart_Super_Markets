import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// MERGED: All icons are now in this single import line
import { Search, Package, Tag, X, SlidersHorizontal, ArrowUpDown, ShoppingBag, History, User, LogOut, Settings, Truck, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProducts, getCategories } from '../api/catalogApi';
import type { ProductFilters } from '../api/catalogApi';
import CartDrawer from './CartDrawer';
import { logoutUser } from '../../auth/api/authApi';
import StorefrontAssistant from './StorefrontAssistant';

// Interfaces
interface ProductVariant { 
    id: number; 
    sku: string; 
    weightOrSize: string; 
    originalPrice: number; 
    discountedPrice?: number;
    discountLabel?: string;
    stockQuantity: number; 
    isActive: boolean; 
}
interface ProductImage { id: number; imageUrl: string; isPrimary: boolean; }
interface Category { id: number; name: string; }
interface Product {
    id: number; name: string; brand: string; description: string; categoryName: string; isActive: boolean;
    variants: ProductVariant[]; images: ProductImage[];
}

export default function ProductCatalog() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Cart Drawer State
    const [isCartOpen, setIsCartOpen] = useState(false);
    
    // Core Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<ProductFilters>({
        categoryId: undefined,
        minPrice: '',
        maxPrice: '',
        brand: '',
        inStockOnly: false,
        sortBy: 'relevance'
    });
    
    // Debouncer states
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [debouncedFilters, setDebouncedFilters] = useState<ProductFilters>(filters);
    const [showAutocomplete, setShowAutocomplete] = useState(false);

    // Debounce the text inputs
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setDebouncedFilters(filters);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, filters]);

    // Fetch data when debounced states change
    useEffect(() => {
        loadData();
    }, [debouncedSearch, debouncedFilters]);

    const loadData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [fetchedProducts, fetchedCategories] = await Promise.all([
                getProducts({ ...debouncedFilters, search: debouncedSearch }),
                getCategories()
            ]);
            setProducts(fetchedProducts);
            setCategories(fetchedCategories);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = (key: keyof ProductFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="min-h-screen bg-[#0B1F33] p-8 text-white relative" onClick={() => setShowAutocomplete(false)}>
            
            {/* Header with Cart, History, and Profile Buttons */}
            <div className="mb-8 flex justify-between items-start relative z-50">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-wide flex items-center gap-3">
                        <Package className="text-[#D4AF37]" size={36} /> Product Catalog
                    </h1>
                    <p className="text-gray-400 mt-2">Advanced search, filtering, and inventory browsing.</p>
                </div>

                {/* NEW: Action Buttons with Profile Dropdown */}
                <div className="flex gap-4 items-center">
                    
                    {/* User Profile Dropdown */}
                    <div className="relative group">
                        <button className="bg-[#121212] border border-white/10 hover:bg-white/5 p-4 rounded-2xl transition-all duration-300 flex items-center gap-2">
                            <User className="text-gray-300 group-hover:text-[#D4AF37] transition-colors" size={24} />
                        </button>
                        
                        {/* Dropdown Menu (Appears on Hover) */}
                        <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                            <div className="p-4 border-b border-white/5">
                                <p className="text-sm font-bold text-white truncate">{JSON.parse(localStorage.getItem('user') || '{}').fullName || 'Customer'}</p>
                                <p className="text-xs text-gray-500 truncate">{JSON.parse(localStorage.getItem('user') || '{}').email || ''}</p>
                            </div>
                            <div className="p-2">
                                {/* DYNAMIC ROLE CHECKING */}
                                {(() => {
                                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                                    const userRole = String(user.role).toUpperCase();

                                    return (
                                        <>
                                            {/* INVENTORY & PO MANAGER: Only Admin and Product Manager */}
                                            {(userRole === 'ADMIN' || userRole === 'PRODUCTMANAGER') && (
                                                <>
                                                    <button onClick={() => navigate('/admin/inventory')} className="w-full text-left px-4 py-2.5 text-sm text-[#D4AF37] hover:text-black hover:bg-[#D4AF37] rounded-xl transition-colors flex items-center gap-3 font-bold">
                                                        <LayoutDashboard size={16} /> Inventory Hub
                                                    </button>
                                                    <button onClick={() => navigate('/admin/purchase-orders')} className="w-full text-left px-4 py-2.5 text-sm text-[#D4AF37] hover:text-black hover:bg-[#D4AF37] rounded-xl transition-colors flex items-center gap-3 font-bold mb-1">
                                                        <Truck size={16} /> PO Manager
                                                    </button>
                                                </>
                                            )}

                                            {/* DELIVERY MANAGER: STRICTLY ONLY for the Delivery Manager Role */}
                                            {userRole === 'DELIVERYMANAGER' && (
                                                <button onClick={() => navigate('/admin/delivery-management')} className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:text-white hover:bg-blue-500 rounded-xl transition-colors flex items-center gap-3 font-bold mb-1">
                                                    <Truck size={16} /> Delivery Manager
                                                </button>
                                            )}

                                            {/* Add a divider if the user is ANY kind of staff member */}
                                            {(userRole === 'ADMIN' || userRole === 'PRODUCTMANAGER' || userRole === 'DELIVERYMANAGER') && (
                                                <div className="border-t border-white/5 my-1"></div>
                                            )}
                                        </>
                                    );
                                })()}

                                {/* STANDARD CUSTOMER LINKS (Visible to everyone) */}
                                <button onClick={() => navigate('/profile')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3">
                                    <Settings size={16} /> Account Settings
                                </button>
                                <button onClick={() => navigate('/orders')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 lg:hidden">
                                    <History size={16} /> Order History
                                </button>
                            </div>
                            <div className="p-2 border-t border-white/5">
                                <button onClick={async () => {
                                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                                    if(user.id) {
                                        await logoutUser(user.id);
                                    } else {
                                        localStorage.clear();
                                    }
                                    navigate('/login');
                                }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-3">
                                    <LogOut size={16} /> Secure Logout
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => navigate('/orders')}
                        className="hidden lg:flex bg-[#121212] border border-white/10 hover:bg-white/5 p-4 rounded-2xl transition-all duration-300 items-center gap-2 group"
                        title="Order History"
                    >
                        <History className="text-gray-300 group-hover:text-white transition-colors" size={24} />
                    </button>
                    
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="bg-[#121212] border border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 p-4 rounded-2xl transition-all duration-300 group"
                    >
                        <ShoppingBag className="text-[#D4AF37] group-hover:scale-110 transition-transform" size={28} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* LEFT SIDEBAR: Advanced Filters */}
                <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-[#121212]">
                        <div className="flex items-center gap-2 font-bold text-lg mb-6 text-[#D4AF37]">
                            <SlidersHorizontal size={20} /> Filters
                        </div>

                        {/* Category Filter */}
                        <div className="mb-6">
                            <label className="text-sm text-gray-400 mb-2 block font-semibold">Category</label>
                            <select 
                                value={filters.categoryId || ''}
                                onChange={(e) => handleFilterChange('categoryId', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer appearance-none"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Brand Filter */}
                        <div className="mb-6">
                            <label className="text-sm text-gray-400 mb-2 block font-semibold">Brand</label>
                            <input 
                                type="text"
                                placeholder="e.g. Nestlé, CIC"
                                value={filters.brand || ''}
                                onChange={(e) => handleFilterChange('brand', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-[#D4AF37] transition-colors"
                            />
                        </div>

                       {/* Price Range Filter */}
                        <div className="mb-6">
                            <label className="text-sm text-gray-400 mb-2 block font-semibold">Price Range (Rs.)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    placeholder="Min" 
                                    min="0"
                                    value={filters.minPrice}
                                    onKeyDown={(e) => { 
                                        if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); 
                                    }}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (Number(val) >= 0 || val === '') handleFilterChange('minPrice', val);
                                    }}
                                    className={`w-1/2 bg-black/50 border rounded-xl py-2 px-3 focus:outline-none transition-colors ${
                                        filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice) 
                                        ? 'border-red-500 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                                        : 'border-white/10 focus:border-[#D4AF37]'
                                    }`}
                                />
                                <span className="text-gray-500">-</span>
                                <input 
                                    type="number" 
                                    placeholder="Max" 
                                    min="0"
                                    value={filters.maxPrice}
                                    onKeyDown={(e) => { 
                                        if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); 
                                    }}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (Number(val) >= 0 || val === '') handleFilterChange('maxPrice', val);
                                    }}
                                    className={`w-1/2 bg-black/50 border rounded-xl py-2 px-3 focus:outline-none transition-colors ${
                                        filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice) 
                                        ? 'border-red-500 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                                        : 'border-white/10 focus:border-[#D4AF37]'
                                    }`}
                                />
                            </div>
                            
                            {/* Strict Validation Error Message */}
                            {filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice) && (
                                <p className="text-red-400 text-xs mt-2 font-semibold animate-pulse">
                                    Min price cannot exceed Max price.
                                </p>
                            )}
                        </div>

                        {/* Availability Filter */}
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input 
                                    type="checkbox"
                                    checked={filters.inStockOnly}
                                    onChange={(e) => handleFilterChange('inStockOnly', e.target.checked)}
                                    className="w-5 h-5 rounded bg-black/50 border border-white/20 accent-[#D4AF37]"
                                />
                                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">In Stock Only</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Search, Sort, and Grid */}
                <div className="flex-grow flex flex-col">
                    
                    {/* Top Bar: Search and Sort */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 z-40">
                        {/* Autocomplete Search */}
                        <div className="relative flex-grow" onClick={(e) => e.stopPropagation()}>
                            <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="text" value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setShowAutocomplete(true); }}
                                onFocus={() => setShowAutocomplete(true)}
                                placeholder="Search by name, brand, or SKU..." 
                                className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-10 focus:outline-none focus:border-[#D4AF37] transition-colors"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-4 top-3.5 text-gray-500 hover:text-white">
                                    <X size={18} />
                                </button>
                            )}

                            {/* Autocomplete Dropdown */}
                            <AnimatePresence>
                                {showAutocomplete && searchTerm && products.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden max-h-64 overflow-y-auto z-50"
                                    >
                                        {products.slice(0, 5).map(prod => (
                                            <div 
                                                key={prod.id} onClick={() => { navigate(`/product/${prod.id}`); setShowAutocomplete(false); }}
                                                className="px-5 py-3 hover:bg-white/5 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0"
                                            >
                                                <div>
                                                    <div className="font-semibold text-white">{prod.name}</div>
                                                    <div className="text-xs text-gray-400">{prod.brand} • {prod.categoryName}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sorting */}
                        <div className="relative w-full sm:w-56">
                            <ArrowUpDown className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <select 
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                className="w-full appearance-none bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-10 focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer"
                            >
                                <option value="relevance">Sort by: Relevance</option>
                                <option value="newest">Sort by: Newest</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Error & Loading States */}
                    {error && <div className="p-4 mb-8 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400">{error}</div>}
                    
                    {isLoading ? (
                        <div className="flex-grow flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
                        </div>
                    ) : (
                        /* Product Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
                            {products.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                                    No products match your exact filters. Try adjusting your price range or brand.
                                </div>
                            ) : (
                                products.map((product) => {
                                    const primaryImage = product.images.find(img => img.isPrimary)?.imageUrl || product.images[0]?.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image';
                                    const startingPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.discountedPrice ?? v.originalPrice)) : 0;

                                    const cheapestVariant = product.variants.find(v => (v.discountedPrice ?? v.originalPrice) === startingPrice);
                                    const hasDiscount = cheapestVariant?.discountedPrice != null;
                                    const totalStock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);

                                    return (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={product.id} 
                                            onClick={() => navigate(`/product/${product.id}`)}
                                            className={`bg-[#121212] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 group cursor-pointer flex flex-col h-full ${totalStock === 0 ? 'opacity-70 grayscale-[0.5]' : 'hover:border-[#D4AF37]/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]'}`}
                                        >
                                            <div className="relative h-56 overflow-hidden bg-black/50 flex-shrink-0">
                                                <img src={primaryImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                                                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/10 z-10">{product.categoryName}</div>
                                                {totalStock === 0 && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20"><span className="text-red-400 font-bold tracking-widest uppercase border-2 border-red-500/50 px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md">Out of Stock</span></div>}
                                                {totalStock > 0 && totalStock <= 10 && <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-red-400 text-white animate-pulse z-10 shadow-[0_0_10px_rgba(239,68,68,0.5)]">Only {totalStock} left!</div>}
                                            </div>
                                            <div className="p-5 flex flex-col flex-grow relative">
                                                <div className="text-xs text-[#D4AF37] font-bold tracking-widest uppercase mb-1">{product.brand}</div>
                                                <h3 className="text-lg font-bold mb-2 text-white truncate">{product.name}</h3>
                                                <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">{product.description}</p>
                                                <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/5 gap-2">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Starting from</div>
                                                        {hasDiscount && (
                                                            <div className="text-xs text-gray-500 line-through">
                                                                Rs. {cheapestVariant?.originalPrice.toFixed(2)}
                                                            </div>
                                                        )}
                                                        <div className={`text-xl font-bold ${hasDiscount ? 'text-red-400' : 'text-white'}`}>
                                                            Rs. {startingPrice.toFixed(2)}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2">
                                                        {hasDiscount && cheapestVariant?.discountLabel && (
                                                            <div className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 font-bold px-2 py-0.5 rounded-md">
                                                                {cheapestVariant.discountLabel}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1 text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                                                            <Tag size={12} />
                                                            {product.variants.length} Variant{product.variants.length !== 1 && 's'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
                
            <StorefrontAssistant />

        </div>
    );
}