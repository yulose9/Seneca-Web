import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
    getUserPreferences,
    updateUserPreferences,
    saveDraft as saveDraftToService,
    clearDraft as clearDraftFromService,
    saveUIPreference as saveUIToService,
    updateSession,
    updateAnalytics,
    subscribeToPreferences,
    initializePreferences,
} from "../services/userPreferences";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
    const [preferences, setPreferences] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize on mount
    useEffect(() => {
        const init = async () => {
            try {
                const prefs = await initializePreferences();
                setPreferences(prefs);
            } catch (error) {
                console.error("Failed to initialize preferences:", error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

    // Subscribe to cloud changes
    useEffect(() => {
        const unsubscribe = subscribeToPreferences((updatedPrefs) => {
            setPreferences(updatedPrefs);
        });

        return () => unsubscribe();
    }, []);

    // Update session on activity
    useEffect(() => {
        const updateSessionActivity = () => {
            updateSession({
                lastActiveDate: new Date().toISOString(),
                lastActiveSection: window.location.pathname.split("/")[1] || "protocol",
            });
        };

        // Update every 30 minutes (reduced from 5 to save Firestore writes)
        const interval = setInterval(updateSessionActivity, 30 * 60 * 1000);
        updateSessionActivity(); // Initial update

        return () => clearInterval(interval);
    }, []);

    // Batching for UI preferences (collects multiple updates into one write)
    const uiBatchRef = useRef({});
    const uiBatchTimeoutRef = useRef(null);

    const batchUIUpdate = useCallback((key, value) => {
        // Add to batch
        uiBatchRef.current[key] = value;

        // Clear existing timeout
        if (uiBatchTimeoutRef.current) {
            clearTimeout(uiBatchTimeoutRef.current);
        }

        // Set new timeout to write batch after 2 seconds
        uiBatchTimeoutRef.current = setTimeout(async () => {
            const updates = { ...uiBatchRef.current };
            uiBatchRef.current = {}; // Clear batch

            const updated = await updateUserPreferences("ui", {
                ...preferences?.ui,
                ...updates,
            });
            setPreferences(updated);
        }, 2000);
    }, [preferences]);

    // Helper functions
    const saveDraft = useCallback(async (draftType, content) => {
        const updated = await saveDraftToService(draftType, content);
        setPreferences(updated);
    }, []);

    const clearDraft = useCallback(async (draftType) => {
        const updated = await clearDraftFromService(draftType);
        setPreferences(updated);
    }, []);

    const setTheme = useCallback((theme) => {
        // Update local state immediately for instant UI
        setPreferences(prev => prev ? {
            ...prev,
            ui: { ...prev.ui, theme }
        } : prev);

        // Apply theme to document
        document.documentElement.setAttribute("data-theme", theme);

        // Batch write to Firestore (debounced)
        batchUIUpdate("theme", theme);
    }, [batchUIUpdate]);

    const setLastViewedTab = useCallback((tab) => {
        // Update local state immediately
        setPreferences(prev => prev ? {
            ...prev,
            ui: { ...prev.ui, lastViewedTab: tab }
        } : prev);

        // Batch write to Firestore (debounced)
        batchUIUpdate("lastViewedTab", tab);
    }, [batchUIUpdate]);

    const incrementAnalytic = useCallback(async (key) => {
        if (!preferences) return;
        const updated = await updateAnalytics({
            ...preferences.analytics,
            [key]: (preferences.analytics[key] || 0) + 1,
        });
        setPreferences(updated);
    }, [preferences]);

    const updatePersonalization = useCallback(async (data) => {
        const updated = await updateUserPreferences("personalization", data);
        setPreferences(updated);
    }, []);

    const value = {
        preferences,
        isLoading,

        // Drafts
        saveDraft,
        clearDraft,
        getDraft: (draftType) => preferences?.drafts?.[draftType],

        // UI
        setTheme,
        setLastViewedTab,
        theme: preferences?.ui?.theme || "auto",
        lastViewedTab: preferences?.ui?.lastViewedTab || "protocol",

        // Analytics
        incrementAnalytic,
        analytics: preferences?.analytics,

        // Personalization
        updatePersonalization,
        personalization: preferences?.personalization,

        // Raw update
        updatePreferences: async (section, data) => {
            const updated = await updateUserPreferences(section, data);
            setPreferences(updated);
        },
    };

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error("usePreferences must be used within a PreferencesProvider");
    }
    return context;
}

export default PreferencesContext;
