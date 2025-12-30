# Daily Log System - LLM-Ready Data Architecture

## Overview

Your app now automatically saves all data as **Daily Log Documents** - a structured JSON format optimized for AI/LLM analysis. This runs in the background using `localStorage` but is architected for seamless migration to Google Cloud Firestore.

## What Changed

### 1. New Service Layer

**File:** `src/services/dataLogger.js`

This service handles all data persistence in a **NoSQL-friendly** format:

```json
{
  "2025-12-30": {
    "date": "2025-12-30",
    "user_id": "local_user",
    "protocol": {
      "completion_rate": 0.85,
      "phases": {
        "morningIgnition": {
          "completed": 5,
          "total": 6,
          "tasks": [...]
        }
      }
    },
    "growth": { ... },
    "wealth": { ... },
    "journal": { ... }
  }
}
```

### 2. Updated ProtocolContext

**File:** `src/context/ProtocolContext.jsx`

- Now imports the `dataLogger` service
- Automatically syncs to Daily Log whenever tasks change
- Runs data migration on first load (converts old localStorage keys)

### 3. Export Component

**File:** `src/components/ExportDataButton.jsx`

A floating button (purple icon in bottom-right) that lets you:

- View summary stats (days tracked, avg completion)
- Export as JSON (for programmatic LLM use)
- Export as LLM Prompt (ready to paste into ChatGPT/Claude)

## How to Use

### Testing the Export

1. Use your app normally (complete tasks in Protocol, Growth, Wealth, Journal)
2. Click the purple **JSON icon** in the bottom-right corner
3. Choose:
   - **Time Range**: Last 7/14/30/90 days
   - **Format**: JSON or LLM Prompt
4. Click **Export**

### LLM Analysis Example

After exporting as "LLM Prompt", you can paste it into ChatGPT/Claude and ask:

```
Based on my last 30 days:
1. Which habits do I skip most often?
2. What patterns exist between my morning routine and overall day success?
3. Which days of the week am I most productive?
4. Are there correlations between my mood and completion rate?
```

## API Reference

### dataLogger Service

```javascript
import {
  getTodayKey,
  getLogForDate,
  updateTodayLog,
  getLastNDaysLogs,
  exportForLLM,
  exportAsLLMPrompt
} from './services/dataLogger';

// Get today's date key
const today = getTodayKey(); // "2025-12-30"

// Get log for specific date
const log = getLogForDate("2025-12-30");

// Update a section of today's log
updateTodayLog("protocol", {
  completion_rate: 0.85,
  phases: { ... }
});

// Get last 30 days
const logs = getLastNDaysLogs(30);

// Export for LLM (structured data)
const data = exportForLLM(30);

// Export as ready-to-use prompt
const prompt = exportAsLLMPrompt(30);
```

### Daily Log Structure

Each daily log contains:

| Section    | Purpose          | Example Data                   |
| ---------- | ---------------- | ------------------------------ |
| `protocol` | Habit tracking   | Completion rates, phase status |
| `growth`   | Study/learning   | Session times, books read      |
| `wealth`   | Finance tracking | Transactions, net worth        |
| `journal`  | Reflections      | Entries, mood, highlights      |
| `metadata` | System info      | App version, device            |

## Future: Google Cloud Migration

When you're ready to deploy, here's the path forward:

### 1. Setup Firestore

```bash
npm install firebase
```

### 2. Update dataLogger.js

Replace `localStorage` calls with Firestore:

```javascript
// Current (localStorage)
localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

// Future (Firestore)
await setDoc(doc(db, "daily_logs", dateKey), todayLog);
```

### 3. No Changes Needed to Components

Because we abstracted the storage layer, your UI components won't need any changes!

## Data Structure Benefits

### For LLMs

- **Narrative Format**: Reads like a story of your day
- **Temporal Context**: Easy to find patterns across time
- **Rich Metadata**: Includes completion rates, streaks, mood

### For You

- **Single Source of Truth**: One document per day
- **Easy Backups**: Just download JSON files
- **Privacy**: All data stored locally (for now)

### For Future Features

- **Weekly Recaps**: Already have summary functions
- **Trend Analysis**: Easy to calculate streaks, averages
- **Insights Dashboard**: All data ready for visualization

## Next Steps for Other Sections

### Growth Section

Add to your StudyGoalContext:

```javascript
updateTodayLog("growth", {
  study_sessions: [{ start: "...", end: "...", topic: "..." }],
  focus_time: 120, // minutes
  books_read: ["Book Title"],
});
```

### Wealth Section

Add to your transaction context:

```javascript
updateTodayLog("wealth", {
  transactions: [{ amount: -50, category: "food", ... }],
  net_worth: 55000,
  spending_by_category: { food: 150, ... }
});
```

### Journal Section

Add when saving entries:

```javascript
updateTodayLog("journal", {
  entries: [{ time: "...", content: "...", ... }],
  mood: "focused",
  highlights: ["Completed morning routine"],
  challenges: ["Distracted after lunch"]
});
```

## Storage Details

- **Current**: `localStorage` key `seneca_daily_logs`
- **Size**: ~5-10KB per day (~150KB per month)
- **Limit**: localStorage can hold 5-10MB (years of data)
- **Backup**: Export JSON files regularly

## Questions?

This system is now running in the background. Every time you:

- Complete a task in Protocol ✅
- (Soon) Add a transaction ✅
- (Soon) Write a journal entry ✅
- (Soon) Study something ✅

...it's being saved in this LLM-ready format.

Your data is now **Cloud Ready** without needing a backend yet! 🚀
