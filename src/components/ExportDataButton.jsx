import { motion } from "framer-motion";
import { Download, FileJson } from "lucide-react";
import React, { useState } from "react";
import {
  exportAsLLMPrompt,
  exportForLLM,
  getLastNDaysLogs,
} from "../services/dataLogger";

/**
 * Export Data Component
 * Allows you to view and export your data for LLM analysis
 */
export default function ExportDataButton() {
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
    URL.revokeObjectURL(url);

    setShowModal(false);
  };

  const logs = getLastNDaysLogs(7);

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-[#5856D6] flex items-center justify-center shadow-lg"
      >
        <FileJson size={24} className="text-white" />
      </motion.button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => setShowModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
          >
            <h2 className="text-[22px] font-bold text-black mb-2">
              Export Data for LLM
            </h2>
            <p className="text-[15px] text-[#86868B] mb-6">
              Download your habit data in a format optimized for AI analysis.
            </p>

            {/* Stats Preview */}
            <div className="bg-[#F2F2F7] rounded-xl p-4 mb-6">
              <p className="text-[13px] text-[#86868B] mb-2">
                Last 7 Days Summary
              </p>
              <div className="flex justify-between">
                <div>
                  <p className="text-[24px] font-bold text-black">
                    {logs.length}
                  </p>
                  <p className="text-[13px] text-[#86868B]">Days Tracked</p>
                </div>
                <div>
                  <p className="text-[24px] font-bold text-[#007AFF]">
                    {Math.round(
                      (logs.reduce(
                        (sum, log) =>
                          sum + (log.protocol?.completion_rate || 0),
                        0
                      ) /
                        logs.length) *
                        100
                    )}
                    %
                  </p>
                  <p className="text-[13px] text-[#86868B]">Avg Completion</p>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4 mb-6">
              {/* Days Selector */}
              <div>
                <label className="text-[13px] text-[#86868B] uppercase tracking-wide mb-2 block">
                  Time Range
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-[#F2F2F7] rounded-xl text-[17px] text-black outline-none"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>

              {/* Format Selector */}
              <div>
                <label className="text-[13px] text-[#86868B] uppercase tracking-wide mb-2 block">
                  Export Format
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportType("json")}
                    className={`flex-1 px-4 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                      exportType === "json"
                        ? "bg-[#007AFF] text-white"
                        : "bg-[#F2F2F7] text-black"
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setExportType("prompt")}
                    className={`flex-1 px-4 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                      exportType === "prompt"
                        ? "bg-[#007AFF] text-white"
                        : "bg-[#F2F2F7] text-black"
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
                className="flex-1 px-4 py-3 rounded-xl text-[17px] font-semibold text-[#007AFF] bg-[#F2F2F7]"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 px-4 py-3 rounded-xl text-[17px] font-semibold text-white bg-[#007AFF] flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
