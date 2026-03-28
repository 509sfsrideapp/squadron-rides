"use client";

import { useEffect, useRef } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 767px), (hover: none), (pointer: coarse)";
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

export default function TacticalBackground() {
  const backgroundRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const background = backgroundRef.current;

    if (!background || typeof window === "undefined") {
      return;
    }

    const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);
    let frameId = 0;

    const applyParallax = () => {
      frameId = 0;

      if (mobileQuery.matches || reducedMotionQuery.matches) {
        background.style.setProperty("--tactical-bg-topo-shift", "0px");
        background.style.setProperty("--tactical-bg-grain-shift", "0px");
        return;
      }

      const scrollY = window.scrollY || window.pageYOffset;
      const topoShift = -Math.min(scrollY * 0.018, 24);
      const grainShift = -Math.min(scrollY * 0.01, 12);

      background.style.setProperty("--tactical-bg-topo-shift", `${topoShift.toFixed(2)}px`);
      background.style.setProperty("--tactical-bg-grain-shift", `${grainShift.toFixed(2)}px`);
    };

    const requestParallax = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(applyParallax);
    };

    const handleMediaChange = () => requestParallax();

    applyParallax();
    window.addEventListener("scroll", requestParallax, { passive: true });
    window.addEventListener("resize", requestParallax);

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", handleMediaChange);
      reducedMotionQuery.addEventListener("change", handleMediaChange);
    } else {
      mobileQuery.addListener(handleMediaChange);
      reducedMotionQuery.addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener("scroll", requestParallax);
      window.removeEventListener("resize", requestParallax);

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      if (typeof mobileQuery.removeEventListener === "function") {
        mobileQuery.removeEventListener("change", handleMediaChange);
        reducedMotionQuery.removeEventListener("change", handleMediaChange);
      } else {
        mobileQuery.removeListener(handleMediaChange);
        reducedMotionQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  return (
    <div ref={backgroundRef} className="tactical-background" aria-hidden="true">
      <span className="tactical-background__layer tactical-background__layer--base" />
      <span className="tactical-background__layer tactical-background__layer--grid" />
      <span className="tactical-background__layer tactical-background__layer--topography" />
      <span className="tactical-background__layer tactical-background__layer--grain" />
      <span className="tactical-background__layer tactical-background__layer--vignette" />
    </div>
  );
}
