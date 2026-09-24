import React from 'react';
import { motion } from 'framer-motion';
import { EASE_OUT } from '../constants/motion';

// Route changes happen tens of times a day: keep them quick and quiet.
// Exit is shorter than enter so AnimatePresence mode="wait" adds ~0.3s total, not 0.8s.
const pageVariants = {
    initial: { opacity: 0, scale: 0.99 },
    in: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: EASE_OUT } },
    out: { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }
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
