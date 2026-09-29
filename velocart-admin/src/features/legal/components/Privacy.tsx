import { motion } from 'framer-motion';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen relative overflow-hidden bg-background py-12 px-4 sm:px-6 lg:px-8">
            <video autoPlay loop muted playsInline className="fixed top-0 left-0 w-full h-full object-cover z-0 opacity-20">
                <source src="/bg-video.mp4" type="video/mp4" />
            </video>
            <div className="fixed inset-0 bg-background/80 z-0 backdrop-blur-sm"></div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 sm:p-12 rounded-3xl w-full max-w-4xl z-10 relative mx-auto shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors mb-8">
                    <ArrowLeft size={20} /> Back
                </button>

                <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <div className="p-4 rounded-xl bg-primary/10 text-primary">
                        <LockKeyhole size={32} />
                    </div>
                    <div>
                        <h1 className="font-display text-3xl font-bold text-white tracking-wide">Privacy Policy</h1>
                        <p className="text-primary font-sans text-sm mt-1">Last Updated: September 2026</p>
                    </div>
                </div>

                <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white max-w-none space-y-6 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold mb-2">1. Data Collection</h2>
                        <p>Velocart strictly limits data collection to what is necessary for operations. We collect Identity Data (Name, Email, Phone), Authentication Data (BCrypt-hashed passwords, OAuth tokens), and Logistics Data (Delivery Addresses). We **never** store passwords in plain text.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-2">2. Use of Information</h2>
                        <p>Your data is exclusively used to authenticate your sessions via JWT (JSON Web Tokens), process your grocery orders, execute deliveries to your saved addresses, and provide intelligent product recommendations. We do not sell your personal data to third-party advertisers.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-2">3. Third-Party OAuth Providers</h2>
                        <p>If you choose to use "Continue with Google," we receive your cryptographic ID token, email, and basic profile data strictly for authentication and account linking purposes. This data is subject to Google's independent Privacy Policy.</p>
                    </section>
                </div>
            </motion.div>
        </div>
    );
}