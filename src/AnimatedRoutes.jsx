import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Protocol from './pages/Protocol';
import Growth from './pages/Growth';
import Wealth from './pages/Wealth';
import Journal from './pages/Journal';

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/protocol" element={<Protocol />} />
        <Route path="/growth" element={<Growth />} />
        <Route path="/wealth" element={<Wealth />} />
        <Route path="/journal" element={<Journal />} />
        {/* Redirect any unknown paths (like /login) to Home */}
        <Route path="*" element={<Home />} />
      </Routes>
    </AnimatePresence>
  );
}
