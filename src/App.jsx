import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AnimatedRoutes from "./AnimatedRoutes";
import DailyTasksReminder from "./components/DailyTasksReminder";
import GlassTabBar from "./components/GlassTabBar";
import LoginScreen from "./components/LoginScreen";
import ObligationReminder, {
  useObligationReminder,
} from "./components/ObligationReminder";
import { PersonalGoalsProvider } from "./context/PersonalGoalsContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { ProtocolProvider } from "./context/ProtocolContext";
import { StudyGoalProvider } from "./context/StudyGoalContext";
import { EASE_OUT } from "./constants/motion";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase Auth state changes (Persists login across refreshes)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = () => {
    // The onAuthStateChanged listener will handle the update
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F2F2F7]">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    // reducedMotion="user": honor the OS setting — transforms are dropped, opacity/color kept
    <MotionConfig reducedMotion="user">
      <Router>
        <PreferencesProvider>
          <ProtocolProvider>
            <StudyGoalProvider>
              <PersonalGoalsProvider>
                <AppShell />
              </PersonalGoalsProvider>
            </StudyGoalProvider>
          </ProtocolProvider>
        </PreferencesProvider>
      </Router>
    </MotionConfig>
  );
}

// Separate component so hooks can access context providers above
function AppShell() {
  const { showReminder, closeReminder, showTasksReminder, closeTasksReminder } =
    useObligationReminder();
  
  // Prompt 9: Network Connection Handling
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      <div className="font-sans antialiased text-[#1C1C1E] selection:bg-[#2E5C8A]/30 desktop-shell relative">
        <AnimatePresence initial={false}>
          {!isOnline && (
            <motion.div
              key="offline-banner"
              role="status"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15, ease: EASE_OUT } }}
              className="absolute top-0 inset-x-0 z-[999] bg-orange-500/90 text-white text-[13px] font-medium py-1.5 flex items-center justify-center gap-2 backdrop-blur-md"
            >
              <span>You are offline. Changes will save automatically when reconnected.</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="desktop-app-frame">
          <AnimatedRoutes />
        </div>
        <GlassTabBar />
      </div>

      {/* Notifications — rendered at app level, fire once per session */}
      <ObligationReminder isOpen={showReminder} onClose={closeReminder} />
      <DailyTasksReminder
        isOpen={showTasksReminder}
        onClose={closeTasksReminder}
      />
    </>
  );
}
