"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import {
  APP_HOMEPAGE_REVEAL_KEY,
  APP_STARTUP_RUNTIME_KEY,
  APP_STARTUP_SESSION_KEY,
} from "../../lib/startup-access";

type InitialAppSplashProps = {
  forceReplay?: boolean;
};

type UserAccessProfile = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
  flight?: string | null;
  riderPhotoUrl?: string | null;
  driverPhotoUrl?: string | null;
};

type AccessPhase =
  | "booting"
  | "identifying"
  | "granted"
  | "closing"
  | "hidden";

type BootMode = "signed_out" | "authenticated";

const FULL_BOOT_LINES = [
  "INITIALIZING SYSTEM ASSETS",
  "LOADING APP MODULES",
  "SYNCING SECURE SERVICES",
  "RETRIEVING USER PROFILE",
  "VERIFYING SESSION",
  "USER IDENTIFIED",
];

const SIGNED_OUT_LINES = [
  "INITIALIZING SYSTEM ASSETS",
  "LOADING APP MODULES",
  "SYNCING SECURE SERVICES",
  "VERIFYING SESSION",
  "TERMINAL READY",
];

function buildUserDisplayName(profile: UserAccessProfile | null, user: User | null) {
  const rank = profile?.rank?.trim() || "";
  const firstName = profile?.firstName?.trim() || "";
  const lastName = profile?.lastName?.trim() || "";
  const fallbackName = profile?.name?.trim() || user?.displayName?.trim() || user?.email?.split("@")[0] || "Authorized User";

  if (rank && lastName && firstName) {
    return `${rank} ${lastName}, ${firstName}`;
  }

  if (rank && lastName) {
    return `${rank} ${lastName}`;
  }

  return fallbackName;
}

function buildUserSubLabel(profile: UserAccessProfile | null, user: User | null) {
  const office = profile?.flight?.trim() || "";
  const email = user?.email?.trim() || "";

  if (office && email) {
    return `${email} // ${office}`;
  }

  return office || email || "SESSION PROFILE VERIFIED";
}

function getUserPhoto(profile: UserAccessProfile | null) {
  return profile?.driverPhotoUrl?.trim() || profile?.riderPhotoUrl?.trim() || "";
}

export default function InitialAppSplash({ forceReplay = false }: InitialAppSplashProps) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<AccessPhase>("booting");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserAccessProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [bootMode, setBootMode] = useState<BootMode | null>(null);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);

  const shouldRun = forceReplay || pathname === "/";
  const accessGrantedLabel = currentUser ? "ACCESS GRANTED" : "TERMINAL READY";
  const userDisplayName = useMemo(
    () => buildUserDisplayName(profile, currentUser),
    [currentUser, profile]
  );
  const userSubLabel = useMemo(
    () => buildUserSubLabel(profile, currentUser),
    [currentUser, profile]
  );
  const userPhotoUrl = useMemo(() => getUserPhoto(profile), [profile]);
  const currentBootLines =
    bootMode === "authenticated" ? FULL_BOOT_LINES : SIGNED_OUT_LINES;

  useEffect(() => {
    if (typeof window === "undefined" || !shouldRun) {
      setPhase("hidden");
      return;
    }

    const startupRuntimeSeen =
      typeof window !== "undefined" &&
      (window as Window & { [APP_STARTUP_RUNTIME_KEY]?: boolean })[
        APP_STARTUP_RUNTIME_KEY
      ] === true;
    const startupSessionSeen =
      window.sessionStorage.getItem(APP_STARTUP_SESSION_KEY) === "true";

    if (!forceReplay && (startupRuntimeSeen || startupSessionSeen)) {
      setPhase("hidden");
      return;
    }

    setPhase("booting");
  }, [forceReplay, shouldRun]);

  useEffect(() => {
    if (!shouldRun || phase === "hidden") {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setProfile(null);
        setAuthResolved(true);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        setProfile(snapshot.exists() ? (snapshot.data() as UserAccessProfile) : null);
      } catch (error) {
        console.error(error);
        setProfile(null);
      } finally {
        setAuthResolved(true);
      }
    });

    return () => unsubscribe();
  }, [phase, shouldRun]);

  useEffect(() => {
    if (!shouldRun || phase === "hidden" || !authResolved || phase !== "booting") {
      return;
    }

    setBootMode(currentUser ? "authenticated" : "signed_out");
    setPhase("identifying");
  }, [authResolved, currentUser, phase, shouldRun]);

  useEffect(() => {
    if (phase !== "identifying" || !bootMode) {
      return;
    }

    setVisibleLines([]);

    const timers = currentBootLines.map((line, index) =>
      window.setTimeout(() => {
        setVisibleLines((current) => [...current, line]);
      }, index * 220)
    );

    const grantedTimer = window.setTimeout(() => {
      setPhase("granted");
    }, currentBootLines.length * 220 + 420);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(grantedTimer);
    };
  }, [bootMode, currentBootLines, phase]);

  useEffect(() => {
    if (phase !== "granted") {
      return;
    }

    const closingTimer = window.setTimeout(() => {
      setPhase("closing");
    }, 360);

    const finishTimer = window.setTimeout(() => {
      if (typeof window !== "undefined") {
        (
          window as Window & { [APP_STARTUP_RUNTIME_KEY]?: boolean }
        )[APP_STARTUP_RUNTIME_KEY] = true;
        window.sessionStorage.setItem(APP_STARTUP_SESSION_KEY, "true");
        window.sessionStorage.setItem(APP_HOMEPAGE_REVEAL_KEY, `${Date.now()}`);
      }
      setPhase("hidden");
    }, 820);

    return () => {
      window.clearTimeout(closingTimer);
      window.clearTimeout(finishTimer);
    };
  }, [phase]);

  if (!shouldRun || phase === "hidden") {
    return null;
  }

  return (
    <div
      className={`app-access-screen app-access-screen-${phase}`}
      aria-label="Opening Defender One"
    >
      <div className="app-access-grid" aria-hidden="true" />
      <div className="app-access-scan" aria-hidden="true" />
      <div className="app-access-shell">
        <div className="app-access-topbar">
          <span>DEFENDER ONE</span>
          <span>{currentUser ? "SECURE USER SESSION" : "PUBLIC ACCESS NODE"}</span>
        </div>

        <div className="app-access-panel">
          <div className="app-access-panel-copy">
            <p className="app-access-kicker">Secure Access Sequence</p>
            <h1 className="app-access-title">Defender One</h1>
            <p className="app-access-subtitle">
              509 SFS operations platform
            </p>
          </div>

          <div className="app-access-runtime">
            <div className="app-access-status-stack">
              {visibleLines.map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className={`app-access-status-line ${index === visibleLines.length - 1 && phase === "identifying" ? "app-access-status-line-active" : ""}`}
                >
                  <span className="app-access-status-prompt">SYS&gt;</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>

            {currentUser ? (
              <div className={`app-access-identity-card ${visibleLines.length >= currentBootLines.length - 1 || phase === "granted" || phase === "closing" ? "app-access-identity-card-visible" : ""}`}>
                <div className="app-access-identity-photo">
                  {userPhotoUrl ? (
                    <div
                      className="app-access-identity-photo-fill"
                      style={{ backgroundImage: `url(${userPhotoUrl})` }}
                    />
                  ) : (
                    <span>{userDisplayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="app-access-identity-copy">
                  <p className="app-access-module-label">USER IDENTIFICATION</p>
                  <strong>{userDisplayName}</strong>
                  <span>{userSubLabel}</span>
                </div>
              </div>
            ) : (
              <div className={`app-access-terminal-card ${visibleLines.length >= SIGNED_OUT_LINES.length - 1 || phase === "granted" || phase === "closing" ? "app-access-terminal-card-visible" : ""}`}>
                <p className="app-access-module-label">SESSION STATUS</p>
                <strong>PUBLIC ACCESS TERMINAL READY</strong>
                <span>Authentication controls remain available on the homepage.</span>
              </div>
            )}

            <div className={`app-access-granted ${phase === "granted" || phase === "closing" ? "app-access-granted-visible" : ""}`}>
              <span className="app-access-granted-label">{accessGrantedLabel}</span>
              <span className="app-access-granted-subtitle">
                {currentUser ? "TERMINAL ACCESS APPROVED" : "HOME NODE AVAILABLE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
