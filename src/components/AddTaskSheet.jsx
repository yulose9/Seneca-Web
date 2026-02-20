import EmojiPicker from "emoji-picker-react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import React, { useState } from "react";

// Phase options with colors matching the app theme
const PHASE_OPTIONS = [
  {
    id: "morningIgnition",
    label: "Morning Ignition",
    emoji: "🔥",
    color: "#FF9500",
  },
  { id: "arena", label: "The Arena", emoji: "⚔️", color: "#FF3B30" },
  {
    id: "maintenance",
    label: "The Maintenance",
    emoji: "🔧",
    color: "#5856D6",
  },
  { id: "shutdown", label: "The Shutdown", emoji: "🌙", color: "#007AFF" },
];

// iOS-style Form Row Component
const FormRow = ({ label, children, isLast = false }) => (
  <div
    className={`flex items-center min-h-[44px] px-4 ${!isLast ? "border-b border-[rgba(60,60,67,0.12)]" : ""
      }`}
  >
    {label && (
      <span className="text-[17px] text-black w-24 shrink-0">{label}</span>
    )}
    <div className="flex-1">{children}</div>
  </div>
);

// iOS-style Section Component
const FormSection = ({ header, footer, children }) => (
  <div className="mb-6">
    {header && (
      <p className="text-[13px] font-normal text-[#86868B] uppercase tracking-wide px-5 mb-2">
        {header}
      </p>
    )}
    <div className="mx-4 bg-white rounded-xl overflow-hidden">{children}</div>
    {footer && (
      <p className="text-[13px] font-normal text-[#86868B] px-5 mt-2">
        {footer}
      </p>
    )}
  </div>
);

export default function AddTaskSheet({ visible, onClose, onAddTask, protocolCategory = "personal" }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📝");
  const [selectedPhase, setSelectedPhase] = useState("morningIgnition");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // For work/other categories, phases are optional (default: unassigned = "general")
  const isPersonal = protocolCategory === "personal";
  const [phaseEnabled, setPhaseEnabled] = useState(isPersonal);

  // Reset phaseEnabled when category changes
  React.useEffect(() => {
    setPhaseEnabled(isPersonal);
  }, [isPersonal]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const newTask = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      emoji: selectedEmoji,
      done: false,
      isCustom: true,
    };

    // For work/other: if no phase assigned, use "general"
    const targetPhase = phaseEnabled ? selectedPhase : "general";
    onAddTask(targetPhase, newTask);

    // Reset form
    setTitle("");
    setSubtitle("");
    setDescription("");
    setSelectedEmoji("📝");
    setSelectedPhase("morningIgnition");
    setPhaseEnabled(isPersonal);
    onClose();
  };

  const isValid = title.trim().length > 0;

  const selectedPhaseData = PHASE_OPTIONS.find((p) => p.id === selectedPhase);

  // Category label for the title
  const categoryTitle = protocolCategory === "personal"
    ? "New Task"
    : `New ${protocolCategory.charAt(0).toUpperCase() + protocolCategory.slice(1)} Task`;

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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#F2F2F7] rounded-t-[14px] max-h-[92vh] overflow-hidden"
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-pointer"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 bg-[rgba(60,60,67,0.3)] rounded-full" />
            </div>

            {/* Navigation Bar - iOS Sheet Style */}
            <div className="relative flex items-center justify-center h-11 border-b border-[rgba(60,60,67,0.12)]">
              {/* Cancel Button */}
              <button
                onClick={onClose}
                className="absolute left-4 text-[17px] text-[#007AFF] font-normal active:opacity-50"
              >
                Cancel
              </button>

              {/* Title */}
              <h2 className="text-[17px] font-semibold text-black">
                {categoryTitle}
              </h2>

              {/* Add Button */}
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                className={`absolute right-4 text-[17px] font-semibold transition-colors ${isValid
                    ? "text-[#007AFF] active:opacity-50"
                    : "text-[rgba(60,60,67,0.3)]"
                  }`}
              >
                Add
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(92vh-60px)] pb-24">
              {/* Icon Preview - Centered Hero Style (like Reminders) */}
              <div className="flex flex-col items-center py-8">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="relative"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: phaseEnabled
                        ? `${selectedPhaseData?.color}20`
                        : "rgba(120,120,128,0.12)",
                    }}
                  >
                    <span className="text-5xl">{selectedEmoji}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#007AFF] rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xs">✏️</span>
                  </div>
                </motion.button>
                <p className="text-[13px] text-[#007AFF] mt-3 font-medium">
                  Tap to change icon
                </p>
              </div>

              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 350, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="overflow-hidden mx-4 mb-4 rounded-xl"
                  >
                    <EmojiPicker
                      onEmojiClick={(e) => {
                        setSelectedEmoji(e.emoji);
                        setShowEmojiPicker(false);
                      }}
                      width="100%"
                      height={350}
                      previewConfig={{ showPreview: false }}
                      skinTonesDisabled
                      searchPlaceholder="Search emoji..."
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task Details Section */}
              <FormSection header="Task Details">
                <FormRow label="Title">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task name"
                    className="w-full text-[17px] text-black bg-transparent outline-none placeholder:text-[#C7C7CC]"
                    autoFocus
                  />
                </FormRow>
                <FormRow label="Subtitle" isLast>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Optional"
                    className="w-full text-[17px] text-black bg-transparent outline-none placeholder:text-[#C7C7CC]"
                  />
                </FormRow>
              </FormSection>

              {/* Phase Selection - with toggle for non-personal categories */}
              <FormSection
                header={isPersonal ? "Schedule" : "Schedule (Optional)"}
                footer={
                  isPersonal
                    ? "Choose when this task appears in your daily routine."
                    : phaseEnabled
                      ? "Assign this task to a time slot, or turn off to keep it unscheduled."
                      : "This task will appear as an unscheduled item in your list."
                }
              >
                {/* Toggle for non-personal categories */}
                {!isPersonal && (
                  <div className="flex items-center justify-between min-h-[44px] px-4 border-b border-[rgba(60,60,67,0.12)]">
                    <span className="text-[17px] text-black">Assign to Phase</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setPhaseEnabled(!phaseEnabled)}
                      className="relative w-[51px] h-[31px] rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor: phaseEnabled ? "#34C759" : "rgba(120,120,128,0.16)",
                      }}
                    >
                      <motion.div
                        className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm"
                        animate={{ left: phaseEnabled ? 22 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                )}

                {/* Phase options - shown only when enabled */}
                <AnimatePresence>
                  {phaseEnabled && (
                    <motion.div
                      initial={!isPersonal ? { height: 0, opacity: 0 } : false}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      style={{ overflow: "hidden" }}
                    >
                      {PHASE_OPTIONS.map((phase, index) => (
                        <motion.button
                          key={phase.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedPhase(phase.id)}
                          className={`w-full flex items-center justify-between min-h-[44px] px-4 ${index !== PHASE_OPTIONS.length - 1
                              ? "border-b border-[rgba(60,60,67,0.12)]"
                              : ""
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${phase.color}15` }}
                            >
                              <span className="text-lg">{phase.emoji}</span>
                            </div>
                            <span className="text-[17px] text-black">
                              {phase.label}
                            </span>
                          </div>
                          {selectedPhase === phase.id && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", damping: 15 }}
                            >
                              <Check size={20} className="text-[#007AFF]" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </FormSection>

              {/* Notes Section */}
              <FormSection
                header="Notes"
                footer="Add details or instructions for this task."
              >
                <div className="p-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a note..."
                    rows={4}
                    className="w-full text-[17px] text-black bg-transparent outline-none resize-none placeholder:text-[#C7C7CC] leading-relaxed"
                  />
                </div>
              </FormSection>

              {/* Streak Info Card */}
              <div className="mx-4 mb-12">
                <div className="bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-black mb-0.5">
                      Streak Tracking
                    </p>
                    <p className="text-[13px] text-[#86868B] leading-snug">
                      Custom tasks include streak tracking to help you build
                      consistent habits over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
