/**
 * User Preferences & Session Management Service
 * 
 * Stores user preferences, drafts, and session data in both:
 * - LocalStorage (instant access, offline support)
 * - Firestore (cross-device sync, backup)
 * 
 * Path: users/{uid}/preferences (single document)
 */

import { db, auth } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const PREFS_STORAGE_KEY = "seneca_user_preferences";
const LAST_SYNC_KEY = "seneca_prefs_last_sync";

// --- DEFAULT STRUCTURE ---

const createDefaultPreferences = () => ({
    // UI Preferences
    ui: {
        theme: "auto", // "light", "dark", "auto"
        lastViewedTab: "protocol", // Last active main tab
        compactMode: false,
        animationsEnabled: true,
        fontSize: "medium", // "small", "medium", "large"
        accentColor: "#007AFF", // iOS blue default
    },

    // Drafts (Auto-saved content being typed)
    drafts: {
        journal: {
            content: null,
            title: "",
            mood: "😊",
            lastModified: null,
        },
        protocolReflection: "",
        growthNotes: "",
        wealthNotes: "",
    },

    // Session Data
    session: {
        lastActiveDate: null,
        lastActiveSection: "protocol",
        deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
        },
        sessionStartTime: new Date().toISOString(),
        totalSessionTime: 0, // minutes
    },

    // Analytics & Insights (User-specific, not daily)
    analytics: {
        totalDaysTracked: 0,
        currentStreak: 0,
        longestStreak: 0,
        favoriteTimeToLog: "morning", // "morning", "afternoon", "evening", "night"
        mostProductiveDay: "Monday",
        totalJournalEntries: 0,
        totalTransactions: 0,
        averageCompletionRate: 0,
    },

    // Personalization
    personalization: {
        displayName: "",
        favoriteEmoji: "⭐",
        dailyGoalText: "Make today count!",
        customGreeting: "",
        notificationsEnabled: false,
        reminderTime: "09:00",
    },

    // Metadata
    metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
    },
});

// --- FIRESTORE HELPERS ---

const getPrefsRef = () => {
    if (!auth.currentUser) return null;
    return doc(db, "users", auth.currentUser.uid, "preferences", "settings");
};

// --- MAIN API ---

/**
 * Get user preferences.
 * Served from localStorage; cloud data arrives through subscribeToPreferences
 * (one listener instead of a getDoc + listener = 2 billed reads per app open).
 */
export const getUserPreferences = async () => getLocalPreferences();

/**
 * Update user preferences (writes to both local and cloud).
 * Only the touched `section.key` fields are sent (mergeFields), so a device with
 * stale or default local prefs can never overwrite the rest of the cloud doc.
 */
export const updateUserPreferences = async (section, data) => {
    const currentPrefs = getLocalPreferences();

    currentPrefs[section] = {
        ...currentPrefs[section],
        ...data,
    };
    currentPrefs.metadata = {
        ...currentPrefs.metadata,
        lastUpdated: new Date().toISOString(),
    };

    // Save to local immediately
    saveToLocal(currentPrefs);

    // Save to cloud (background) — only the fields that were passed in
    const ref = getPrefsRef();
    const keys = Object.keys(data);
    if (ref && keys.length > 0) {
        const payload = {
            [section]: Object.fromEntries(keys.map((k) => [k, data[k] === undefined ? null : data[k]])),
            metadata: { lastUpdated: currentPrefs.metadata.lastUpdated },
        };
        const fields = [...keys.map((k) => `${section}.${k}`), "metadata.lastUpdated"];
        setDoc(ref, payload, { mergeFields: fields }).catch((error) => {
            console.error("Failed to sync preferences to cloud:", error);
        });
    }

    return currentPrefs;
};

/**
 * Quick helpers for common updates
 */

// Save draft content
export const saveDraft = async (draftType, content) => {
    return updateUserPreferences("drafts", {
        [draftType]: {
            ...content,
            lastModified: new Date().toISOString(),
        },
    });
};

// Clear draft
export const clearDraft = async (draftType) => {
    return updateUserPreferences("drafts", {
        [draftType]: {
            content: null,
            title: "",
            mood: "😊",
            lastModified: null,
        },
    });
};

// Save UI preference
export const saveUIPreference = async (key, value) => {
    return updateUserPreferences("ui", { [key]: value });
};

// Update session info
// Throttled: at most one cloud write per 30 minutes, whatever the caller does
const SESSION_WRITE_INTERVAL = 30 * 60 * 1000;
const LAST_SESSION_WRITE_KEY = "seneca_prefs_last_session_write";
export const updateSession = async (data) => {
    const last = Number(localStorage.getItem(LAST_SESSION_WRITE_KEY) || 0);
    if (Date.now() - last < SESSION_WRITE_INTERVAL) return getLocalPreferences();
    localStorage.setItem(LAST_SESSION_WRITE_KEY, String(Date.now()));
    return updateUserPreferences("session", data);
};

// Update analytics
export const updateAnalytics = async (data) => {
    return updateUserPreferences("analytics", data);
};

/**
 * Subscribe to preference changes (for cross-device sync)
 */
export const subscribeToPreferences = (callback) => {
    const ref = getPrefsRef();
    if (!ref) return () => { };

    const unsubscribe = onSnapshot(
        ref,
        (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const fullPrefs = { ...createDefaultPreferences(), ...data };
                saveToLocal(fullPrefs);
                callback(fullPrefs);
            }
        },
        (error) => {
            console.error("Preferences sync error:", error);
        }
    );

    return unsubscribe;
};

/**
 * Migrate old localStorage drafts to new system
 */
export const migrateOldDrafts = async () => {
    try {
        // Check for old journal drafts
        const oldContent = localStorage.getItem("journal-draft");
        const oldTitle = localStorage.getItem("journal-draft-title");
        const oldMood = localStorage.getItem("journal-draft-mood");

        if (oldContent || oldTitle || oldMood) {
            await saveDraft("journal", {
                content: oldContent ? JSON.parse(oldContent) : null,
                title: oldTitle || "",
                mood: oldMood || "😊",
            });

            // Clean up old keys
            localStorage.removeItem("journal-draft");
            localStorage.removeItem("journal-draft-title");
            localStorage.removeItem("journal-draft-mood");

            console.log("✅ Migrated old journal drafts to new system");
        }
    } catch (error) {
        console.error("Migration failed:", error);
    }
};

// --- LOCAL STORAGE HELPERS ---

const getLocalPreferences = () => {
    try {
        const saved = localStorage.getItem(PREFS_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with defaults to ensure all new fields exist
            return { ...createDefaultPreferences(), ...parsed };
        }
    } catch (e) {
        console.error("Failed to parse local preferences:", e);
    }
    return createDefaultPreferences();
};

const saveToLocal = (prefs) => {
    try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch (e) {
        console.error("Failed to save preferences locally:", e);
    }
};

/**
 * Initialize preferences on app load
 */
export const initializePreferences = async () => {
    // Migrate old drafts first
    await migrateOldDrafts();

    // Load preferences
    return await getUserPreferences();
};

export default {
    getUserPreferences,
    updateUserPreferences,
    saveDraft,
    clearDraft,
    saveUIPreference,
    updateSession,
    updateAnalytics,
    subscribeToPreferences,
    initializePreferences,
};
