import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, ArrowRight, CheckCircle } from 'lucide-react';
import { resetPassword } from '../api/authApi';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({ newPassword: '', confirmNewPassword: '' });
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError("Invalid reset link. Token is missing.");
            return;
        }

        if (formData.newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (formData.newPassword !== formData.confirmNewPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            await resetPassword({
                token: token,
                newPassword: formData.newPassword,
                confirmNewPassword: formData.confirmNewPassword
            });
            setIsSuccess(true);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40">
                <source src="/bg-video.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-background/70 z-0 backdrop-blur-[2px]"></div>

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="glass-panel p-10 rounded-3xl w-full max-w-md z-10 relative m-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
                {isSuccess ? (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Password Reset!</h2>
                        <p className="text-gray-400 font-sans text-sm mb-8">Your account is secure. You can now log in.</p>
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/login')}
                            className="w-full py-4 bg-primary text-black font-semibold rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all flex justify-center items-center gap-2"
                        >
                            Proceed to Login <ArrowRight size={18} />
                        </motion.button>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <h1 className="font-display text-3xl font-bold text-white tracking-wide mb-2">Create New Password</h1>
                            <p className="text-gray-400 font-sans text-sm">Secure your Velocart workspace.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input name="newPassword" type="password" value={formData.newPassword} onChange={handleChange} required placeholder="New Password" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                            </div>

                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input name="confirmNewPassword" type="password" value={formData.confirmNewPassword} onChange={handleChange} required placeholder="Confirm New Password" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" 
                                disabled={isLoading}
                                className="w-full py-4 mt-2 bg-primary text-black font-semibold rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70"
                            >
                                {isLoading ? 'Updating...' : 'Secure My Account'}
                                {!isLoading && <ArrowRight size={18} />}
                            </motion.button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
}