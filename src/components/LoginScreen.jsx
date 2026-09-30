import React, { useState } from 'react';
import { useWebHaptics } from 'web-haptics/react';
import { authService } from '../services/authService';
import { AlertCircle, Lock, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { EASE_OUT } from '../constants/motion';

export default function LoginScreen({ onLoginSuccess }) {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const haptic = useWebHaptics();

    const handleLogin = async () => {
        haptic.trigger('medium');
        setLoading(true);
        setError(null);
        try {
            await authService.loginWithGoogle();
            haptic.trigger('success');
            // Force navigation to root to reset URL and context states
            window.location.href = "/";
        } catch (err) {
            console.error(err);
            haptic.trigger('error');
            setError(err.message || "Access Denied. Authorization failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-canvas z-[9999] flex flex-col items-center justify-center p-6 text-ink text-center">
            {/* Background ambient aesthetic */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-blue-400/20 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] bg-purple-400/20 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0 }}
                className="relative w-full max-w-sm bg-white/60 border border-white/50 rounded-sheet p-8 backdrop-blur-xl shadow-float"
            >
                <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 bg-surface rounded-sheet flex items-center justify-center shadow-float relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                        <Lock size={40} className="text-accent relative z-10" strokeWidth={2.5} />
                    </div>
                </div>

                <h1 className="text-title-1 font-bold mb-3 tracking-tight text-ink">Seneca Vault</h1>
                <p className="text-ink-2 text-subhead mb-10 font-medium leading-relaxed">
                    Identity Verification Required<br />
                    <span className="text-caption opacity-70">Secure Cloud Environment</span>
                </p>

                {error && (
                    <motion.div
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                        className="mb-8 p-4 bg-negative/10 border border-negative/20 rounded-2xl text-negative text-subhead font-medium text-left flex items-start gap-3"
                    >
                        <AlertCircle size={18} strokeWidth={2} className="shrink-0 mt-px" aria-hidden="true" />
                        <span>{error}</span>
                    </motion.div>
                )}

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="group w-full py-4 bg-ink text-white font-semibold rounded-2xl active:scale-[0.96] transition-[scale,background-color] duration-150 ease-out hover:bg-ink disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-float"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Smartphone size={20} strokeWidth={2} className="group-hover:scale-110 transition-[scale] duration-150 ease-out" aria-hidden="true" />
                            <span>Authenticate</span>
                        </>
                    )}
                </button>

                <div className="mt-8 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-caption font-semibold text-ink-2 opacity-60">
                        <span>Encrypted</span>
                        <div className="w-1 h-1 rounded-full bg-ink-3" />
                        <span>Private</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
