"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import afgscLogo from "../afgsc.png";

const splashSessionKey = "defender-drivers-initial-splash-seen";

export default function InitialAppSplash() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(splashSessionKey) !== "true";
  });
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!visible || typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(splashSessionKey, "true");

    const fadeTimer = window.setTimeout(() => {
      setFadingOut(true);
    }, 2700);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`initial-app-splash${fadingOut ? " initial-app-splash-hidden" : ""}`} aria-label="Opening Defender Drivers">
      <div className="initial-app-splash-panel">
        <div className="initial-app-splash-grid" aria-hidden="true" />
        <div className="initial-app-splash-ring" aria-hidden="true" />
        <Image
          src={afgscLogo}
          alt="Air Force Global Strike Command"
          priority
          className="initial-app-splash-logo"
        />
        <p className="initial-app-splash-kicker">System Launch</p>
        <h1 className="initial-app-splash-title">Defender Drivers</h1>
        <div className="initial-app-splash-bar" aria-hidden="true">
          <div className="initial-app-splash-bar-fill" />
        </div>
        <p className="initial-app-splash-status">Establishing secure ride network...</p>
      </div>
    </div>
  );
}
