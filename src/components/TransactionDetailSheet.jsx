import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ArrowDownLeft, ArrowUpRight, Copy, Share, Tag, Calendar, MapPin, CreditCard } from 'lucide-react';
import { useWebHaptics } from "web-haptics/react";
import { TAP, TAP_TRANSITION } from "../constants/motion";
import Sheet from "./Sheet";

const SystemColors = {
    green: '#34C759',
    red: '#FF3B30',
    blue: '#007AFF',
    gray: '#8E8E93',
};

export default function TransactionDetailSheet({ visible, onClose, transaction, onAccountClick }) {
    const [cachedTransaction, setCachedTransaction] = useState(transaction);
    const haptic = useWebHaptics();

    // Keep the last transaction so the sheet can finish its exit after the parent clears it
    if (transaction && transaction !== cachedTransaction) setCachedTransaction(transaction);

    const activeTransaction = transaction || cachedTransaction;

    // Stable per transaction — Math.random() here re-rolled the reference on every render
    const reference = useMemo(() => {
        const seed = String(activeTransaction?.id ?? activeTransaction?.date ?? '');
        let hash = 0;
        for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
        return `#TRX-${String(hash % 1000000).padStart(6, '0')}`;
    }, [activeTransaction?.id, activeTransaction?.date]);

    if (!activeTransaction) return null;

    const isDeposit = activeTransaction.type === 'deposit';
    const color = isDeposit ? SystemColors.green : SystemColors.red;
    const dateObj = new Date(activeTransaction.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Mock extra data for visual richness
    const details = [
        { label: 'Status', value: 'Completed', icon: <div className="w-2 h-2 rounded-full bg-[#34C759]" /> },
        { label: 'Reference', value: reference, icon: <Copy size={14} className="text-[rgba(60,60,67,0.4)]" /> },
        { label: 'Category', value: isDeposit ? 'Income' : 'Expense', icon: <Tag size={16} className="text-[rgba(60,60,67,0.6)]" /> },
    ];

    return (
        <Sheet
            open={visible}
            onClose={() => { haptic.trigger("medium"); onClose(); }}
            zIndex={200}
            label="Transaction details"
            backdropClassName="ios-sheet-backdrop"
            className="ios-sheet"
        >
                {/* Handle */}
                <div
                    className="flex justify-center pt-3 pb-2 cursor-pointer"
                    onClick={() => { haptic.trigger("medium"); onClose(); }}
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
                        <h2 className="text-[32px] font-bold text-black tracking-tight leading-tight mb-1 tabular-nums">
                            {isDeposit ? '+' : '-'}₱{activeTransaction.amount.toLocaleString()}
                        </h2>
                        <p
                            onClick={() => onAccountClick && onAccountClick(activeTransaction)}
                            className={clsx(
                                "text-[17px] font-medium text-[rgba(60,60,67,0.6)]",
                                onAccountClick && "cursor-pointer hover:text-black transition-colors duration-150"
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
                            className={clsx("flex items-center p-4 cursor-pointer active:bg-black/5 transition-colors duration-150")}
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
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        className="w-full h-[52px] bg-black text-white rounded-xl font-bold text-[17px] flex items-center justify-center mb-3 shadow-lg shadow-black/10"
                    >
                        <Share size={18} className="mr-2" />
                        Share Receipt
                    </motion.button>

                    <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() => { haptic.trigger("medium"); onClose(); }}
                        className="w-full h-[52px] bg-[rgba(120,120,128,0.08)] text-black rounded-xl font-semibold text-[17px] flex items-center justify-center"
                    >
                        Close
                    </motion.button>
                </div>
        </Sheet>
    );
}
