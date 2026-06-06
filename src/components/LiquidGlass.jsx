import React, { useId, useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function LiquidGlass({
  children,
  className = "",
  intensity = 15, // How distorted the liquid is
  frequency = 0.03, // Size of the liquid ripples
  blur = 16, // CSS background blur
  tint = "rgba(255, 255, 255, 0.4)", // Fallback/overlay color
  enabled = true,
  layout = false,
  style = {},
  ...props
}) {
  // Generate a unique ID that we will cycle occasionally if needed (Safari fix)
  const baseId = useId().replace(/:/g, "");
  const [filterId, setFilterId] = useState(`liquid-glass-${baseId}`);

  // Workaround for Safari caching SVG filters:
  // As noted in the Aave blog: Safari caches SVG filter output by its filter ID.
  // When layout changes or occasionally, we force a new ID to prevent freeze.
  useEffect(() => {
    let frame;
    const forceUpdate = () => {
      setFilterId(`liquid-glass-${baseId}-${Date.now()}`);
    };
    // Force one update after mount to ensure Safari paints it correctly
    frame = requestAnimationFrame(forceUpdate);
    return () => cancelAnimationFrame(frame);
  }, [baseId]);

  if (!enabled) {
    const Component = layout ? motion.div : "div";
    return (
      <Component className={className} layout={layout || undefined} style={style} {...props}>
        {children}
      </Component>
    );
  }

  const Component = layout ? motion.div : "div";

  return (
    <>
      <svg
        className="absolute w-0 h-0 pointer-events-none"
        style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={frequency}
              numOctaves="3"
              result="noise"
            />
            {/* Soften the noise to make the liquid smooth rather than harsh */}
            <feGaussianBlur in="noise" stdDeviation="2" result="smoothedNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="smoothedNoise"
              scale={intensity}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
          </filter>
        </defs>
      </svg>
      <Component
        className={className}
        layout={layout || undefined}
        style={{
          backgroundColor: tint,
          backdropFilter: `blur(${blur}px) url(#${filterId})`,
          WebkitBackdropFilter: `blur(${blur}px) url(#${filterId})`,
          ...style,
        }}
        {...props}
      >
        {children}
      </Component>
    </>
  );
}
