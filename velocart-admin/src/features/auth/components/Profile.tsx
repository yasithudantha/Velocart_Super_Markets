import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { User, Mail, Phone, ShieldCheck, LogOut, Edit2, Save, X, Loader2, Bell, Lock, AlertTriangle, Award, Package } from 'lucide-react';
import { getUserProfile, updateUserProfile, changePassword, requestEmailChange, deleteAccount, getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../api/userApi';
import { logoutUser } from '../api/authApi';
import AddressManager from './AddressManager';

import LoyaltyDashboard from "../../Loyalty/component/LoyaltyDashboard";
import OrderHistory from "../../orders/components/OrderHistory";

export default function Profile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    const [activeView, setActiveView] = useState<'profile' | 'loyalty' | 'orders'>('profile');
    
    const [editData, setEditData] = useState({ fullName: '', phoneNumber: '', receiveNotifications: true, communicationPreference: 'Email' });
    
    const [securityData, setSecurityData] = useState({ 
        emailCurrentPassword: '', newEmail: '', passwordCurrentPassword: '', newPassword: '', deleteCurrentPassword: ''
    });
    const [isSecuritySaving, setIsSecuritySaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // NEW: Notification States (SRS 6.15)
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const data = await getUserProfile();
                setProfile(data);
                setEditData({ 
                    fullName: data.fullName, phoneNumber: data.phoneNumber,
                    receiveNotifications: data.receiveNotifications ?? true, communicationPreference: data.communicationPreference || 'Email'
                });
                
                // Fetch Notifications concurrently
                const notifs = await getMyNotifications();
                setNotifications(notifs);

            } catch (err: any) {
                setError(err.toString());
                if (err.toString().includes("Unauthorized")) setTimeout(() => handleLogout(), 2000);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    // NEW: Notification Handlers
    const handleMarkAsRead = async (id: number) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (e) { console.error(e); }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (e) { console.error(e); }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleLogout = async () => {
        try { if (profile?.id) await logoutUser(profile.id); } catch (e) { console.error(e); }
        localStorage.removeItem('velocart_token');
        localStorage.removeItem('velocart_user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleSave = async () => {
        setError(''); setMessage(''); setIsLoading(true);
        try {

            let cleanedPhone = editData.phoneNumber.replace(/\s/g, '');
            if (cleanedPhone.startsWith('0')) {
                cleanedPhone = '+94' + cleanedPhone.substring(1);
            }
            const payload = {
                ...profile, 
                ...editData,
                phoneNumber: cleanedPhone
            };
            const result = await updateUserProfile(payload);
            setMessage(result.message);
            setProfile(payload);
            setEditData({
            ...editData,
            phoneNumber: cleanedPhone
            });
            setIsEditing(false);
        } catch (err: any) { setError(err.toString()); } 
        finally { setIsLoading(false); }
    };

    const handleSecurityAction = async (action: 'password' | 'email' | 'delete', e: React.FormEvent) => {
        e.preventDefault(); setIsSecuritySaving(true); setError(''); setMessage('');
        try {
            if (action === 'password') {
                const res = await changePassword({ currentPassword: securityData.passwordCurrentPassword, newPassword: securityData.newPassword });
                setMessage(res.message); setSecurityData({ ...securityData, passwordCurrentPassword: '', newPassword: '' });
            } else if (action === 'email') {
                const res = await requestEmailChange({ currentPassword: securityData.emailCurrentPassword, newEmail: securityData.newEmail });
                setMessage(res.message); setSecurityData({ ...securityData, emailCurrentPassword: '', newEmail: '' });
            } else if (action === 'delete') {
                if(!window.confirm("Are you absolutely sure? This cannot be undone.")) { setIsSecuritySaving(false); return; }
                await deleteAccount({ currentPassword: securityData.deleteCurrentPassword });
                alert("Account deleted. We are sorry to see you go.");
                handleLogout();
            }
        } catch (err: any) { setError(err.toString()); } 
        finally { setIsSecuritySaving(false); }
    };

    const containerVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };

    if (isLoading && !profile) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

    const isGoogleUser = profile?.authProvider === 'GOOGLE' || (!profile?.passwordHash && profile?.profilePictureUrl);
    const userRole = profile?.role || profile?.Role || profile?.userRole || profile?.UserRole;

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#F7F3E8] py-10" onClick={() => setIsNotifOpen(false)}>
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40 fixed">
                <source src="/bg-video.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-background/80 z-0 backdrop-blur-[1px] fixed"></div>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="glass-panel p-10 rounded-3xl w-full max-w-2xl z-10 relative m-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] my-10" onClick={e => e.stopPropagation()}>
                
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-6 relative">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-white tracking-wide">
                            My <span className="text-primary">Workspace</span>
                        </h1>
                        <p className="text-gray-400 font-sans text-sm mt-1">Manage your identity, rewards, and orders.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* NOTIFICATION BELL ENGINE */}
                        <div className="relative">
                            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-primary transition-colors relative">
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#121212]"></span>}
                            </button>

                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 mt-3 w-80 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/40">
                                            <h3 className="font-bold text-white text-sm">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <button onClick={handleMarkAllAsRead} className="text-xs text-primary hover:underline">Mark all as read</button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-sm text-gray-500">No new notifications.</div>
                                            ) : (
                                                notifications.map(n => (
                                                    <div key={n.id} onClick={() => !n.isRead && handleMarkAsRead(n.id)} className={`p-4 transition-colors cursor-pointer flex gap-3 ${!n.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/5'}`}>
                                                        <div className="mt-1">
                                                            {n.type === 'LOYALTY' ? <Award size={16} className={!n.isRead ? 'text-primary' : 'text-gray-500'} /> : <Bell size={16} className={!n.isRead ? 'text-blue-400' : 'text-gray-500'} />}
                                                        </div>
                                                        <div>
                                                            <h4 className={`text-sm font-bold ${!n.isRead ? 'text-white' : 'text-gray-400'}`}>{n.title}</h4>
                                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                                            <span className="text-[10px] text-gray-500 mt-2 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 ml-auto"></div>}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {(userRole === 'ADMIN' || userRole === 'PROMOTIONMANAGER') && (
                            <button onClick={() => navigate('/admin/promotions')} className="hidden sm:flex text-left px-4 py-2 text-sm text-[#D4AF37] hover:text-black hover:bg-[#D4AF37] border border-[#D4AF37]/50 rounded-xl transition-colors items-center gap-2 font-bold">
                                <Award size={16}/> Promotions
                            </button>
                        )}

                        <button onClick={handleLogout} className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-red-500/20">
                            <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
                    <button onClick={() => setActiveView('profile')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${activeView === 'profile' ? 'bg-primary text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                        <User size={16} /> Account Details
                    </button>
                    <button onClick={() => setActiveView('loyalty')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${activeView === 'loyalty' ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-[#D4AF37]/70 hover:bg-white/10 hover:text-[#D4AF37]'}`}>
                        <Award size={16} /> VelocityFamily Rewards
                    </button>
                    <button onClick={() => setActiveView('orders')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${activeView === 'orders' ? 'bg-primary text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                        <Package size={16} /> Order History
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeView === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            {profile && !profile.phoneNumber && !isEditing && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                                    <div className="p-1 rounded-full bg-orange-500/20 text-orange-400 mt-0.5"><span className="flex h-4 w-4 items-center justify-center font-bold text-xs">!</span></div>
                                    <div>
                                        <h3 className="text-orange-400 font-semibold text-sm mb-1">Action Required: Incomplete Profile</h3>
                                        <p className="text-orange-200/70 text-xs mb-3">Please add a mobile phone number. This is required for delivery communication and order updates.</p>
                                        <button onClick={() => setIsEditing(true)} className="text-xs bg-orange-500 text-black font-bold px-4 py-1.5 rounded-lg hover:bg-orange-400 transition-colors">Add Phone Number</button>
                                    </div>
                                </motion.div>
                            )}

                            {error && <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center">{error}</div>}
                            {message && <div className="mb-6 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm text-center">{message}</div>}

                            {profile && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="p-3 rounded-full bg-primary/10 text-primary"><User size={20} /></div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Full Name</p>
                                                {isEditing ? <input value={editData.fullName} onChange={(e) => setEditData({...editData, fullName: e.target.value})} className="glass-input w-full py-2 px-3 rounded-lg text-sm" /> : <p className="text-white font-medium">{profile.fullName}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="p-3 rounded-full bg-primary/10 text-primary"><Phone size={20} /></div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone Number</p>
                                                {isEditing ? <input value={editData.phoneNumber} onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})} className="glass-input w-full py-2 px-3 rounded-lg text-sm" /> : <p className="text-white font-medium">{profile.phoneNumber || 'Not provided'}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                                        <div className="flex items-start gap-4 w-full">
                                            <div className="p-3 rounded-full bg-primary/10 text-primary"><Bell size={20} /></div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Communication Preferences</p>
                                                {isEditing ? (
                                                    <div className="space-y-4">
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <input type="checkbox" checked={editData.receiveNotifications} onChange={(e) => setEditData({...editData, receiveNotifications: e.target.checked})} className="w-4 h-4 accent-primary" />
                                                            <span className="text-sm text-gray-300">Receive Marketing & Promo Updates</span>
                                                        </label>
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-1">Order Update Channel</p>
                                                            <select value={editData.communicationPreference} onChange={(e) => setEditData({...editData, communicationPreference: e.target.value})} className="glass-input w-full md:w-1/2 py-2 px-3 rounded-lg text-sm bg-black/50 text-white">
                                                                <option value="Email">Email Only</option><option value="SMS">SMS Only</option><option value="Both">Email & SMS</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-white font-medium text-sm">Marketing: {profile.receiveNotifications ? 'Subscribed' : 'Unsubscribed'}</p>
                                                        <p className="text-white font-medium text-sm">Order Updates: {profile.communicationPreference || 'Email'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/5 opacity-70">
                                            <div className="p-3 rounded-full bg-white/5 text-gray-400"><Mail size={20} /></div>
                                            <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p><p className="text-white font-medium text-sm truncate">{profile.email}</p></div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/5 opacity-70">
                                            <div className="p-3 rounded-full bg-white/5 text-gray-400"><ShieldCheck size={20} /></div>
                                            <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p><p className="text-primary font-medium text-sm">{profile.AccountStatus || profile.accountStatus}</p></div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3 border-t border-white/10 mt-6">
                                        {isEditing ? (
                                            <><button onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"><X size={16} /> Cancel</button>
                                            <button onClick={handleSave} disabled={isLoading} className="px-5 py-2.5 rounded-lg text-sm bg-primary text-black font-semibold shadow-glow hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center gap-2">
                                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                                            </button></>
                                        ) : (
                                            <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 rounded-lg text-sm bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all flex items-center gap-2"><Edit2 size={16} /> Edit Profile</button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!isEditing && profile && (
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Lock size={20} className="text-primary" /> Security & Privacy</h2>
                                    {isGoogleUser ? (
                                        <div className="p-6 bg-black/40 border border-white/5 rounded-xl text-center"><ShieldCheck size={32} className="mx-auto text-blue-400 mb-3" /><h3 className="font-bold text-white mb-1">Secured by Google</h3><p className="text-gray-400 text-sm">Your account authentication and email are managed securely by Google.</p></div>
                                    ) : (
                                        <div className="space-y-4">
                                            <form onSubmit={(e) => handleSecurityAction('email', e)} className="p-5 bg-black/40 border border-white/5 rounded-xl">
                                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">Update Email Address</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                    <input required type="email" placeholder="New Email Address" value={securityData.newEmail} onChange={(e) => setSecurityData({...securityData, newEmail: e.target.value})} className="glass-input w-full py-2 px-3 rounded-lg text-sm" />
                                                    <input required type="password" placeholder="Current Password (Required)" value={securityData.emailCurrentPassword} onChange={(e) => setSecurityData({...securityData, emailCurrentPassword: e.target.value})} className="glass-input w-full py-2 px-3 rounded-lg text-sm" />
                                                </div>
                                                <button type="submit" disabled={isSecuritySaving} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2">{isSecuritySaving ? <Loader2 size={14} className="animate-spin" /> : null} Request Change</button>
                                            </form>
                                            <form onSubmit={(e) => handleSecurityAction('password', e)} className="p-5 bg-black/40 border border-white/5 rounded-xl">
                                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">Change Password</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                    <input required type="password" placeholder="Current Password" value={securityData.passwordCurrentPassword} onChange={(e) => setSecurityData({...securityData, passwordCurrentPassword: e.target.value})} className="glass-input w-full py-2 px-3 rounded-lg text-sm" />
                                                    <input required type="password" placeholder="New Password" value={securityData.newPassword} onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})} className="glass-input w-full py-2 px-3 rounded-lg text-sm" />
                                                </div>
                                                <button type="submit" disabled={isSecuritySaving} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2">{isSecuritySaving ? <Loader2 size={14} className="animate-spin" /> : null} Update Password</button>
                                            </form>
                                        </div>
                                    )}

                                    <form onSubmit={(e) => handleSecurityAction('delete', e)} className="mt-8 p-5 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={16} /> Danger Zone</h3>
                                        <p className="text-xs text-red-300/70 mb-4">Deleting your account is permanent and cannot be undone.</p>
                                        {!isGoogleUser && (<input required type="password" placeholder="Enter password to confirm" value={securityData.deleteCurrentPassword} onChange={(e) => setSecurityData({...securityData, deleteCurrentPassword: e.target.value})} className="glass-input w-full md:w-1/2 py-2 px-3 rounded-lg text-sm mb-3 border-red-500/30 focus:border-red-500" />)}
                                        <button type="submit" disabled={isSecuritySaving} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors block">Delete Account</button>
                                    </form>
                                </div>
                            )}

                            <div className="mt-8"><AddressManager /></div>
                        </motion.div>
                    )}

                    {activeView === 'loyalty' && (
                        <motion.div key="loyalty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            <LoyaltyDashboard />
                        </motion.div>
                    )}

                    {activeView === 'orders' && (
                        <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            <OrderHistory />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}