import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * iOS 18 Glass/Frosted Material Card
 * For overlays and floating elements
 */
export default function GlassCard({
    children,
    className,
    onClick,
    style,
    intensity = 'regular' // 'regular' | 'thick' | 'thin'
}) {
    const isInteractive = !!onClick;

    const intensityClasses = {
        thin: 'bg-white/60 backdrop-blur-lg',
        regular: 'bg-white/75 backdrop-blur-xl',
        thick: 'bg-white/90 backdrop-blur-2xl',
    };

    const cardContent = (
        <div
            onClick={onClick}
            className={clsx(
                // Base styles
                "relative overflow-hidden rounded-2xl mb-4 p-4",
                // Glass effect
                intensityClasses[intensity],
                // Border - subtle glass edge
                "border border-white/40",
                // Shadow
                "shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]",
                // Interactive states
                isInteractive && "cursor-pointer",
                // Transition
                "transition-all duration-200 ease-out",
                className
            )}
            style={style}
        >
            {/* Subtle highlight gradient */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%)',
                    borderRadius: 'inherit',
                }}
            />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );

    if (isInteractive) {
        return (
            <motion.div
                whileTap={{ scale: 0.98, opacity: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                {cardContent}
            </motion.div>
        );
    }

    return cardContent;
}

/**
 * iOS 18 Tinted Card
 * For accent-colored cards (like the Journal reflection card)
 */
export function TintedCard({
    children,
    className,
    onClick,
    tintColor = '#007AFF',
}) {
    const isInteractive = !!onClick;

    // Convert hex to rgba for proper tinting
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return (
        <motion.div
            onClick={onClick}
            whileTap={isInteractive ? { scale: 0.98, opacity: 0.9 } : undefined}
            className={clsx(
                "relative overflow-hidden rounded-2xl mb-4 p-5",
                "border",
                isInteractive && "cursor-pointer",
                "transition-all duration-200 ease-out",
                className
            )}
            style={{
                backgroundColor: hexToRgba(tintColor, 0.08),
                borderColor: hexToRgba(tintColor, 0.15),
            }}
        >
            {children}
        </motion.div>
    );
}

/**
 * iOS 18 Hero Card
 * Large featured card with gradient or image background
 */
export function HeroCard({
    children,
    className,
    onClick,
    gradient = ['#007AFF', '#5856D6'],
}) {
    const isInteractive = !!onClick;

    return (
        <motion.div
            onClick={onClick}
            whileTap={isInteractive ? { scale: 0.98 } : undefined}
            className={clsx(
                "relative overflow-hidden rounded-3xl mb-4 p-6",
                "text-white",
                isInteractive && "cursor-pointer",
                "transition-all duration-200 ease-out",
                className
            )}
            style={{
                background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
            }}
        >
            {/* Subtle pattern overlay */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle at 100% 0%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                }}
            />

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
}
