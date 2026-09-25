import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { verifyEmail } from '../api/authApi';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your digital identity...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided in the URL.');
            return;
        }

        const verify = async () => {
            try {
                const result = await verifyEmail(token);
                setStatus('success');
                setMessage(result.message);
            } catch (err: any) {
                setStatus('error');
                setMessage(err.toString());
            }
        };

        verify();
    }, [token]);

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
            {/* Cinematic Video Background (reused from Login) */}
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40">
                <source src="/bg-video.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-background/70 z-0 backdrop-blur-[2px]"></div>

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="glass-panel p-10 rounded-3xl w-full max-w-md z-10 relative m-4 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
                {status === 'loading' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Authenticating</h2>
                    </motion.div>
                )}

                {status === 'success' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Identity Verified</h2>
                    </motion.div>
                )}

                {status === 'error' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                        <XCircle className="w-16 h-16 text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Verification Failed</h2>
                    </motion.div>
                )}

                <p className="text-gray-400 font-sans text-sm mt-2 mb-8">{message}</p>

                {status !== 'loading' && (
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        className="w-full py-4 bg-primary text-black font-semibold rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all duration-300 flex justify-center items-center gap-2"
                    >
                        Proceed to Login <ArrowRight size={18} />
                    </motion.button>
                )}
            </motion.div>
        </div>
    );
}