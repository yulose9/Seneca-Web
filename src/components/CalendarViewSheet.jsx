import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import React, { useMemo, useRef, useLayoutEffect, useState } from "react";

// Helper to determine quarter from target string
const getQuarterFromTarget = (target) => {
  if (!target) return "Unscheduled";

  const targetLower = target.toLowerCase();

  // Year 2 detection
  const isY2 = targetLower.includes("y2") || targetLower.includes("2026");
  const yearPrefix = isY2 ? "Y2 " : "Y1 ";

  // Quarter detection
  if (targetLower.includes("q1")) return `${yearPrefix}Q1 (Jan-Mar)`;
  if (targetLower.includes("q2")) return `${yearPrefix}Q2 (Apr-Jun)`;
  if (targetLower.includes("q3")) return `${yearPrefix}Q3 (Jul-Sep)`;
  if (targetLower.includes("q4")) return `${yearPrefix}Q4 (Oct-Dec)`;

  // Month detection
  if (targetLower.match(/jan|feb|mar/)) return `${yearPrefix}Q1 (Jan-Mar)`;
  if (targetLower.match(/apr|may|jun/)) return `${yearPrefix}Q2 (Apr-Jun)`;
  if (targetLower.match(/jul|aug|sep/)) return `${yearPrefix}Q3 (Jul-Sep)`;
  if (targetLower.match(/oct|nov|dec/)) return `${yearPrefix}Q4 (Oct-Dec)`;

  return "Unscheduled";
};

// Sort order for quarters
const QUARTER_ORDER = [
  "Y1 Q1 (Jan-Mar)",
  "Y1 Q2 (Apr-Jun)",
  "Y1 Q3 (Jul-Sep)",
  "Y1 Q4 (Oct-Dec)",
  "Y2 Q1 (Jan-Mar)",
  "Y2 Q2 (Apr-Jun)",
  "Y2 Q3 (Jul-Sep)",
  "Y2 Q4 (Oct-Dec)",
  "Unscheduled",
];

export default function CalendarViewSheet({
  visible,
  onClose,
  domains,
  customCertifications,
}) {
  // Aggregate and group all certifications
  const groupedCerts = useMemo(() => {
    const allCerts = [];

    // Add domain certs
    domains.forEach((domain) => {
      if (domain.subcategories) {
        domain.subcategories.forEach((sub) => {
          sub.modules.forEach((module) => {
            allCerts.push({
              ...module,
              category: domain.title,
              subCategory: sub.name,
              color: domain.color,
            });
          });
        });
      } else if (domain.modules) {
        domain.modules.forEach((module) => {
          allCerts.push({
            ...module,
            category: domain.title,
            color: domain.color,
          });
        });
      }
    });

    // Add custom certs
    if (customCertifications) {
      customCertifications.forEach((cert) => {
        allCerts.push({ ...cert, category: "Custom", color: "#007AFF" });
      });
    }

    // Group by quarter
    const groups = {};
    allCerts.forEach((cert) => {
      const quarter = getQuarterFromTarget(cert.target);
      if (!groups[quarter]) {
        groups[quarter] = [];
      }
      groups[quarter].push(cert);
    });

    return groups;
  }, [domains, customCertifications]);

  // Sort quarters
  const sortedQuarters = Object.keys(groupedCerts).sort((a, b) => {
    const idxA = QUARTER_ORDER.indexOf(a);
    const idxB = QUARTER_ORDER.indexOf(b);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

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
              className="flex justify-center pt-3 pb-2 bg-white/50 backdrop-blur-md cursor-pointer"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 bg-[rgba(60,60,67,0.3)] rounded-full" />
            </div>

            {/* Navigation Bar */}
            <div className="relative flex items-center justify-center h-11 border-b border-[rgba(60,60,67,0.12)] bg-white/50 backdrop-blur-md shrink-0">
              <h2 className="text-[17px] font-semibold text-black">
                Certification Roadmap
              </h2>
              <button
                onClick={onClose}
                className="absolute right-4 w-7 h-7 bg-[#EEE] rounded-full flex items-center justify-center text-[#8E8E93]"
              >
                <span className="text-sm font-bold">✕</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-5 pb-20">
              {sortedQuarters.map((quarter) => (
                <div key={quarter} className="mb-6">
                  <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-3 sticky top-0 bg-[#F2F2F7] py-2 z-10">
                    {quarter}
                  </h3>
                  <div className="grid gap-3">
                    {groupedCerts[quarter].map((cert, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl p-4 border border-black/[0.04] shadow-sm flex items-center gap-3"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cert.color}15` }}
                        >
                          {/* Simple Icon placeholder if none provided */}
                          <span
                            className="text-lg font-bold"
                            style={{ color: cert.color }}
                          >
                            {cert.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-black leading-tight mb-1 truncate">
                            {cert.name}
                          </p>
                          <div className="flex items-center gap-2 text-[13px]">
                            <span
                              className={clsx(
                                "font-medium",
                                cert.status === "done"
                                  ? "text-green-500"
                                  : cert.status === "progress"
                                    ? "text-orange-500"
                                    : "text-gray-400"
                              )}
                            >
                              {cert.status === "done"
                                ? "Completed"
                                : cert.status === "progress"
                                  ? "In Progress"
                                  : "Planned"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500">
                              {cert.category}
                            </span>
                          </div>
                        </div>
                        {cert.status === "done" && (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M10 3L4.5 8.5L2 6"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {sortedQuarters.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <p>No certifications found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
