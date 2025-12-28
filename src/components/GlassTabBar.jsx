import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Home, Flame, Trophy, Landmark, BookOpen } from 'lucide-react';
import clsx from 'clsx';

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
    const [activeIndex, setActiveIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState(0);
    const pillControls = useAnimation();

    // Constants for positioning
    const PADDING_LEFT = 10;
    const ITEM_WIDTH = 68;
    const GAP = 4;

    useEffect(() => {
        const index = tabs.findIndex(tab => tab.path === location.pathname);
        if (index !== -1 && index !== activeIndex) {
            setPrevIndex(activeIndex);
            setActiveIndex(index);
        }
    }, [location.pathname]);

    // Calculate position for the single active pill
    // x = padding + (index * (width + gap))
    const currentX = PADDING_LEFT + (activeIndex * (ITEM_WIDTH + GAP));

    // Handle the liquid stretch effect
    useEffect(() => {
        const animateLiquid = async () => {
            const direction = activeIndex - prevIndex;
            const distance = Math.abs(direction);

            // If no movement (initial load), just set position
            if (distance === 0) return;

            // Animate width to simulate stretching
            // A simple "squash and stretch" based on velocity/distance
            // We widen the pill during the move, then span it back
            const stretchWidth = ITEM_WIDTH + (Math.min(distance, 2) * 20); // Cap stretch

            await pillControls.start({
                width: [ITEM_WIDTH, stretchWidth, ITEM_WIDTH],
                transition: {
                    duration: 0.4,
                    times: [0, 0.5, 1],
                    ease: "easeInOut"
                }
            });
        };

        animateLiquid();
    }, [activeIndex, prevIndex, pillControls]);

    return (
        <motion.nav
            className="liquid-nav"
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 25,
                delay: 0.2
            }}
        >
            {/* Single Floating Active Pill */}
            <motion.div
                className="liquid-active-tab"
                initial={false}
                animate={{
                    x: currentX,
                    // We can also add a subtle scale bounce here if we want
                    // but the main position slide is handled here
                }}
                transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 24,
                    mass: 1 // Slightly heavier for premium feel
                }}
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
                    <motion.div
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        className={clsx("liquid-nav-item", isActive && "active")}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.1 }}
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
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 15
                            }}
                        >
                            <Icon
                                size={26}
                                strokeWidth={isActive ? 2.5 : 2}
                                className="liquid-icon"
                            />
                            <motion.span
                                className="liquid-label"
                                initial={{ opacity: 0.8, fontWeight: 600 }}
                                animate={isActive ? {
                                    opacity: 1,
                                    fontWeight: 700
                                } : {
                                    opacity: 0.8,
                                    fontWeight: 600
                                }}
                            >
                                {tab.label}
                            </motion.span>
                        </motion.div>
                    </motion.div>
                );
            })}
        </motion.nav>
    );
}
