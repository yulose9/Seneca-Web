import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import clsx from 'clsx';

export default function GsapText({ children, className, delay = 0, stagger = 0.03, type = 'chars' }) {
    const textRef = useRef(null);

    useGSAP(() => {
        if (!textRef.current) return;

        // Simple fade up animation for now, we can make it more complex later
        // If we want to split text, we usually need the SplitText plugin (paid)
        // or a custom implementation. For open source, we'll do word/line animation if possible
        // or just a nice stagger of the container if it's a list.
        
        // Since we don't have SplitText, let's just animate the element itself nicely
        gsap.fromTo(textRef.current, 
            { y: 20, opacity: 0, filter: 'blur(10px)' },
            { 
                y: 0, 
                opacity: 1, 
                filter: 'blur(0px)', 
                duration: 1, 
                ease: "power3.out",
                delay: delay
            }
        );
    }, { scope: textRef, dependencies: [children] });

    return (
        <div ref={textRef} className={clsx(className, "will-change-transform")}>
            {children}
        </div>
    );
}
