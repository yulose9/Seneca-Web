<p align="center">
  <img src="https://img.shields.io/badge/React-19.1-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19.1" />
  <img src="https://img.shields.io/badge/Vite-7.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 7.2" />
  <img src="https://img.shields.io/badge/Gemini_AI-Powered-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/iOS_18-Design-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS 18 Design" />
</p>

# 🪞 Seneca — The Mirror of Self-Mastery

> *"We suffer more often in imagination than in reality."* — Seneca

**Seneca** is a beautifully crafted personal growth companion inspired by Stoic philosophy. It combines habit tracking, journaling, financial awareness, and AI-powered reflection to help you live intentionally and grow mindfully.

## ✨ Features

### 📓 The Mirror — Journal
A Notion-like rich text editor for deep self-reflection:
- **Slash Commands** (`/`) — Quick access to headings, lists, quotes, media, and more
- **Rich Formatting** — Bold, italic, underline, strikethrough, code, highlights, text colors
- **Task Lists** — Track to-dos with interactive checkboxes
- **Text Alignment** — Left, center, right alignment
- **Media Support** — Embed images and YouTube videos
- **AI Refinement** — Powered by Google Gemini to polish your writing
- **JSON Storage** — Entries saved in structured Tiptap JSON format
- **Auto-Save Draft** — Never lose your thoughts

### 🌱 The Garden — Habit Tracking
Build lasting habits with visual progress tracking:
- **Streak Tracking** — GitHub-style contribution grid
- **Habit Categories** — Health, mindfulness, productivity, and more
- **Push Notifications** — Gentle reminders to stay consistent
- **Detailed Analytics** — View habit history and patterns

### 💰 The Vault — Financial Awareness
Mindful money management without complexity:
- **Income/Expense Tracking** — Log transactions with categories
- **Balance Overview** — Real-time financial snapshot
- **Spending Categories** — Visualize where money flows

### 🚀 Growth Dashboard
Track your personal development journey:
- **Progress Metrics** — See your growth over time
- **Goal Setting** — Define and track objectives
- **Streak Analytics** — Visualize consistency patterns

### 🏛️ The Protocol — Daily Routines
Structured routines for intentional living:
- **Morning Rituals** — Start your day with purpose
- **Evening Reviews** — Reflect on daily achievements
- **Custom Protocols** — Create personalized routines

## 🎨 Design Philosophy

Seneca features a premium **iOS 18-inspired design** with:
- **Liquid Glass Navbar** — Glassmorphism with dynamic saturation
- **Smooth Animations** — Framer Motion & GSAP transitions
- **Responsive Layout** — Mobile-first, adapts beautifully to all screens
- **Dark Mode Ready** — Respects system preferences
- **Native Feel** — Haptic feedback, swipe gestures, and iOS patterns

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | React 19.1 with Vite 7.2 |
| **Editor** | Tiptap 2.x with ProseMirror |
| **Styling** | Tailwind CSS + Custom CSS |
| **Animations** | Framer Motion + GSAP |
| **AI** | Google Gemini API |
| **State** | React Hooks + Local Storage |
| **Icons** | Lucide React |
| **Utilities** | clsx, date-fns |

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/seneca-web.git
cd seneca-web

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your VITE_GEMINI_API_KEY

# Start development server
npm run dev
```

## 📝 Environment Variables

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_WEATHER_API_KEY=your_openweather_api_key_here
```

## 📁 Project Structure

```
seneca-web/
├── src/
│   ├── components/
│   │   ├── editor/         # Tiptap rich text editor
│   │   ├── GlassTabBar.jsx # iOS-style navigation
│   │   ├── RichTextEditor.jsx
│   │   └── ...
│   ├── pages/
│   │   ├── Home.jsx        # Dashboard
│   │   ├── Journal.jsx     # The Mirror
│   │   ├── Protocol.jsx    # Daily routines
│   │   ├── Growth.jsx      # Growth analytics
│   │   └── Wealth.jsx      # Financial tracking
│   ├── services/           # API integrations
│   └── index.css           # Global styles
├── public/
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by Stoic philosophy and the teachings of Seneca
- UI patterns influenced by Apple's Human Interface Guidelines
- Built with love for personal growth enthusiasts

---

<p align="center">
  <strong>Live with intention. Grow with purpose.</strong>
  <br />
  <em>— The Seneca Team</em>
</p>
