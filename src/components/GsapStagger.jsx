import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

// Runs on every visit to the page, so it stays short: small offset, quick stagger, no overshoot.
export default function GsapStagger({ children, className, stagger = 0.05, delay = 0 }) {
    const containerRef = useRef(null);

    useGSAP(() => {
        if (!containerRef.current) return;

        // Select direct children
        const elements = containerRef.current.children;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        gsap.fromTo(elements,
            { y: reduceMotion ? 0 : 12, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.4,
                stagger: stagger,
                ease: "power3.out",
                delay: delay,
                // A leftover inline transform turns each child into a containing block,
                // which would pin any position:fixed descendant (sheets) to the card
                clearProps: "transform"
            }
        );
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}
