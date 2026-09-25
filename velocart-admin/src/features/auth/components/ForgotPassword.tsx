import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../api/authApi';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        try {
            const result = await requestPasswordReset(email);
            setMessage(result.message);
            setEmail('');
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
                <div className="text-center mb-8">
                    <h1 className="font-display text-3xl font-bold text-white tracking-wide mb-2">Account Recovery</h1>
                    <p className="text-gray-400 font-sans text-sm">Enter your email to receive a secure reset link.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            placeholder="Email Address" 
                            className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" 
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}
                    
                    {message && (
                        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm text-center">
                            {message}
                        </div>
                    )}

                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-4 mt-2 bg-primary text-black font-semibold rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70"
                    >
                        {isLoading ? 'Processing...' : 'Send Recovery Link'}
                        {!isLoading && <ArrowRight size={18} />}
                    </motion.button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => navigate('/login')}
                        className="text-sm text-gray-400 hover:text-primary transition-colors duration-300 flex items-center justify-center gap-2 mx-auto"
                    >
                        <ArrowLeft size={16} /> Back to Login
                    </button>
                </div>
            </motion.div>
        </div>
    );
}