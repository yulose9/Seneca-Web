import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, ChevronLeft, Save, Sparkles, History as HistoryIcon, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import EmojiPicker from 'emoji-picker-react';
import RichTextEditor from './RichTextEditor';
import { refineEntryWithGemini } from '../services/journalAI';

// Relative Time Helper
const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Today';
    const date = new Date(dateStr);
    const now = new Date();
    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = d2 - d1;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return 'Over a year ago';
};

const HistoryViewer = ({ history, onRestore, onClose }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute inset-x-4 top-20 bottom-4 bg-white rounded-2xl shadow-2xl border border-black/5 z-50 overflow-hidden flex flex-col"
    >
        <div className="flex items-center justify-between p-4 border-b border-black/5 bg-gray-50/50">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <HistoryIcon size={18} />
                Entry History
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full">
                <X size={20} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(!history || history.length === 0) && (
                <div className="text-center text-gray-400 py-8">No edit history available.</div>
            )}
            {history?.slice().reverse().map((ver, idx) => (
                <div key={ver.timestamp || idx} className="border border-black/5 rounded-xl p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-0.5">
                                {ver.action || 'Edit'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {new Date(ver.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <button
                            onClick={() => onRestore(ver)}
                            className="flex items-center gap-1 text-xs font-semibold bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200"
                        >
                            <RotateCcw size={12} /> Restore
                        </button>
                    </div>
                    <p className="font-medium text-sm text-gray-900 truncate">{ver.title}</p>
                    <div className="text-xs text-gray-500 line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: ver.content }} />
                </div>
            ))}
        </div>
    </motion.div>
);

export default function JournalDetailSheet({ isOpen, onClose, entry, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);

    // Form States
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [content, setContent] = useState(null); // Now accepts JSON
    const [mood, setMood] = useState('😊');

    // History State
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // UI States
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [justRefined, setJustRefined] = useState(false); // For Undo button

    // Reset state when entry changes
    useEffect(() => {
        if (entry) {
            setTitle(entry.title || '');
            setDate(entry.isoDate || new Date().toISOString().split('T')[0]);
            setTime(entry.time || '');
            // Content can be JSON object or legacy HTML string
            setContent(entry.content || null);
            setMood(entry.mood || '😊');
            setHistory(entry.history || []);
            setJustRefined(false);
        }
        setIsEditing(false);
        setIsRefining(false);
        setShowHistory(false);
        setShowEmojiPicker(false);
    }, [entry, isOpen]);

    if (!entry && !isOpen) return null;
    const safeEntry = entry || { date: '', preview: '', mood: '', content: '' };

    const saveToHistory = (actionName) => {
        const newVersion = {
            timestamp: Date.now(),
            title,
            content,
            mood,
            date,
            time,
            action: actionName
        };
        // Don't duplicate if identical to last
        if (history.length > 0) {
            const last = history[history.length - 1];
            if (last.title === title && last.content === content && last.mood === mood) return history;
        }
        return [...history, newVersion];
    };

    const handleSave = () => {
        const dateObj = new Date(date);
        const displayDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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

        // Generate preview from JSON or fallback to HTML parsing for legacy content
        let plainText = '';
        if (content && typeof content === 'object') {
            plainText = getPlainTextFromJson(content);
        } else if (typeof content === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            plainText = tempDiv.innerText || tempDiv.textContent || "";
        }
        const preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');

        const newHistory = saveToHistory("Manual Edit");

        const updated = {
            ...entry,
            title,
            date: displayDate,
            isoDate: date,
            time,
            content,
            mood,
            preview,
            history: newHistory
        };

        onUpdate?.(updated);
        setIsEditing(false);
    };

    const handleRefine = async () => {
        setIsRefining(true);
        setJustRefined(false);

        // Save state BEFORE refine
        const currentHistory = saveToHistory("Before Stoic Rewrite");
        setHistory(currentHistory); // Update local state immediately

        try {
            const result = await refineEntryWithGemini(title, content);

            if (result.title) setTitle(result.title);
            if (result.content) setContent(result.content);

            // Auto-Save the updated entry

            const newDateObj = new Date(date);
            const newDisplayDate = newDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            // Preview gen
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = result.content || content;
            const plainText = tempDiv.innerText || tempDiv.textContent || "";
            const preview = plainText.replace(/\n/g, ' ').substring(0, 100) + (plainText.length > 100 ? '...' : '');

            const updatedEntry = {
                ...entry,
                title: result.title || title,
                content: result.content || content,
                date: newDisplayDate,
                isoDate: date,
                time,
                mood,
                preview,
                history: currentHistory // Save the 'Before' state
            };

            onUpdate?.(updatedEntry); // Persist immediately
            setJustRefined(true); // Show Undo

        } catch (e) {
            console.error(e);
            alert("Failed to refine entry. Please try again.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleUndo = () => {
        if (history.length > 0) {
            const lastVersion = history[history.length - 1];
            handleRestore(lastVersion); // Restore updates parent too
            setJustRefined(false);
        }
    };

    const handleRestore = (version) => {
        setTitle(version.title);
        setContent(version.content);
        setMood(version.mood);
        if (version.date) setDate(version.date);

        // We also need to SAVE this restoration logic to parent
        // But if we are Restoring, we add the "Undone" state to history? 
        // Or do we just revert? 
        // Typically "Restore" is a NEW edit that matches the old one.

        const newHistory = [...history, {
            timestamp: Date.now(),
            title, // Current (bad) title
            content, // Current (bad) content
            mood,
            action: "Reverted Change"
        }];

        const updatedEntry = {
            ...entry,
            title: version.title,
            content: version.content,
            mood: version.mood,
            history: newHistory
        };
        onUpdate?.(updatedEntry);
        setHistory(newHistory);
        setShowHistory(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[400]"
                    />

                    {/* Sheet Container */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full md:max-w-2xl bg-white shadow-2xl z-[401] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-black/[0.04] bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                            {isEditing ? (
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="text-[17px] text-[#FF3B30] -ml-2 px-3 py-1"
                                    disabled={isRefining}
                                >
                                    Cancel
                                </button>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={onClose}
                                        className="flex items-center gap-1 text-[#007AFF] text-[17px] font-medium -ml-2 px-2 py-1 rounded-lg hover:bg-black/[0.04] transition-colors"
                                    >
                                        <ChevronLeft size={22} className="-ml-1" />
                                        Back
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                {/* Actions Area */}
                                {!isEditing && (
                                    <>
                                        {/* History Button */}
                                        <button
                                            onClick={() => setShowHistory(!showHistory)}
                                            className="p-2 text-gray-400 hover:text-black hover:bg-black/5 rounded-full transition-colors"
                                            title="View History"
                                        >
                                            <HistoryIcon size={20} />
                                        </button>

                                        {/* Stoic Rewrite in View Mode */}
                                        {justRefined ? (
                                            <button
                                                onClick={handleUndo}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 text-black hover:bg-black/10 transition-colors text-sm font-medium mr-1"
                                            >
                                                <RotateCcw size={14} />
                                                Undo
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleRefine}
                                                disabled={isRefining}
                                                className={clsx(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all mr-1",
                                                    isRefining
                                                        ? "bg-[#E5E5EA] text-[#8E8E93]"
                                                        : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg"
                                                )}
                                            >
                                                {isRefining ? (
                                                    <span className="animate-pulse">Rewriting...</span>
                                                ) : (
                                                    <>
                                                        <Sparkles size={14} />
                                                        Stoic Rewrite
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}

                                {isEditing ? (
                                    <button
                                        onClick={handleSave}
                                        className="text-[17px] font-semibold text-[#007AFF] -mr-2 px-3 py-1"
                                        disabled={isRefining}
                                    >
                                        Save
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-[17px] font-medium text-[#007AFF] px-2"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Relative Container for Overlays */}
                        <div className="flex-1 overflow-y-auto bg-white relative">
                            {/* History Overlay */}
                            <AnimatePresence>
                                {showHistory && (
                                    <HistoryViewer
                                        history={history}
                                        onRestore={handleRestore}
                                        onClose={() => setShowHistory(false)}
                                    />
                                )}
                            </AnimatePresence>

                            {isEditing ? (
                                <div className="px-5 py-6 flex flex-col gap-5">
                                    <div className="flex items-start gap-3">
                                        <div className="relative shrink-0">
                                            <button
                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                className="w-12 h-12 rounded-full bg-[#f2f2f7] flex items-center justify-center text-3xl hover:bg-[#e5e5ea] transition-colors"
                                            >
                                                {mood}
                                            </button>
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

                                        <div className="space-y-1 flex-1">
                                            <input
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full text-2xl font-bold p-2 bg-[rgba(120,120,128,0.06)] rounded-xl outline-none focus:ring-2 ring-[#007AFF]/20 leading-tight"
                                                placeholder="Entry Title"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-[rgba(60,60,67,0.6)] uppercase tracking-wider ml-1">Date</label>
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="w-full text-[17px] p-2 bg-[rgba(120,120,128,0.06)] rounded-xl outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-[rgba(60,60,67,0.6)] uppercase tracking-wider ml-1">Time</label>
                                            <input
                                                type="text"
                                                value={time}
                                                onChange={(e) => setTime(e.target.value)}
                                                className="w-full text-[17px] p-2 bg-[rgba(120,120,128,0.06)] rounded-xl outline-none"
                                                placeholder="12:00 PM"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1 min-h-[300px]">
                                        <label className="text-xs font-semibold text-[rgba(60,60,67,0.6)] uppercase tracking-wider ml-1">Entry</label>
                                        <div className="border border-[rgba(60,60,67,0.12)] rounded-xl min-h-[300px] relative">
                                            <RichTextEditor
                                                content={content}
                                                onChange={setContent}
                                                placeholder="Write here..."
                                                className="min-h-[300px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-none px-6 py-8">
                                    <div className="mb-8">
                                        <div className="flex items-start gap-4 mb-4">
                                            <span className="text-4xl mt-1">{safeEntry.mood}</span>
                                            <div>
                                                <h1 className="text-3xl font-bold text-[#1C1C1E] leading-tight mb-2">
                                                    {safeEntry.title || "Untitled Entry"}
                                                </h1>
                                                <div className="flex items-center gap-4 text-[13px] text-[rgba(60,60,67,0.5)] font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={14} />
                                                        {getRelativeTime(safeEntry.isoDate)}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={14} />
                                                        {safeEntry.time}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <motion.div
                                        key={content}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="prose prose-lg max-w-none prose-headings:font-bold prose-p:text-[17px] prose-p:leading-relaxed prose-a:text-[#007AFF] prose-img:rounded-xl prose-img:shadow-sm"
                                        dangerouslySetInnerHTML={{ __html: safeEntry.content || safeEntry.preview }}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
