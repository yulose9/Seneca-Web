import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

const ITEM_HEIGHT = 44; // Standard iOS height
const VISIBLE_ITEMS = 5; // How many items to show in the viewport

export default function IOSPicker({ items, value, onChange, label }) {
    const containerRef = useRef(null);
    const scrollY = useSpring(0, { stiffness: 400, damping: 90 }); // Smooth the scroll reading

    // Initialize scroll position based on value
    useEffect(() => {
        if (containerRef.current) {
            const index = items.indexOf(value);
            if (index !== -1) {
                containerRef.current.scrollTop = index * ITEM_HEIGHT;
            }
        }
    }, []); // Run once on mount

    const handleScroll = (e) => {
        scrollY.set(e.target.scrollTop);

        // Calculate selected item based on scroll position
        const index = Math.round(e.target.scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
        if (items[clampedIndex] !== value) {
            onChange(items[clampedIndex]);
        }
    };

    return (
        <div className="relative h-[220px] w-full max-w-[100px] overflow-hidden">
            {/* Label (kg, etc) */}
            {label && (
                <span className="absolute right-[-10px] top-1/2 -translate-y-1/2 text-[15px] font-medium text-gray-500 pointer-events-none z-20">
                    {label}
                </span>
            )}

            {/* Selection Highlight (Glass Bar) */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[44px] bg-[#007AFF]/10 rounded-[8px] pointer-events-none z-10 border-y border-[#007AFF]/20" />

            {/* Scroll Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide py-[88px]" // py = (height - itemHeight) / 2
                style={{
                    perspective: "1000px",
                    perspectiveOrigin: "center center",
                    msOverflowStyle: "none",
                    scrollbarWidth: "none"
                }}
            >
                <div className="relative">
                    {items.map((item, i) => (
                        <PickerItem
                            key={i}
                            item={item}
                            index={i}
                            containerScrollY={scrollY}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function PickerItem({ item, index, containerScrollY }) {
    // Calculate relative position of this item
    const yRange = [
        (index - 2) * ITEM_HEIGHT,
        (index - 1) * ITEM_HEIGHT,
        index * ITEM_HEIGHT, // Center
        (index + 1) * ITEM_HEIGHT,
        (index + 2) * ITEM_HEIGHT,
    ];

    // Rotate X: 0 when in center, +/- 60deg at edges
    const rotateX = useTransform(containerScrollY, yRange, [60, 45, 0, -45, -60]);

    // Opacity: 1 in center, 0.3 at edges
    const opacity = useTransform(containerScrollY, yRange, [0.3, 0.5, 1, 0.5, 0.3]);

    // Scale: 1.1 in center, 0.8 at edges
    const scale = useTransform(containerScrollY, yRange, [0.8, 0.9, 1.1, 0.9, 0.8]);

    return (
        <div className="h-[44px] flex items-center justify-center snap-center">
            <motion.div
                style={{
                    rotateX,
                    opacity,
                    scale,
                    transformStyle: "preserve-3d",
                }}
                className="text-[22px] font-semibold text-black origin-center"
            >
                {item}
            </motion.div>
        </div>
    );
}
