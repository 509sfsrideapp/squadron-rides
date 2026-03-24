"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppLoadingState from "./components/AppLoadingState";
import { useRouter } from "next/navigation";
import PushNotificationsCard from "./components/PushNotificationsCard";
import { auth, db } from "../lib/firebase";
import { isAdminEmail } from "../lib/admin";
import { canDrive, canRequestRide, getDriverReadinessIssues, getRideReadinessIssues } from "../lib/profile-readiness";
import { useActiveRides } from "../lib/use-active-rides";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type UserProfile = {
  name: string;
  firstName?: string;
  lastName?: string;
  rank?: string;
  flight?: string;
  username?: string;
  phone: string;
  email: string;
  available: boolean;
  notificationsEnabled?: boolean;
  homeAddress?: string;
  homeAddressVerified?: boolean;
  driverPhotoUrl?: string;
  riderPhotoUrl?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
};

const appTilePlaceholderCount = 6;

function SteeringWheelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="32" cy="32" r="20" />
      <circle cx="32" cy="24" r="6" />
      <path d="M32 30v22" />
      <path d="M14 38l14-5" />
      <path d="M50 38l-14-5" />
      <path d="M20 46c2-6 6-9 12-9s10 3 12 9" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16h40a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H28l-10 8v-8h-6a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6Z" />
      <path d="M20 28h24" />
      <path d="M20 36h18" />
    </svg>
  );
}

function DevIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M38 12 52 26 46 32 32 18 38 12Z" />
      <path d="M28 20 16 32l4 4-6 6" />
      <path d="m26 40-6 6" />
      <path d="m15 22-5 5 5 5" />
      <path d="m49 22 5 5-5 5" />
      <path d="M28 49h8" />
      <path d="M26 17h-8" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authWarning, setAuthWarning] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { riderActiveRide, driverActiveRide, loading: activeRideLoading } = useActiveRides(user);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCheckingAuth(false);
      setAuthWarning("Still waiting on account status. You can keep using the app and refresh if needed.");
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      try {
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setProfile(userSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(error);
        setProfile(null);
        setAuthWarning("We could not load your account details yet.");
      }

      window.clearTimeout(timeoutId);
      setCheckingAuth(false);
      setAuthWarning((currentWarning) =>
        currentWarning === "We could not load your account details yet." ? currentWarning : ""
      );
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && event.target instanceof Node && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!user || activeRideLoading) return;

    if (driverActiveRide) {
      router.replace(`/driver/active/${driverActiveRide.id}`);
      return;
    }

    if (riderActiveRide) {
      router.replace(`/ride-status?rideId=${riderActiveRide.id}`);
    }
  }, [activeRideLoading, driverActiveRide, riderActiveRide, router, user]);

  const rideIssues = getRideReadinessIssues(profile);
  const driverIssues = getDriverReadinessIssues(profile);
  const rideReady = canRequestRide(profile);
  const driverReady = canDrive(profile);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Logout failed");
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Defender Drivers</h1>
        {user ? (
          <div ref={profileMenuRef} style={{ position: "relative", display: "grid", justifyItems: "end" }}>
            <button
              type="button"
              aria-label="Open account menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((current) => !current)}
              style={{
                padding: 0,
                background: "transparent",
                border: "none",
                boxShadow: "none",
              }}
            >
              {profile?.driverPhotoUrl || profile?.riderPhotoUrl ? (
                <Image
                  src={profile.driverPhotoUrl || profile.riderPhotoUrl || ""}
                  alt="Account menu"
                  width={52}
                  height={52}
                  unoptimized
                  style={{
                    width: 52,
                    height: 52,
                    objectFit: "cover",
                    borderRadius: 999,
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "rgba(18, 37, 63, 0.72)",
                    color: "#dbeafe",
                    border: "1px solid rgba(96, 165, 250, 0.2)",
                    fontFamily: "var(--font-display)",
                    fontSize: "1.1rem",
                  }}
                >
                  {(profile?.firstName || profile?.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            <div
              className={`profile-menu-panel${profileMenuOpen ? " profile-menu-panel-open" : ""}`}
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                minWidth: 180,
                padding: 8,
                borderRadius: 14,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                backgroundColor: "rgba(9, 15, 25, 0.96)",
                boxShadow: "0 18px 40px rgba(2, 6, 23, 0.32)",
                display: "grid",
                gap: 6,
                zIndex: 20,
              }}
            >
              <div className="profile-menu-item-wrap">
                <Link
                  href="/account"
                  onClick={() => setProfileMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#e5edf7",
                    backgroundColor: "rgba(15, 23, 42, 0.72)",
                  }}
                >
                  Settings
                </Link>
              </div>
              <div className="profile-menu-item-wrap">
                <Link
                  href="/messages"
                  onClick={() => setProfileMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#e5edf7",
                    backgroundColor: "rgba(15, 23, 42, 0.72)",
                  }}
                >
                  Inbox
                </Link>
              </div>
              <div className="profile-menu-item-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void handleLogout();
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    textAlign: "left",
                    backgroundColor: "rgba(127, 29, 29, 0.9)",
                    textTransform: "none",
                    letterSpacing: "0.02em",
                  }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {checkingAuth ? (
        <AppLoadingState
          compact
          title="Checking Sign-In"
          caption="Verifying your account status and mission access."
        />
      ) : null}
      {authWarning ? (
        <p style={{ color: "#b45309", maxWidth: 560 }}>{authWarning}</p>
      ) : null}

      {!user ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <Link
              href="/signup"
              style={{
                display: "inline-block",
                padding: "10px 16px",
                backgroundColor: "#1f2937",
                color: "white",
                textDecoration: "none",
                borderRadius: 8,
              }}
            >
              Create Account
            </Link>
          </div>

          <div>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                padding: "10px 16px",
                backgroundColor: "#1f2937",
                color: "white",
                textDecoration: "none",
                borderRadius: 8,
              }}
            >
              Login
            </Link>
          </div>

          <div style={{ marginTop: 20 }}>
            <Link
              href="/admin/login"
              style={{
                display: "inline-block",
                padding: "10px 16px",
                backgroundColor: "#7c3aed",
                color: "white",
                textDecoration: "none",
                borderRadius: 8,
              }}
            >
              Admin Login
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {activeRideLoading ? (
            <AppLoadingState
              compact
              title="Checking Active Rides"
              caption="Scanning your rider and driver status now."
            />
          ) : null}

          {driverActiveRide ? (
            <AppLoadingState
              compact
              title="Driver Ride Found"
              caption="Redirecting you back to your active driver mission."
            />
          ) : null}

          {!driverActiveRide && riderActiveRide ? (
            <AppLoadingState
              compact
              title="Ride Request Found"
              caption="Redirecting you back to your current ride status."
            />
          ) : null}

          {!driverActiveRide && !riderActiveRide ? (
            <div style={{ marginTop: 20 }}>
              {rideReady ? (
                <Link
                  href="/request"
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: 540,
                    padding: "16px 20px",
                    background: "linear-gradient(180deg, #c01d1d 0%, #7f1212 100%)",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 14,
                    textAlign: "center",
                    fontSize: 18,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    boxShadow: "0 16px 38px rgba(127, 18, 18, 0.34)",
                  }}
                >
                  Request Ride
                </Link>
              ) : (
                <>
                  <div
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: 540,
                      padding: "16px 20px",
                      background: "linear-gradient(180deg, rgba(71, 85, 105, 0.92) 0%, rgba(51, 65, 85, 0.96) 100%)",
                      color: "#cbd5e1",
                      borderRadius: 14,
                      textAlign: "center",
                      fontSize: 18,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      boxShadow: "0 16px 38px rgba(15, 23, 42, 0.18)",
                      opacity: 0.82,
                    }}
                  >
                    Request Ride
                  </div>
                  <p style={{ maxWidth: 540, marginTop: 10, color: "#94a3b8" }}>
                    You must complete additional account information in order to use this feature.
                  </p>
                  {rideIssues[0] ? <p style={{ maxWidth: 540, marginTop: 0, color: "#fca5a5" }}>{rideIssues[0]}</p> : null}
                </>
              )}

              <div style={{ maxWidth: 540, marginTop: 24 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  {driverReady ? (
                    <Link
                      href="/driver"
                      style={{
                        minHeight: 112,
                        padding: "14px 12px",
                        borderRadius: 18,
                        textDecoration: "none",
                        color: "#e5edf7",
                        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(9, 15, 25, 0.98) 100%)",
                        border: "1px solid rgba(96, 165, 250, 0.18)",
                        boxShadow: "0 14px 30px rgba(2, 6, 23, 0.2)",
                        display: "grid",
                        justifyItems: "center",
                        alignContent: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: "rgba(59, 130, 246, 0.12)",
                          color: "#dbeafe",
                        }}
                      >
                        <SteeringWheelIcon />
                      </div>
                      <span
                        style={{
                          textAlign: "center",
                          fontSize: 12,
                          lineHeight: 1.3,
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Driver Dashboard
                      </span>
                    </Link>
                  ) : (
                    <div
                      style={{
                        minHeight: 112,
                        padding: "14px 12px",
                        borderRadius: 18,
                        color: "#94a3b8",
                        background: "linear-gradient(180deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.94) 100%)",
                        border: "1px solid rgba(148, 163, 184, 0.16)",
                        display: "grid",
                        justifyItems: "center",
                        alignContent: "center",
                        gap: 10,
                        opacity: 0.82,
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: "rgba(148, 163, 184, 0.12)",
                          color: "#cbd5e1",
                        }}
                      >
                        <SteeringWheelIcon />
                      </div>
                      <span
                        style={{
                          textAlign: "center",
                          fontSize: 12,
                          lineHeight: 1.3,
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Driver Dashboard
                      </span>
                    </div>
                  )}

                  <Link
                    href="/messages/direct"
                    style={{
                      minHeight: 112,
                      padding: "14px 12px",
                      borderRadius: 18,
                      textDecoration: "none",
                      color: "#e5edf7",
                      background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(9, 15, 25, 0.98) 100%)",
                      border: "1px solid rgba(96, 165, 250, 0.18)",
                      boxShadow: "0 14px 30px rgba(2, 6, 23, 0.2)",
                      display: "grid",
                      justifyItems: "center",
                      alignContent: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: "rgba(59, 130, 246, 0.12)",
                        color: "#dbeafe",
                      }}
                    >
                      <MessagesIcon />
                    </div>
                    <span
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        lineHeight: 1.3,
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Messages
                    </span>
                  </Link>

                  <Link
                    href="/developer"
                    style={{
                      minHeight: 112,
                      padding: "14px 12px",
                      borderRadius: 18,
                      textDecoration: "none",
                      color: "#e5edf7",
                      background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(9, 15, 25, 0.98) 100%)",
                      border: "1px solid rgba(96, 165, 250, 0.18)",
                      boxShadow: "0 14px 30px rgba(2, 6, 23, 0.2)",
                      display: "grid",
                      justifyItems: "center",
                      alignContent: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: "rgba(59, 130, 246, 0.12)",
                        color: "#dbeafe",
                      }}
                    >
                      <DevIcon />
                    </div>
                    <span
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        lineHeight: 1.3,
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Dev
                    </span>
                  </Link>

                  {Array.from({ length: appTilePlaceholderCount }).map((_, index) => (
                    <div
                      key={index}
                      aria-hidden="true"
                      style={{
                        minHeight: 112,
                        borderRadius: 18,
                        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.46) 0%, rgba(9, 15, 25, 0.7) 100%)",
                        border: "1px dashed rgba(148, 163, 184, 0.14)",
                        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
                      }}
                    />
                  ))}
                </div>

                {!driverReady ? (
                  <>
                    <p style={{ maxWidth: 540, marginTop: 12, color: "#94a3b8" }}>
                      You must complete additional account information in order to use this feature.
                    </p>
                    {driverIssues[0] ? (
                      <p style={{ maxWidth: 540, marginTop: 0, color: "#fca5a5" }}>{driverIssues[0]}</p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {riderActiveRide ? (
            <div style={{ marginTop: 20 }}>
              <Link
                href="/ride-status"
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  backgroundColor: "#0f766e",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                Current Ride Status
              </Link>
            </div>
          ) : null}

          {isAdminEmail(user.email) && !driverActiveRide && !riderActiveRide ? (
            <div style={{ marginTop: 20 }}>
              <Link
                href="/admin"
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  backgroundColor: "#7c3aed",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                Admin Dashboard
              </Link>
            </div>
          ) : null}

          {!checkingAuth && !activeRideLoading && !driverActiveRide && !riderActiveRide ? <PushNotificationsCard /> : null}
        </div>
      )}
    </main>
  );
}
