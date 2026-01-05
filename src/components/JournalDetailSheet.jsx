import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import EmojiPicker from "emoji-picker-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  Clock,
  History as HistoryIcon,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { refineEntryWithGemini } from "../services/journalAI";
import RichTextEditor from "./RichTextEditor";

// TipTap extensions for HTML generation
const extensions = [
  StarterKit,
  Underline,
  Highlight,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Link,
  Image,
];

// Helper to convert TipTap JSON to HTML
const jsonToHtml = (content) => {
  if (!content) return "";
  // If it's already a string (legacy HTML), return as-is
  if (typeof content === "string") return content;
  // If it's a JSON object, convert to HTML
  if (typeof content === "object" && content.type === "doc") {
    try {
      return generateHTML(content, extensions);
    } catch (e) {
      console.error("Error generating HTML:", e);
      return "";
    }
  }
  return "";
};

// Relative Time Helper
const getRelativeTime = (dateStr) => {
  if (!dateStr) return "Today";
  const date = new Date(dateStr);
  const now = new Date();
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = d2 - d1;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return "Over a year ago";
};

// Convert 12-hour format (e.g., "2:25 AM") to 24-hour format (e.g., "02:25")
const to24Hour = (time12h) => {
  if (!time12h) return "";
  // If already in 24-hour format (no AM/PM), return as is
  if (!time12h.includes("AM") && !time12h.includes("PM")) return time12h;

  try {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":");

    if (hours === "12") {
      hours = "00";
    }

    if (modifier === "PM") {
      hours = parseInt(hours, 10) + 12;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  } catch {
    return "";
  }
};

// Convert 24-hour format (e.g., "14:25") to 12-hour format (e.g., "2:25 PM")
const to12Hour = (time24h) => {
  if (!time24h) return "";

  try {
    const [hours, minutes] = time24h.split(":");
    const hour = parseInt(hours, 10);
    const modifier = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minutes} ${modifier}`;
  } catch {
    return "";
  }
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
        <div className="text-center text-gray-400 py-8">
          No edit history available.
        </div>
      )}
      {history
        ?.slice()
        .reverse()
        .map((ver, idx) => (
          <div
            key={ver.timestamp || idx}
            className="border border-black/5 rounded-xl p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-0.5">
                  {ver.action || "Edit"}
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
            <p className="font-medium text-sm text-gray-900 truncate">
              {ver.title}
            </p>
            <div
              className="text-xs text-gray-500 line-clamp-2 mt-1"
              dangerouslySetInnerHTML={{ __html: ver.content }}
            />
          </div>
        ))}
    </div>
  </motion.div>
);

export default function JournalDetailSheet({
  isOpen,
  onClose,
  entry,
  onUpdate,
}) {
  const [isEditing, setIsEditing] = useState(false);

  // Form States
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [content, setContent] = useState(null); // Now accepts JSON
  const [mood, setMood] = useState("😊");

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
      setTitle(entry.title || "");
      setDate(entry.isoDate || new Date().toISOString().split("T")[0]);
      setTime(to24Hour(entry.time) || ""); // Convert 12-hour to 24-hour for input
      // Content can be JSON object or legacy HTML string
      setContent(entry.content || null);
      setMood(entry.mood || "");
      setHistory(entry.history || []);
      setJustRefined(false);
    }
    setIsEditing(false);
    setIsRefining(false);
    setShowHistory(false);
    setShowEmojiPicker(false);
  }, [entry, isOpen]);

  // if (!entry && !isOpen) return null; // Removed to allow exit animation

  const saveToHistory = (actionName) => {
    const newVersion = {
      timestamp: Date.now(),
      title,
      content,
      mood,
      date,
      time,
      action: actionName,
    };
    // Don't duplicate if identical to last
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (
        last.title === title &&
        last.content === content &&
        last.mood === mood
      )
        return history;
    }
    return [...history, newVersion];
  };

  const handleSave = () => {
    // ... (rest of handleSave is fine)
    const dateObj = new Date(date);
    const displayDate = dateObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Helper to extract plain text from Tiptap JSON
    const getPlainTextFromJson = (json) => {
      if (!json || !json.content) return "";
      const extractText = (nodes) => {
        if (!nodes) return "";
        return nodes
          .map((node) => {
            if (node.type === "text") return node.text || "";
            if (node.content) return extractText(node.content);
            return "";
          })
          .join(" ");
      };
      return extractText(json.content).trim();
    };

    // Generate preview from JSON or fallback to HTML parsing for legacy content
    let plainText = "";
    if (content && typeof content === "object") {
      plainText = getPlainTextFromJson(content);
    } else if (typeof content === "string") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      plainText = tempDiv.innerText || tempDiv.textContent || "";
    }
    const preview =
      plainText.substring(0, 100) + (plainText.length > 100 ? "..." : "");

    const newHistory = saveToHistory("Manual Edit");

    const updated = {
      ...entry,
      title,
      date: displayDate,
      isoDate: date,
      time: to12Hour(time), // Convert back to 12-hour format for storage
      content,
      mood,
      preview,
      history: newHistory,
    };

    onUpdate?.(updated);
    setIsEditing(false);
  };

  // ... (handleRefine, handleUndo, handleRestore are fine)

  // ... (inside render)

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
      const newDisplayDate = newDateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      // Preview gen
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = result.content || content;
      const plainText = tempDiv.innerText || tempDiv.textContent || "";
      const preview =
        plainText.replace(/\n/g, " ").substring(0, 100) +
        (plainText.length > 100 ? "..." : "");

      const updatedEntry = {
        ...entry,
        title: result.title || title,
        content: result.content || content,
        date: newDisplayDate,
        isoDate: date,
        time,
        mood,
        preview,
        history: currentHistory, // Save the 'Before' state
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

    const newHistory = [
      ...history,
      {
        timestamp: Date.now(),
        title, // Current (bad) title
        content, // Current (bad) content
        mood,
        action: "Reverted Change",
      },
    ];

    const updatedEntry = {
      ...entry,
      title: version.title,
      content: version.content,
      mood: version.mood,
      history: newHistory,
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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
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

              <AnimatePresence mode="wait" initial={false}>
                {isEditing ? (
                  <motion.div
                    key="edit-mode"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="px-5 py-6 flex flex-col gap-5"
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-4xl shadow-sm border border-black/5 hover:bg-gray-100 transition-colors"
                        >
                          {mood}
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute top-full left-0 mt-2 z-50 shadow-2xl rounded-2xl">
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowEmojiPicker(false)}
                            />
                            <div className="relative z-50">
                              <EmojiPicker
                                onEmojiClick={(e) => {
                                  setMood(e.emoji);
                                  setShowEmojiPicker(false);
                                }}
                                width={300}
                                height={400}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 pt-1">
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full text-[22px] font-bold bg-transparent outline-none placeholder:text-gray-300 leading-tight"
                          placeholder="Entry Title"
                        />
                        <p className="text-[15px] text-gray-400 mt-1">
                          {date ? new Date(date).toLocaleDateString() : "Today"}{" "}
                          • {time || "No time set"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl overflow-hidden border border-black/5 mb-2">
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                        <div className="flex items-center gap-2 text-gray-900">
                          <Calendar size={18} className="text-[#007AFF]" />
                          <span className="text-[17px]">Date</span>
                        </div>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="text-[17px] text-gray-500 bg-transparent outline-none text-right font-medium"
                        />
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-white">
                        <div className="flex items-center gap-2 text-gray-900">
                          <Clock size={18} className="text-[#FF9500]" />
                          <span className="text-[17px]">Time</span>
                        </div>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="text-[17px] text-gray-500 bg-transparent outline-none text-right font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 min-h-[300px]">
                      <label className="text-xs font-semibold text-[rgba(60,60,67,0.6)] uppercase tracking-wider ml-1">
                        Entry
                      </label>
                      <div className="relative">
                        <RichTextEditor
                          content={content}
                          onChange={setContent}
                          placeholder="Write here..."
                          className="min-h-[300px]"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view-mode"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="max-w-none px-6 py-8"
                  >
                    <div className="mb-8">
                      <div className="flex items-start gap-4 mb-4">
                        <span className="text-4xl mt-1">{mood}</span>
                        <div>
                          <h1 className="text-3xl font-bold text-[#1C1C1E] leading-tight mb-2">
                            {title || "Untitled Entry"}
                          </h1>
                          <div className="flex items-center gap-4 text-[13px] text-[rgba(60,60,67,0.5)] font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={14} />
                              {getRelativeTime(date)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} />
                              {time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <motion.div
                      key={JSON.stringify(content)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="prose prose-lg max-w-none prose-headings:font-bold prose-p:text-[17px] prose-p:leading-relaxed prose-a:text-[#007AFF] prose-img:rounded-xl prose-img:shadow-sm"
                      dangerouslySetInnerHTML={{
                        __html: jsonToHtml(content),
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
