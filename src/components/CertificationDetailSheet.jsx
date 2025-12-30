import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, Clock, Lock, Pencil, Trash2, X } from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// Animated Height Container
const AnimatedHeight = ({ children, className = "" }) => {
  const containerRef = useRef(null);
  const [height, setHeight] = useState("auto");

  useLayoutEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <motion.div
      style={{ height }}
      animate={{ height }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 40,
        mass: 1,
      }}
      className={`overflow-hidden ${className}`}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

// Status options with their visual properties
const STATUS_OPTIONS = [
  {
    id: "done",
    label: "Completed",
    icon: Check,
    color: "#34C759",
    bgColor: "rgba(52, 199, 89, 0.12)",
  },
  {
    id: "progress",
    label: "Studying",
    icon: Clock,
    color: "#FF9500",
    bgColor: "rgba(255, 149, 0, 0.12)",
  },
  {
    id: "locked",
    label: "Locked",
    icon: Lock,
    color: "#8E8E93",
    bgColor: "rgba(142, 142, 147, 0.12)",
  },
];

// Level badge colors
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
  const [editForm, setEditForm] = useState({
    target: "",
    vendor: "",
    level: "",
  });

  useEffect(() => {
    if (visible && certification) {
      setEditForm({
        target: certification.target || "",
        vendor: certification.vendor || "",
        level: certification.level || "Foundational",
      });
      setIsEditing(false);
    }
  }, [visible, certification]);

  if (!certification) return null;

  const handleStatusChange = (newStatus) => {
    onUpdateStatus(certification, newStatus);
  };

  const handleSave = () => {
    onUpdateCertification({
      ...certification,
      ...editForm,
    });
    setIsEditing(false);
  };

  const handleSetStudyGoal = () => {
    if (certification.status !== "locked") {
      onSetStudyGoal(certification);
      onClose();
    }
  };

  const levelColor = LEVEL_COLORS[certification.level] || "#007AFF";

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#F2F2F7] rounded-t-[14px] max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-pointer shrink-0"
              onClick={onClose}
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
                {isEditing ? "Edit Details" : "Certification"}
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

            {/* Content Container */}
            <div className="overflow-y-auto overflow-x-hidden w-full">
              <AnimatedHeight>
                <div className="pb-32">
                  <AnimatePresence mode="wait">
                    {isEditing ? (
                      /* Edit Form */
                      <motion.div
                        key="edit-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="pt-6"
                      >
                        <div className="mb-6">
                          <p className="text-[13px] font-normal text-[#86868B] uppercase tracking-wide px-5 mb-2">
                            Details
                          </p>
                          <div className="mx-4 bg-white rounded-xl overflow-hidden">
                            {/* Target Input */}
                            <div className="flex items-center min-h-[44px] px-4 border-b border-[rgba(60,60,67,0.12)]">
                              <span className="text-[17px] text-black w-24 shrink-0">
                                Target
                              </span>
                              <input
                                type="text"
                                value={editForm.target}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    target: e.target.value,
                                  })
                                }
                                placeholder="e.g. Y1 Q3"
                                className="flex-1 text-[17px] text-zinc-600 outline-none bg-transparent text-right"
                              />
                            </div>

                            {/* Vendor Input */}
                            <div className="flex items-center min-h-[44px] px-4 border-b border-[rgba(60,60,67,0.12)]">
                              <span className="text-[17px] text-black w-24 shrink-0">
                                Vendor
                              </span>
                              <input
                                type="text"
                                value={editForm.vendor}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    vendor: e.target.value,
                                  })
                                }
                                placeholder="e.g. AWS"
                                className="flex-1 text-[17px] text-zinc-600 outline-none bg-transparent text-right"
                              />
                            </div>

                            {/* Level Select */}
                            <div className="flex items-center min-h-[44px] px-4">
                              <span className="text-[17px] text-black w-24 shrink-0">
                                Level
                              </span>
                              <select
                                value={editForm.level}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    level: e.target.value,
                                  })
                                }
                                className="flex-1 text-[17px] text-zinc-600 outline-none bg-transparent text-right appearance-none"
                              >
                                {LEVEL_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      /* View Mode */
                      <motion.div
                        key="view-mode"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Hero Card */}
                        <div className="mx-4 mt-6 mb-6">
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04]">
                            {/* Status Badge */}
                            <div className="flex items-center justify-between mb-3">
                              <span
                                className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-md"
                                style={{
                                  backgroundColor: `${levelColor}15`,
                                  color: levelColor,
                                }}
                              >
                                {certification.level}
                              </span>
                              {certification.vendor && (
                                <span className="text-[12px] font-medium text-[rgba(60,60,67,0.6)]">
                                  {certification.vendor}
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className="text-[20px] font-bold text-black mb-2 leading-tight">
                              {certification.name}
                            </h3>

                            {/* Target */}
                            <p className="text-[15px] text-[rgba(60,60,67,0.6)]">
                              📅 Target: {certification.target}
                            </p>

                            {/* Prerequisite (if any) */}
                            {certification.prereq && (
                              <p className="text-[13px] text-[rgba(60,60,67,0.4)] mt-2">
                                ⚠️ Requires: {certification.prereq}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Section */}
                        <div className="mb-6">
                          <p className="text-[13px] font-normal text-[#86868B] uppercase tracking-wide px-5 mb-2">
                            Status
                          </p>
                          <div className="mx-4 bg-white rounded-xl overflow-hidden">
                            {STATUS_OPTIONS.map((status, index) => {
                              const isSelected =
                                certification.status === status.id;
                              const StatusIcon = status.icon;

                              return (
                                <motion.button
                                  key={status.id}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleStatusChange(status.id)}
                                  className={`w-full flex items-center py-3.5 px-4 ${
                                    index !== STATUS_OPTIONS.length - 1
                                      ? "border-b border-[rgba(60,60,67,0.12)]"
                                      : ""
                                  }`}
                                >
                                  {/* Status Icon */}
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
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
                                      color: isSelected ? status.color : "#000",
                                    }}
                                  >
                                    {status.label}
                                  </span>

                                  {/* Checkmark for selected */}
                                  {isSelected && (
                                    <Check
                                      size={20}
                                      strokeWidth={2.5}
                                      style={{ color: status.color }}
                                    />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Set as Study Goal Button */}
                        {certification.status !== "locked" && (
                          <div className="mx-4 mb-4">
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={handleSetStudyGoal}
                              className="w-full bg-[#007AFF] rounded-xl py-4 flex items-center justify-center gap-2"
                            >
                              <BookOpen size={18} className="text-white" />
                              <span className="text-[17px] font-semibold text-white">
                                Set as Current Study Goal
                              </span>
                            </motion.button>
                          </div>
                        )}

                        {/* Delete Button (only for custom certifications) */}
                        {isCustom && (
                          <div className="mx-4 mt-2">
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                onDelete?.(certification);
                                onClose();
                              }}
                              className="w-full bg-white rounded-xl py-4 flex items-center justify-center gap-2"
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
  );
}
