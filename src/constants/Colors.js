/**
 * Seneca Design System - iOS 18 Human Interface Guidelines
 * Color Palette aligned with Apple's System Colors
 */

// ============================================
// iOS 18 System Colors
// ============================================

export const SystemColors = {
    // Primary Colors
    blue: '#007AFF',
    green: '#34C759',
    indigo: '#5856D6',
    orange: '#FF9500',
    pink: '#FF2D55',
    purple: '#AF52DE',
    red: '#FF3B30',
    teal: '#5AC8FA',
    yellow: '#FFCC00',

    // iOS 18 New Colors
    mint: '#00C7BE',
    cyan: '#32ADE6',
    brown: '#A2845E',
};

// ============================================
// Seneca Brand Colors (Built on iOS Colors)
// ============================================

export const SenecaBlue = {
    primary: '#007AFF',    // iOS Blue
    secondary: '#5856D6',   // iOS Indigo
    start: '#007AFF',       // Gradient start
    end: '#5856D6',         // Gradient end
};

export const WealthTeal = {
    primary: '#34C759',     // iOS Green
    secondary: '#00C7BE',   // iOS Mint
    start: '#34C759',
    end: '#00C7BE',
};

export const EmpireGold = {
    primary: '#FF9500',     // iOS Orange
    secondary: '#FFCC00',   // iOS Yellow
    start: '#FF9500',
    end: '#FFCC00',
};

export const DestructiveRed = '#FF3B30'; // iOS Red

// ============================================
// iOS 18 Semantic Colors (Light Mode)
// ============================================

export const LightColors = {
    // Backgrounds
    background: '#F2F2F7',           // System Background
    secondaryBackground: '#FFFFFF',   // Secondary System Background
    tertiaryBackground: '#F5F5FA',    // Tertiary System Background

    // Grouped Backgrounds
    groupedBackground: '#F2F2F7',
    secondaryGroupedBackground: '#FFFFFF',
    tertiaryGroupedBackground: '#F5F5FA',

    // Labels
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.6)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
    quaternaryLabel: 'rgba(60, 60, 67, 0.18)',

    // Fills
    fill: 'rgba(120, 120, 128, 0.2)',
    secondaryFill: 'rgba(120, 120, 128, 0.16)',
    tertiaryFill: 'rgba(120, 120, 128, 0.12)',
    quaternaryFill: 'rgba(120, 120, 128, 0.08)',

    // Separators
    separator: 'rgba(60, 60, 67, 0.18)',
    opaqueSeparator: '#C6C6C8',

    // System Colors
    ...SystemColors,

    // Glass Effects
    glass: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.3)',

    // Legacy mappings
    text: '#000000',
    textSecondary: 'rgba(60, 60, 67, 0.6)',
    textMuted: 'rgba(60, 60, 67, 0.3)',
    tint: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    destructive: '#FF3B30',
};

// ============================================
// iOS 18 Semantic Colors (Dark Mode)
// ============================================

export const DarkColors = {
    // Backgrounds
    background: '#000000',
    secondaryBackground: '#1C1C1E',
    tertiaryBackground: '#2C2C2E',

    // Grouped Backgrounds (Elevated)
    groupedBackground: '#000000',
    secondaryGroupedBackground: '#1C1C1E',
    tertiaryGroupedBackground: '#2C2C2E',

    // Labels
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.6)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
    quaternaryLabel: 'rgba(235, 235, 245, 0.18)',

    // Fills
    fill: 'rgba(120, 120, 128, 0.36)',
    secondaryFill: 'rgba(120, 120, 128, 0.32)',
    tertiaryFill: 'rgba(120, 120, 128, 0.24)',
    quaternaryFill: 'rgba(120, 120, 128, 0.18)',

    // Separators
    separator: 'rgba(84, 84, 88, 0.65)',
    opaqueSeparator: '#38383A',

    // System Colors (Dark mode variants are same in iOS 18)
    ...SystemColors,

    // Glass Effects
    glass: 'rgba(30, 30, 30, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',

    // Legacy mappings
    text: '#FFFFFF',
    textSecondary: 'rgba(235, 235, 245, 0.6)',
    textMuted: 'rgba(235, 235, 245, 0.3)',
    tint: '#0A84FF', // Accessible Blue for dark mode
    success: '#30D158',
    warning: '#FF9F0A',
    destructive: '#FF453A',
};

// ============================================
// Default Export (Light Mode)
// ============================================

export const Colors = {
    ...LightColors,
    primary: SenecaBlue.primary,
    primaryForeground: '#FFFFFF',
    link: SenecaBlue.primary,
};

// ============================================
// Gradients
// ============================================

export const Gradients = {
    senecaBlue: [SenecaBlue.start, SenecaBlue.end],
    wealthGreen: [WealthTeal.start, WealthTeal.end],
    empireGold: [EmpireGold.start, EmpireGold.end],

    // iOS-style gradients
    sunrise: ['#FF9500', '#FF2D55'],
    ocean: ['#5AC8FA', '#007AFF'],
    forest: ['#00C7BE', '#34C759'],
    sunset: ['#FF2D55', '#AF52DE'],
    night: ['#5856D6', '#000000'],
};

// ============================================
// Typography System (iOS HIG)
// ============================================

export const Typography = {
    // Large Title (Navigation bars)
    largeTitle: {
        fontSize: '34px',
        fontWeight: 700,
        letterSpacing: '0.37px',
        lineHeight: '41px',
    },

    // Title 1
    title1: {
        fontSize: '28px',
        fontWeight: 700,
        letterSpacing: '0.36px',
        lineHeight: '34px',
    },

    // Title 2
    title2: {
        fontSize: '22px',
        fontWeight: 700,
        letterSpacing: '0.35px',
        lineHeight: '28px',
    },

    // Title 3
    title3: {
        fontSize: '20px',
        fontWeight: 600,
        letterSpacing: '0.38px',
        lineHeight: '25px',
    },

    // Headline
    headline: {
        fontSize: '17px',
        fontWeight: 600,
        letterSpacing: '-0.41px',
        lineHeight: '22px',
    },

    // Body
    body: {
        fontSize: '17px',
        fontWeight: 400,
        letterSpacing: '-0.41px',
        lineHeight: '22px',
    },

    // Callout
    callout: {
        fontSize: '16px',
        fontWeight: 400,
        letterSpacing: '-0.32px',
        lineHeight: '21px',
    },

    // Subheadline
    subheadline: {
        fontSize: '15px',
        fontWeight: 400,
        letterSpacing: '-0.24px',
        lineHeight: '20px',
    },

    // Footnote
    footnote: {
        fontSize: '13px',
        fontWeight: 400,
        letterSpacing: '-0.08px',
        lineHeight: '18px',
    },

    // Caption 1
    caption1: {
        fontSize: '12px',
        fontWeight: 400,
        letterSpacing: '0px',
        lineHeight: '16px',
    },

    // Caption 2
    caption2: {
        fontSize: '11px',
        fontWeight: 400,
        letterSpacing: '0.07px',
        lineHeight: '13px',
    },
};

// ============================================
// Spacing System (iOS HIG)
// ============================================

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
};

// ============================================
// Border Radius (iOS HIG)
// ============================================

export const Radii = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    full: 9999,
};

// ============================================
// Shadows (iOS-style)
// ============================================

export const Shadows = {
    sm: '0 1px 3px rgba(0, 0, 0, 0.04)',
    md: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    lg: '0 4px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)',
    xl: '0 8px 40px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(0, 0, 0, 0.08)',
};

// ============================================
// Animation Easings
// ============================================

export const Easings = {
    springBounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    springSmooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
    easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',
};
