import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import React, { useState } from "react";

// Level options
const LEVEL_OPTIONS = [
  { id: "Foundational", label: "Foundational", color: "#5AC8FA" },
  { id: "Associate", label: "Associate", color: "#FF9500" },
  { id: "Professional", label: "Professional", color: "#FF3B30" },
  { id: "Expert", label: "Expert", color: "#AF52DE" },
];

// Category options (domains)
const CATEGORY_OPTIONS = [
  { id: "technical", label: "Technical Mastery", icon: "⚡", color: "#FF3B30" },
  {
    id: "communication",
    label: "Communication Core",
    icon: "🗣️",
    color: "#007AFF",
  },
  {
    id: "collaboration",
    label: "Collaboration & Problem Solving",
    icon: "🤝",
    color: "#34C759",
  },
  {
    id: "leadership",
    label: "Leadership & Governance",
    icon: "🛡️",
    color: "#AF52DE",
  },
];

// Vendor options (for technical)
const VENDOR_OPTIONS = [
  { id: "AWS", label: "Amazon Web Services" },
  { id: "Red Hat", label: "Red Hat" },
  { id: "HashiCorp", label: "HashiCorp" },
  { id: "GitHub", label: "GitHub" },
  { id: "Microsoft", label: "Microsoft" },
  { id: "Google", label: "Google Cloud" },
  { id: "Other", label: "Other" },
];

// iOS-style Form Row Component
const FormRow = ({ label, children, isLast = false, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center min-h-[44px] px-4 ${
      !isLast ? "border-b border-[rgba(60,60,67,0.12)]" : ""
    } ${onClick ? "cursor-pointer active:bg-black/[0.02]" : ""}`}
  >
    {label && (
      <span className="text-[17px] text-black w-28 shrink-0">{label}</span>
    )}
    <div className="flex-1 flex items-center justify-end">{children}</div>
    {onClick && (
      <ChevronRight size={18} className="text-[rgba(60,60,67,0.3)] ml-1" />
    )}
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

// Selector Sheet (iOS action sheet style)
const SelectorSheet = ({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}) => (
  <AnimatePresence>
    {visible && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-[60]"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[60] bg-[#F2F2F7] rounded-t-[14px] max-h-[60vh]"
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-9 h-[5px] bg-[rgba(60,60,67,0.3)] rounded-full" />
          </div>
          <div className="relative flex items-center justify-center h-11 border-b border-[rgba(60,60,67,0.12)]">
            <h2 className="text-[17px] font-semibold text-black">{title}</h2>
            <button
              onClick={onClose}
              className="absolute right-4 text-[17px] text-[#007AFF] font-semibold"
            >
              Done
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(60vh-60px)] pb-8">
            <div className="mx-4 mt-4 bg-white rounded-xl overflow-hidden">
              {options.map((option, index) => (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onSelect(option);
                    onClose();
                  }}
                  className={`w-full flex items-center py-3.5 px-4 ${
                    index !== options.length - 1
                      ? "border-b border-[rgba(60,60,67,0.12)]"
                      : ""
                  }`}
                >
                  {option.icon && (
                    <span className="text-lg mr-3">{option.icon}</span>
                  )}
                  <span className="text-[17px] text-black flex-1 text-left">
                    {option.label}
                  </span>
                  {selected?.id === option.id && (
                    <span className="text-[#007AFF] text-lg">✓</span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default function AddCertificationSheet({
  visible,
  onClose,
  onAddCertification,
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(LEVEL_OPTIONS[0]);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Selector sheet states
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showVendorSelector, setShowVendorSelector] = useState(false);

  const isValid = name.trim().length > 0 && target.trim().length > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    const newCert = {
      id: `cert-${Date.now()}`,
      name: name.trim(),
      target: target.trim(),
      level: selectedLevel.id,
      status: "locked",
      vendor:
        selectedCategory.id === "technical" ? selectedVendor?.id : undefined,
      category: selectedCategory.id,
      isCustom: true,
    };

    onAddCertification(newCert);

    // Reset form
    setName("");
    setTarget("");
    setSelectedLevel(LEVEL_OPTIONS[0]);
    setSelectedCategory(CATEGORY_OPTIONS[0]);
    setSelectedVendor(null);
    onClose();
  };

  const handleClose = () => {
    setName("");
    setTarget("");
    setSelectedLevel(LEVEL_OPTIONS[0]);
    setSelectedCategory(CATEGORY_OPTIONS[0]);
    setSelectedVendor(null);
    onClose();
  };

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

            {/* Navigation Bar */}
            <div className="relative flex items-center justify-center h-11 border-b border-[rgba(60,60,67,0.12)]">
              <button
                onClick={handleClose}
                className="absolute left-4 text-[17px] text-[#007AFF] font-normal active:opacity-50"
              >
                Cancel
              </button>
              <h2 className="text-[17px] font-semibold text-black">
                New Certification
              </h2>
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                className={`absolute right-4 text-[17px] font-semibold transition-colors ${
                  isValid
                    ? "text-[#007AFF] active:opacity-50"
                    : "text-[rgba(60,60,67,0.3)]"
                }`}
              >
                Add
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(92vh-60px)] pb-10">
              {/* Hero Icon */}
              <div className="flex flex-col items-center py-6">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: `${selectedCategory.color}20`,
                  }}
                >
                  <span className="text-5xl">📜</span>
                </div>
              </div>

              {/* Details Section */}
              <FormSection header="Certification Details">
                <FormRow label="Name">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., AWS Solutions Architect"
                    className="w-full text-[17px] text-black text-right placeholder:text-[rgba(60,60,67,0.3)] outline-none bg-transparent py-3"
                    autoFocus
                  />
                </FormRow>
                <FormRow label="Target">
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="e.g., Q2 2025 or Mar 15"
                    className="w-full text-[17px] text-black text-right placeholder:text-[rgba(60,60,67,0.3)] outline-none bg-transparent py-3"
                  />
                </FormRow>
                <FormRow
                  label="Level"
                  onClick={() => setShowLevelSelector(true)}
                  isLast={selectedCategory.id !== "technical"}
                >
                  <span
                    className="text-[17px]"
                    style={{ color: selectedLevel.color }}
                  >
                    {selectedLevel.label}
                  </span>
                </FormRow>
                {selectedCategory.id === "technical" && (
                  <FormRow
                    label="Vendor"
                    onClick={() => setShowVendorSelector(true)}
                    isLast
                  >
                    <span className="text-[17px] text-[rgba(60,60,67,0.6)]">
                      {selectedVendor?.label || "Select vendor"}
                    </span>
                  </FormRow>
                )}
              </FormSection>

              {/* Category Section */}
              <FormSection header="Category">
                <FormRow
                  label="Domain"
                  onClick={() => setShowCategorySelector(true)}
                  isLast
                >
                  <div className="flex items-center gap-2">
                    <span>{selectedCategory.icon}</span>
                    <span
                      className="text-[17px]"
                      style={{ color: selectedCategory.color }}
                    >
                      {selectedCategory.label}
                    </span>
                  </div>
                </FormRow>
              </FormSection>
            </div>
          </motion.div>

          {/* Selector Sheets */}
          <SelectorSheet
            visible={showLevelSelector}
            title="Select Level"
            options={LEVEL_OPTIONS}
            selected={selectedLevel}
            onSelect={setSelectedLevel}
            onClose={() => setShowLevelSelector(false)}
          />
          <SelectorSheet
            visible={showCategorySelector}
            title="Select Category"
            options={CATEGORY_OPTIONS}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            onClose={() => setShowCategorySelector(false)}
          />
          <SelectorSheet
            visible={showVendorSelector}
            title="Select Vendor"
            options={VENDOR_OPTIONS}
            selected={selectedVendor}
            onSelect={setSelectedVendor}
            onClose={() => setShowVendorSelector(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
