import React, { useState } from 'react';
import { useWebHaptics } from 'web-haptics/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Flame, Trophy, Landmark, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import LiquidGlass from './LiquidGlass';
import { TAP, TAP_TRANSITION } from '../constants/motion';

const PILL_SPRING = { type: "spring", duration: 0.3, bounce: 0 };

const tabs = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/protocol", icon: Flame, label: "Protocol" },
    { path: "/growth", icon: Trophy, label: "Growth" },
    { path: "/wealth", icon: Landmark, label: "Wealth" },
    { path: "/journal", icon: BookOpen, label: "Journal" },
];

export default function GlassTabBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const matchedIndex = tabs.findIndex(tab => tab.path === location.pathname);
    // Start on the current route so a deep link doesn't slide the pill in from Home
    const [activeIndex, setActiveIndex] = useState(matchedIndex === -1 ? 0 : matchedIndex);
    const haptic = useWebHaptics();

    // Constants for positioning
    const PADDING_LEFT = 10;
    const ITEM_WIDTH = 68;
    const GAP = 4;

    // Derive during render (no effect round-trip) when the route changes
    if (matchedIndex !== -1 && matchedIndex !== activeIndex) {
        setActiveIndex(matchedIndex);
    }

    // Calculate position for the single active pill
    // x = padding + (index * (width + gap))
    const currentX = PADDING_LEFT + (activeIndex * (ITEM_WIDTH + GAP));

    return (
        <LiquidGlass
            as={motion.nav}
            tint="transparent"
            className="liquid-nav"
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0, delay: 0.1 }}
        >
            {/* Single Floating Active Pill */}
            <motion.div
                className="liquid-active-tab"
                initial={false}
                animate={{ transform: `translateX(${currentX}px)` }}
                transition={PILL_SPRING}
                style={{
                    position: 'absolute',
                    left: 0, // We animate x from 0
                    width: ITEM_WIDTH,
                    height: 'calc(100% - 16px)', // 80px height - 8px top - 8px bottom
                    top: '8px',
                    borderRadius: '99em',
                    zIndex: 1,
                    // layoutId removed to prevent jumping
                }}
            >
                {/* Optional: Inner "liquid" distortion can go here if needed */}
            </motion.div>

            {tabs.map((tab, index) => {
                const isActive = activeIndex === index;
                const Icon = tab.icon;

                return (
                    <motion.button
                        key={tab.path}
                        type="button"
                        aria-label={tab.label}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => {
                            if (!isActive) haptic.trigger('selection');
                            navigate(tab.path);
                        }}
                        className={clsx("liquid-nav-item", isActive && "active")}
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                    >
                        {/* Icon with refined animations */}
                        <motion.div
                            className="relative z-10 flex flex-col items-center justify-center pointer-events-none" // prevent icon blocking clicks
                            animate={isActive ? {
                                y: -2,
                                scale: 1.1
                            } : {
                                y: 0,
                                scale: 1
                            }}
                            transition={PILL_SPRING}
                        >
                            {/* One stroke weight for the set — 2px matches the semibold label; state reads from color + pill */}
                            <Icon
                                size={26}
                                strokeWidth={2}
                                className="liquid-icon"
                                aria-hidden="true"
                            />
                            <span className="liquid-label">
                                {tab.label}
                            </span>
                        </motion.div>
                    </motion.button>
                );
            })}
        </LiquidGlass>
    );
}
