import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { loginUser, googleAuth } from '../api/authApi';

interface LoginProps {
    onSwitchToRegister: () => void;
}

export default function Login({ onSwitchToRegister }: LoginProps) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const routeUser = (user: any) => {
        const userRole = String(user.role || user.Role || '').toUpperCase();
        if (userRole == 'DELIVERYMANAGER') {
            navigate('/admin/delivery-management');
        } else if (userRole == 'PROMOTIONMANAGER') {
            navigate('/admin/promotions'); // <-- NEW: Routes Manager to their dashboard!
        } else if (userRole == 'ADMIN' || userRole == 'PRODUCTMANAGER') {
            navigate('/admin/products/new'); 
        } else if (userRole == 'MAINADMIN') {
            navigate('/admin/main-admin');    
        } else {
            navigate('/catalog'); // Regular customers
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await loginUser(formData);
            
            // THE CRITICAL FIX: Storing the new secure Session Tokens!
            localStorage.setItem('token', result.token);
            localStorage.setItem('refreshToken', result.refreshToken);
            localStorage.setItem('user', JSON.stringify(result.user));

            setSuccessMessage("Authentication successful. Redirecting...");
            setTimeout(() => routeUser(result.user), 1000); 
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

   const handleGoogleSuccess = async (credentialResponse: any) => {
        setError('');
        setIsLoading(true);
        try {
            const result = await googleAuth(credentialResponse.credential);

            // THE CRITICAL FIX: Storing the new secure Session Tokens!
            localStorage.setItem('token', result.token);
            localStorage.setItem('refreshToken', result.refreshToken);
            localStorage.setItem('user', JSON.stringify(result.user));

            setSuccessMessage("Google Authentication successful. Redirecting...");
            setTimeout(() => routeUser(result.user), 1000);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-100">
                <source src="/bg-video.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-background/50 z-0 backdrop-blur-[2px]"></div>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="glass-panel p-10 rounded-3xl w-full max-w-md z-10 relative m-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <motion.div variants={itemVariants} className="text-center mb-8">
                    <h1 className="font-display text-4xl font-bold text-white tracking-wide mb-2">
                        Welcome to <span className="text-primary">Velocart</span>
                    </h1>
                    <p className="text-gray-400 font-sans text-sm">Sign in to your intelligent workspace.</p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <motion.div variants={itemVariants} className="relative">
                        <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
                        <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="Email Address" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                    </motion.div>

                    <motion.div variants={itemVariants} className="relative">
                        <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
                        <input name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="Password" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex justify-end mt-1">
                        <Link to="/forgot-password" className="text-sm text-primary hover:text-white transition-colors">
                            Forgot Password?
                        </Link>
                    </motion.div>

                    {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center">{error}</motion.div>}
                    {successMessage && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm text-center">{successMessage}</motion.div>}

                    <motion.button variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full py-4 mt-2 bg-primary text-black font-semibold rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70">
                        {isLoading ? 'Authenticating...' : 'Secure Login'}
                        {!isLoading && <ArrowRight size={18} />}
                    </motion.button>
                </form>

                <motion.div variants={itemVariants} className="my-6 flex items-center justify-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="px-4 text-gray-500 text-xs tracking-widest uppercase">Or</span>
                    <div className="flex-grow border-t border-white/10"></div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError("Google sign-in was cancelled or failed.")}
                        theme="filled_black"
                        shape="pill"
                        text="continue_with"
                        width={350}
                    />
                </motion.div>

                <motion.div variants={itemVariants} className="mt-8 text-center">
                    <button onClick={onSwitchToRegister} className="text-sm text-gray-400 hover:text-primary transition-colors duration-300">
                        Don't have an account? Create one
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}