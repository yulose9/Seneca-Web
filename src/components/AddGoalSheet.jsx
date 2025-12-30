import EmojiPicker from "emoji-picker-react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import React, { useState } from "react";

// Preset colors for goals
const COLOR_OPTIONS = [
  { id: "purple", color: "#8B5CF6", name: "Purple" },
  { id: "blue", color: "#007AFF", name: "Blue" },
  { id: "green", color: "#34C759", name: "Green" },
  { id: "orange", color: "#FF9500", name: "Orange" },
  { id: "red", color: "#FF3B30", name: "Red" },
  { id: "pink", color: "#FF2D92", name: "Pink" },
  { id: "teal", color: "#5AC8FA", name: "Teal" },
  { id: "indigo", color: "#5856D6", name: "Indigo" },
];

// iOS-style Form Row Component
const FormRow = ({ label, children, isLast = false }) => (
  <div
    className={`flex items-center min-h-[44px] px-4 ${
      !isLast ? "border-b border-[rgba(60,60,67,0.12)]" : ""
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

export default function AddGoalSheet({
  visible,
  onClose,
  onAddGoal,
  onDeleteGoal,
  editingGoal = null,
}) {
  const [title, setTitle] = useState(editingGoal?.title || "");
  const [selectedEmoji, setSelectedEmoji] = useState(
    editingGoal?.emoji || "🎯"
  );
  const [selectedColor, setSelectedColor] = useState(
    editingGoal?.color || "#8B5CF6"
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isEditing = !!editingGoal;
  const isDefaultGoal =
    editingGoal?.id === "noPorn" || editingGoal?.id === "exercise";

  const handleSubmit = () => {
    if (!title.trim()) return;

    onAddGoal(selectedEmoji, title.trim(), selectedColor);

    // Reset form
    setTitle("");
    setSelectedEmoji("🎯");
    setSelectedColor("#8B5CF6");
    onClose();
  };

  const handleDelete = () => {
    if (editingGoal && onDeleteGoal) {
      onDeleteGoal(editingGoal.id);
      onClose();
    }
  };

  const handleClose = () => {
    setTitle("");
    setSelectedEmoji("🎯");
    setSelectedColor("#8B5CF6");
    setShowEmojiPicker(false);
    onClose();
  };

  const isValid = title.trim().length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
              onClick={handleClose}
            >
              <div className="w-12 h-1.5 bg-[rgba(60,60,67,0.3)] rounded-full" />
            </div>

            {/* Navigation Bar - iOS Sheet Style */}
            <div className="relative flex items-center justify-center h-11 border-b border-[rgba(60,60,67,0.12)]">
              {/* Cancel Button */}
              <button
                onClick={handleClose}
                className="absolute left-4 text-[17px] text-[#007AFF] font-normal active:opacity-50"
              >
                Cancel
              </button>

              {/* Title */}
              <h2 className="text-[17px] font-semibold text-black">
                {isEditing ? "Edit Goal" : "New Goal"}
              </h2>

              {/* Add Button */}
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                className={`absolute right-4 text-[17px] font-semibold transition-colors ${
                  isValid
                    ? "text-[#007AFF] active:opacity-50"
                    : "text-[rgba(60,60,67,0.3)]"
                }`}
              >
                {isEditing ? "Save" : "Add"}
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(92vh-60px)] pb-20">
              {/* Icon Preview - Centered Hero Style */}
              <div className="flex flex-col items-center py-8">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="relative"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: `${selectedColor}20`,
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

              {/* Goal Details Section */}
              <FormSection header="Goal Details">
                <FormRow label="Title" isLast>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Meditate, Read, No Sugar"
                    className="w-full text-[17px] text-black placeholder:text-[rgba(60,60,67,0.3)] outline-none bg-transparent py-3"
                    autoFocus
                  />
                </FormRow>
              </FormSection>

              {/* Color Section */}
              <FormSection header="Color">
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-4 justify-items-center">
                    {COLOR_OPTIONS.map((option) => (
                      <motion.button
                        key={option.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedColor(option.color)}
                        className={`w-12 h-12 rounded-full transition-all ${
                          selectedColor === option.color
                            ? "ring-2 ring-offset-2 ring-[#007AFF]"
                            : ""
                        }`}
                        style={{ backgroundColor: option.color }}
                      />
                    ))}
                  </div>
                </div>
              </FormSection>

              {/* Delete Button (only for editing custom goals) */}
              {isEditing && !isDefaultGoal && (
                <div className="mx-4 mt-4">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDelete}
                    className="w-full bg-white rounded-xl py-4 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} className="text-[#FF3B30]" />
                    <span className="text-[17px] font-medium text-[#FF3B30]">
                      Delete Goal
                    </span>
                  </motion.button>
                </div>
              )}

              {/* Info footer */}
              <p className="text-[13px] text-[rgba(60,60,67,0.5)] text-center mt-8 mb-6 px-8">
                Track your daily habits with a GitHub-style streak grid. Tap any
                day to mark it complete or missed.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
