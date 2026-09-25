import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { registerUser, googleAuth, verifyEmail } from '../api/authApi';

export default function Register() {
    const navigate = useNavigate();
    
    // Form States
    const [formData, setFormData] = useState({ fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' });
    const [agreed, setAgreed] = useState(false);
    
    // UI States
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // NEW: Verification State
    const [isRegistered, setIsRegistered] = useState(false);
    const [verificationToken, setVerificationToken] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    // --- STEP 1: SUBMIT REGISTRATION ---
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (!agreed) {
            setError("You must agree to the Terms & Privacy Policy.");
            return;
        }

        setIsLoading(true);
        try {

            let cleanedPhone = formData.phoneNumber.replace(/\s/g, '');
            if (cleanedPhone.startsWith('0')) {
                cleanedPhone = '+94' + cleanedPhone.substring(1);
            }
            // FIX: Added confirmPassword to match the backend DTO requirement
            const dataToSubmit = {
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: cleanedPhone,
                password: formData.password,
                confirmPassword: formData.confirmPassword, 
                agreeToTerms: agreed,
                agreeToPrivacyPolicy: agreed
            };

            await registerUser(dataToSubmit);
            
            // Switch UI to the Verification Screen
            setIsRegistered(true);
            setSuccessMessage("Account created securely!");
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    // --- STEP 2: SUBMIT VERIFICATION TOKEN ---
    const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await verifyEmail(verificationToken.trim());
            setSuccessMessage("Email verified! Redirecting to login...");
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    // --- GOOGLE REGISTRATION (Fulfills requirement for BOTH methods) ---
    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError('');
        setIsLoading(true);
        try {
            const result = await googleAuth(credentialResponse.credential);
            localStorage.setItem('velocart_token', result.token);
            localStorage.setItem('velocart_user', JSON.stringify(result.user));
            navigate('/profile');
        } catch (err: any) {
            setError(err.toString());
            setIsLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background py-10">
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
                {/* ========================================== */}
                {/* VERIFICATION UI (Shown after successful submit) */}
                {/* ========================================== */}
                {isRegistered ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 rounded-full bg-primary/20 text-primary">
                                <Mail size={40} />
                            </div>
                        </div>
                        <h1 className="font-display text-2xl font-bold text-white mb-2">Check Your Email</h1>
                        <p className="text-gray-400 font-sans text-sm mb-6">
                            We saved your details and sent a verification code to <strong>{formData.email}</strong>. Please paste it below to activate your account.
                        </p>

                        <form onSubmit={handleVerify} className="space-y-4">
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input 
                                    name="token" 
                                    type="text" 
                                    value={verificationToken} 
                                    onChange={(e) => {setVerificationToken(e.target.value); setError('');}} 
                                    required 
                                    placeholder="Paste your code here" 
                                    className="glass-input w-full py-3 pl-12 pr-4 rounded-xl text-center tracking-widest" 
                                />
                            </div>
                            
                            {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}
                            {successMessage && <div className="p-3 rounded-lg bg-green-500/20 text-green-400 text-sm">{successMessage}</div>}

                            <button 
                                type="submit" 
                                disabled={isLoading || !verificationToken}
                                className="w-full py-4 mt-2 bg-primary text-black font-semibold rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all duration-300 disabled:opacity-70"
                            >
                                {isLoading ? 'Verifying...' : 'Verify & Login'}
                            </button>
                        </form>
                    </motion.div>
                ) : (
                /* ========================================== */
                /* STANDARD REGISTRATION UI                   */
                /* ========================================== */
                    <>
                        <div className="text-center mb-8">
                            <h1 className="font-display text-3xl font-bold text-white tracking-wide mb-2">Create Account</h1>
                            <p className="text-gray-400 font-sans text-sm">Join the Velocart ecosystem.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input name="fullName" type="text" value={formData.fullName} onChange={handleChange} required placeholder="Full Name" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                            </div>

                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="Email Address" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                            </div>

                            <div className="relative">
                                <Phone className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange} required placeholder="Mobile Number (e.g. +94...)" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="Secure Password" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required placeholder="Confirm Password" className="glass-input w-full py-3 pl-12 pr-4 rounded-xl" />
                            </div>

                            <div className="flex items-start gap-3 mt-4">
                                <input type="checkbox" id="terms" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(''); }} className="mt-1 w-4 h-4 rounded bg-black/50 border border-white/20 accent-primary" />
                                <label htmlFor="terms" className="text-xs text-gray-400">
                                    I agree to the <span onClick={() => window.open('/terms', '_blank')} className="text-primary hover:underline cursor-pointer">Terms & Conditions</span> and <span onClick={() => window.open('/privacy', '_blank')} className="text-primary hover:underline cursor-pointer">Privacy Policy</span>.
                                </label>
                            </div>

                            {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center">{error}</div>}

                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" 
                                disabled={isLoading}
                                className="w-full py-4 mt-2 bg-primary text-black font-semibold rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70"
                            >
                                {isLoading ? 'Creating Identity...' : 'Register Account'}
                                {!isLoading && <ArrowRight size={18} />}
                            </motion.button>
                        </form>

                        {/* VISUAL DIVIDER */}
                        <div className="my-6 flex items-center justify-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="px-4 text-gray-500 text-xs tracking-widest uppercase">Or</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        {/* GOOGLE OAUTH BUTTON (Fulfills BOTH registration methods) */}
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError("Google sign-up was cancelled or failed.")}
                                theme="filled_black"
                                shape="pill"
                                text="signup_with" 
                                width={350}
                            />
                        </div>

                        <div className="mt-6 text-center">
                            <button onClick={() => navigate('/login')} className="text-sm text-gray-400 hover:text-primary transition-colors duration-300">
                                Already have an account? Sign in
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}