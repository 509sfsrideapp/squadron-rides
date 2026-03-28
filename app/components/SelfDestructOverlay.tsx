"use client";

import { useEffect, useState } from "react";

const SELF_DESTRUCT_STORAGE_KEY = "developer-self-destruct-overlay";

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
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <div className="self-destruct-overlay" aria-hidden="true">
      <div className="self-destruct-flash" />
      <div className="self-destruct-fireball" />
      <div className="self-destruct-smoke self-destruct-smoke-a" />
      <div className="self-destruct-smoke self-destruct-smoke-b" />
      <div className="self-destruct-smoke self-destruct-smoke-c" />
      <div className="self-destruct-embers" />
    </div>
  );
}
