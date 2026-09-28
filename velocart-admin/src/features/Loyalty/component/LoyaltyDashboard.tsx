import { useEffect,useState } from 'react';
import { Loader2,Award,Star,TrendingUp,CreditCard,Info,History } from 'lucide-react';
import { getLoyaltyDashboard,type LoyaltyDashboardData } from '../api/loyaltyApi';
import { getOrderHistory } from '../../catalog/api/catalogApi';

const getAuthToken=() => localStorage.getItem('velocart_token') || localStorage.getItem('token') || '';

export default function LoyaltyDashboard() {
    const [dashboardData,setDashboardData]=useState<LoyaltyDashboardData | null>(null);
    const [loyaltyOrders,setLoyaltyOrders]=useState<any[]>([]);
    const [loading,setLoading]=useState<boolean>(true);
    const [error,setError]=useState<string>('');

    useEffect(() => {
        const fetchAllData=async () => {
            try {
                const token=getAuthToken();
                // Fetch both dashboard and historical order data simultaneously
                const [dashData,orderData]=await Promise.all([
                    getLoyaltyDashboard(token),
                    getOrderHistory()
                ]);
                
                setDashboardData(dashData);
                // SRS 6.8: Filter to show ONLY orders where loyalty points were used
                setLoyaltyOrders(orderData.filter((o: any) => o.loyaltyPointsUsed > 0));
            } catch (err: any) {
                setError('Could not load your loyalty information. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    },[]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-400 text-sm animate-pulse">Loading VelocityFamily Data...</p>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">{error}</div>;
    }

    if (!dashboardData) return null;

    const getCardStyles=(tier: string) => {
        switch (tier.toLowerCase()) {
            case 'gold': return 'bg-gradient-to-br from-[#D4AF37] via-[#AA7C11] to-[#5c430a] border-[#D4AF37]/50 text-white shadow-[0_0_30px_rgba(212,175,55,0.2)]';
            case 'platinum': return 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-800 border-gray-400/50 text-gray-900 shadow-[0_0_30px_rgba(255,255,255,0.1)]';
            default: return 'bg-gradient-to-br from-gray-700 via-gray-800 to-black border-gray-500/30 text-gray-200 shadow-[0_0_30px_rgba(0,0,0,0.5)]';
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            
            {/* SECTION 1: VelocityFamily Digital Card (SRS 6.1.1) */}
            <div className={`relative p-8 rounded-2xl border overflow-hidden ${getCardStyles(dashboardData.currentTier)} transition-transform hover:scale-[1.02] duration-300 ease-out`}>
                <div className="absolute top-0 right-0 p-6 opacity-20">
                    <svg className="w-32 h-32 transform translate-x-4 -translate-y-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/5 to-transparent z-0 pointer-events-none"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] opacity-80 mb-1 flex items-center gap-2"><Award size={14} /> VelocityFamily</p>
                        <h2 className="text-4xl font-black tracking-wide drop-shadow-md">{dashboardData.currentTier}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase opacity-80 mb-1">Status</p>
                        <p className="font-bold tracking-widest text-sm bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">{dashboardData.status}</p>
                    </div>
                </div>

                <div className="relative z-10 mt-12 mb-6">
                    <p className="text-2xl md:text-3xl tracking-[0.25em] font-mono drop-shadow-sm flex items-center gap-4">
                        <CreditCard size={28} className="opacity-70" />
                        {dashboardData.loyaltyIdNumber.match(/.{1,4}/g)?.join(' ') || dashboardData.loyaltyIdNumber}
                    </p>
                </div>

                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Cardholder</p>
                        <p className="text-lg font-semibold tracking-wider uppercase">{dashboardData.customerName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Valid Thru</p>
                        <p className="text-lg font-semibold tracking-wider font-mono">
                            {new Date(dashboardData.expiryDate).toLocaleDateString('en-US',{ month: '2-digit',year: '2-digit' })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SECTION 2: Points Summary (SRS 6.1.2) */}
                <div className="bg-black/40 border border-white/5 p-6 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-primary/10"></div>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Star className="text-primary" size={20} /> Points Summary</h3>
                    
                    <div className="flex justify-between items-end mb-6 bg-black/20 p-4 rounded-lg border border-white/5">
                        <span className="text-gray-400 text-sm uppercase tracking-wider">Available Balance</span>
                        <span className="text-4xl font-black text-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">{dashboardData.currentPointsBalance.toLocaleString()}</span>
                    </div>
                    
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between border-b border-white/10 pb-3"><span className="text-gray-400">Lifetime Earned</span><span className="font-semibold text-white">{dashboardData.totalPointsEarned.toLocaleString()}</span></div>
                        <div className="flex justify-between border-b border-white/10 pb-3"><span className="text-gray-400">Lifetime Redeemed</span><span className="font-semibold text-white">{dashboardData.totalPointsRedeemed.toLocaleString()}</span></div>
                        <div className="flex justify-between pt-1"><span className="text-gray-400">Total Eligible Spend</span><span className="font-semibold text-primary">Rs. {dashboardData.totalEligibleSpend.toLocaleString(undefined,{ minimumFractionDigits: 2 })}</span></div>
                    </div>
                </div>

                {/* SECTION 3: Tier Progress (SRS 6.1.11) */}
                <div className="bg-black/40 border border-white/5 p-6 rounded-xl relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -ml-10 -mb-10 transition-all group-hover:bg-blue-500/10"></div>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><TrendingUp className="text-blue-400" size={20} /> Tier Progress</h3>
                    
                    {dashboardData.nextTier !== "Maximum Tier Reached" ? (
                        <div className="flex flex-col h-full justify-center pb-4">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-3">
                                <span className="text-gray-300">{dashboardData.currentTier}</span>
                                <span className="text-primary">{dashboardData.nextTier}</span>
                            </div>
                            <div className="w-full bg-black/50 rounded-full h-3 mb-6 overflow-hidden border border-white/5 shadow-inner">
                                <div className="bg-gradient-to-r from-blue-600 to-primary h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(212,175,55,0.5)]" style={{ width: `${dashboardData.progressPercentage}%` }}></div>
                            </div>
                            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm">
                                <p className="text-sm text-gray-300">Earn <span className="font-bold text-primary text-lg mx-1">{dashboardData.pointsRequiredForNextTier.toLocaleString()}</span> more points to unlock <strong className="text-white">{dashboardData.nextTier}</strong> status!</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[200px] bg-white/5 rounded-lg border border-white/5">
                            <span className="text-5xl mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">👑</span>
                            <p className="text-center font-bold text-primary text-lg">Maximum Tier Reached!</p>
                            <p className="text-center text-sm text-gray-400 mt-2 px-6">You are enjoying the highest level of VelocityFamily benefits.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 4: Loyalty-Paid Orders (SRS 6.8) */}
            <div className="bg-black/40 border border-white/5 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><History className="text-[#D4AF37]" size={20} /> Loyalty-Paid Orders</h3>
                {loyaltyOrders.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                        You have not used loyalty points for any purchases yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {loyaltyOrders.map((order,idx) => (
                            <div key={idx} className="bg-black/50 p-4 rounded-xl border border-white/5 flex flex-wrap justify-between items-center gap-4 hover:border-white/20 transition-colors">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{new Date(order.orderDate).toLocaleDateString()}</p>
                                    <p className="text-white font-bold">{order.orderNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-red-400 mb-1">-{order.loyaltyPointsUsed} Points</p>
                                    <p className="text-xs text-gray-400">Saved Rs. {order.loyaltyDiscountAmount.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 5: Rules & Regulations (SRS 6.17) */}
            <div className="bg-[#121212] border border-white/5 p-6 rounded-xl mt-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Info className="text-blue-400" size={20} /> Program Rules & Regulations</h3>
                <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
                    <p><strong>1. Earning Points:</strong> You earn 1 point for every Rs. 100 spent on eligible products. Promotional multipliers may apply.</p>
                    <p><strong>2. Point Redemption:</strong> Points can be applied at checkout. Silver (Max 5% discount),Gold (Max 10% discount),Platinum (Max 5% discount,unrestricted points cap). 1 Point=Rs. 1.00.</p>
                    <p><strong>3. Expiration:</strong> Points expire strictly 365 days from the date they were earned. Use them before you lose them!</p>
                    <p><strong>4. Tier Evaluation:</strong> Your account tier is re-evaluated annually on the anniversary of your account creation based on total points earned during that year.</p>
                    <p><strong>5. Reversals:</strong> If an order is cancelled,any loyalty points consumed during that transaction will be automatically restored to your available balance.</p>
                </div>
            </div>

        </div>
    );
}