import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function GsapStagger({ children, className, stagger = 0.1, delay = 0 }) {
    const containerRef = useRef(null);

    useGSAP(() => {
        if (!containerRef.current) return;
        
        // Select direct children
        const elements = containerRef.current.children;
        
        gsap.fromTo(elements, 
            { y: 30, opacity: 0 },
            { 
                y: 0, 
                opacity: 1, 
                duration: 0.8, 
                stagger: stagger,
                ease: "back.out(1.2)", // "Thoughtful" bounce
                delay: delay
            }
        );
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}
