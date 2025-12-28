import React, { useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { ChevronDown, Plus, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

// Asset Row (Phantom-style)
const AssetRow = ({ icon, name, platform, amount, value, change, isPositive = true, onClick }) => (
    <motion.div
        onClick={onClick}
        whileTap={{ scale: 0.98, backgroundColor: 'rgba(0,0,0,0.02)' }}
        className="flex items-center p-4 cursor-pointer"
    >
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-xl mr-3 shrink-0">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-black truncate">{name}</p>
            <p className="text-[13px] text-[rgba(60,60,67,0.6)]">{platform}</p>
        </div>
        <div className="text-right">
            <p className="text-[16px] font-bold text-black">₱{value.toLocaleString()}</p>
            {change !== undefined && (
                <p className={clsx(
                    "text-[13px] font-semibold",
                    isPositive ? "text-[#34C759]" : "text-[#FF3B30]"
                )}>
                    {isPositive ? '+' : '-'}₱{Math.abs(change).toLocaleString()}
                </p>
            )}
        </div>
    </motion.div>
);

// Transaction Card (from mockup)
const TransactionCard = ({ bank, location, amount, type = 'deposit' }) => (
    <motion.div
        whileTap={{ scale: 0.98 }}
        className="flex items-center p-4 bg-white rounded-xl border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer"
    >
        <div className="w-10 h-10 rounded-full border-2 border-[rgba(60,60,67,0.2)] flex items-center justify-center mr-3">
            {type === 'deposit' ? (
                <ArrowDownLeft size={18} className="text-[#34C759]" />
            ) : (
                <ArrowUpRight size={18} className="text-[#FF3B30]" />
            )}
        </div>
        <div className="flex-1">
            <p className="text-[16px] font-semibold text-black">{bank}</p>
            <p className="text-[13px] text-[rgba(60,60,67,0.6)]">{location}</p>
        </div>
        <p className={clsx(
            "text-[17px] font-bold",
            type === 'deposit' ? "text-black" : "text-[#FF3B30]"
        )}>
            {type === 'withdrawal' && '-'}₱{amount.toLocaleString()}
        </p>
    </motion.div>
);

// Category Dropdown
const CategoryDropdown = ({ selected, options, onSelect, isOpen, setIsOpen }) => (
    <div className="relative">
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-white/90 font-semibold text-[15px]"
        >
            {selected}
            <ChevronDown size={18} className={clsx("transition-transform", isOpen && "rotate-180")} />
        </motion.button>

        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-black/[0.06] overflow-hidden min-w-[140px] z-50"
                >
                    {options.map(option => (
                        <motion.button
                            key={option}
                            whileTap={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
                            onClick={() => { onSelect(option); setIsOpen(false); }}
                            className={clsx(
                                "w-full px-4 py-3 text-left text-[15px] font-medium",
                                selected === option ? "text-[#007AFF] bg-[#007AFF]/5" : "text-black"
                            )}
                        >
                            {option}
                        </motion.button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

export default function Wealth() {
    const [selectedCategory, setSelectedCategory] = useState('All Assets');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const categories = ['All Assets', 'Savings', 'Investments', 'Liabilities'];

    const assets = [
        {
            id: 'maribank',
            icon: '🏦',
            name: 'MariBank',
            platform: 'Emergency Fund',
            amount: 1928,
            value: 1928,
            change: 312.82,
            isPositive: true,
            category: 'Savings'
        },
        {
            id: 'trading212',
            icon: '📈',
            name: 'Trading212',
            platform: 'AI Growth Stocks',
            amount: 5000,
            value: 5000,
            change: 145.50,
            isPositive: true,
            category: 'Investments'
        },
        {
            id: 'gcash',
            icon: '💳',
            name: 'GCash',
            platform: 'Digital Wallet',
            amount: 850,
            value: 850,
            change: 0,
            isPositive: true,
            category: 'Savings'
        },
    ];

    const liabilities = [
        {
            id: 'kuya',
            icon: '🤝',
            name: 'Loan from Kuya',
            platform: 'Personal - PRIORITY',
            amount: 16000,
            value: -16000,
            category: 'Liabilities',
            isPriority: true
        },
        {
            id: 'other',
            icon: '🏦',
            name: 'Other Loans',
            platform: 'Bank / Other',
            amount: 160000,
            value: -160000,
            category: 'Liabilities',
            isPriority: false
        },
    ];

    const transactions = [
        {
            date: 'January 9, 2025', items: [
                { bank: 'MariBank', location: 'Imus, Cavite', amount: 312.82, type: 'deposit' }
            ]
        },
        {
            date: 'January 2, 2025', items: [
                { bank: 'MariBank', location: 'Imus, Cavite', amount: 312.82, type: 'deposit' },
                { bank: 'MariBank', location: 'Imus, Cavite', amount: 312.82, type: 'deposit' }
            ]
        },
    ];

    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
    const netWorth = totalAssets - totalLiabilities;
    const totalChange = assets.reduce((sum, a) => sum + (a.change || 0), 0);
    const changePercentage = totalAssets > 0 ? ((totalChange / (totalAssets - totalChange)) * 100).toFixed(2) : 0;

    // Filter based on selected category
    const filteredAssets = selectedCategory === 'All Assets'
        ? assets
        : selectedCategory === 'Liabilities'
            ? []
            : assets.filter(a => a.category === selectedCategory);

    const filteredLiabilities = selectedCategory === 'All Assets' || selectedCategory === 'Liabilities'
        ? liabilities
        : [];

    const displayedBalance = selectedCategory === 'Liabilities'
        ? totalLiabilities
        : selectedCategory === 'All Assets'
            ? netWorth
            : filteredAssets.reduce((sum, a) => sum + a.amount, 0);

    return (
        <PageTransition className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Phantom-style Dark Header */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative overflow-hidden"
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a] via-[#1e3a2f] to-[#2d4a3e]" />

                {/* Content */}
                <div className="relative pt-14 pb-8 px-5">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between mb-8">
                        <CategoryDropdown
                            selected={selectedCategory}
                            options={categories}
                            onSelect={setSelectedCategory}
                            isOpen={isDropdownOpen}
                            setIsOpen={setIsDropdownOpen}
                        />
                        <div className="flex items-center gap-3">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                            >
                                <Plus size={20} className="text-white" />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                            >
                                <Search size={20} className="text-white" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Balance Display */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-center mb-6"
                    >
                        <p className={clsx(
                            "text-[48px] font-bold tracking-tight",
                            displayedBalance >= 0 ? "bg-gradient-to-br from-[#86EFAC] to-[#22C55E] bg-clip-text text-transparent" : "text-[#FF6B6B]"
                        )}>
                            {displayedBalance < 0 && '-'}₱{Math.abs(displayedBalance).toLocaleString()}
                        </p>
                        {selectedCategory !== 'Liabilities' && totalChange > 0 && (
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <span className="text-[#4ADE80] text-[15px] font-semibold">
                                    +₱{totalChange.toLocaleString()}
                                </span>
                                <span className="text-[#4ADE80] text-[15px] font-semibold">
                                    +{changePercentage}%
                                </span>
                            </div>
                        )}
                    </motion.div>
                </div>
            </motion.div>

            {/* Priority Liabilities Alert - Always show if exists */}
            {liabilities.some(l => l.isPriority) && selectedCategory !== 'Savings' && selectedCategory !== 'Investments' && (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mx-5 mt-6"
                >
                    <div className="bg-gradient-to-r from-[#FF3B30] to-[#FF6B6B] rounded-2xl p-4 shadow-lg shadow-[#FF3B30]/20">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                                ⚠️
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] font-bold text-white/80 uppercase tracking-wide">
                                    Priority Payment
                                </p>
                                <p className="text-[20px] font-bold text-white">
                                    Loan from Kuya
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[24px] font-bold text-white">
                                    ₱{liabilities.find(l => l.isPriority)?.amount.toLocaleString()}
                                </p>
                                <p className="text-[12px] text-white/70">
                                    Outstanding
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.section>
            )}

            {/* Liabilities List - Show BEFORE Assets for visibility */}
            {filteredLiabilities.length > 0 && (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mx-5 mt-6"
                >
                    <h3 className="text-[13px] font-semibold text-[#FF3B30] uppercase tracking-wide mb-2 px-1">
                        🚨 Obligations
                    </h3>
                    <div className="bg-white rounded-2xl overflow-hidden border border-[#FF3B30]/20 shadow-[0_2px_12px_rgba(255,59,48,0.1)]">
                        {filteredLiabilities.map((liability, index) => (
                            <div key={liability.id}>
                                <div className={`flex items-center p-4 ${liability.isPriority ? 'bg-[#FF3B30]/5' : ''}`}>
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl mr-3 shrink-0 ${liability.isPriority ? 'bg-[#FF3B30]/20' : 'bg-[#FF3B30]/10'
                                        }`}>
                                        {liability.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[16px] font-semibold text-black">{liability.name}</p>
                                            {liability.isPriority && (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FF3B30] text-white">
                                                    Priority
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-[rgba(60,60,67,0.6)]">{liability.platform}</p>
                                    </div>
                                    <p className="text-[16px] font-bold text-[#FF3B30]">
                                        -₱{liability.amount.toLocaleString()}
                                    </p>
                                </div>
                                {index < filteredLiabilities.length - 1 && (
                                    <div className="h-px bg-[rgba(60,60,67,0.12)] ml-[68px]" />
                                )}
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}

            {/* Assets List */}
            {filteredAssets.length > 0 && (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mx-5 mt-6"
                >
                    <h3 className="text-[13px] font-semibold text-[#34C759] uppercase tracking-wide mb-2 px-1">
                        💰 Assets
                    </h3>
                    <div className="bg-white rounded-2xl overflow-hidden border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                        {filteredAssets.map((asset, index) => (
                            <div key={asset.id}>
                                <AssetRow
                                    icon={asset.icon}
                                    name={asset.name}
                                    platform={asset.platform}
                                    amount={asset.amount}
                                    value={asset.value}
                                    change={asset.change}
                                    isPositive={asset.isPositive}
                                />
                                {index < filteredAssets.length - 1 && (
                                    <div className="h-px bg-[rgba(60,60,67,0.12)] ml-[68px]" />
                                )}
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}



            {/* Transactions Section */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mx-5 mt-8"
            >
                <h3 className="text-[20px] font-bold text-black mb-4">Transactions</h3>

                {transactions.map((group, groupIndex) => (
                    <div key={groupIndex} className="mb-4">
                        <p className="text-[13px] font-semibold text-[rgba(60,60,67,0.6)] mb-2">
                            {group.date}
                        </p>
                        <div className="space-y-2">
                            {group.items.map((transaction, index) => (
                                <TransactionCard
                                    key={index}
                                    bank={transaction.bank}
                                    location={transaction.location}
                                    amount={transaction.amount}
                                    type={transaction.type}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Manage Token Link */}
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 text-center text-[15px] font-semibold text-[rgba(60,60,67,0.6)]"
                >
                    Manage accounts list
                </motion.button>
            </motion.section>
        </PageTransition>
    );
}