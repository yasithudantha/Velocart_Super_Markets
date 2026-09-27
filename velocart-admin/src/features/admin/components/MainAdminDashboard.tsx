import { useState,useEffect } from 'react';
import { motion,AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    ShieldAlert,
    KeyRound,
    UserPlus,
    History,
    X,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    Presentation,
    BarChart3,
    Plus,
    Trash2,
    Printer,
    FileText,
    Truck,
    Star,
    Package,
} from 'lucide-react';

import {
    getUsers,
    createStaffAccount,
    updateUserStatusRole,
    getSecurityHistory,
    getBanners,
    createBanner,
    deleteBanner,
    getFinancialReport,
    getLogisticsReport,
    getLoyaltyReport,
    getInventoryReport,
} from '../api/mainAdminApi';

export default function MainAdminDashboard() {

    // ============================================================
    // MAIN DASHBOARD STATE
    // ============================================================

    const [activeTab,setActiveTab]=useState<'USERS' | 'STOREFRONT' | 'REPORTS'>('USERS');

    // Kept as true to preserve previous loading behavior.
    const [isLoading,setIsLoading]=useState(true);

    const [toast,setToast]=useState<{ message: string,type: 'success' | 'error' } | null>(null);

    // ============================================================
    // USER MANAGEMENT STATE
    // ============================================================

    // Filters
    const [users,setUsers]=useState<any[]>([]);
    const [searchTerm,setSearchTerm]=useState('');
    const [roleFilter,setRoleFilter]=useState('');
    const [statusFilter,setStatusFilter]=useState('');

    // Modals
    const [isCreateModalOpen,setIsCreateModalOpen]=useState(false);
    const [historyModalData,setHistoryModalData]=useState<{
        userId: number,
        name: string,
        events: any[]
    } | null>(null);

    const [editModalUser,setEditModalUser]=useState<any | null>(null);

    const [staffForm,setStaffForm]=useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        role: 'ADMIN'
    });

    // ============================================================
    // STOREFRONT CMS STATE
    // ============================================================

    const [banners,setBanners]=useState<any[]>([]);

    const [isBannerModalOpen,setIsBannerModalOpen]=useState(false);
    const [deleteBannerId,setDeleteBannerId]=useState<number | null>(null);

    const [bannerForm,setBannerForm]=useState({
        title: '',
        subtitle: '',
        discount: '',
        timer: '',
        label: '',
        image: '/images/promotions/weekend-fresh.jpg',
        accent: 'from-orange-500/25 via-transparent to-red-500/20'
    });

    // ============================================================
    // REPORTS STATE
    // ============================================================

    const [reportData,setReportData]=useState<any | null>(null);

    // ============================================================
    // TOAST
    // ============================================================

    const showToast=(message: string,type: 'success' | 'error') => {
        setToast({ message,type });
        setTimeout(() => setToast(null),4000);
    };

    // ============================================================
    // DATA LOADING / DEBOUNCE
    // ============================================================

    useEffect(() => {
        if(activeTab === 'USERS') {
            const delayDebounceFn=setTimeout(() => fetchUsers(),500);

            return () => clearTimeout(delayDebounceFn);
        } else if(activeTab === 'STOREFRONT') {
            fetchBanners();
        }
    },[searchTerm,roleFilter,statusFilter,activeTab]);

    // ============================================================
    // USER MANAGEMENT API
    // ============================================================

    const fetchUsers=async () => {
        setIsLoading(true);

        try {
            const data=await getUsers(searchTerm,roleFilter,statusFilter);
            setUsers(data);
        } catch (err: any) {
            showToast("Failed to load users.","error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateStaff=async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await createStaffAccount(staffForm);

            showToast("Staff account created securely.","success");

            setIsCreateModalOpen(false);

            setStaffForm({
                fullName: '',
                email: '',
                phoneNumber: '',
                password: '',
                role: 'ADMIN'
            });

            fetchUsers();
        } catch (err: any) {
            showToast(
                err.response?.data?.message || "Failed to create staff.",
                "error"
            );
        }
    };

    const handleUpdateUser=async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await updateUserStatusRole(editModalUser.id,{
                role: editModalUser.role,
                accountStatus: editModalUser.accountStatus
            });

            showToast("User privileges updated.","success");

            setEditModalUser(null);

            fetchUsers();
        } catch (err: any) {
            showToast(
                err.response?.data?.message ||
                err.response?.data ||
                "Update failed.",
                "error"
            );
        }
    };

    const handleViewHistory=async (user: any) => {
        try {
            const events=await getSecurityHistory(user.id);

            setHistoryModalData({
                userId: user.id,
                name: user.fullName,
                events
            });
        } catch (err: any) {
            showToast("Failed to load audit logs.","error");
        }
    };

    // ============================================================
    // STOREFRONT CMS API
    // ============================================================

    const fetchBanners=async () => {
        setIsLoading(true);

        try {
            setBanners(await getBanners());
        } catch (err) {
            showToast("Failed to load banners.","error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBanner=async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await createBanner(bannerForm);

            showToast("Banner published.","success");

            setIsBannerModalOpen(false);

            setBannerForm({
                title: '',
                subtitle: '',
                discount: '',
                timer: '',
                label: '',
                image: '/images/promotions/weekend-fresh.jpg',
                accent: 'from-orange-500/25 via-transparent to-red-500/20'
            });

            fetchBanners();
        } catch (err) {
            showToast("Failed to publish.","error");
        }
    };

    const confirmDeleteBanner=async () => {
        if(!deleteBannerId) return;

        try {
            await deleteBanner(deleteBannerId);
            showToast("Banner removed.","success");
            fetchBanners();
        } catch (err) {
            showToast("Failed to remove.","error");
        } finally {
            setDeleteBannerId(null);
        }
    };

    // ============================================================
    // BI REPORTS API
    // ============================================================

    const handleGenerateReport=async (
        type: 'FINANCE' | 'LOGISTICS' | 'LOYALTY' | 'INVENTORY'
    ) => {
        setIsLoading(true);

        try {
            let data;

            if(type === 'FINANCE') {
                data=await getFinancialReport();
            }

            if(type === 'LOGISTICS') {
                data=await getLogisticsReport();
            }

            if(type === 'LOYALTY') {
                data=await getLoyaltyReport();
            }

            if(type === 'INVENTORY') {
                data=await getInventoryReport();
            }

            setReportData(data);
        } catch (err) {
            showToast("Failed to generate report.","error");
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="min-h-screen bg-[#0B1F33] text-white p-8 relative">

            {/* ========================================================
                GLOBAL TOAST
            ======================================================== */}

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0,y: -50 }}
                        animate={{ opacity: 1,y: 0 }}
                        exit={{ opacity: 0,y: -50 }}
                        className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white ${
                            toast.type === 'success'
                                ? 'bg-green-600'
                                : 'bg-red-600'
                        }`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle2 size={24} />
                        ) : (
                            <AlertTriangle size={24} />
                        )}

                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto">

                {/* ====================================================
                    ORIGINAL HEADER
                ==================================================== */}

                <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6 hide-on-print">

                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-wide flex items-center gap-3">
                            <ShieldAlert
                                className="text-red-500"
                                size={36}
                            />

                            Main Admin Control Center
                        </h1>

                        <p className="text-gray-400 mt-2">
                            Centralized authentication,role assignment,and security auditing.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center gap-2"
                    >
                        <UserPlus size={20} />

                        Provision Staff Account
                    </button>
                </div>

                {/* ====================================================
                    NEW TABS
                ==================================================== */}

                <div className="flex gap-4 mb-8 overflow-x-auto pb-2 hide-on-print">

                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'USERS'
                                ? 'bg-red-500/10 border border-red-500 text-red-400'
                                : 'border border-white/10 text-gray-400 hover:bg-white/5'
                        }`}
                    >
                        <Users size={18} />
                        User Management
                    </button>

                    <button
                        onClick={() => setActiveTab('STOREFRONT')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'STOREFRONT'
                                ? 'bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37]'
                                : 'border border-white/10 text-gray-400 hover:bg-white/5'
                        }`}
                    >
                        <Presentation size={18} />
                        Storefront CMS
                    </button>

                    <button
                        onClick={() => setActiveTab('REPORTS')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'REPORTS'
                                ? 'bg-blue-500/10 border border-blue-500 text-blue-400'
                                : 'border border-white/10 text-gray-400 hover:bg-white/5'
                        }`}
                    >
                        <BarChart3 size={18} />
                        BI Reports
                    </button>

                </div>

                {/* ====================================================
                    USER MANAGEMENT
                    ORIGINAL FILTERS + TABLE PRESERVED
                ==================================================== */}

                {activeTab === 'USERS' && (
                    <div className="space-y-6">

                        {/* Filters */}
                        <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 flex flex-wrap gap-4 mb-6">

                            <div className="flex-1 min-w-[200px] relative">

                                <Search
                                    className="absolute left-4 top-3 text-gray-500"
                                    size={18}
                                />

                                <input
                                    type="text"
                                    placeholder="Search by name,email,or phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-12 pr-4 focus:outline-none focus:border-red-500 text-sm"
                                />

                            </div>

                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="bg-black/50 border border-white/10 rounded-xl py-2 px-4 focus:outline-none focus:border-red-500 text-sm text-gray-300"
                            >
                                <option value="">All Roles</option>
                                <option value="CUSTOMER">Customer</option>
                                <option value="ADMIN">Admin</option>
                                <option value="DELIVERYMANAGER">
                                    Delivery Manager
                                </option>
                                <option value="PRODUCTMANAGER">
                                    Product Manager
                                </option>
                                <option value="PROMOTIONMANAGER">
                                    Promotion Manager
                                </option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-black/50 border border-white/10 rounded-xl py-2 px-4 focus:outline-none focus:border-red-500 text-sm text-gray-300"
                            >
                                <option value="">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="DEACTIVATED">Deactivated</option>
                            </select>

                        </div>

                        {/* User Table */}
                        <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">

                            <div className="overflow-x-auto">

                                <table className="w-full text-left text-sm">

                                    <thead className="bg-black/50 text-gray-400 font-bold border-b border-white/5">

                                        <tr>
                                            <th className="p-4">
                                                User Details
                                            </th>

                                            <th className="p-4">
                                                Role
                                            </th>

                                            <th className="p-4">
                                                Security Status
                                            </th>

                                            <th className="p-4 text-center">
                                                Last Login
                                            </th>

                                            <th className="p-4 text-right">
                                                Actions
                                            </th>
                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-white/5">

                                        {isLoading ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="p-8 text-center text-gray-500"
                                                >
                                                    Loading directory...
                                                </td>
                                            </tr>
                                        ) : users.map(user => (

                                            <tr
                                                key={user.id}
                                                className="hover:bg-white/5 transition-colors"
                                            >

                                                <td className="p-4">

                                                    <div className="font-bold text-white flex items-center gap-2">

                                                        {user.fullName}

                                                        {user.role === 'MAINADMIN' && (
                                                            <ShieldCheck
                                                                size={14}
                                                                className="text-red-500"
                                                                
                                                            />
                                                        )}

                                                    </div>

                                                    <div className="text-xs text-gray-500">
                                                        {user.email} • {user.phoneNumber}
                                                    </div>

                                                </td>

                                                <td className="p-4">

                                                    <span
                                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                                            user.role === 'CUSTOMER'
                                                                ? 'bg-blue-500/20 text-blue-400'
                                                                : 'bg-orange-500/20 text-orange-400'
                                                        }`}
                                                    >
                                                        {user.role}
                                                    </span>

                                                </td>

                                                <td className="p-4">

                                                    <div className="flex flex-col gap-1">

                                                        <span
                                                            className={`w-max px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                user.accountStatus === 'ACTIVE'
                                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            }`}
                                                        >
                                                            {user.accountStatus}
                                                        </span>

                                                        {user.isEmailVerified && (
                                                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                <CheckCircle2
                                                                    size={10}
                                                                    className="text-green-500"
                                                                />
                                                                Email Verified
                                                            </span>
                                                        )}

                                                    </div>

                                                </td>

                                                <td className="p-4 text-center text-gray-400 text-xs">

                                                    {user.lastLoginAt
                                                        ? new Date(user.lastLoginAt).toLocaleString()
                                                        : 'Never'}

                                                </td>

                                                <td className="p-4 text-right">

                                                    <button
                                                        onClick={() => handleViewHistory(user)}
                                                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors bg-white/5 rounded-lg mr-2"
                                                        title="Security Audit Log"
                                                    >
                                                        <History size={16} />
                                                    </button>

                                                    <button
                                                        onClick={() => setEditModalUser(user)}
                                                        disabled={user.role === 'MAINADMIN'}
                                                        className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-lg disabled:opacity-30"
                                                        title="Manage Privileges"
                                                    >
                                                        <KeyRound size={16} />
                                                    </button>

                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    </div>
                )}

                {/* ====================================================
                    STOREFRONT CMS - NEW
                ==================================================== */}

                {activeTab === 'STOREFRONT' && (
                    <div className="space-y-6">

                        <div className="flex justify-between items-center">

                            <h2 className="text-xl font-bold text-[#D4AF37]">
                                Live Landing Page Banners
                            </h2>

                            <button
                                onClick={() => setIsBannerModalOpen(true)}
                                className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Publish New Banner
                            </button>

                        </div>

                        {isLoading ? (
                            <div className="bg-[#121212] border border-white/10 rounded-2xl p-10 text-center text-gray-500">
                                Loading storefront banners...
                            </div>
                        ) : banners.length === 0 ? (
                            <div className="bg-[#121212] border border-white/10 rounded-2xl p-10 text-center text-gray-500">
                                No storefront banners found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                {banners.map(b => (

                                    <div
                                        key={b.id}
                                        className="bg-[#121212] border border-white/10 p-5 rounded-2xl relative"
                                    >

                                        <div
                                            className={`h-32 rounded-xl mb-4 bg-gradient-to-br ${b.accent || 'from-orange-500/25 via-transparent to-red-500/20'} flex items-center justify-center border border-white/5 overflow-hidden`}
                                            style={
                                                b.image
                                                    ? {
                                                        backgroundImage: `url(${b.image})`,
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center'
                                                    }
                                                    : undefined
                                            }
                                        >
                                            <div className="absolute"></div>

                                            <span className="font-black text-2xl drop-shadow-md relative z-10">
                                                {b.discount}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-lg mb-1">
                                            {b.title}
                                        </h3>

                                        <p className="text-xs text-gray-400 mb-4">
                                            {b.subtitle}
                                        </p>

                                        {b.label && (
                                            <div className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-bold mb-2">
                                                {b.label}
                                            </div>
                                        )}

                                        {b.timer && (
                                            <div className="text-xs text-gray-500 mb-2">
                                                Timer: {b.timer}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setDeleteBannerId(b.id)}
                                            className="absolute top-4 right-4 bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                            title="Delete Banner"
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                    </div>

                                ))}

                            </div>
                        )}

                    </div>
                )}

                {/* ====================================================
                    BI REPORTS - NEW
                ==================================================== */}

                {activeTab === 'REPORTS' && (
                    <div className="space-y-6">

                        <h2 className="text-xl font-bold text-blue-400 mb-4">
                            Generate Official Reports
                        </h2>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                            <button
                                onClick={() => handleGenerateReport('FINANCE')}
                                className="bg-black/50 border border-white/10 hover:border-blue-500 p-6 rounded-2xl text-left transition-all group"
                            >
                                <BarChart3
                                    className="text-blue-400 mb-4 group-hover:scale-110 transition-transform"
                                    size={32}
                                />

                                <div className="font-bold text-lg">
                                    Financial P&amp;L
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                    Income &amp; Expenses
                                </div>
                            </button>

                            <button
                                onClick={() => handleGenerateReport('LOGISTICS')}
                                className="bg-black/50 border border-white/10 hover:border-orange-500 p-6 rounded-2xl text-left transition-all group"
                            >
                                <Truck
                                    className="text-orange-400 mb-4 group-hover:scale-110 transition-transform"
                                    size={32}
                                />

                                <div className="font-bold text-lg">
                                    Logistics &amp; Support
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                    Delivery Success &amp; Complaints
                                </div>
                            </button>

                            <button
                                onClick={() => handleGenerateReport('LOYALTY')}
                                className="bg-black/50 border border-white/10 hover:border-green-500 p-6 rounded-2xl text-left transition-all group"
                            >
                                <Star
                                    className="text-green-400 mb-4 group-hover:scale-110 transition-transform"
                                    size={32}
                                />

                                <div className="font-bold text-lg">
                                    Loyalty Analytics
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                    Points Liability &amp; Redemptions
                                </div>
                            </button>

                            <button
                                onClick={() => handleGenerateReport('INVENTORY')}
                                className="bg-black/50 border border-white/10 hover:border-purple-500 p-6 rounded-2xl text-left transition-all group"
                            >
                                <Package
                                    className="text-purple-400 mb-4 group-hover:scale-110 transition-transform"
                                    size={32}
                                />

                                <div className="font-bold text-lg">
                                    Inventory Valuation
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                    Asset Value &amp; SKUs
                                </div>
                            </button>

                        </div>

                    </div>
                )}

            </div>

            {/* ========================================================
                ALL MODALS
            ======================================================== */}

            <AnimatePresence>

                {/* ====================================================
                    ORIGINAL CREATE STAFF MODAL
                ==================================================== */}

                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsCreateModalOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0,scale: 0.95 }}
                            animate={{ opacity: 1,scale: 1 }}
                            exit={{ opacity: 0,scale: 0.95 }}
                            className="bg-[#121212] border border-red-500/30 rounded-3xl p-8 max-w-md w-full z-10 shadow-[0_20px_60px_rgba(220,38,38,0.2)]"
                        >

                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                                <UserPlus className="text-red-500" />
                                Provision Staff Identity
                            </h2>

                            <form
                                onSubmit={handleCreateStaff}
                                className="space-y-4"
                            >

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Full Name
                                    </label>

                                    <input
                                        required
                                        value={staffForm.fullName}
                                        onChange={e =>
                                            setStaffForm({
                                                ...staffForm,
                                                fullName: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Work Email
                                    </label>

                                    <input
                                        required
                                        type="email"
                                        value={staffForm.email}
                                        onChange={e =>
                                            setStaffForm({
                                                ...staffForm,
                                                email: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Phone Number
                                    </label>

                                    <input
                                        required
                                        type="tel"
                                        value={staffForm.phoneNumber}
                                        onChange={e =>
                                            setStaffForm({
                                                ...staffForm,
                                                phoneNumber: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Initial Password
                                    </label>

                                    <input
                                        required
                                        type="password"
                                        value={staffForm.password}
                                        onChange={e =>
                                            setStaffForm({
                                                ...staffForm,
                                                password: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        System Role Allocation
                                    </label>

                                    <select
                                        value={staffForm.role}
                                        onChange={e =>
                                            setStaffForm({
                                                ...staffForm,
                                                role: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none text-sm appearance-none"
                                    >
                                        <option value="ADMIN">
                                            ADMIN (General)
                                        </option>

                                        <option value="PRODUCTMANAGER">
                                            PRODUCT MANAGER
                                        </option>

                                        <option value="PROMOTIONMANAGER">
                                            PROMOTION MANAGER
                                        </option>

                                        <option value="DELIVERYMANAGER">
                                            DELIVERY MANAGER
                                        </option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">

                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-4 py-2 text-gray-400 hover:text-white font-bold"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg"
                                    >
                                        Provision Account
                                    </button>

                                </div>

                            </form>

                        </motion.div>

                    </div>
                )}

                {/* ====================================================
                    ORIGINAL MANAGE PRIVILEGES MODAL
                ==================================================== */}

                {editModalUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setEditModalUser(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0,scale: 0.95 }}
                            animate={{ opacity: 1,scale: 1 }}
                            exit={{ opacity: 0,scale: 0.95 }}
                            className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-md w-full z-10"
                        >

                            <h2 className="text-xl font-bold text-white mb-2">
                                Manage Access
                            </h2>

                            <p className="text-sm text-gray-400 mb-6 pb-4 border-b border-white/10">
                                Updating privileges for
                                <strong className="text-white ml-1">
                                    {editModalUser.fullName}
                                </strong>
                            </p>

                            <form
                                onSubmit={handleUpdateUser}
                                className="space-y-4"
                            >

                                <div>

                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Account Status (Soft Delete)
                                    </label>

                                    <select
                                        value={editModalUser.accountStatus}
                                        onChange={e =>
                                            setEditModalUser({
                                                ...editModalUser,
                                                accountStatus: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none text-sm appearance-none"
                                    >
                                        <option value="ACTIVE">
                                            ACTIVE (Permit Login)
                                        </option>

                                        <option value="DEACTIVATED">
                                            DEACTIVATED (Block Access)
                                        </option>
                                    </select>

                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Deactivation preserves financial/order history (Soft Delete).
                                    </p>

                                </div>

                                {editModalUser.role !== 'CUSTOMER' && (
                                    <div>

                                        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                            Modify Staff Role
                                        </label>

                                        <select
                                            value={editModalUser.role}
                                            onChange={e =>
                                                setEditModalUser({
                                                    ...editModalUser,
                                                    role: e.target.value
                                                })
                                            }
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none text-sm appearance-none"
                                        >
                                            <option value="ADMIN">
                                                ADMIN
                                            </option>

                                            <option value="PRODUCTMANAGER">
                                                PRODUCT MANAGER
                                            </option>

                                            <option value="PROMOTIONMANAGER">
                                                PROMOTION MANAGER
                                            </option>

                                            <option value="DELIVERYMANAGER">
                                                DELIVERY MANAGER
                                            </option>
                                        </select>

                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">

                                    <button
                                        type="button"
                                        onClick={() => setEditModalUser(null)}
                                        className="px-4 py-2 text-gray-400 hover:text-white font-bold"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg"
                                    >
                                        Save Configuration
                                    </button>

                                </div>

                            </form>

                        </motion.div>

                    </div>
                )}

                {/* ====================================================
                    ORIGINAL SECURITY AUDIT LOG MODAL
                ==================================================== */}

                {historyModalData && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setHistoryModalData(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0,y: 20 }}
                            animate={{ opacity: 1,y: 0 }}
                            exit={{ opacity: 0,y: 20 }}
                            className="bg-[#121212] border border-blue-500/30 rounded-3xl p-8 max-w-2xl w-full z-10 max-h-[80vh] flex flex-col"
                        >

                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">

                                <div>

                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <History className="text-blue-400" />
                                        Security Audit Log
                                    </h2>

                                    <p className="text-xs text-gray-400 mt-1">
                                        Immutable security events for {historyModalData.name}
                                    </p>

                                </div>

                                <button
                                    onClick={() => setHistoryModalData(null)}
                                    className="text-gray-500 hover:text-white"
                                >
                                    <X size={24} />
                                </button>

                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">

                                {historyModalData.events.length === 0 ? (

                                    <p className="text-center text-gray-500 py-10">
                                        No security events recorded.
                                    </p>

                                ) : (
                                    historyModalData.events.map((evt,idx) => (

                                        <div
                                            key={idx}
                                            className="bg-black/40 border border-white/5 p-4 rounded-xl"
                                        >

                                            <div className="flex justify-between items-start mb-2">

                                                <span className="text-sm font-bold text-blue-400">
                                                    {evt.eventType}
                                                </span>

                                                <span className="text-[10px] text-gray-500 font-mono">
                                                    {new Date(evt.timestamp).toLocaleString()}
                                                </span>

                                            </div>

                                            <p className="text-sm text-gray-300">
                                                {evt.description}
                                            </p>

                                        </div>

                                    ))
                                )}

                            </div>

                        </motion.div>

                    </div>
                )}

                {/* ====================================================
                    NEW CREATE BANNER MODAL
                ==================================================== */}

                {isBannerModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsBannerModalOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0,scale: 0.95,y: 20 }}
                            animate={{ opacity: 1,scale: 1,y: 0 }}
                            exit={{ opacity: 0,scale: 0.95,y: 20 }}
                            className="bg-[#121212] border border-[#D4AF37]/30 rounded-3xl p-8 max-w-lg w-full z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
                        >

                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">

                                <h2 className="text-xl font-bold text-[#D4AF37] flex items-center gap-2">
                                    <Presentation size={20} />
                                    Publish New Banner
                                </h2>

                                <button
                                    onClick={() => setIsBannerModalOpen(false)}
                                    className="text-gray-500 hover:text-white"
                                >
                                    <X size={22} />
                                </button>

                            </div>

                            <form
                                onSubmit={handleCreateBanner}
                                className="space-y-4"
                            >

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Title
                                    </label>

                                    <input
                                        required
                                        value={bannerForm.title}
                                        onChange={e =>
                                            setBannerForm({
                                                ...bannerForm,
                                                title: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Subtitle
                                    </label>

                                    <input
                                        required
                                        value={bannerForm.subtitle}
                                        onChange={e =>
                                            setBannerForm({
                                                ...bannerForm,
                                                subtitle: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Discount
                                    </label>

                                    <input
                                        required
                                        value={bannerForm.discount}
                                        onChange={e =>
                                            setBannerForm({
                                                ...bannerForm,
                                                discount: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Timer
                                    </label>

                                    <input
                                        value={bannerForm.timer}
                                        onChange={e =>
                                            setBannerForm({
                                                ...bannerForm,
                                                timer: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Label
                                    </label>

                                    <input
                                        value={bannerForm.label}
                                        onChange={e =>
                                            setBannerForm({
                                                ...bannerForm,
                                                label: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Image Path
                                    </label>

                                    <input
                                        value={bannerForm.image}
                                        onChange={e =>
                                            setBannerForm({
                                                ...bannerForm,
                                                image: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                        Accent Classes
                                    </label>

                                    <input
                                        value={bannerForm.accent}
                                        onChange={e =>
                                            setBannerForm({
                                                ...bannerForm,
                                                accent: e.target.value
                                            })
                                        }
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">

                                    <button
                                        type="button"
                                        onClick={() => setIsBannerModalOpen(false)}
                                        className="px-4 py-2 text-gray-400 hover:text-white font-bold"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-[#c4a22f] transition-colors shadow-lg"
                                    >
                                        Publish Banner
                                    </button>

                                </div>

                            </form>

                        </motion.div>

                    </div>
                )}

                {/* ====================================================
                    NEW REPORT PRINT MODAL
                ==================================================== */}

                {/* ====================================================
                    NEW DELETE BANNER MODAL
                ==================================================== */}

                {deleteBannerId && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setDeleteBannerId(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0,scale: 0.95,y: 20 }}
                            animate={{ opacity: 1,scale: 1,y: 0 }}
                            exit={{ opacity: 0,scale: 0.95,y: 20 }}
                            className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-sm w-full z-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center relative"
                        >
                            <button
                                onClick={() => setDeleteBannerId(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mb-6">
                                <AlertTriangle size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">
                                Delete Banner?
                            </h3>
                            <p className="text-gray-400 text-sm mb-8">
                                Are you sure you want to remove this promotional banner from the live storefront? This cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteBannerId(null)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteBanner}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                                >
                                    Yes,Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {reportData && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 printable-modal">

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm hide-on-print"
                            onClick={() => setReportData(null)}
                        />

                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0.95,
                                y: 20
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.95,
                                y: 20
                            }}
                            className="bg-white text-black rounded-xl p-8 max-w-2xl w-full z-10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        >

                            <div className="flex justify-between items-start mb-8 border-b pb-4 hide-on-print">

                                <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                                    <FileText />
                                    Official Document
                                </h2>

                                <div className="flex gap-2">

                                    <button
                                        onClick={() => window.print()}
                                        className="p-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg transition-colors"
                                        title="Print Report"
                                    >
                                        <Printer size={20} />
                                    </button>

                                    <button
                                        onClick={() => setReportData(null)}
                                        className="p-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg transition-colors"
                                        title="Close Report"
                                    >
                                        <X size={20} />
                                    </button>

                                </div>

                            </div>

                            <div
                                id="receipt-content"
                                className="print:m-0 print:p-0"
                            >

                                <div className="text-center mb-8 border-b-2 border-black pb-6">

                                    <h1 className="text-4xl font-black tracking-widest uppercase">
                                        VELOCART
                                    </h1>

                                    <h2 className="text-xl font-bold text-gray-600 mt-2">
                                        {reportData.reportName}
                                    </h2>

                                    <p className="text-gray-500 text-xs mt-1">
                                        Generated:{' '}
                                        {new Date(reportData.generatedAt).toLocaleString()}
                                    </p>

                                </div>

                                <div className="space-y-4">

                                    {Object.entries(reportData).map(([key,value]) => {

                                        if(
                                            key === 'reportName' ||
                                            key === 'generatedAt'
                                        ) {
                                            return null;
                                        }

                                        return (
                                            <div
                                                key={key}
                                                className="flex justify-between items-center p-3 border-b border-gray-200 gap-6"
                                            >

                                                <span className="font-bold text-gray-700 capitalize">
                                                    {key
                                                        .replace(/([A-Z])/g,' $1')
                                                        .trim()}
                                                </span>

                                                <span className="text-lg font-black text-right">
                                                    {typeof value === 'number' &&
                                                    (key.includes('Total') ||
                                                        key.includes('Rs'))
                                                        ? `Rs. ${value.toLocaleString(undefined,{
                                                            minimumFractionDigits: 2
                                                        })}`
                                                        : value?.toString()}
                                                </span>

                                            </div>
                                        );
                                    })}

                                </div>

                                <div className="mt-12 text-center text-xs text-gray-400">
                                    This document is system-generated by VeloCart BI Systems.
                                </div>

                            </div>

                        </motion.div>

                    </div>
                )}

            </AnimatePresence>

            {/* ========================================================
                PRINT CSS
            ======================================================== */}

            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }

                    .printable-modal,
                    .printable-modal * {
                        visibility: visible;
                    }

                    .printable-modal {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        box-shadow: none;
                        background: white;
                    }

                    .hide-on-print {
                        display: none !important;
                    }
                }
            `}</style>

        </div>
    );
}