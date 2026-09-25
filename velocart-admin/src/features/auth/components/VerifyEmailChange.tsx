import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios'; // We can just use a direct axios call for this single endpoint

export default function VerifyEmailChange() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your new email address...');

    useEffect(() => {
        if (!token) {
            setStatus('error'); setMessage('No verification token provided.'); return;
        }

        const verify = async () => {
            try {
                // Call the C# endpoint we verified earlier!
                const result = await axios.get(`http://localhost:5176/api/User/verify-email-change?token=${token}`);
                setStatus('success');
                setMessage(result.data.message);
                
                // Clear old token because the email changed!
                localStorage.clear();
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || "Failed to verify email change.");
            }
        };
        verify();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
            <div className="absolute inset-0 bg-background/70 z-0 backdrop-blur-[2px]"></div>
            <motion.div className="glass-panel p-10 rounded-3xl w-full max-w-md z-10 relative m-4 text-center shadow-2xl">
                {status === 'loading' && <Loader2 className="w-16 h-16 text-primary animate-spin mb-4 mx-auto" />}
                {status === 'success' && <CheckCircle className="w-16 h-16 text-green-500 mb-4 mx-auto" />}
                {status === 'error' && <XCircle className="w-16 h-16 text-red-500 mb-4 mx-auto" />}
                
                <h2 className="text-2xl font-bold text-white mb-2">Email Update</h2>
                <p className="text-gray-400 text-sm mb-8">{message}</p>

                {status !== 'loading' && (
                    <button onClick={() => navigate('/login')} className="w-full py-4 bg-primary text-black font-semibold rounded-xl flex justify-center items-center gap-2">
                        Proceed to Login <ArrowRight size={18} />
                    </button>
                )}
            </motion.div>
        </div>
    );
}