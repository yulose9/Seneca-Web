import React, { useState, useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import PageTransition from '../components/PageTransition';
import RichTextEditor from '../components/RichTextEditor';
import JournalDetailSheet from '../components/JournalDetailSheet';
import { ChevronRight, Trash2, Check, BookOpen, SmilePlus } from 'lucide-react';

// Confirmation Dialog Component
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete" }) => (
    <AnimatePresence>
        {isOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300]"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl overflow-hidden z-[301] max-w-sm mx-auto shadow-2xl"
                >
                    <div className="p-6 text-center">
                        <h3 className="text-[17px] font-semibold text-black mb-2">{title}</h3>
                        <p className="text-[15px] text-[rgba(60,60,67,0.6)]">{message}</p>
                    </div>
                    <div className="border-t border-[rgba(60,60,67,0.12)] flex">
                        <motion.button
                            whileTap={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                            onClick={onClose}
                            className="flex-1 py-4 text-[17px] font-medium text-[#007AFF] border-r border-[rgba(60,60,67,0.12)]"
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            whileTap={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                            onClick={onConfirm}
                            className="flex-1 py-4 text-[17px] font-semibold text-[#FF3B30]"
                        >
                            {confirmText}
                        </motion.button>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
);

// Entry Row Component
const EntryRow = ({ item, isLast, isSelecting, isSelected, onSelect, onDelete, onClick, onLongPress }) => {
    const [showDelete, setShowDelete] = useState(false);
    const longPressTimer = useRef(null);
    const isLongPress = useRef(false);

    const handleTouchStart = (e) => {
        isLongPress.current = false;
        if (!isSelecting) {
            e.currentTarget.dataset.startX = e.touches[0].clientX;
            longPressTimer.current = setTimeout(() => {
                isLongPress.current = true;
                onLongPress?.(item.id);
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        }
    };

    const handleTouchMove = (e) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        if (!isSelecting && e.currentTarget.dataset.startX) {
            const diff = e.touches[0].clientX - parseFloat(e.currentTarget.dataset.startX);
            if (diff < -50) setShowDelete(true);
            if (diff > 50) setShowDelete(false);
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleClick = () => {
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }
        if (isSelecting) {
            onSelect(item.id);
        } else if (!showDelete) {
            onClick?.(item);
        }
    };

    const getMoodColor = (mood) => {
        // Simple helper if we want specific mood colors later
        return 'bg-[rgba(120,120,128,0.08)]';
    }

    return (
        <div className="relative overflow-hidden">
            <div
                className={clsx(
                    "absolute right-0 top-0 bottom-0 w-20 bg-[#FF3B30] flex items-center justify-center transition-transform duration-200",
                    showDelete ? "translate-x-0" : "translate-x-full"
                )}
            >
                <button
                    onClick={() => onDelete(item.id)}
                    className="w-full h-full flex items-center justify-center"
                >
                    <Trash2 size={20} className="text-white" />
                </button>
            </div>

            <motion.div
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                whileTap={!isSelecting && !showDelete ? { backgroundColor: 'rgba(0,0,0,0.04)' } : undefined}
                className={clsx(
                    "flex items-center p-4 cursor-pointer bg-white relative transition-transform duration-200 select-none",
                    !isLast && "border-b border-[rgba(60,60,67,0.12)]",
                    showDelete && "-translate-x-20"
                )}
            >
                <AnimatePresence>
                    {isSelecting && (
                        <motion.div
                            initial={{ width: 0, opacity: 0, marginRight: 0 }}
                            animate={{ width: 28, opacity: 1, marginRight: 12 }}
                            exit={{ width: 0, opacity: 0, marginRight: 0 }}
                            className="shrink-0 overflow-hidden"
                        >
                            <div className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors", isSelected ? "bg-[#007AFF] border-[#007AFF]" : "border-[rgba(60,60,67,0.3)]")}>
                                {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-xl mr-3 shrink-0", getMoodColor(item.mood))}>
                    {item.mood}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                        <p className="text-[15px] font-semibold text-black leading-snug truncate pr-2">{item.title}</p>
                        <span className="text-[11px] text-[rgba(60,60,67,0.4)] whitespace-nowrap">{item.time}</span>
                    </div>
                    <p className="text-[13px] text-[rgba(60,60,67,0.6)] leading-snug line-clamp-2">{item.preview}</p>
                </div>

                {!isSelecting && !showDelete && (
                    <ChevronRight size={18} className="text-[#C7C7CC] ml-2 shrink-0" />
                )}
            </motion.div>
        </div>
    );
};

// Random Moods Helper
const RANDOM_MOODS = ['😊', '🌟', '💭', '📝', '🎯', '🌱', '🍃', '🔥', '💡', '🌙', '☀️', '🌊'];
const getRandomMood = () => RANDOM_MOODS[Math.floor(Math.random() * RANDOM_MOODS.length)];

export default function Journal() {
    const [entry, setEntry] = useState(null);
    const [title, setTitle] = useState('');
    const [mood, setMood] = useState(getRandomMood());
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, itemId: null });
    const [viewEntry, setViewEntry] = useState(null);

    // Initial load from localStorage
    const [entries, setEntries] = useState(() => {
        try {
            const saved = localStorage.getItem('journal_entries');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return [] }
    });

    // Load drafts
    useEffect(() => {
        const savedTitle = localStorage.getItem('journal-draft-title');
        const savedMood = localStorage.getItem('journal-draft-mood');
        if (savedTitle) setTitle(savedTitle);
        if (savedMood) setMood(savedMood);
    }, []);

    // Save drafts
    useEffect(() => {
        localStorage.setItem('journal-draft-title', title);
        localStorage.setItem('journal-draft-mood', mood);
    }, [title, mood]);

    // Save Persistent Entires
    useEffect(() => {
        localStorage.setItem('journal_entries', JSON.stringify(entries));
    }, [entries]);

    const handleUpdateEntry = useCallback((updatedEntry) => {
        setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
        setViewEntry(prev => (prev && prev.id === updatedEntry.id ? updatedEntry : prev));
    }, []);

    // Helper to extract plain text from Tiptap JSON
    const getPlainTextFromJson = (json) => {
        if (!json || !json.content) return '';
        const extractText = (nodes) => {
            if (!nodes) return '';
            return nodes.map(node => {
                if (node.type === 'text') return node.text || '';
                if (node.content) return extractText(node.content);
                return '';
            }).join(' ');
        };
        return extractText(json.content).trim();
    };

    const handleSave = useCallback(async () => {
        // Check if we have content (either JSON object or title)
        const hasJsonContent = entry && typeof entry === 'object' && entry.content && entry.content.length > 0;
        const hasNonEmptyContent = hasJsonContent && getPlainTextFromJson(entry).length > 0;

        if (!hasNonEmptyContent && !title) return;
        setIsSaving(true);

        // Generate Preview from JSON
        const plainText = getPlainTextFromJson(entry);
        const preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');

        const finalTitle = title.trim() || "Untitled Entry";

        const newEntry = {
            id: Date.now(),
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            isoDate: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            title: finalTitle,
            preview: preview || "No additional text",
            content: entry, // This is now JSON!
            mood: mood
        };

        // Artificial delay for UX
        await new Promise(resolve => setTimeout(resolve, 600));

        setEntries(prev => [newEntry, ...prev]);

        // Clear logic
        try {
            localStorage.removeItem('journal-draft');
            localStorage.removeItem('journal-draft-title');
            localStorage.removeItem('journal-draft-mood');
        } catch (e) { }

        setEntry(null);
        setTitle('');
        setMood(getRandomMood());
        setIsSaving(false);
    }, [entry, title, mood]);

    const handleSelect = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            return newSet;
        });
    };
    const handleDeleteSingle = (id) => setConfirmDialog({ isOpen: true, type: 'single', itemId: id });
    const handleDeleteSelected = () => { if (selectedIds.size > 0) setConfirmDialog({ isOpen: true, type: 'bulk', itemId: null }); };
    const handleConfirmDelete = () => {
        if (confirmDialog.type === 'single') setEntries(prev => prev.filter(e => e.id !== confirmDialog.itemId));
        else { setEntries(prev => prev.filter(e => !selectedIds.has(e.id))); setSelectedIds(new Set()); setIsSelecting(false); }
        setConfirmDialog({ isOpen: false, type: null, itemId: null });
    };
    const handleSelectAll = () => setSelectedIds(selectedIds.size === entries.length ? new Set() : new Set(entries.map(e => e.id)));
    const handleLongPress = (id) => { setIsSelecting(true); setSelectedIds(new Set([id])); };


    // Check if entry has content (JSON format)
    const hasJsonContent = entry && typeof entry === 'object' && entry.content && entry.content.length > 0;
    const hasContent = (hasJsonContent && getPlainTextFromJson(entry).length > 0) || title.length > 0;

    // Categorize
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = entries.filter(e => e.isoDate === today);
    const pastEntries = entries.filter(e => e.isoDate !== today);

    return (
        <PageTransition className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Header */}
            <header className="pt-14 px-5 pb-4 flex justify-between items-end">
                <div>
                    <motion.h1 className="ios-large-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>The Mirror</motion.h1>
                    <motion.p className="text-[17px] text-[rgba(60,60,67,0.6)] mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>Reflect on your journey</motion.p>
                </div>
                {entries.length > 0 && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => { setIsSelecting(!isSelecting); setSelectedIds(new Set()); }}
                        className="text-[17px] font-medium text-[#007AFF] mb-1"
                    >
                        {isSelecting ? 'Done' : 'Edit'}
                    </motion.button>
                )}
            </header>

            {/* Selection bar - Global */}
            <AnimatePresence>
                {isSelecting && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 mb-4 overflow-hidden">
                        <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-black/[0.04] shadow-sm">
                            <button onClick={handleSelectAll} className="text-[15px] font-medium text-[#007AFF]">{selectedIds.size === entries.length ? 'Deselect All' : 'Select All'}</button>
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] text-[rgba(60,60,67,0.6)]">{selectedIds.size} selected</span>
                                <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0} className={clsx("px-4 py-2 rounded-lg text-[15px] font-semibold transition-colors", selectedIds.size > 0 ? "bg-[#FF3B30] text-white" : "bg-[rgba(120,120,128,0.12)] text-[rgba(60,60,67,0.3)]")}>Delete</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Editor Area */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-5 mb-8">
                <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative z-10">

                    {/* Title & Mood Row */}
                    <div className="flex items-start gap-3 mb-4">
                        <div className="relative">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="w-12 h-12 rounded-full bg-[#f2f2f7] flex items-center justify-center text-2xl hover:bg-[#e5e5ea] transition-colors"
                            >
                                {mood}
                            </motion.button>
                            {showEmojiPicker && (
                                <div className="absolute top-14 left-0 z-50 shadow-2xl rounded-2xl">
                                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                                    <div className="relative z-50">
                                        <EmojiPicker
                                            onEmojiClick={(e) => { setMood(e.emoji); setShowEmojiPicker(false); }}
                                            width={300}
                                            height={400}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <textarea
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Title your entry..."
                            className="flex-1 bg-transparent text-[22px] font-bold text-black placeholder:text-black/20 resize-none outline-none py-2 leading-tight"
                            rows={1}
                            style={{ minHeight: '48px' }}
                        />
                    </div>

                    <div className="w-full h-px bg-black/[0.06] mb-4" />

                    <RichTextEditor
                        content={entry}
                        onChange={setEntry}
                        placeholder="Write your thoughts..."
                        autoSaveKey="journal-draft"
                        className="min-h-[150px]"
                    />

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave}
                        disabled={!hasContent || isSaving}
                        className={clsx(
                            "w-full h-[50px] rounded-xl font-semibold text-[17px] mt-4 transition-all",
                            hasContent && !isSaving ? "bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/25" : "bg-[rgba(120,120,128,0.12)] text-[rgba(60,60,67,0.3)]"
                        )}
                    >
                        {isSaving ? 'Saving...' : 'Save Entry'}
                    </motion.button>
                </div>
            </motion.section>

            {/* Content Lists (Today / Past) */}
            {todayEntries.length > 0 && (
                <section className="px-5 mb-8">
                    <h3 className="ios-list-header uppercase mb-2">Today</h3>
                    <div className="bg-white rounded-xl overflow-hidden border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        {todayEntries.map((item, index) => (
                            <EntryRow key={item.id} item={item} isLast={index === todayEntries.length - 1} isSelecting={isSelecting} isSelected={selectedIds.has(item.id)} onSelect={handleSelect} onDelete={handleDeleteSingle} onClick={setViewEntry} onLongPress={handleLongPress} />
                        ))}
                    </div>
                </section>
            )}

            <section className="px-5">
                {pastEntries.length > 0 && <h3 className="ios-list-header uppercase mb-2">Past Entries</h3>}

                {pastEntries.length > 0 ? (
                    <div className="bg-white rounded-xl overflow-hidden border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        {pastEntries.map((item, index) => (
                            <EntryRow key={item.id} item={item} isLast={index === pastEntries.length - 1} isSelecting={isSelecting} isSelected={selectedIds.has(item.id)} onSelect={handleSelect} onDelete={handleDeleteSingle} onClick={setViewEntry} onLongPress={handleLongPress} />
                        ))}
                    </div>
                ) : (
                    entries.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-8">
                            <span className="text-5xl mb-4">✨</span>
                            <p className="text-[17px] font-semibold text-black text-center mb-2">No Entries Yet</p>
                            <p className="text-[15px] text-[rgba(60,60,67,0.6)] text-center">Start your journal by writing above.</p>
                        </div>
                    )
                )}
            </section>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, type: null, itemId: null })}
                onConfirm={handleConfirmDelete}
                title={confirmDialog.type === 'bulk' ? `Delete ${selectedIds.size} Entries?` : 'Delete Entry?'}
                message="This action cannot be undone."
            />

            <JournalDetailSheet
                isOpen={!!viewEntry}
                onClose={() => setViewEntry(null)}
                entry={viewEntry}
                onUpdate={handleUpdateEntry}
            />
        </PageTransition>
    );
}