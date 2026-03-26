"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MAX_PULL_DISTANCE = 108;
const REFRESH_THRESHOLD = 82;

export default function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const engagedRef = useRef(false);

  const hasTouchSupport = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    if (!hasTouchSupport) {
      return;
    }

    const resetPullState = () => {
      startYRef.current = null;
      engagedRef.current = false;
      setPullDistance(0);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) {
        resetPullState();
        return;
      }

      startYRef.current = event.touches[0]?.clientY ?? null;
      engagedRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const startY = startYRef.current;

      if (startY == null || refreshing) {
        return;
      }

      const currentY = event.touches[0]?.clientY ?? startY;
      const deltaY = currentY - startY;

      if (deltaY <= 0) {
        if (!engagedRef.current) {
          setPullDistance(0);
        }
        return;
      }

      if (!engagedRef.current && window.scrollY > 0) {
        resetPullState();
        return;
      }

      engagedRef.current = true;
      const nextDistance = Math.min(MAX_PULL_DISTANCE, deltaY * 0.45);
      setPullDistance(nextDistance);

      if (window.scrollY <= 0) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!engagedRef.current) {
        resetPullState();
        return;
      }

      if (pullDistance >= REFRESH_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(REFRESH_THRESHOLD);
        window.location.reload();
        return;
      }

      resetPullState();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", resetPullState, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", resetPullState);
    };
  }, [hasTouchSupport, pullDistance, refreshing]);

  if (!hasTouchSupport) {
    return null;
  }

  const visible = refreshing || pullDistance > 0;
  const progress = Math.max(0, Math.min(1, pullDistance / REFRESH_THRESHOLD));
  const indicatorOffset = visible ? pullDistance - REFRESH_THRESHOLD : -REFRESH_THRESHOLD;

  return (
    <div
      aria-hidden="true"
      className={`pull-refresh-shell${visible ? " pull-refresh-shell-visible" : ""}${refreshing ? " pull-refresh-shell-refreshing" : ""}`}
      style={{
        transform: `translate(-50%, ${indicatorOffset}px)`,
      }}
    >
      <div className="pull-refresh-indicator">
        <div
          className="pull-refresh-spinner"
          style={{
            transform: refreshing ? "rotate(360deg)" : `rotate(${progress * 180}deg)`,
          }}
        />
        <span className="pull-refresh-text">
          {refreshing ? "Refreshing..." : progress >= 1 ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
