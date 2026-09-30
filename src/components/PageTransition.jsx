import React from 'react';
import { motion } from 'framer-motion';
import { EASE_OUT } from '../constants/motion';

// Route changes happen tens of times a day: keep them quick and quiet.
// Exit is instant (opacity stays 1, duration 0) so AnimatePresence mode="wait" adds zero dead time
// before the new page mounts; enter is opacity-only (no main-thread scale on the heaviest frame).
const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1, transition: { duration: 0.15, ease: EASE_OUT } },
    out: { opacity: 1, transition: { duration: 0 } }
};

export default function PageTransition({ children, className }) {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            className={className}
        >
            {children}
        </motion.div>
    );
}
