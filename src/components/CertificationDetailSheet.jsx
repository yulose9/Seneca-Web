import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  Clock,
  Lock,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import {
  DIALOG_SPRING,
  EASE_OUT,
  FADE,
  ICON_ENTER,
  ICON_SPRING,
  ICON_VISIBLE,
  LAYOUT_SPRING,
  TAP_CARD,
} from "../constants/motion";
import Sheet from "./Sheet";

// ─── Animated height container ────────────────────────────────────────────────
const AnimatedHeight = ({ children, className = "" }) => {
  const containerRef = useRef(null);
  const [height, setHeight] = useState("auto");

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setHeight(entry.contentRect.height);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      style={{ height }}
      animate={{ height }}
      transition={LAYOUT_SPRING}
      className={`overflow-hidden ${className}`}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  {
    id: "done",
    label: "Completed",
    icon: Check,
    color: "#34C759",
    bgColor: "rgba(52, 199, 89, 0.12)",
    emoji: "✅",
  },
  {
    id: "progress",
    label: "Studying",
    icon: Clock,
    color: "#FF9500",
    bgColor: "rgba(255, 149, 0, 0.12)",
    emoji: "📖",
  },
  {
    id: "locked",
    label: "Locked",
    icon: Lock,
    color: "#8E8E93",
    bgColor: "rgba(142, 142, 147, 0.12)",
    emoji: "🔒",
  },
];

const LEVEL_COLORS = {
  Foundational: "#5AC8FA",
  Basic: "#5AC8FA",
  Intermediate: "#FF9500",
  Associate: "#FF9500",
  Professional: "#FF3B30",
  Expert: "#AF52DE",
  Advance: "#AF52DE",
};

const LEVEL_OPTIONS = [
  "Foundational",
  "Basic",
  "Intermediate",
  "Associate",
  "Professional",
  "Expert",
  "Advance",
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHeader = ({ children }) => (
  <p className="text-footnote font-semibold text-ink-2 px-5 mb-2">
    {children}
  </p>
);

const GroupedRow = ({
  label,
  children,
  isLast = false,
  onClick,
  destructive = false,
}) => (
  <div
    onClick={onClick}
    className={`flex items-center min-h-[44px] px-4 ${
      !isLast ? "border-b border-separator" : ""
    } ${onClick ? "cursor-pointer active:bg-fill" : ""}`}
  >
    {label && (
      <span className={`text-body w-28 shrink-0 ${destructive ? "text-negative" : "text-ink"}`}>
        {label}
      </span>
    )}
    <div className="flex-1 flex items-center justify-end">{children}</div>
  </div>
);

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteConfirmModal = ({ visible, certName, onConfirm, onCancel }) => (
  <AnimatePresence>
    {visible && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={FADE}
          onClick={onCancel}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
          transition={DIALOG_SPRING}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[280px] bg-surface rounded-2xl overflow-hidden shadow-float"
        >
          {/* Icon + title */}
          <div className="flex flex-col items-center px-6 pt-7 pb-4">
            <div className="w-14 h-14 rounded-full bg-negative/10 flex items-center justify-center mb-4">
              <AlertTriangle size={28} className="text-negative" />
            </div>
            <h3 className="text-body font-semibold text-ink text-center mb-1">
              Delete Certification?
            </h3>
            <p className="text-footnote text-ink-2 text-center">
              <span className="font-medium text-ink">"{certName}"</span> will
              be permanently removed. This cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="border-t border-separator">
            <button
              onClick={onConfirm}
              className="w-full py-3.5 text-body font-semibold text-negative border-b border-separator active:bg-fill"
            >
              Delete
            </button>
            <button
              onClick={onCancel}
              className="w-full py-3.5 text-body font-normal text-accent active:bg-fill"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CertificationDetailSheet({
  visible,
  onClose,
  certification,
  onUpdateStatus,
  onUpdateCertification,
  onDelete,
  onSetStudyGoal,
  isCustom = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    target: "",
    vendor: "",
    level: "Foundational",
    notes: "",
  });
  const haptic = useWebHaptics();

  // Reset form whenever sheet opens
  useEffect(() => {
    if (visible && certification) {
      setEditForm({
        name: certification.name || "",
        target: certification.target || "",
        vendor: certification.vendor || "",
        level: certification.level || "Foundational",
        notes: certification.notes || "",
      });
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [visible, certification]);

  if (!certification) return null;

  const currentStatus =
    STATUS_OPTIONS.find((s) => s.id === certification.status) ||
    STATUS_OPTIONS[2];
  const levelColor = LEVEL_COLORS[certification.level] || "#007AFF";

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStatusChange = (newStatus) => {
    haptic.trigger("selection");
    onUpdateStatus(certification, newStatus);
  };

  const handleSave = () => {
    const trimmed = {
      name: editForm.name.trim() || certification.name,
      target: editForm.target.trim(),
      vendor: editForm.vendor.trim(),
      level: editForm.level,
      notes: editForm.notes.trim(),
    };
    onUpdateCertification({ ...certification, ...trimmed });
    haptic.trigger("success");
    setIsEditing(false);
  };

  const handleDelete = () => {
    haptic.trigger("warning");
    onDelete?.(certification);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleSetStudyGoal = () => {
    if (certification.status !== "locked") {
      onSetStudyGoal(certification);
      onClose();
    }
  };

  const updateField = (field, value) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Sheet
        open={visible}
        onClose={() => { haptic.trigger("medium"); onClose(); }}
        label={certification?.name}
        className="fixed bottom-0 left-0 right-0 bg-canvas rounded-t-sheet max-h-[92vh] overflow-hidden flex flex-col"
      >
          {/* Drag Handle */}
          <div
            className="flex justify-center pt-3 pb-2 cursor-pointer shrink-0"
            onClick={() => { haptic.trigger("medium"); onClose(); }}
          >
            <div className="w-12 h-1.5 bg-separator rounded-full" />
          </div>

          {/* Navigation Bar */}
          <div className="relative flex items-center justify-between px-4 h-11 border-b border-separator shrink-0">
            {isEditing ? (
              <button
                onClick={() => setIsEditing(false)}
                className="text-body text-negative font-normal active:opacity-50"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={onClose}
                className="text-body text-accent font-normal active:opacity-50"
              >
                Close
              </button>
            )}

            <h2 className="text-body font-semibold text-ink absolute left-1/2 -translate-x-1/2">
              {isEditing ? "Edit Certification" : "Certification"}
            </h2>

            {isEditing ? (
              <button
                onClick={handleSave}
                className="text-body text-accent font-semibold active:opacity-50"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-body text-accent font-normal active:opacity-50"
              >
                Edit
              </button>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto overflow-x-hidden w-full">
            <AnimatedHeight>
              <div className="pb-32">
                <AnimatePresence mode="wait" initial={false}>
                  {isEditing ? (
                    /* ── EDIT FORM ─────────────────────────────────────── */
                    <motion.div
                      key="edit-form"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                      className="pt-6"
                    >
                      {/* Certification Details */}
                      <div className="mb-6">
                        <SectionHeader>Certification</SectionHeader>
                        <div className="mx-4 bg-surface rounded-2xl overflow-hidden">
                          {/* Name — editable for custom certs */}
                          {isCustom && (
                            <GroupedRow label="Name">
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) =>
                                  updateField("name", e.target.value)
                                }
                                placeholder="Certification name"
                                className="flex-1 text-body text-ink-2 outline-none bg-transparent text-right"
                              />
                            </GroupedRow>
                          )}

                          {/* Target */}
                          <GroupedRow label="Target">
                            <input
                              type="text"
                              value={editForm.target}
                              onChange={(e) =>
                                updateField("target", e.target.value)
                              }
                              placeholder="e.g. Q3 2026"
                              className="flex-1 text-body text-ink-2 outline-none bg-transparent text-right"
                            />
                          </GroupedRow>

                          {/* Vendor */}
                          <GroupedRow label="Vendor">
                            <input
                              type="text"
                              value={editForm.vendor}
                              onChange={(e) =>
                                updateField("vendor", e.target.value)
                              }
                              placeholder="e.g. AWS"
                              className="flex-1 text-body text-ink-2 outline-none bg-transparent text-right"
                            />
                          </GroupedRow>

                          {/* Level */}
                          <GroupedRow label="Level" isLast>
                            <select
                              value={editForm.level}
                              onChange={(e) =>
                                updateField("level", e.target.value)
                              }
                              className="flex-1 text-body text-ink-2 outline-none bg-transparent text-right appearance-none"
                            >
                              {LEVEL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </GroupedRow>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="mb-6">
                        <SectionHeader>Notes</SectionHeader>
                        <div className="mx-4 bg-surface rounded-2xl overflow-hidden">
                          <div className="px-4 py-3">
                            <textarea
                              value={editForm.notes}
                              onChange={(e) =>
                                updateField("notes", e.target.value)
                              }
                              placeholder="Add notes, exam tips, links…"
                              rows={4}
                              className="w-full text-body text-ink outline-none bg-transparent resize-none placeholder:text-ink-3"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Delete (custom only) */}
                      {isCustom && (
                        <div className="mb-6">
                          <div className="mx-4 bg-surface rounded-2xl overflow-hidden">
                            <GroupedRow
                              isLast
                              onClick={() => { haptic.trigger("warning"); setShowDeleteConfirm(true); }}
                            >
                              <span className="text-body font-medium text-negative">
                                Delete Certification
                              </span>
                              <Trash2
                                size={18}
                                className="text-negative ml-2"
                              />
                            </GroupedRow>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    /* ── VIEW MODE ─────────────────────────────────────── */
                    <motion.div
                      key="view-mode"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                    >
                      {/* Hero Card */}
                      <div className="mx-4 mt-6 mb-4">
                        <div className="bg-surface rounded-2xl p-5 shadow-card">
                          {/* Level + vendor row */}
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className="text-caption-2 font-semibold px-2.5 py-1 rounded-lg"
                              style={{
                                backgroundColor: `${levelColor}18`,
                                color: levelColor,
                              }}
                            >
                              {certification.level}
                            </span>
                            {certification.vendor && (
                              <span className="text-caption font-medium text-ink-2">
                                {certification.vendor}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-title-3 font-semibold text-ink mb-2">
                            {certification.name}
                          </h3>

                          {/* Target */}
                          {certification.target && (
                            <p className="text-subhead text-ink-2 mb-1">
                              📅 Target:{" "}
                              <span className="font-medium text-ink-2">
                                {certification.target}
                              </span>
                            </p>
                          )}

                          {/* Prereq */}
                          {certification.prereq && (
                            <p className="text-footnote text-ink-3 mt-1">
                              ⚠️ Requires: {certification.prereq}
                            </p>
                          )}

                          {/* Notes preview */}
                          {certification.notes && (
                            <p className="text-footnote text-ink-2 mt-3 pt-3 border-t border-separator line-clamp-3">
                              {certification.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Current Status Badge */}
                      <div className="px-4 mb-4">
                        <div
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                          style={{ backgroundColor: currentStatus.bgColor }}
                        >
                          <currentStatus.icon
                            size={16}
                            strokeWidth={2.5}
                            style={{ color: currentStatus.color }}
                          />
                          <span
                            className="text-subhead font-semibold"
                            style={{ color: currentStatus.color }}
                          >
                            {currentStatus.label}
                          </span>
                        </div>
                      </div>

                      {/* Status Picker */}
                      <div className="mb-5">
                        <SectionHeader>Change status</SectionHeader>
                        <div className="mx-4 bg-surface rounded-2xl overflow-hidden">
                          {STATUS_OPTIONS.map((status, index) => {
                            const isSelected =
                              certification.status === status.id;
                            const StatusIcon = status.icon;

                            return (
                              <motion.button
                                key={status.id}
                                whileTap={TAP_CARD}
                                onClick={() =>
                                  handleStatusChange(status.id)
                                }
                                className={`w-full flex items-center py-3.5 px-4 ${
                                  index !== STATUS_OPTIONS.length - 1
                                    ? "border-b border-separator"
                                    : ""
                                }`}
                                style={{
                                  backgroundColor: isSelected
                                    ? `${status.color}0a`
                                    : "transparent",
                                }}
                              >
                                {/* Icon circle */}
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors duration-150"
                                  style={{
                                    backgroundColor: isSelected
                                      ? status.color
                                      : status.bgColor,
                                  }}
                                >
                                  <StatusIcon
                                    size={16}
                                    strokeWidth={2.5}
                                    style={{
                                      color: isSelected
                                        ? "white"
                                        : status.color,
                                    }}
                                  />
                                </div>

                                {/* Label */}
                                <span
                                  className={`text-body flex-1 text-left ${
                                    isSelected
                                      ? "font-semibold"
                                      : "font-normal"
                                  }`}
                                  style={{
                                    color: isSelected
                                      ? status.color
                                      : "#000",
                                  }}
                                >
                                  {status.label}
                                </span>

                                {/* Emoji */}
                                <span className="text-body mr-2">
                                  {status.emoji}
                                </span>

                                {/* Checkmark */}
                                <AnimatePresence initial={false}>
                                  {isSelected && (
                                    <motion.span
                                      initial={ICON_ENTER}
                                      animate={ICON_VISIBLE}
                                      exit={ICON_ENTER}
                                      transition={ICON_SPRING}
                                      className="flex"
                                    >
                                      <Check
                                        size={18}
                                        strokeWidth={2.5}
                                        style={{ color: status.color }}
                                      />
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Set as Study Goal */}
                      {certification.status !== "locked" && (
                        <div className="mx-4 mb-4">
                          <motion.button
                            whileTap={TAP_CARD}
                            onClick={handleSetStudyGoal}
                            className="w-full bg-accent rounded-xl py-4 flex items-center justify-center gap-2 shadow-card"
                          >
                            <BookOpen size={18} className="text-white" />
                            <span className="text-body font-semibold text-white">
                              Set as Current Study Goal
                            </span>
                          </motion.button>
                        </div>
                      )}

                      {/* Delete (custom only, from view mode too) */}
                      {isCustom && (
                        <div className="mx-4 mb-4">
                          <motion.button
                            whileTap={TAP_CARD}
                            onClick={() => { haptic.trigger("warning"); setShowDeleteConfirm(true); }}
                            className="w-full bg-surface rounded-xl py-4 flex items-center justify-center gap-2 border border-negative/20"
                          >
                            <Trash2 size={18} className="text-negative" />
                            <span className="text-body font-medium text-negative">
                              Delete Certification
                            </span>
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AnimatedHeight>
          </div>
      </Sheet>

      {/* Delete Confirmation — rendered outside sheet so it stacks on top */}
      <DeleteConfirmModal
        visible={showDeleteConfirm}
        certName={certification?.name}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
