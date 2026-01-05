// 🎯 Example: How to Use the Preferences System in Your Components

import { usePreferences } from '../context/PreferencesContext';

export default function ExampleComponent() {
    const {
        preferences,      // Full preferences object
        saveDraft,        // Save draft content
        clearDraft,       // Clear draft
        getDraft,         // Get draft by type
        setTheme,         // Change theme
        setLastViewedTab, // Track navigation
        incrementAnalytic,// Increment counters
        theme,            // Current theme
        lastViewedTab,    // Last tab
        updatePersonalization, // Update user profile
    } = usePreferences();

    // 1️⃣ AUTO-SAVE DRAFT (Journal Example)
    const handleContentChange = async (newContent) => {
        await saveDraft("journal", {
            content: newContent,
            title: "My Entry Title",
            mood: "😊",
        });
    };

    // 2️⃣ RESTORE DRAFT ON MOUNT
    useEffect(() => {
        const draft = getDraft("journal");
        if (draft?.content) {
            setContent(draft.content);
            setTitle(draft.title);
            setMood(draft.mood);
        }
    }, []);

    // 3️⃣ CLEAR DRAFT AFTER SAVING
    const handleSaveEntry = async () => {
        // ... save entry logic
        await clearDraft("journal");
        await incrementAnalytic("totalJournalEntries");
    };

    // 4️⃣ THEME TOGGLE
    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
    };

    // 5️⃣ TRACK NAVIGATION
    useEffect(() => {
        setLastViewedTab("journal");
    }, []);

    // 6️⃣ UPDATE USER PROFILE
    const updateProfile = async () => {
        await updatePersonalization({
            displayName: "Janna",
            favoriteEmoji: "🚀",
            dailyGoalText: "Crush it today!",
        });
    };

    // 7️⃣ ACCESS ANALYTICS
    const { totalJournalEntries, currentStreak } = preferences?.analytics || {};

    return (
        <div>
            <h1>Current Theme: {theme}</h1>
            <p>Total Entries: {totalJournalEntries}</p>
            <p>Current Streak: {currentStreak} days</p>
            <button onClick={toggleTheme}>Toggle Theme</button>
        </div>
    );
}

// ✨ CHEAT SHEET

/*
DRAFTS:
- saveDraft(type, content) → Auto-save as user types
- clearDraft(type) → Clear after submission
- getDraft(type) → Restore on mount

UI PREFERENCES:
- setTheme(theme) → "light", "dark", "auto"
- setLastViewedTab(tab) → Track navigation
- preferences.ui.fontSize → Access any UI setting

ANALYTICS:
- incrementAnalytic(key) → Increment any counter
- preferences.analytics → Access all analytics

PERSONALIZATION:
- updatePersonalization(data) → Update display name, emoji, etc.
- preferences.personalization → Access user profile

RAW UPDATE:
- updatePreferences(section, data) → Update any section directly
*/
