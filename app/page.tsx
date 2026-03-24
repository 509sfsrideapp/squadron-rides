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
import { doc, getDoc, updateDoc } from "firebase/firestore";

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

  const handleClockIn = async () => {
    if (!user) {
      alert("Log in first");
      return;
    }

    if (driverActiveRide) {
      router.replace(`/driver/active/${driverActiveRide.id}`);
      return;
    }

    if (riderActiveRide) {
      router.replace(`/ride-status?rideId=${riderActiveRide.id}`);
      return;
    }

    const driverReadinessIssues = getDriverReadinessIssues(profile);

    if (driverReadinessIssues.length > 0) {
      alert(driverReadinessIssues[0]);
      router.push("/account");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        available: true,
      });
      window.location.href = "/driver";
    } catch (error) {
      console.error(error);
      alert("Failed to clock in");
    }
  };

  const rideIssues = getRideReadinessIssues(profile);
  const driverIssues = getDriverReadinessIssues(profile);
  const rideReady = canRequestRide(profile);
  const driverReady = canDrive(profile);

  const handleClockOut = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        available: false,
      });
      setProfile((prev) =>
        prev ? { ...prev, available: false } : prev
      );
      alert("Clocked out");
    } catch (error) {
      console.error(error);
      alert("Failed to clock out");
    }
  };

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

            {profileMenuOpen ? (
              <div
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
                  Messages
                </Link>
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
            ) : null}
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
          <p><strong>Logged in as:</strong> {profile?.name || user.email}</p>
          <p><strong>Phone:</strong> {profile?.phone || "N/A"}</p>
          <p><strong>Status:</strong> {profile?.available ? "Clocked In" : "Clocked Out"}</p>

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

          {!driverActiveRide && !riderActiveRide ? (
            <div style={{ marginTop: 20 }}>
            {!profile?.available ? (
              driverReady ? (
                <button
                  onClick={handleClockIn}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#1f2937",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  Clock In as Driver
                </button>
              ) : (
                <>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "10px 16px",
                      backgroundColor: "rgba(51, 65, 85, 0.9)",
                      color: "#cbd5e1",
                      borderRadius: 8,
                      opacity: 0.82,
                    }}
                  >
                    Clock In as Driver
                  </div>
                  <p style={{ maxWidth: 540, marginTop: 10, color: "#94a3b8" }}>
                    You must complete additional account information in order to use this feature.
                  </p>
                  {driverIssues[0] ? <p style={{ maxWidth: 540, marginTop: 0, color: "#fca5a5" }}>{driverIssues[0]}</p> : null}
                </>
              )
            ) : (
              <>
                {driverReady ? (
                  <Link
                    href="/driver"
                    style={{
                      display: "inline-block",
                      padding: "10px 16px",
                      backgroundColor: "#1f2937",
                      color: "white",
                      textDecoration: "none",
                      borderRadius: 8,
                      marginRight: 12,
                    }}
                  >
                    Driver Dashboard
                  </Link>
                ) : (
                  <>
                    <div
                      style={{
                        display: "inline-block",
                        padding: "10px 16px",
                        backgroundColor: "rgba(51, 65, 85, 0.9)",
                        color: "#cbd5e1",
                        borderRadius: 8,
                        marginRight: 12,
                        opacity: 0.82,
                      }}
                    >
                      Driver Dashboard
                    </div>
                    <p style={{ maxWidth: 540, marginTop: 10, color: "#94a3b8" }}>
                      You must complete additional account information in order to use this feature.
                    </p>
                    {driverIssues[0] ? <p style={{ maxWidth: 540, marginTop: 0, color: "#fca5a5" }}>{driverIssues[0]}</p> : null}
                  </>
                )}

                <button
                  onClick={handleClockOut}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#7f1d1d",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  Clock Out
                </button>
              </>
            )}
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
