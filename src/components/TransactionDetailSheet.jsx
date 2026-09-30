import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ArrowDownLeft, ArrowUpRight, Copy, Share, Tag, Calendar, MapPin, CreditCard } from 'lucide-react';
import { useWebHaptics } from "web-haptics/react";
import { TAP, TAP_TRANSITION } from "../constants/motion";
import Sheet from "./Sheet";

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
    // Income reads positive, spending negative (HIG semantic tints)
    const tint = isDeposit ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative";
    const dateObj = new Date(activeTransaction.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Mock extra data for visual richness
    const details = [
        { label: 'Status', value: 'Completed', icon: <div className="w-2 h-2 rounded-full bg-positive" /> },
        { label: 'Reference', value: reference, icon: <Copy size={14} className="text-ink-3" /> },
        { label: 'Category', value: isDeposit ? 'Income' : 'Expense', icon: <Tag size={16} className="text-ink-2" /> },
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
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${tint}`}>
                            {isDeposit ? (
                                <ArrowDownLeft size={32} />
                            ) : (
                                <ArrowUpRight size={32} />
                            )}
                        </div>
                        <h2 className="text-large-title font-bold text-ink leading-tight mb-1 tabular-nums">
                            {isDeposit ? '+' : '-'}₱{activeTransaction.amount.toLocaleString()}
                        </h2>
                        <p
                            onClick={() => onAccountClick && onAccountClick(activeTransaction)}
                            className={clsx(
                                "text-body font-medium text-ink-2",
                                onAccountClick && "cursor-pointer hover:text-ink transition-colors duration-150"
                            )}
                        >
                            {activeTransaction.bank}
                        </p>
                    </div>

                    {/* Details List */}
                    <div className="bg-fill rounded-2xl overflow-hidden mb-6">
                        <div className="flex items-center p-4 border-b border-separator">
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center mr-3 shrink-0 text-ink-2">
                                <Calendar size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-footnote text-ink-2">Date & Time</p>
                                <p className="text-subhead font-semibold text-ink">{dateStr} • {timeStr}</p>
                            </div>
                        </div>
                        <div className="flex items-center p-4 border-b border-separator">
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center mr-3 shrink-0 text-ink-2">
                                <MapPin size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-footnote text-ink-2">Location</p>
                                <p className="text-subhead font-semibold text-ink">{activeTransaction.location}</p>
                            </div>
                        </div>
                        <div
                            className={clsx("flex items-center p-4 cursor-pointer active:bg-fill transition-colors duration-150")}
                            onClick={() => onAccountClick && onAccountClick(activeTransaction)}
                        >
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center mr-3 shrink-0 text-ink-2">
                                <CreditCard size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-footnote text-ink-2">Account</p>
                                <p className={clsx("text-subhead font-semibold", onAccountClick ? "text-accent" : "text-ink")}>
                                    {activeTransaction.bank}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {details.map((detail, i) => (
                            <div key={i} className="bg-fill p-4 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-footnote text-ink-2 font-medium">{detail.label}</span>
                                    {detail.icon}
                                </div>
                                <p className="text-subhead font-semibold text-ink">{detail.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        className="w-full h-[52px] bg-black text-white rounded-xl font-bold text-body flex items-center justify-center mb-3 shadow-float"
                    >
                        <Share size={18} className="mr-2" />
                        Share Receipt
                    </motion.button>

                    <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() => { haptic.trigger("medium"); onClose(); }}
                        className="w-full h-[52px] bg-fill text-ink rounded-xl font-semibold text-body flex items-center justify-center"
                    >
                        Close
                    </motion.button>
                </div>
        </Sheet>
    );
}
