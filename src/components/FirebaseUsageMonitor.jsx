/**
 * Firebase Usage Monitor Component
 * 
 * Displays real-time Firestore operation counts
 * Helps you track and optimize Firebase costs
 * 
 * Usage: Add to any page in development
 * <FirebaseUsageMonitor />
 */

import React, { useState, useEffect } from 'react';

let operationCounts = {
    reads: 0,
    writes: 0,
    deletes: 0,
    listeners: 0,
};

// Intercept Firestore operations (for monitoring only)
export const trackOperation = (type) => {
    operationCounts[type]++;
};

export default function FirebaseUsageMonitor() {
    const [counts, setCounts] = useState(operationCounts);
    const [isVisible, setIsVisible] = useState(false);

    // Update counts every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCounts({ ...operationCounts });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Calculate daily projection
    const sessionDuration = 0.5; // Assume 30 min session
    const dailyMultiplier = 16; // 8 hours / 30 min

    const projected = {
        reads: Math.round(counts.reads * dailyMultiplier),
        writes: Math.round(counts.writes * dailyMultiplier),
        deletes: Math.round(counts.deletes * dailyMultiplier),
    };

    // Cost calculation (Blaze tier)
    const costPer100k = {
        reads: 0.06, // $0.06 per 100K reads
        writes: 0.18, // $0.18 per 100K writes
        deletes: 0.02, // $0.02 per 100K deletes
    };

    const dailyCost =
        (projected.reads / 100000 * costPer100k.reads) +
        (projected.writes / 100000 * costPer100k.writes) +
        (projected.deletes / 100000 * costPer100k.deletes);

    const monthlyCost = dailyCost * 30;

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-20 right-4 z-50 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium"
            >
                📊 Usage
            </button>
        );
    }

    return (
        <div className="fixed bottom-20 right-4 z-50 bg-white rounded-2xl shadow-2xl p-4 border border-gray-200 w-80">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <span className="text-xl">🔥</span>
                    Firebase Monitor
                </h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>

            {/* Session Counts */}
            <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">This Session</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-xs text-blue-600 font-medium">Reads</div>
                        <div className="text-lg font-bold text-blue-900">{counts.reads}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-xs text-green-600 font-medium">Writes</div>
                        <div className="text-lg font-bold text-green-900">{counts.writes}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                        <div className="text-xs text-red-600 font-medium">Deletes</div>
                        <div className="text-lg font-bold text-red-900">{counts.deletes}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2">
                        <div className="text-xs text-purple-600 font-medium">Listeners</div>
                        <div className="text-lg font-bold text-purple-900">{counts.listeners}</div>
                    </div>
                </div>
            </div>

            {/* Daily Projection */}
            <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Daily Projection</h4>
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Reads:</span>
                        <span className="font-medium">{projected.reads.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Writes:</span>
                        <span className="font-medium">{projected.writes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Deletes:</span>
                        <span className="font-medium">{projected.deletes.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Cost Estimate */}
            <div className="border-t border-gray-200 pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Cost Estimate</h4>
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Daily:</span>
                        <span className="font-bold text-green-600">${dailyCost.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Monthly:</span>
                        <span className="font-bold text-green-600">${monthlyCost.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Health Indicator */}
            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className={`text-2xl ${monthlyCost < 1 ? '🟢' : monthlyCost < 5 ? '🟡' : '🔴'}`}>
                        {monthlyCost < 1 ? '🟢' : monthlyCost < 5 ? '🟡' : '🔴'}
                    </span>
                    <div className="text-xs">
                        <div className="font-medium">
                            {monthlyCost < 1 ? 'Excellent' : monthlyCost < 5 ? 'Good' : 'Review Usage'}
                        </div>
                        <div className="text-gray-500">
                            {monthlyCost < 1
                                ? 'Very cost efficient'
                                : monthlyCost < 5
                                    ? 'Within budget'
                                    : 'Consider optimizing'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-3 text-xs text-gray-400 text-center">
                Based on Blaze (pay-as-you-go) pricing
            </div>
        </div>
    );
}

// Optional: Add to your dataLogger.js to track operations
export const wrapFirestoreOperation = (operation, type) => {
    trackOperation(type);
    return operation;
};
