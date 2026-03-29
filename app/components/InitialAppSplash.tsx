"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import afgscLogo from "../afgsc.png";

const splashSessionKey = "defender-drivers-initial-splash-seen";

type InitialAppSplashProps = {
  forceReplay?: boolean;
};

export default function InitialAppSplash({ forceReplay = false }: InitialAppSplashProps) {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!forceReplay && window.sessionStorage.getItem(splashSessionKey) === "true") {
      const hideImmediately = window.requestAnimationFrame(() => {
        setVisible(false);
      });

      return () => {
        window.cancelAnimationFrame(hideImmediately);
      };
    }

    if (!visible) {
      return;
    }

    if (!forceReplay) {
      window.sessionStorage.setItem(splashSessionKey, "true");
    }

    const fadeTimer = window.setTimeout(() => {
      setFadingOut(true);
    }, 1000);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [forceReplay, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`initial-app-splash${fadingOut ? " initial-app-splash-hidden" : ""}`} aria-label="Opening Defender One">
      <div className="initial-app-splash-door initial-app-splash-door-left" aria-hidden="true">
        <div className="initial-app-splash-door-panel">
          <div className="initial-app-splash-door-screen-frame">
            <div className="initial-app-splash-door-screen">
              <span>ACCESS</span>
              <span>ARMED</span>
              <span>SYNC</span>
            </div>
          </div>
        </div>
      </div>
      <div className="initial-app-splash-door initial-app-splash-door-right" aria-hidden="true">
        <div className="initial-app-splash-door-panel">
          <div className="initial-app-splash-door-screen-frame">
            <div className="initial-app-splash-door-screen">
              <span>VAULT</span>
              <span>ROUTE</span>
              <span>OPEN</span>
            </div>
          </div>
        </div>
      </div>
      <div className="initial-app-splash-seam" aria-hidden="true">
        <span className="initial-app-splash-steam initial-app-splash-steam-a" />
        <span className="initial-app-splash-steam initial-app-splash-steam-b" />
        <span className="initial-app-splash-steam initial-app-splash-steam-c" />
      </div>
      <div className="initial-app-splash-core">
        <div className="initial-app-splash-panel">
          <div className="initial-app-splash-grid" aria-hidden="true" />
          <div className="initial-app-splash-scanline" aria-hidden="true" />
          <Image
            src={afgscLogo}
            alt="Air Force Global Strike Command"
            priority
            className="initial-app-splash-logo"
          />
          <p className="initial-app-splash-kicker">Secure Vault Access</p>
          <h1 className="initial-app-splash-title">Defender One</h1>
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
