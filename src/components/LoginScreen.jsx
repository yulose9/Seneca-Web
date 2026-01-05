import React, { useState } from 'react';
import { authService } from '../services/authService';
import { Lock, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginScreen({ onLoginSuccess }) {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await authService.loginWithGoogle();
            // Force navigation to root to reset URL and context states
            window.location.href = "/";
        } catch (err) {
            console.error(err);
            setError(err.message || "Access Denied. Authorization failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#F2F2F7] z-[9999] flex flex-col items-center justify-center p-6 text-black text-center">
            {/* Background ambient aesthetic */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-blue-400/20 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] bg-purple-400/20 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative w-full max-w-sm bg-white/60 border border-white/50 rounded-[32px] p-8 backdrop-blur-xl shadow-2xl shadow-black/5"
            >
                <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-lg shadow-black/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                        <Lock size={40} className="text-[#007AFF] relative z-10" strokeWidth={2.5} />
                    </div>
                </div>

                <h1 className="text-[28px] font-bold mb-3 tracking-tight text-black">Seneca Vault</h1>
                <p className="text-[#8E8E93] text-[15px] mb-10 font-medium leading-relaxed">
                    Identity Verification Required<br />
                    <span className="text-xs opacity-70">Secure Cloud Environment</span>
                </p>

                {error && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mb-8 p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl text-[#FF3B30] text-[14px] font-medium text-left flex items-start gap-3"
                    >
                        <span>⚠️</span>
                        <span>{error}</span>
                    </motion.div>
                )}

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="group w-full py-4 bg-[#000000] text-white font-semibold rounded-2xl active:scale-[0.98] transition-all hover:bg-[#1C1C1E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-black/10"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Smartphone size={20} className="group-hover:scale-110 transition-transform" />
                            <span>Authenticate</span>
                        </>
                    )}
                </button>

                <div className="mt-8 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider opacity-60">
                        <span>Encrypted</span>
                        <div className="w-1 h-1 rounded-full bg-[#8E8E93]" />
                        <span>Private</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
