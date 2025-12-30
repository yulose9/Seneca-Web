import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ArrowDownLeft, ArrowUpRight, Copy, Share, Tag, Calendar, MapPin, CreditCard } from 'lucide-react';

const SystemColors = {
    green: '#34C759',
    red: '#FF3B30',
    blue: '#007AFF',
    gray: '#8E8E93',
};

export default function TransactionDetailSheet({ visible, onClose, transaction, onAccountClick }) {
    const [cachedTransaction, setCachedTransaction] = useState(transaction);

    useEffect(() => {
        if (transaction) setCachedTransaction(transaction);
    }, [transaction]);

    const activeTransaction = transaction || cachedTransaction;

    if (!activeTransaction) return null;

    const isDeposit = activeTransaction.type === 'deposit';
    const color = isDeposit ? SystemColors.green : SystemColors.red;
    const dateObj = new Date(activeTransaction.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Mock extra data for visual richness
    const details = [
        { label: 'Status', value: 'Completed', icon: <div className="w-2 h-2 rounded-full bg-[#34C759]" /> },
        { label: 'Reference', value: `#TRX-${Math.floor(Math.random() * 1000000)}`, icon: <Copy size={14} className="text-[rgba(60,60,67,0.4)]" /> },
        { label: 'Category', value: isDeposit ? 'Income' : 'Expense', icon: <Tag size={16} className="text-[rgba(60,60,67,0.6)]" /> },
    ];

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="ios-sheet-backdrop"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="ios-sheet"
                    >
                        {/* Handle */}
                        <div
                            className="flex justify-center pt-3 pb-2 cursor-pointer"
                            onClick={onClose}
                        >
                            <div className="ios-sheet-handle w-12 h-1.5" />
                        </div>

                        <div className="ios-sheet-content px-6 pb-12 pt-4">
                            {/* Icon & Title */}
                            <div className="flex flex-col items-center justify-center mb-6 text-center">
                                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${color}15` }}>
                                    {isDeposit ? (
                                        <ArrowDownLeft size={32} color={color} />
                                    ) : (
                                        <ArrowUpRight size={32} color={color} />
                                    )}
                                </div>
                                <h2 className="text-[32px] font-bold text-black tracking-tight leading-tight mb-1">
                                    {isDeposit ? '+' : '-'}₱{activeTransaction.amount.toLocaleString()}
                                </h2>
                                <p
                                    onClick={() => onAccountClick && onAccountClick(activeTransaction)}
                                    className={clsx(
                                        "text-[17px] font-medium text-[rgba(60,60,67,0.6)]",
                                        onAccountClick && "cursor-pointer hover:text-black transition-colors"
                                    )}
                                >
                                    {activeTransaction.bank}
                                </p>
                            </div>

                            {/* Details List */}
                            <div className="bg-[rgba(120,120,128,0.06)] rounded-2xl overflow-hidden mb-6">
                                <div className="flex items-center p-4 border-b border-[rgba(60,60,67,0.08)]">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shrink-0 text-[rgba(60,60,67,0.6)]">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] text-[rgba(60,60,67,0.6)]">Date & Time</p>
                                        <p className="text-[15px] font-semibold text-black">{dateStr} • {timeStr}</p>
                                    </div>
                                </div>
                                <div className="flex items-center p-4 border-b border-[rgba(60,60,67,0.08)]">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shrink-0 text-[rgba(60,60,67,0.6)]">
                                        <MapPin size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] text-[rgba(60,60,67,0.6)]">Location</p>
                                        <p className="text-[15px] font-semibold text-black">{activeTransaction.location}</p>
                                    </div>
                                </div>
                                <div
                                    className={clsx("flex items-center p-4 cursor-pointer active:bg-black/5 transition-colors")}
                                    onClick={() => onAccountClick && onAccountClick(activeTransaction)}
                                >
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shrink-0 text-[rgba(60,60,67,0.6)]">
                                        <CreditCard size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] text-[rgba(60,60,67,0.6)]">Account</p>
                                        <p className={clsx("text-[15px] font-semibold", onAccountClick ? "text-[#007AFF]" : "text-black")}>
                                            {activeTransaction.bank}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                {details.map((detail, i) => (
                                    <div key={i} className="bg-[rgba(120,120,128,0.06)] p-4 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[13px] text-[rgba(60,60,67,0.6)] font-medium">{detail.label}</span>
                                            {detail.icon}
                                        </div>
                                        <p className="text-[15px] font-semibold text-black">{detail.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                className="w-full h-[52px] bg-black text-white rounded-xl font-bold text-[17px] flex items-center justify-center mb-3 shadow-lg shadow-black/10"
                            >
                                <Share size={18} className="mr-2" />
                                Share Receipt
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={onClose}
                                className="w-full h-[52px] bg-[rgba(120,120,128,0.08)] text-black rounded-xl font-semibold text-[17px] flex items-center justify-center"
                            >
                                Close
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
