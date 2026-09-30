import { AnimatePresence, motion } from "framer-motion";
import { Download, FileJson } from "lucide-react";
import React, { useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import {
  exportAsLLMPrompt,
  exportForLLM,
  getLastNDaysLogs,
} from "../services/dataLogger";
import { DIALOG_SPRING, FADE, TAP, TAP_TRANSITION } from "../constants/motion";

/**
 * Export Data Component
 * Allows you to view and export your data for LLM analysis
 */
export default function ExportDataButton() {
  const haptic = useWebHaptics();
  const [showModal, setShowModal] = useState(false);
  const [exportType, setExportType] = useState("json");
  const [days, setDays] = useState(30);

  const handleExport = () => {
    let data;
    let filename;
    let content;

    if (exportType === "json") {
      data = exportForLLM(days);
      filename = `seneca-data-${days}days.json`;
      content = JSON.stringify(data, null, 2);
    } else {
      data = exportAsLLMPrompt(days);
      filename = `seneca-prompt-${days}days.txt`;
      content = data;
    }

    // Create download
    const blob = new Blob([content], {
      type: exportType === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    // Revoking synchronously can cancel the download in Safari/Firefox
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    haptic.trigger("success");
    setShowModal(false);
  };

  const logs = getLastNDaysLogs(7);
  const avgCompletion = logs.length
    ? Math.round(
        (logs.reduce(
          (sum, log) => sum + (log.protocol?.completion_rate || 0),
          0,
        ) /
          logs.length) *
          100,
      )
    : 0;

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileTap={TAP}
        transition={TAP_TRANSITION}
        aria-label="Export data"
        onClick={() => {
          haptic.trigger("medium");
          setShowModal(true);
        }}
        className="fixed bottom-[calc(var(--tab-height)+env(safe-area-inset-bottom)+20px)] right-5 z-40 w-12 h-12 rounded-full bg-surface text-ink flex items-center justify-center shadow-float"
      >
        <FileJson size={20} strokeWidth={2} className="text-ink" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            onClick={() => setShowModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0, transition: FADE }}
            transition={DIALOG_SPRING}
            role="dialog"
            aria-modal="true"
            className="relative bg-surface rounded-2xl p-6 max-w-md w-full shadow-float"
          >
            <h2 className="text-title-2 font-bold text-ink mb-2">
              Export Data for LLM
            </h2>
            <p className="text-subhead text-ink-2 mb-6">
              Download your habit data in a format optimized for AI analysis.
            </p>

            {/* Stats Preview */}
            <div className="bg-fill rounded-xl p-4 mb-6">
              <p className="text-footnote text-ink-2 mb-2">
                Last 7 Days Summary
              </p>
              <div className="flex justify-between">
                <div>
                  <p className="text-title-2 font-bold text-ink tabular-nums">
                    {logs.length}
                  </p>
                  <p className="text-footnote text-ink-2">Days Tracked</p>
                </div>
                <div>
                  <p className="text-title-2 font-bold text-accent tabular-nums">
                    {avgCompletion}%
                  </p>
                  <p className="text-footnote text-ink-2">Avg Completion</p>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4 mb-6">
              {/* Days Selector */}
              <div>
                <label className="text-footnote font-semibold text-ink-2 mb-2 block">
                  Time range
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-fill rounded-xl text-body text-ink outline-none"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>

              {/* Format Selector */}
              <div>
                <label className="text-footnote font-semibold text-ink-2 mb-2 block">
                  Export format
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportType("json")}
                    aria-pressed={exportType === "json"}
                    className={`flex-1 px-4 py-3 rounded-xl text-subhead font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96] ${
                      exportType === "json"
                        ? "bg-accent text-white"
                        : "bg-fill text-ink"
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setExportType("prompt")}
                    aria-pressed={exportType === "prompt"}
                    className={`flex-1 px-4 py-3 rounded-xl text-subhead font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96] ${
                      exportType === "prompt"
                        ? "bg-accent text-white"
                        : "bg-fill text-ink"
                    }`}
                  >
                    LLM Prompt
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 rounded-xl text-body font-semibold text-accent bg-fill active:scale-[0.96] transition-[scale] duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 px-4 py-3 rounded-xl text-body font-semibold text-white bg-accent flex items-center justify-center gap-2 active:scale-[0.96] transition-[scale] duration-150"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
}
