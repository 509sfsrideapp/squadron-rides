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
    }, 1100);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2200);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`initial-app-splash${fadingOut ? " initial-app-splash-hidden" : ""}`} aria-label="Opening Designated Defenders">
      <div className="initial-app-splash-door initial-app-splash-door-left" aria-hidden="true">
        <div className="initial-app-splash-door-panel" />
      </div>
      <div className="initial-app-splash-door initial-app-splash-door-right" aria-hidden="true">
        <div className="initial-app-splash-door-panel" />
      </div>

      <div className="initial-app-splash-core">
        <div className="initial-app-splash-panel">
          <div className="initial-app-splash-grid" aria-hidden="true" />
          <div className="initial-app-splash-scanline" aria-hidden="true" />
          <div className="initial-app-splash-seal" aria-hidden="true" />
          <Image
            src={afgscLogo}
            alt="Air Force Global Strike Command"
            priority
            className="initial-app-splash-logo"
          />
          <p className="initial-app-splash-kicker">Secure Vault Access</p>
          <h1 className="initial-app-splash-title">Designated Defenders</h1>
          <p className="initial-app-splash-subtitle">509 SFS emergency ride network</p>
          <div className="initial-app-splash-bar" aria-hidden="true">
            <div className="initial-app-splash-bar-fill" />
          </div>
          <div className="initial-app-splash-metrics" aria-hidden="true">
            <span>AUTH</span>
            <span>ROUTE</span>
            <span>COMMS</span>
          </div>
          <p className="initial-app-splash-status">Unlocking secured operations channel...</p>
        </div>
      </div>
    </div>
  );
}
