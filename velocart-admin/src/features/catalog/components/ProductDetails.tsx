import React,{ useState,useEffect } from 'react';
import { useParams,useNavigate } from 'react-router-dom';
import { motion,AnimatePresence } from 'framer-motion';
import { ArrowLeft,ShoppingCart,AlertCircle,CheckCircle2,Minus,Plus,Loader2,Star,MessageSquare } from 'lucide-react';
import { getProductById,addToCart,getCart,getProductReviews } from '../api/catalogApi';

export default function ProductDetails() {
    const { id }=useParams();
    const navigate=useNavigate();
    
    const [product,setProduct]=useState<any>(null);
    const [selectedVariant,setSelectedVariant]=useState<any>(null);
    const [selectedImage,setSelectedImage]=useState<string>('');
    const [reviews,setReviews]=useState<any[]>([]); 
    const [isLoading,setIsLoading]=useState(true);
    const [error,setError]=useState('');

    // Cart States
    const [cart,setCart]=useState<any>(null);
    const [quantity,setQuantity]=useState(1);
    const [isAdding,setIsAdding]=useState(false);
    const [addSuccess,setAddSuccess]=useState(false);

    useEffect(() => {
        if(id) fetchData(Number(id));
    },[id]);

    const fetchData=async (productId: number) => {
        setIsLoading(true);
        try {
            // Fetch product,cart,AND reviews simultaneously for speed
            const [productData,cartData,reviewsData]=await Promise.all([
                getProductById(productId),
                getCart(),// Removed userId parameter
                getProductReviews(productId)
            ]);
            
            setProduct(productData);
            setCart(cartData);
            setReviews(reviewsData);
            
            if(productData.variants && productData.variants.length > 0) setSelectedVariant(productData.variants[0]);
            const primaryImg=productData.images.find((img: any) => img.isPrimary)?.imageUrl || productData.images[0]?.imageUrl;
            setSelectedImage(primaryImg || 'https://via.placeholder.com/600x600?text=No+Image');
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    const inCartQty=cart?.items?.find((i: any) => i.productVariantId === selectedVariant?.id)?.quantity || 0;
    const realAvailableStock=Math.max(0,(selectedVariant?.stockQuantity || 0) - inCartQty);

    useEffect(() => {
        setQuantity(realAvailableStock > 0 ? 1 : 0);
    },[selectedVariant,cart]);

    const handleQuantityChange=(newQty: number) => {
        if(!selectedVariant) return;
        if(newQty < 1) newQty=1;
        if(newQty > realAvailableStock) newQty=realAvailableStock; 
        setQuantity(newQty);
    };

    const handleAddToCart=async () => {
        if(!selectedVariant || quantity < 1 || quantity > realAvailableStock) return;
        
        setIsAdding(true);
        setError('');
        try {
            await addToCart(selectedVariant.id,quantity); // Removed userId parameter
            
            const updatedCart=await getCart(); // Removed userId parameter
            setCart(updatedCart);

            setAddSuccess(true);
            setTimeout(() => setAddSuccess(false),2000);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsAdding(false);
        }
    };

    if(isLoading) return <div className="min-h-screen bg-[#050505] flex justify-center items-center"><Loader2 className="animate-spin text-[#D4AF37]" size={48} /></div>;
    if(error && !product) return <div className="min-h-screen bg-[#050505] text-red-400 p-10">{error}</div>;

    const displayPrice=selectedVariant?.discountedPrice ?? selectedVariant?.originalPrice ?? 0;

    return (
        <div className="min-h-screen bg-[#0B1F33] text-white p-8">
            <button onClick={() => navigate('/catalog')} className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors mb-8">
                <ArrowLeft size={20} /> Back to Catalog
            </button>

            {/* PRODUCT HERO SECTION */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <motion.div initial={{ opacity: 0,scale: 0.95 }} animate={{ opacity: 1,scale: 1 }} className="bg-[#121212] rounded-3xl overflow-hidden border border-white/5 aspect-square flex items-center justify-center p-4">
                        <motion.img 
                            key={selectedImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                            src={selectedImage} alt={product.name} className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                        />
                    </motion.div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {product.images.map((img: any) => (
                            <button key={img.id} onClick={() => setSelectedImage(img.imageUrl)}
                                className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0 ${selectedImage === img.imageUrl ? 'border-[#D4AF37] scale-105 shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                                <img src={img.imageUrl} alt="thumbnail" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                <motion.div initial={{ x: 20,opacity: 0 }} animate={{ x: 0,opacity: 1 }} className="flex flex-col justify-center">
                    <div className="text-sm text-[#D4AF37] font-bold tracking-widest uppercase mb-2">{product.brand}</div>
                    <h1 className="text-4xl font-display font-bold mb-4 leading-tight">{product.name}</h1>
                    
                    <div className="inline-flex bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs text-gray-300 mb-6 backdrop-blur-md">
                        {product.categoryName}
                    </div>

                    <p className="text-gray-400 mb-8 leading-relaxed text-lg">{product.description}</p>

                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Select Variant</h3>
                        <div className="flex flex-wrap gap-3">
                            {product.variants.map((variant: any) => (
                                <button key={variant.id} onClick={() => setSelectedVariant(variant)}
                                    className={`px-6 py-3 rounded-2xl border transition-all duration-300 font-bold ${
                                        selectedVariant?.id === variant.id 
                                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-105' 
                                        : 'bg-[#121212] text-gray-400 border-white/10 hover:border-white/30 hover:bg-white/5'
                                    }`}>
                                    {variant.weightOrSize}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedVariant && (
                        <div className="bg-[#121212] border border-white/5 rounded-3xl p-8 mb-8 relative overflow-hidden shadow-2xl">
                            {selectedVariant.discountLabel && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white px-6 py-2 rounded-bl-2xl font-bold text-sm tracking-wider shadow-lg">
                                    {selectedVariant.discountLabel}
                                </div>
                            )}

                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <div className="text-sm text-gray-500 mb-2 font-medium">Price</div>
                                    <div className="text-4xl font-bold text-white flex items-end gap-3 font-display">
                                        {selectedVariant.discountedPrice && (
                                            <span className="text-xl text-gray-500 line-through mb-1">Rs. {selectedVariant.originalPrice.toFixed(2)}</span>
                                        )}
                                        <span className={selectedVariant.discountedPrice ? "text-red-400" : "text-[#D4AF37]"}>
                                            Rs. {displayPrice.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500 mb-1">Stock Status</div>
                                    {realAvailableStock > 10 ? (
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1.5 text-green-400 font-semibold bg-green-400/10 px-3 py-1 rounded-lg"><CheckCircle2 size={16} /> In Stock</div>
                                            {inCartQty > 0 && <span className="text-xs text-gray-400 mt-1">({inCartQty} in cart)</span>}
                                        </div>
                                    ) : realAvailableStock > 0 ? (
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1.5 text-yellow-400 font-semibold bg-yellow-400/10 px-3 py-1 rounded-lg animate-pulse"><AlertCircle size={16} /> Only {realAvailableStock} left</div>
                                            {inCartQty > 0 && <span className="text-xs text-gray-400 mt-1">({inCartQty} in cart)</span>}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-red-400 font-semibold bg-red-400/10 px-3 py-1 rounded-lg">
                                            <AlertCircle size={16} /> {inCartQty > 0 ? `Max stock in cart (${inCartQty})` : 'Out of Stock'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                                <div className="flex-1 flex items-center bg-black/50 border border-white/10 rounded-2xl p-1">
                                    <button 
                                        onClick={() => handleQuantityChange(quantity - 1)}
                                        disabled={quantity <= 1 || realAvailableStock === 0}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#1A1A1A] hover:bg-[#2A2A2A] disabled:opacity-50 transition-colors"
                                    ><Minus size={18} /></button>
                                    
                                    <div className="flex-1 text-center font-bold text-xl">{quantity}</div>
                                    
                                    <button 
                                        onClick={() => handleQuantityChange(quantity + 1)}
                                        disabled={quantity >= realAvailableStock || realAvailableStock === 0}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#1A1A1A] hover:bg-[#2A2A2A] disabled:opacity-50 transition-colors"
                                    ><Plus size={18} /></button>
                                </div>

                                <motion.button 
                                    whileTap={{ scale: 0.95 }}
                                    disabled={!selectedVariant || realAvailableStock === 0 || quantity < 1 || isAdding || addSuccess}
                                    onClick={handleAddToCart}
                                    className={`flex-[2] h-14 font-bold text-lg rounded-2xl flex justify-center items-center gap-3 transition-all duration-300 shadow-xl ${
                                        addSuccess 
                                        ? 'bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.4)]' 
                                        : (!selectedVariant || realAvailableStock === 0)
                                            ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10'
                                            : 'bg-[#D4AF37] text-black hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]'
                                    }`}
                                >
                                    <AnimatePresence mode="wait">
                                        {isAdding ? (
                                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <Loader2 className="animate-spin" size={24} />
                                            </motion.div>
                                        ) : addSuccess ? (
                                            <motion.div key="success" initial={{ opacity: 0,scale: 0.5 }} animate={{ opacity: 1,scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                                <CheckCircle2 size={24} /> Added!
                                            </motion.div>
                                        ) : (
                                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                                <ShoppingCart size={24} />
                                                {realAvailableStock === 0 
                                                    ? (inCartQty > 0 ? 'Limit Reached' : 'Out of Stock') 
                                                    : `Add ${quantity} to Cart`}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* REVIEWS SECTION */}
            <div className="max-w-6xl mx-auto mt-24 pt-16 border-t border-white/5">
                <div className="flex items-center gap-3 mb-10">
                    <MessageSquare className="text-[#D4AF37]" size={32} />
                    <h2 className="text-3xl font-display font-bold text-white">Customer Reviews</h2>
                </div>

                {reviews.length === 0 ? (
                    <div className="text-center py-16 bg-[#121212] border border-white/5 rounded-3xl">
                        <MessageSquare size={48} className="mx-auto text-gray-600 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No reviews yet</h3>
                        <p className="text-gray-400">Be the first to review this product after purchase!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reviews.map((review: any) => (
                            <motion.div 
                                initial={{ opacity: 0,y: 20 }} animate={{ opacity: 1,y: 0 }}
                                key={review.id} 
                                className="bg-[#121212] p-6 rounded-3xl border border-white/5 relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-white font-bold text-lg mb-1">{review.userName}</div>
                                        {review.isVerifiedPurchase && (
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                                <div className="flex items-center gap-1.5 text-[#D4AF37]">
                                                    <CheckCircle2 size={14} /> Verified Buyer
                                                </div>
                                                {/* Dynamic Order Reference */}
                                                {review.orderReference && (
                                                    <>
                                                        <span className="text-white/20">|</span>
                                                        <span className="text-gray-500 normal-case">Order: {review.orderReference}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex text-[#D4AF37]">
                                        {[...Array(5)].map((_,i) => (
                                            <Star key={i} size={16} fill={i < review.rating ? 'currentColor' : 'none'} className={i >= review.rating ? 'text-gray-600' : ''} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-gray-300 leading-relaxed">{review.comment || "No comment provided."}</p>
                                <div className="mt-4 text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}