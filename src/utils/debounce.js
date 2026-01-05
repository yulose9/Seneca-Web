/**
 * Debounce utility for reducing Firestore writes
 * 
 * Usage:
 * const debouncedSave = debounce(saveFn, 2000);
 * debouncedSave(data); // Will only execute after 2s of inactivity
 */

export function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Batch multiple updates into a single write
 * 
 * Usage:
 * const batch = createBatchUpdater(updateFn, 2000);
 * batch({ theme: "dark" });
 * batch({ fontSize: "large" });
 * // Only writes once after 2s with { theme: "dark", fontSize: "large" }
 */

export function createBatchUpdater(updateFn, wait = 2000) {
    let timeout;
    let pendingUpdates = {};

    return function batchUpdate(updates) {
        // Merge with pending updates
        pendingUpdates = { ...pendingUpdates, ...updates };

        // Clear existing timeout
        clearTimeout(timeout);

        // Set new timeout
        timeout = setTimeout(() => {
            updateFn(pendingUpdates);
            pendingUpdates = {};
        }, wait);
    };
}

/**
 * Throttle - Execute at most once per interval
 * Good for scroll handlers, resize events
 * 
 * Usage:
 * const throttledScroll = throttle(handleScroll, 1000);
 * window.addEventListener('scroll', throttledScroll);
 */

export function throttle(func, limit) {
    let inThrottle;

    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
