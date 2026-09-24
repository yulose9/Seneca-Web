import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function GsapText({ children, className, delay = 0 }) {
    const textRef = useRef(null);

    useGSAP(() => {
        if (!textRef.current) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Fade up with a light blur to soften the entrance
        gsap.fromTo(textRef.current,
            { y: reduceMotion ? 0 : 8, opacity: 0, filter: reduceMotion ? 'blur(0px)' : 'blur(4px)' },
            {
                y: 0,
                opacity: 1,
                filter: 'blur(0px)',
                duration: 0.5,
                ease: "power3.out",
                delay: delay,
                // Drop inline transform/filter once settled so the text isn't left on its own layer
                clearProps: "transform,filter"
            }
        );
    }, { scope: textRef, dependencies: [] });

    return (
        <div ref={textRef} className={className}>
            {children}
        </div>
    );
}
