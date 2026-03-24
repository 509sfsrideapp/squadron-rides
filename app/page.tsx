"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppLoadingState from "./components/AppLoadingState";
import { useRouter } from "next/navigation";
import PushNotificationsCard from "./components/PushNotificationsCard";
import { auth, db } from "../lib/firebase";
import { isAdminEmail } from "../lib/admin";
import { useActiveRides } from "../lib/use-active-rides";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type UserProfile = {
  name: string;
  firstName?: string;
  lastName?: string;
  rank?: string;
  flight?: string;
  phone: string;
  email: string;
  available: boolean;
  notificationsEnabled?: boolean;
  driverPhotoUrl?: string;
  riderPhotoUrl?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authWarning, setAuthWarning] = useState("");
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
          <div style={{ display: "grid", justifyItems: "end" }}>
            <Link
              href="/account"
              aria-label="Open account settings"
              style={{ display: "inline-flex", textDecoration: "none" }}
            >
              {profile?.driverPhotoUrl || profile?.riderPhotoUrl ? (
                <Image
                  src={profile.driverPhotoUrl || profile.riderPhotoUrl || ""}
                  alt="Account settings"
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
            </Link>
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

          {!driverActiveRide && !riderActiveRide ? (
            <div style={{ marginTop: 20 }}>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 16px",
                backgroundColor: "#444",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
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

      <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
        <Link
          href="/developer"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(148, 163, 184, 0.16)",
            backgroundColor: "rgba(7, 11, 18, 0.84)",
            color: "#94a3b8",
            textDecoration: "none",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Developer
        </Link>
      </div>
    </main>
  );
}
