"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { isAdminEmail } from "../lib/admin";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";

type UserProfile = {
  name: string;
  phone: string;
  email: string;
  available: boolean;
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authWarning, setAuthWarning] = useState("");
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [hasRideHistory, setHasRideHistory] = useState(false);

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
          setHasActiveRide(false);
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
    if (!user) return;

    const activeRideQuery = query(collection(db, "rides"), where("riderId", "==", user.uid));
    const unsubscribe = onSnapshot(activeRideQuery, (snapshot) => {
      const statuses = snapshot.docs.map((docSnap) => docSnap.data().status);
      const hasRide = statuses.some((status) => status === "open" || status === "accepted" || status === "arrived" || status === "picked_up");
      const hasHistory = statuses.some((status) => status === "completed" || status === "canceled");

      setHasActiveRide(hasRide);
      setHasRideHistory(hasHistory);
    });

    return () => unsubscribe();
  }, [user]);

  const handleClockIn = async () => {
    if (!user) {
      alert("Log in first");
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
      <h1>Squadron Ride App</h1>
      {checkingAuth ? <p>Checking sign-in status...</p> : null}
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
          <p><strong>Logged in as:</strong> {profile?.name || user.email}</p>
          <p><strong>Phone:</strong> {profile?.phone || "N/A"}</p>
          <p><strong>Status:</strong> {profile?.available ? "Clocked In" : "Clocked Out"}</p>

          <div style={{ marginTop: 20 }}>
            <Link
              href="/account"
              style={{
                display: "inline-block",
                padding: "10px 16px",
                backgroundColor: "#111827",
                color: "white",
                textDecoration: "none",
                borderRadius: 8,
              }}
            >
              Account Details
            </Link>
          </div>

          <div style={{ marginTop: 20 }}>
            <Link
              href="/request"
              style={{
                display: "inline-block",
                padding: "10px 16px",
                backgroundColor: "#1f2937",
                color: "white",
                textDecoration: "none",
                borderRadius: 8,
              }}
            >
              Request Ride
            </Link>
          </div>

          {hasActiveRide ? (
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

          {hasRideHistory ? (
            <div style={{ marginTop: 20 }}>
              <Link
                href="/history"
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  backgroundColor: "#111827",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                Ride History
              </Link>
            </div>
          ) : null}

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

          {isAdminEmail(user.email) ? (
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
        </div>
      )}
    </main>
  );
}
