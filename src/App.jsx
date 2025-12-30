import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AnimatedRoutes from "./AnimatedRoutes";
import GlassTabBar from "./components/GlassTabBar";
import { PersonalGoalsProvider } from "./context/PersonalGoalsContext";
import { ProtocolProvider } from "./context/ProtocolContext";
import { StudyGoalProvider } from "./context/StudyGoalContext";

export default function App() {
  return (
    <Router>
      <ProtocolProvider>
        <StudyGoalProvider>
          <PersonalGoalsProvider>
            <div className="font-sans antialiased text-[#1C1C1E] selection:bg-[#2E5C8A]/30">
              <AnimatedRoutes />
              <GlassTabBar />
            </div>
          </PersonalGoalsProvider>
        </StudyGoalProvider>
      </ProtocolProvider>
    </Router>
  );
}
