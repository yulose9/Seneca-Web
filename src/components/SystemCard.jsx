import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * iOS 18 Material Card Component
 * Follows Apple Human Interface Guidelines
 */
export default function SystemCard({
    children,
    className,
    onClick,
    variant = 'default',
    padding = 'default',
    animate = true
}) {
    const isInteractive = !!onClick;

    const paddingClasses = {
        none: 'p-0',
        compact: 'p-3',
        default: 'p-4',
        spacious: 'p-5',
    };

    const variantClasses = {
        default: 'bg-white',
        elevated: 'bg-white shadow-lg',
        grouped: 'bg-white rounded-xl overflow-hidden',
        tinted: '',
    };

    const cardContent = (
        <div
            onClick={onClick}
            className={clsx(
                // Base styles
                "relative overflow-hidden rounded-2xl",
                // Background & Border
                variantClasses[variant],
                "border border-black/[0.04]",
                // Shadow
                "shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]",
                // Padding
                paddingClasses[padding],
                // Interactive states
                isInteractive && "cursor-pointer",
                // Transition
                "transition-all duration-200 ease-out",
                className
            )}
        >
            {children}
        </div>
    );

    if (animate && isInteractive) {
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
 * iOS 18 Grouped Card Container
 * For Settings-style inset grouped lists
 */
export function GroupedCard({ children, className }) {
    return (
        <div className={clsx(
            "bg-white rounded-xl overflow-hidden",
            "border border-black/[0.04]",
            "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
            className
        )}>
            {children}
        </div>
    );
}

/**
 * iOS 18 Row Component
 * For use inside GroupedCard
 */
export function CardRow({
    children,
    onClick,
    leftIcon,
    rightAccessory,
    showChevron = false,
    isLast = false,
    className
}) {
    return (
        <motion.div
            onClick={onClick}
            whileTap={onClick ? { backgroundColor: 'rgba(0,0,0,0.04)' } : undefined}
            className={clsx(
                "flex items-center gap-3 py-3 px-4 min-h-[44px]",
                "bg-white transition-colors duration-100",
                onClick && "cursor-pointer",
                !isLast && "border-b border-[rgba(60,60,67,0.12)]",
                className
            )}
        >
            {leftIcon && (
                <div className="flex-shrink-0">
                    {leftIcon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                {children}
            </div>
            {rightAccessory && (
                <div className="flex-shrink-0 text-[#C7C7CC]">
                    {rightAccessory}
                </div>
            )}
            {showChevron && (
                <svg
                    width="7"
                    height="12"
                    viewBox="0 0 7 12"
                    fill="none"
                    className="text-[#C7C7CC] flex-shrink-0"
                >
                    <path
                        d="M1 1L6 6L1 11"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </motion.div>
    );
}
