import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, History, AlertTriangle, DollarSign, Package, AlertOctagon, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5176/api';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function RealTimeInventoryDashboard() {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LEDGER'>('OVERVIEW');
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            if (activeTab === 'OVERVIEW') {
                const response = await axios.get(`${API_URL}/inventory/dashboard`, getAuthHeader());
                setDashboardData(response.data);
            } else {
                const response = await axios.get(`${API_URL}/inventory/audit-ledger`, getAuthHeader());
                setLedgerData(response.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to fetch inventory data.");
        } finally {
            setIsLoading(false);
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'Received': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'Sold': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'Adjusted_Up': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'Adjusted_Down': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 'Expired': 
            case 'Damaged': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'Returned': return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1F33] text-white p-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-wide flex items-center gap-3">
                            <LayoutDashboard className="text-[#D4AF37]" size={36} /> Inventory Hub
                        </h1>
                        <p className="text-gray-400 mt-2">Real-time stock monitoring, valuations, and immutable audit trails.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button 
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'OVERVIEW' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        <Package size={18} /> Live Operations
                    </button>
                    <button 
                        onClick={() => setActiveTab('LEDGER')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'LEDGER' ? 'bg-[#121212] border border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        <History size={18} /> Audit Ledger
                    </button>
                </div>

                {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold">{error}</div>}

                {isLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" /></div>
                ) : activeTab === 'OVERVIEW' && dashboardData ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        
                        {/* KPI Metrics Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-[#121212] border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center gap-3 text-gray-400 mb-2"><DollarSign size={18} className="text-[#D4AF37]" /> Inventory Valuation</div>
                                <div className="text-3xl font-bold text-white">Rs. {dashboardData.summary.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-[#121212] border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center gap-3 text-gray-400 mb-2"><Package size={18} className="text-blue-400" /> Active Products</div>
                                <div className="text-3xl font-bold text-white">{dashboardData.summary.totalProducts}</div>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6">
                                <div className="flex items-center gap-3 text-orange-400 mb-2"><AlertTriangle size={18} /> Near Expiry / Low Stock</div>
                                <div className="text-3xl font-bold text-orange-400">{dashboardData.summary.nearExpiryCount} / {dashboardData.summary.lowStockCount}</div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                                <div className="flex items-center gap-3 text-red-400 mb-2"><AlertOctagon size={18} /> Expired / Out of Stock</div>
                                <div className="text-3xl font-bold text-red-500">{dashboardData.summary.expiredCount} / {dashboardData.summary.outOfStockCount}</div>
                            </div>
                        </div>

                        {/* Live Stock Table */}
                        <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/50 text-gray-400 font-bold border-b border-white/5">
                                        <tr>
                                            <th className="p-4">Product Name</th>
                                            <th className="p-4">SKU</th>
                                            <th className="p-4 text-center">Physical Stock</th>
                                            <th className="p-4 text-center text-orange-300">Reserved (Carts)</th>
                                            <th className="p-4 text-center text-[#D4AF37]">Available to Sell</th>
                                            <th className="p-4 text-right">Status Alerts</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {dashboardData.products.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-bold">{p.productName} <span className="text-gray-500 font-normal ml-2">{p.variantName}</span></td>
                                                <td className="p-4 text-gray-400 font-mono text-xs">{p.sku}</td>
                                                <td className="p-4 text-center">{p.physicalStock}</td>
                                                <td className="p-4 text-center text-orange-300 font-bold">{p.reservedStock > 0 ? p.reservedStock : '-'}</td>
                                                <td className="p-4 text-center font-bold text-[#D4AF37]">{p.availableStock}</td>
                                                <td className="p-4 text-right space-x-2">
                                                    {p.hasExpiredBatches && <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold uppercase">Expired Batches</span>}
                                                    {p.hasNearExpiryBatches && <span className="inline-block px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-[10px] font-bold uppercase">Expiring Soon</span>}
                                                    {p.status === 'OUT_OF_STOCK' && <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold uppercase">Out of Stock</span>}
                                                    {p.status === 'LOW_STOCK' && <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-bold uppercase">Low Stock</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>

                ) : activeTab === 'LEDGER' ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-black/30">
                            <h3 className="font-bold text-xl flex items-center gap-2"><History className="text-[#D4AF37]" size={20} /> Immutable Audit Ledger</h3>
                            <p className="text-gray-400 text-sm mt-1">A strict, permanent record of all physical inventory movements.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-black/50 text-gray-400 font-bold border-b border-white/5">
                                    <tr>
                                        <th className="p-4">Timestamp (UTC)</th>
                                        <th className="p-4">Product</th>
                                        <th className="p-4">Transaction Type</th>
                                        <th className="p-4 text-center">Qty Change</th>
                                        <th className="p-4 text-center">Before → After</th>
                                        <th className="p-4">Reference & Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {ledgerData.map((t: any) => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 text-gray-400 text-xs">{new Date(t.timestamp).toLocaleString()}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-white">{t.productName}</div>
                                                <div className="text-xs text-gray-500 font-mono">{t.sku}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getTransactionColor(t.type)}`}>
                                                    {t.type.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center font-bold">
                                                <span className={`flex items-center justify-center gap-1 ${t.quantityChanged > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {t.quantityChanged > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                    {Math.abs(t.quantityChanged)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center text-gray-400 font-mono text-xs">
                                                {t.quantityBefore} <span className="text-[#D4AF37] mx-1">→</span> {t.quantityAfter}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-sm text-gray-300">{t.referenceDocument}</div>
                                                <div className="text-xs text-gray-500">{t.reason}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    {ledgerData.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">No transactions found in the ledger.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : null}

            </div>
        </div>
    );
}