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
      transition={{ type: "spring", stiffness: 500, damping: 40, mass: 1 }}
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
  <p className="text-[13px] font-normal text-[#86868B] uppercase tracking-wide px-5 mb-2">
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
      !isLast ? "border-b border-[rgba(60,60,67,0.12)]" : ""
    } ${onClick ? "cursor-pointer active:bg-black/[0.02]" : ""}`}
  >
    {label && (
      <span
        className="text-[17px] w-28 shrink-0"
        style={{ color: destructive ? "#FF3B30" : "#000" }}
      >
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
          onClick={onCancel}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
        />
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 320 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[280px] bg-white rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Icon + title */}
          <div className="flex flex-col items-center px-6 pt-7 pb-4">
            <div className="w-14 h-14 rounded-full bg-[rgba(255,59,48,0.1)] flex items-center justify-center mb-4">
              <AlertTriangle size={28} className="text-[#FF3B30]" />
            </div>
            <h3 className="text-[17px] font-semibold text-black text-center mb-1">
              Delete Certification?
            </h3>
            <p className="text-[13px] text-[rgba(60,60,67,0.6)] text-center">
              <span className="font-medium text-black">"{certName}"</span> will
              be permanently removed. This cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="border-t border-[rgba(60,60,67,0.12)]">
            <button
              onClick={onConfirm}
              className="w-full py-3.5 text-[17px] font-semibold text-[#FF3B30] border-b border-[rgba(60,60,67,0.12)] active:bg-red-50"
            >
              Delete
            </button>
            <button
              onClick={onCancel}
              className="w-full py-3.5 text-[17px] font-normal text-[#007AFF] active:bg-blue-50"
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
      <AnimatePresence>
        {visible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { haptic.trigger("medium"); onClose(); }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#F2F2F7] rounded-t-[14px] max-h-[92vh] overflow-hidden flex flex-col"
            >
              {/* Drag Handle */}
              <div
                className="flex justify-center pt-3 pb-2 cursor-pointer shrink-0"
                onClick={() => { haptic.trigger("medium"); onClose(); }}
              >
                <div className="w-12 h-1.5 bg-[rgba(60,60,67,0.3)] rounded-full" />
              </div>

              {/* Navigation Bar */}
              <div className="relative flex items-center justify-between px-4 h-11 border-b border-[rgba(60,60,67,0.12)] shrink-0">
                {isEditing ? (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-[17px] text-[#FF3B30] font-normal active:opacity-50"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="text-[17px] text-[#007AFF] font-normal active:opacity-50"
                  >
                    Close
                  </button>
                )}

                <h2 className="text-[17px] font-semibold text-black absolute left-1/2 -translate-x-1/2">
                  {isEditing ? "Edit Certification" : "Certification"}
                </h2>

                {isEditing ? (
                  <button
                    onClick={handleSave}
                    className="text-[17px] text-[#007AFF] font-semibold active:opacity-50"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[17px] text-[#007AFF] font-normal active:opacity-50"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto overflow-x-hidden w-full">
                <AnimatedHeight>
                  <div className="pb-32">
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        /* ── EDIT FORM ─────────────────────────────────────── */
                        <motion.div
                          key="edit-form"
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.2 }}
                          className="pt-6"
                        >
                          {/* Certification Details */}
                          <div className="mb-6">
                            <SectionHeader>Certification</SectionHeader>
                            <div className="mx-4 bg-white rounded-xl overflow-hidden">
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
                                    className="flex-1 text-[17px] text-zinc-600 outline-none bg-transparent text-right"
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
                                  className="flex-1 text-[17px] text-zinc-600 outline-none bg-transparent text-right"
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
                                  className="flex-1 text-[17px] text-zinc-600 outline-none bg-transparent text-right"
                                />
                              </GroupedRow>

                              {/* Level */}
                              <GroupedRow label="Level" isLast>
                                <select
                                  value={editForm.level}
                                  onChange={(e) =>
                                    updateField("level", e.target.value)
                                  }
                                  className="flex-1 text-[17px] text-zinc-600 outline-none bg-transparent text-right appearance-none"
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
                            <div className="mx-4 bg-white rounded-xl overflow-hidden">
                              <div className="px-4 py-3">
                                <textarea
                                  value={editForm.notes}
                                  onChange={(e) =>
                                    updateField("notes", e.target.value)
                                  }
                                  placeholder="Add notes, exam tips, links…"
                                  rows={4}
                                  className="w-full text-[17px] text-zinc-700 outline-none bg-transparent resize-none placeholder:text-[rgba(60,60,67,0.3)]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Delete (custom only) */}
                          {isCustom && (
                            <div className="mb-6">
                              <div className="mx-4 bg-white rounded-xl overflow-hidden">
                                <GroupedRow
                                  isLast
                                  onClick={() => { haptic.trigger("warning"); setShowDeleteConfirm(true); }}
                                >
                                  <span className="text-[17px] font-medium text-[#FF3B30]">
                                    Delete Certification
                                  </span>
                                  <Trash2
                                    size={18}
                                    className="text-[#FF3B30] ml-2"
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
                          transition={{ duration: 0.2 }}
                        >
                          {/* Hero Card */}
                          <div className="mx-4 mt-6 mb-4">
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04]">
                              {/* Level + vendor row */}
                              <div className="flex items-center justify-between mb-3">
                                <span
                                  className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-md tracking-wide"
                                  style={{
                                    backgroundColor: `${levelColor}18`,
                                    color: levelColor,
                                  }}
                                >
                                  {certification.level}
                                </span>
                                {certification.vendor && (
                                  <span className="text-[12px] font-medium text-[rgba(60,60,67,0.55)]">
                                    {certification.vendor}
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <h3 className="text-[20px] font-bold text-black mb-2 leading-tight">
                                {certification.name}
                              </h3>

                              {/* Target */}
                              {certification.target && (
                                <p className="text-[14px] text-[rgba(60,60,67,0.55)] mb-1">
                                  📅 Target:{" "}
                                  <span className="font-medium text-[rgba(60,60,67,0.8)]">
                                    {certification.target}
                                  </span>
                                </p>
                              )}

                              {/* Prereq */}
                              {certification.prereq && (
                                <p className="text-[13px] text-[rgba(60,60,67,0.4)] mt-1">
                                  ⚠️ Requires: {certification.prereq}
                                </p>
                              )}

                              {/* Notes preview */}
                              {certification.notes && (
                                <p className="text-[13px] text-[rgba(60,60,67,0.55)] mt-3 pt-3 border-t border-[rgba(60,60,67,0.08)] line-clamp-3">
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
                                className="text-[14px] font-semibold"
                                style={{ color: currentStatus.color }}
                              >
                                {currentStatus.label}
                              </span>
                            </div>
                          </div>

                          {/* Status Picker */}
                          <div className="mb-5">
                            <SectionHeader>Change Status</SectionHeader>
                            <div className="mx-4 bg-white rounded-xl overflow-hidden">
                              {STATUS_OPTIONS.map((status, index) => {
                                const isSelected =
                                  certification.status === status.id;
                                const StatusIcon = status.icon;

                                return (
                                  <motion.button
                                    key={status.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                      handleStatusChange(status.id)
                                    }
                                    className={`w-full flex items-center py-3.5 px-4 ${
                                      index !== STATUS_OPTIONS.length - 1
                                        ? "border-b border-[rgba(60,60,67,0.12)]"
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
                                      className="w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors"
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
                                      className={`text-[17px] flex-1 text-left ${
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
                                    <span className="text-[18px] mr-2">
                                      {status.emoji}
                                    </span>

                                    {/* Checkmark */}
                                    {isSelected && (
                                      <Check
                                        size={18}
                                        strokeWidth={2.5}
                                        style={{ color: status.color }}
                                      />
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Set as Study Goal */}
                          {certification.status !== "locked" && (
                            <div className="mx-4 mb-4">
                              <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSetStudyGoal}
                                className="w-full bg-[#007AFF] rounded-xl py-4 flex items-center justify-center gap-2 shadow-sm"
                              >
                                <BookOpen size={18} className="text-white" />
                                <span className="text-[17px] font-semibold text-white">
                                  Set as Current Study Goal
                                </span>
                              </motion.button>
                            </div>
                          )}

                          {/* Delete (custom only, from view mode too) */}
                          {isCustom && (
                            <div className="mx-4 mb-4">
                              <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { haptic.trigger("warning"); setShowDeleteConfirm(true); }}
                                className="w-full bg-white rounded-xl py-4 flex items-center justify-center gap-2 border border-[rgba(255,59,48,0.2)]"
                              >
                                <Trash2 size={18} className="text-[#FF3B30]" />
                                <span className="text-[17px] font-medium text-[#FF3B30]">
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
