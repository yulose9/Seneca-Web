import EmojiPicker from "emoji-picker-react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import React, { useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import {
  ICON_ENTER,
  ICON_SPRING,
  ICON_VISIBLE,
  LAYOUT_SPRING,
  TAP,
  TAP_TRANSITION,
} from "../constants/motion";
import Sheet from "./Sheet";

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
    className={`flex items-center min-h-[44px] px-4 ${!isLast ? "border-b border-separator" : ""
      }`}
  >
    {label && (
      <span className="text-body text-ink w-24 shrink-0">{label}</span>
    )}
    <div className="flex-1">{children}</div>
  </div>
);

// iOS-style Section Component
const FormSection = ({ header, footer, children }) => (
  <div className="mb-6">
    {header && (
      <p className="text-footnote font-normal text-ink-2 px-5 mb-2">
        {header}
      </p>
    )}
    <div className="mx-4 bg-surface rounded-xl overflow-hidden">{children}</div>
    {footer && (
      <p className="text-footnote font-normal text-ink-2 px-5 mt-2">
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
  const haptic = useWebHaptics();

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
    haptic.trigger("success");

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
    <Sheet
      open={visible}
      onClose={() => { haptic.trigger("medium"); onClose(); }}
      label={categoryTitle}
      className="fixed bottom-0 left-0 right-0 bg-canvas rounded-t-sheet max-h-[92vh] overflow-hidden"
    >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          onClick={() => { haptic.trigger("medium"); onClose(); }}
          aria-hidden="true"
        >
          <div className="w-12 h-1.5 bg-ink-3 rounded-full" />
        </div>

        {/* Navigation Bar - iOS Sheet Style */}
        <div className="relative flex items-center justify-center h-11 border-b border-separator">
          {/* Cancel Button */}
          <button
            onClick={() => { haptic.trigger("medium"); onClose(); }}
            className="absolute left-4 text-body text-accent font-normal active:opacity-50"
          >
            Cancel
          </button>

          {/* Title */}
          <h2 className="text-body font-semibold text-ink">
            {categoryTitle}
          </h2>

          {/* Add Button */}
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`absolute right-4 text-body font-semibold transition-colors ${isValid
                ? "text-accent active:opacity-50"
                : "text-ink-3"
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
              whileTap={TAP}
              transition={TAP_TRANSITION}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              aria-label="Change icon"
              aria-expanded={showEmojiPicker}
              className="relative"
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-card"
                style={{
                  backgroundColor: phaseEnabled
                    ? `${selectedPhaseData?.color}20`
                    : "rgba(120,120,128,0.12)",
                }}
              >
                <span className="text-display">{selectedEmoji}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent rounded-full flex items-center justify-center shadow-float">
                <span className="text-white text-caption">✏️</span>
              </div>
            </motion.button>
            <p className="text-footnote text-accent mt-3 font-medium">
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
                transition={LAYOUT_SPRING}
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
                className="w-full text-body text-ink bg-transparent outline-none placeholder:text-ink-3"
                autoFocus
              />
            </FormRow>
            <FormRow label="Subtitle" isLast>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional"
                className="w-full text-body text-ink bg-transparent outline-none placeholder:text-ink-3"
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
              <div className="flex items-center justify-between min-h-[44px] px-4 border-b border-separator">
                <span className="text-body text-ink">Assign to Phase</span>
                <motion.button
                  whileTap={TAP}
                  role="switch"
                  aria-checked={phaseEnabled}
                  aria-label="Assign to Phase"
                  onClick={() => { haptic.trigger("selection"); setPhaseEnabled(!phaseEnabled); }}
                  className="relative w-[51px] h-[31px] rounded-full transition-colors duration-200"
                  style={{
                    backgroundColor: phaseEnabled ? "var(--color-positive)" : "var(--color-fill-strong)",
                  }}
                >
                  <motion.div
                    className="absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-surface shadow-card"
                    initial={false}
                    animate={{ x: phaseEnabled ? 20 : 0 }}
                    transition={ICON_SPRING}
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
                  transition={LAYOUT_SPRING}
                  style={{ overflow: "hidden" }}
                >
                  {PHASE_OPTIONS.map((phase, index) => (
                    <motion.button
                      key={phase.id}
                      whileTap={{ scale: 0.98 }}
                      transition={TAP_TRANSITION}
                      aria-pressed={selectedPhase === phase.id}
                      onClick={() => { haptic.trigger("selection"); setSelectedPhase(phase.id); }}
                      className={`w-full flex items-center justify-between min-h-[44px] px-4 ${index !== PHASE_OPTIONS.length - 1
                          ? "border-b border-separator"
                          : ""
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${phase.color}15` }}
                        >
                          <span className="text-body">{phase.emoji}</span>
                        </div>
                        <span className="text-body text-ink">
                          {phase.label}
                        </span>
                      </div>
                      <AnimatePresence initial={false}>
                        {selectedPhase === phase.id && (
                          <motion.div
                            key="check"
                            initial={ICON_ENTER}
                            animate={ICON_VISIBLE}
                            exit={ICON_ENTER}
                            transition={ICON_SPRING}
                          >
                            <Check size={20} className="text-accent" />
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                className="w-full text-body text-ink bg-transparent outline-none resize-none placeholder:text-ink-3 leading-relaxed"
              />
            </div>
          </FormSection>

          {/* Streak Info Card */}
          <div className="mx-4 mb-12">
            <div className="bg-gradient-to-r from-accent/10 to-indigo/10 rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shadow-card shrink-0">
                <span className="text-title-2">🔥</span>
              </div>
              <div>
                <p className="text-subhead font-semibold text-ink mb-0.5">
                  Streak Tracking
                </p>
                <p className="text-footnote text-ink-2 leading-snug">
                  Custom tasks include streak tracking to help you build
                  consistent habits over time.
                </p>
              </div>
            </div>
          </div>
        </div>
    </Sheet>
  );
}
