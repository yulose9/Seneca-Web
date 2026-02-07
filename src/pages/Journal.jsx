import clsx from "clsx";
import EmojiPicker from "emoji-picker-react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, ChevronRight, SmilePlus, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import JournalDetailSheet from "../components/JournalDetailSheet";
import PageTransition from "../components/PageTransition";
import RichTextEditor from "../components/RichTextEditor";
import {
  updateTodayLog,
  subscribeToTodayLog,
  updateGlobalData,
  subscribeToGlobalData,
  getGlobalData,
  saveGlobalDataLocal,
  loadGlobalDataLocal
} from "../services/dataLogger";

// Confirmation Dialog Component
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
}) => (
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
            <h3 className="text-[17px] font-semibold text-black mb-2">
              {title}
            </h3>
            <p className="text-[15px] text-[rgba(60,60,67,0.6)]">{message}</p>
          </div>
          <div className="border-t border-[rgba(60,60,67,0.12)] flex">
            <motion.button
              whileTap={{ backgroundColor: "rgba(0,0,0,0.05)" }}
              onClick={onClose}
              className="flex-1 py-4 text-[17px] font-medium text-[#007AFF] border-r border-[rgba(60,60,67,0.12)]"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ backgroundColor: "rgba(0,0,0,0.05)" }}
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
const EntryRow = ({
  item,
  isLast,
  isSelecting,
  isSelected,
  onSelect,
  onDelete,
  onClick,
  onLongPress,
}) => {
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
      const diff =
        e.touches[0].clientX - parseFloat(e.currentTarget.dataset.startX);
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

  // Get a subtle gradient based on the emoji
  const getEmojiBackground = (emoji) => {
    const emojiColors = {
      "😊": "from-yellow-100 to-orange-50",
      "🌟": "from-yellow-100 to-amber-50",
      "💭": "from-blue-50 to-indigo-50",
      "📝": "from-slate-100 to-gray-50",
      "🎯": "from-red-50 to-orange-50",
      "🌱": "from-green-100 to-emerald-50",
      "🍃": "from-green-50 to-teal-50",
      "🔥": "from-orange-100 to-red-50",
      "💡": "from-yellow-100 to-amber-50",
      "🌙": "from-indigo-100 to-purple-50",
      "☀️": "from-yellow-100 to-orange-50",
      "🌊": "from-blue-100 to-cyan-50",
      "😤": "from-red-100 to-orange-50",
      "😢": "from-blue-100 to-indigo-50",
      "😌": "from-green-50 to-teal-50",
    };
    return emojiColors[emoji] || "from-gray-100 to-slate-50";
  };

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
        whileTap={
          !isSelecting && !showDelete
            ? { backgroundColor: "rgba(0,0,0,0.04)" }
            : undefined
        }
        className={clsx(
          "flex items-start p-4 cursor-pointer bg-white relative transition-transform duration-200 select-none",
          !isLast && "border-b border-[rgba(60,60,67,0.08)]",
          showDelete && "-translate-x-20"
        )}
      >
        <AnimatePresence>
          {isSelecting && (
            <motion.div
              initial={{ width: 0, opacity: 0, marginRight: 0 }}
              animate={{ width: 28, opacity: 1, marginRight: 12 }}
              exit={{ width: 0, opacity: 0, marginRight: 0 }}
              className="shrink-0 overflow-hidden mt-2"
            >
              <div
                className={clsx(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-[#007AFF] border-[#007AFF]"
                    : "border-[rgba(60,60,67,0.3)]"
                )}
              >
                {isSelected && (
                  <Check size={14} className="text-white" strokeWidth={3} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji with gradient background */}
        <div
          className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mr-4 shrink-0 bg-gradient-to-br shadow-sm",
            getEmojiBackground(item.mood)
          )}
        >
          {item.mood}
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          {/* Title row with time */}
          <div className="flex justify-between items-start gap-3 mb-1">
            <h3 className="text-[16px] font-semibold text-black leading-tight line-clamp-1">
              {item.title}
            </h3>
            <span className="text-[12px] text-[rgba(60,60,67,0.5)] whitespace-nowrap mt-0.5">
              {item.time}
            </span>
          </div>

          {/* Preview text with better styling */}
          <p className="text-[14px] text-[rgba(60,60,67,0.6)] leading-relaxed line-clamp-2">
            {item.preview}
          </p>
        </div>

        {!isSelecting && !showDelete && (
          <ChevronRight size={18} className="text-[#C7C7CC] ml-2 shrink-0 mt-3" />
        )}
      </motion.div>
    </div>
  );
};

// Random Moods Helper
const RANDOM_MOODS = [
  "😊",
  "🌟",
  "💭",
  "📝",
  "🎯",
  "🌱",
  "🍃",
  "🔥",
  "💡",
  "🌙",
  "☀️",
  "🌊",
];
const getRandomMood = () =>
  RANDOM_MOODS[Math.floor(Math.random() * RANDOM_MOODS.length)];

export default function Journal() {
  // Interaction timestamp to prevent "Cloud Echo" overwrites
  const lastLocalInteraction = useRef(0);

  // 🛡️ MOUNT PROTECTION: Prevents new devices from overwriting cloud data
  const mountTimestamp = useRef(Date.now());
  const MOUNT_PROTECTION_DURATION = 3000; // 3 seconds

  const [entry, setEntry] = useState(null);
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState(getRandomMood());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null,
    itemId: null,
  });
  const [viewEntry, setViewEntry] = useState(null);
  const editorRef = useRef(null);
  const [visiblePastCount, setVisiblePastCount] = useState(10);

  // Initial load from localStorage
  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem("journal_entries");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Load drafts
  useEffect(() => {
    const savedTitle = localStorage.getItem("journal-draft-title");
    const savedMood = localStorage.getItem("journal-draft-mood");
    if (savedTitle) setTitle(savedTitle);
    if (savedMood) setMood(savedMood);
  }, []);

  // Save drafts
  useEffect(() => {
    localStorage.setItem("journal-draft-title", title);
    localStorage.setItem("journal-draft-mood", mood);
  }, [title, mood]);

  // Save Persistent Entries to localStorage
  useEffect(() => {
    localStorage.setItem("journal_entries", JSON.stringify(entries));
  }, [entries]);

  // 🔄 INITIAL CLOUD FETCH on mount - Get ALL journal entries from global data
  useEffect(() => {
    const fetchGlobalJournal = async () => {
      try {
        const cloudJournal = await getGlobalData("journal");
        if (cloudJournal?.entries && Array.isArray(cloudJournal.entries)) {
          console.log("[Journal] ✓ Loaded global entries from Firestore:", cloudJournal.entries.length, "entries");

          // Merge cloud entries with local entries (cloud wins for duplicates)
          setEntries(prev => {
            // Start with cloud entries
            const merged = [...cloudJournal.entries];

            // Add any local entries that don't exist in cloud
            prev.forEach(localEntry => {
              if (!merged.find(c => c.id === localEntry.id)) {
                merged.push(localEntry);
              }
            });

            // Sort by date/id descending (newest first)
            merged.sort((a, b) => b.id - a.id);

            console.log("[Journal] Merged entries:", merged.length);
            return merged;
          });
        }
      } catch (error) {
        console.error("[Journal] Failed to fetch global data:", error);
      }
    };

    fetchGlobalJournal();
  }, []); // Run once on mount

  // 🌐 Sync ALL JOURNAL ENTRIES to GLOBAL storage (persists across days)
  useEffect(() => {
    // 🛡️ MOUNT PROTECTION: Don't sync to Firestore during initial load
    const timeSinceMount = Date.now() - mountTimestamp.current;
    if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
      console.log("[Journal] Mount protection active, skipping Firestore WRITE");
      return;
    }

    // Only sync after user has actually interacted
    if (lastLocalInteraction.current === 0) {
      console.log("[Journal] No user interaction yet, skipping Firestore WRITE");
      return;
    }

    const syncTimer = setTimeout(() => {
      console.log("[Journal] Syncing to GLOBAL Firestore (all entries)...");
      const today = new Date().toISOString().split("T")[0];
      const todayEntries = entries.filter((e) => e.isoDate === today);

      // Get the most recent mood from today's entries
      const latestMood = todayEntries.length > 0 ? todayEntries[0].mood : null;

      // Extract highlights (entries with positive moods)
      const positiveEmojis = ["😊", "🌟", "🔥", "💡", "☀️", "🎯", "🌱"];
      const highlights = todayEntries
        .filter((e) => positiveEmojis.includes(e.mood))
        .map((e) => e.title);

      // Extract challenges (entries with contemplative moods)
      const challengeEmojis = ["💭", "🌙", "🌊"];
      const challenges = todayEntries
        .filter((e) => challengeEmojis.includes(e.mood))
        .map((e) => e.title);

      // 🌐 GLOBAL DATA: Save ALL entries to global_data/journal (persists across days!)
      updateGlobalData("journal", {
        entries: entries.map((e) => ({
          id: e.id,
          title: e.title,
          mood: e.mood,
          time: e.time,
          preview: e.preview,
          content: e.content,
          isoDate: e.isoDate,
          date: e.date,
        })),
        total_entries: entries.length,
      });

      // Save to localStorage for offline access
      saveGlobalDataLocal("journal", { entries });

      // Daily log: Just today's summary for analytics
      updateTodayLog("journal", {
        entries_today: todayEntries.length,
        mood: latestMood,
        highlights,
        challenges,
        total_entries_all_time: entries.length,
      });
    }, 1000); // 1 second debounce

    return () => clearTimeout(syncTimer);
  }, [entries]);

  // 🚀 REAL-TIME CLOUD SYNC (Incoming) - Listen to GLOBAL journal data
  useEffect(() => {
    const unsubscribe = subscribeToGlobalData("journal", (cloudJournal) => {
      // 🛡️ MOUNT PROTECTION: Skip cloud updates for first 3 seconds after page load
      const timeSinceMount = Date.now() - mountTimestamp.current;
      if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
        console.log("[Journal] Mount protection active, skipping cloud sync");
        return;
      }

      // Throttle: Ignore cloud updates if user just interacted locally (< 2s)
      if (Date.now() - lastLocalInteraction.current < 2000) return;

      if (!cloudJournal?.entries) return;

      console.log("[Journal] Received global entries from cloud");

      const cloudEntries = cloudJournal.entries;

      if (Array.isArray(cloudEntries)) {
        setEntries((prevEntries) => {
          // Merge Strategy: Union by ID
          // Prefer Cloud version if it exists (to get remote updates)
          // Keep Local version if it doesn't exist in Cloud (to preserve unsynced new entries)
          const merged = [...cloudEntries];

          prevEntries.forEach((localEntry) => {
            if (!merged.find((c) => c.id === localEntry.id)) {
              merged.push(localEntry);
            }
          });

          // Sort by date/id descending (newest first)
          merged.sort((a, b) => b.id - a.id);

          if (JSON.stringify(merged) === JSON.stringify(prevEntries)) return prevEntries;
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateEntry = useCallback((updatedEntry) => {
    lastLocalInteraction.current = Date.now(); // Mark interaction time

    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
    setViewEntry((prev) =>
      prev && prev.id === updatedEntry.id ? updatedEntry : prev
    );
  }, []);

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

  const handleSave = useCallback(async () => {
    // Check if we have content (either JSON object or title)
    const hasJsonContent =
      entry &&
      typeof entry === "object" &&
      entry.content &&
      entry.content.length > 0;
    const hasNonEmptyContent =
      hasJsonContent && getPlainTextFromJson(entry).length > 0;

    if (!hasNonEmptyContent && !title) return;
    setIsSaving(true);

    // Generate Preview from JSON
    const plainText = getPlainTextFromJson(entry);
    const preview =
      plainText.substring(0, 100) + (plainText.length > 100 ? "..." : "");

    const finalTitle = title.trim() || "Untitled Entry";

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      isoDate: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      title: finalTitle,
      preview: preview || "No additional text",
      content: entry, // This is now JSON!
      mood: mood,
    };

    // Artificial delay for UX
    await new Promise((resolve) => setTimeout(resolve, 600));

    lastLocalInteraction.current = Date.now(); // Mark interaction time
    setEntries((prev) => [newEntry, ...prev]);

    // Clear logic
    try {
      localStorage.removeItem("journal-draft");
      localStorage.removeItem("journal-draft-title");
      localStorage.removeItem("journal-draft-mood");
    } catch (e) { }

    setEntry(null);
    setTitle("");
    setMood(getRandomMood());
    setIsSaving(false);
  }, [entry, title, mood]);

  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };
  const handleDeleteSingle = (id) =>
    setConfirmDialog({ isOpen: true, type: "single", itemId: id });
  const handleDeleteSelected = () => {
    if (selectedIds.size > 0)
      setConfirmDialog({ isOpen: true, type: "bulk", itemId: null });
  };
  const handleConfirmDelete = () => {
    lastLocalInteraction.current = Date.now(); // Mark interaction time

    if (confirmDialog.type === "single")
      setEntries((prev) => prev.filter((e) => e.id !== confirmDialog.itemId));
    else {
      setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
      setIsSelecting(false);
    }
    setConfirmDialog({ isOpen: false, type: null, itemId: null });
  };
  const handleSelectAll = () =>
    setSelectedIds(
      selectedIds.size === entries.length
        ? new Set()
        : new Set(entries.map((e) => e.id))
    );
  const handleLongPress = (id) => {
    setIsSelecting(true);
    setSelectedIds(new Set([id]));
  };

  // Check if entry has content (JSON format)
  const hasJsonContent =
    entry &&
    typeof entry === "object" &&
    entry.content &&
    entry.content.length > 0;
  const hasContent =
    (hasJsonContent && getPlainTextFromJson(entry).length > 0) ||
    title.length > 0;

  // Categorize
  const today = new Date().toISOString().split("T")[0];
  const todayEntries = entries.filter((e) => e.isoDate === today);
  const pastEntries = entries.filter((e) => e.isoDate !== today);

  return (
    <PageTransition className="min-h-screen bg-[#F2F2F7] pb-32">
      {/* Header */}
      <header className="pt-14 px-5 pb-4 flex justify-between items-end">
        <div>
          <motion.h1
            className="ios-large-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            The Mirror
          </motion.h1>
          <motion.p
            className="text-[17px] text-[rgba(60,60,67,0.6)] mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Reflect on your journey
          </motion.p>
        </div>
        {entries.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => {
              setIsSelecting(!isSelecting);
              setSelectedIds(new Set());
            }}
            className="text-[17px] font-medium text-[#007AFF] mb-1"
          >
            {isSelecting ? "Done" : "Edit"}
          </motion.button>
        )}
      </header>

      {/* Selection bar - Global */}
      <AnimatePresence>
        {isSelecting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 mb-4 overflow-hidden"
          >
            <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-black/[0.04] shadow-sm">
              <button
                onClick={handleSelectAll}
                className="text-[15px] font-medium text-[#007AFF]"
              >
                {selectedIds.size === entries.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[rgba(60,60,67,0.6)]">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-[15px] font-semibold transition-colors",
                    selectedIds.size > 0
                      ? "bg-[#FF3B30] text-white"
                      : "bg-[rgba(120,120,128,0.12)] text-[rgba(60,60,67,0.3)]"
                  )}
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Area */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 mb-8"
      >
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

            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  editorRef.current?.focus();
                }
              }}
              placeholder="Title your entry..."
              className="flex-1 bg-transparent text-[22px] font-bold text-black placeholder:text-black/20 resize-none outline-none py-2 leading-tight"
              rows={1}
              style={{ minHeight: "48px" }}
            />
          </div>

          <div className="w-full h-px bg-black/[0.06] mb-4" />

          <RichTextEditor
            ref={editorRef}
            content={entry}
            onChange={setEntry}
            placeholder="Write your thoughts..."
            autoSaveKey="journal-draft"
            className="min-h-[150px]"
          />

          <AnimatePresence>
            {hasContent && (
              <motion.button
                initial={{ opacity: 0, y: 10, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, y: 0, height: 50, marginTop: 16 }}
                exit={{ opacity: 0, y: 10, height: 0, marginTop: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isSaving}
                className={clsx(
                  "w-full rounded-xl font-semibold text-[17px] overflow-hidden",
                  !isSaving
                    ? "bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/25"
                    : "bg-[rgba(120,120,128,0.12)] text-[rgba(60,60,67,0.3)]"
                )}
              >
                {isSaving ? "Saving..." : "Save Entry"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Content Lists (Today / Past) */}
      {todayEntries.length > 0 && (
        <section className="px-5 mb-8">
          <h3 className="ios-list-header uppercase mb-2">Today</h3>
          <div className="bg-white rounded-xl overflow-hidden border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {todayEntries.map((item, index) => (
              <EntryRow
                key={item.id}
                item={item}
                isLast={index === todayEntries.length - 1}
                isSelecting={isSelecting}
                isSelected={selectedIds.has(item.id)}
                onSelect={handleSelect}
                onDelete={handleDeleteSingle}
                onClick={setViewEntry}
                onLongPress={handleLongPress}
              />
            ))}
          </div>
        </section>
      )}

      <section className="px-5">
        {pastEntries.length > 0 && (
          <h3 className="ios-list-header uppercase mb-2">Past Entries</h3>
        )}

        {pastEntries.length > 0 ? (
          <>
            <div className="bg-white rounded-xl overflow-hidden border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {pastEntries.slice(0, visiblePastCount).map((item, index) => (
                <EntryRow
                  key={item.id}
                  item={item}
                  isLast={index === Math.min(visiblePastCount, pastEntries.length) - 1}
                  isSelecting={isSelecting}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={handleSelect}
                  onDelete={handleDeleteSingle}
                  onClick={setViewEntry}
                  onLongPress={handleLongPress}
                />
              ))}
            </div>
            {visiblePastCount < pastEntries.length && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisiblePastCount((prev) => prev + 10)}
                className="w-full mt-3 py-3.5 rounded-xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[15px] font-semibold text-[#007AFF] flex items-center justify-center gap-2"
              >
                View More ({pastEntries.length - visiblePastCount} remaining)
              </motion.button>
            )}
          </>
        ) : (
          entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <span className="text-5xl mb-4">✨</span>
              <p className="text-[17px] font-semibold text-black text-center mb-2">
                No Entries Yet
              </p>
              <p className="text-[15px] text-[rgba(60,60,67,0.6)] text-center">
                Start your journal by writing above.
              </p>
            </div>
          )
        )}
      </section>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, type: null, itemId: null })
        }
        onConfirm={handleConfirmDelete}
        title={
          confirmDialog.type === "bulk"
            ? `Delete ${selectedIds.size} Entries?`
            : "Delete Entry?"
        }
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
