"use client";

import { useEffect, useState } from "react";

const SELF_DESTRUCT_STORAGE_KEY = "developer-self-destruct-overlay";
const SELF_DESTRUCT_OVERLAY_DURATION_MS = 3200;

export default function SelfDestructOverlay() {
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(SELF_DESTRUCT_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(SELF_DESTRUCT_STORAGE_KEY);

    const timer = window.setTimeout(() => {
      setActive(false);
    }, SELF_DESTRUCT_OVERLAY_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <div className="self-destruct-overlay self-destruct-overlay-active" aria-hidden="true">
      <div className="self-destruct-backdrop" />
      <div className="self-destruct-flash" />
      <div className="self-destruct-shockwave" />
      <div className="self-destruct-fireball self-destruct-fireball-core" />
      <div className="self-destruct-fireball self-destruct-fireball-crown" />
      <div className="self-destruct-plume" />
      <div className="self-destruct-heat" />
      <div className="self-destruct-smoke self-destruct-smoke-a" />
      <div className="self-destruct-smoke self-destruct-smoke-b" />
      <div className="self-destruct-smoke self-destruct-smoke-c" />
      <div className="self-destruct-smoke self-destruct-smoke-d" />
      <div className="self-destruct-haze" />
      <div className="self-destruct-embers" />
    </div>
  );
}
