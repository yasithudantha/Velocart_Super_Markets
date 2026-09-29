import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
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
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="font-display text-3xl font-bold text-white tracking-wide">Terms & Conditions</h1>
                        <p className="text-primary font-sans text-sm mt-1">Last Updated: September 2026</p>
                    </div>
                </div>

                <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white max-w-none space-y-6 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold mb-2">1. Acceptance of Terms</h2>
                        <p>By registering for an account and accessing the Velocart Smart Supermarket ecosystem (including the web dashboard, mobile application, and in-store AI terminals), you agree to be bound by these Terms of Service. If you do not agree, you must immediately cease use of our platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-2">2. Account Security & Identity</h2>
                        <p>You are solely responsible for maintaining the confidentiality of your cryptographic login credentials (including passwords and OAuth tokens). You must ensure that your registered email address and E.164-formatted mobile phone number remain accurate. Velocart employs automated brute-force protection and will temporarily lock accounts exhibiting suspicious activity to protect your data.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-2">3. Orders, Deliveries & Addresses</h2>
                        <p>Users may maintain multiple delivery addresses (e.g., Home, Office). You are responsible for ensuring the active default address is accurate before initiating an order. Velocart reserves the right to cancel orders if a delivery address is deemed inaccessible or outside of our logistics geofence.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-2">4. AI & Smart Features</h2>
                        <p>Velocart utilizes Artificial Intelligence (including predictive carts and recommendation algorithms). While we strive for absolute accuracy, AI-generated suggestions do not constitute binding guarantees of product availability or pricing.</p>
                    </section>
                </div>
            </motion.div>
        </div>
    );
}