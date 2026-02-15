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
import { authService } from "./services/authService";

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
  );
}

// Separate component so hooks can access context providers above
function AppShell() {
  const { showReminder, closeReminder, showTasksReminder, closeTasksReminder } =
    useObligationReminder();

  return (
    <>
      <div className="font-sans antialiased text-[#1C1C1E] selection:bg-[#2E5C8A]/30 desktop-shell">
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
