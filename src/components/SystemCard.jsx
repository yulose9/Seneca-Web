import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { TAP, TAP_TRANSITION } from '../constants/motion';

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
        default: 'bg-surface',
        elevated: 'bg-surface shadow-float',
        grouped: 'bg-surface rounded-xl overflow-hidden',
        tinted: '',
    };

    const cardContent = (
        <div
            onClick={onClick}
            className={clsx(
                // Base styles
                "relative overflow-hidden rounded-2xl",
                // Background; depth comes from the shadow alone (no outline)
                variantClasses[variant],
                "shadow-card",
                // Padding
                paddingClasses[padding],
                // Interactive states
                isInteractive && "cursor-pointer",
                className
            )}
        >
            {children}
        </div>
    );

    if (animate && isInteractive) {
        return (
            <motion.div whileTap={TAP} transition={TAP_TRANSITION}>
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
            "bg-surface rounded-2xl overflow-hidden",
            "shadow-card",
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
                "bg-surface transition-colors duration-100",
                onClick && "cursor-pointer",
                !isLast && "border-b border-separator",
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
                <div className="flex-shrink-0 text-ink-3">
                    {rightAccessory}
                </div>
            )}
            {showChevron && (
                <svg
                    width="7"
                    height="12"
                    viewBox="0 0 7 12"
                    fill="none"
                    className="text-ink-3 flex-shrink-0"
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
