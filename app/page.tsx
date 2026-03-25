"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppLoadingState from "./components/AppLoadingState";
import { useRouter } from "next/navigation";
import PushNotificationsCard from "./components/PushNotificationsCard";
import { auth, db } from "../lib/firebase";
import { canDrive, canRequestRide, getDriverReadinessIssues, getRideReadinessIssues } from "../lib/profile-readiness";
import { getLatestActiveRideForRider } from "../lib/ride-state";
import { useActiveRides } from "../lib/use-active-rides";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";

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
  locationServicesEnabled?: boolean;
  emergencyRideAddressConsent?: boolean;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ReverseGeocodeResult = {
  placeName?: string | null;
  address?: string | null;
  display?: string | null;
};

const appTilePlaceholderCount = 6;
const homepageCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "linear-gradient(180deg, rgba(10, 16, 27, 0.92) 0%, rgba(5, 8, 14, 0.96) 100%)",
  boxShadow: "0 18px 42px rgba(2, 6, 23, 0.22)",
};

function AppTile({
  href,
  icon,
  label,
  disabled = false,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  const sharedStyle: React.CSSProperties = {
    minHeight: 120,
    padding: "16px 12px",
    borderRadius: 20,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 12,
    textAlign: "center",
  };

  const iconShell = (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        backgroundColor: disabled ? "rgba(148, 163, 184, 0.12)" : "rgba(59, 130, 246, 0.12)",
        color: disabled ? "#cbd5e1" : "#dbeafe",
      }}
    >
      {icon}
    </div>
  );

  const labelNode = (
    <span
      style={{
        fontSize: 12,
        lineHeight: 1.3,
        fontFamily: "var(--font-display)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );

  if (disabled || !href) {
    return (
      <div
        style={{
          ...sharedStyle,
          color: "#94a3b8",
          background: "linear-gradient(180deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.94) 100%)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          opacity: 0.82,
        }}
      >
        {iconShell}
        {labelNode}
      </div>
    );
  }

  return (
    <Link
      href={href}
      style={{
        ...sharedStyle,
        textDecoration: "none",
        color: "#e5edf7",
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(9, 15, 25, 0.98) 100%)",
        border: "1px solid rgba(96, 165, 250, 0.18)",
        boxShadow: "0 14px 30px rgba(2, 6, 23, 0.2)",
      }}
    >
      {iconShell}
      {labelNode}
    </Link>
  );
}

function PlaceholderTile() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: 120,
        borderRadius: 20,
        padding: "16px 12px",
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.46) 0%, rgba(9, 15, 25, 0.7) 100%)",
        border: "1px dashed rgba(148, 163, 184, 0.14)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
      }}
    />
  );
}

function ReadinessActionCard({
  href,
  title,
  status,
  detail,
}: {
  href: string;
  title: string;
  status: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: "0.95rem 1rem",
        borderRadius: 18,
        border: "1px solid rgba(248, 113, 113, 0.22)",
        background: "linear-gradient(180deg, rgba(69, 10, 10, 0.68) 0%, rgba(31, 41, 55, 0.9) 100%)",
        textDecoration: "none",
        color: "#e5edf7",
        boxShadow: "0 10px 24px rgba(2, 6, 23, 0.16)",
      }}
    >
      <p style={{ margin: 0, color: "#fca5a5", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>{title}</p>
      <p style={{ margin: "0.35rem 0 0", color: "#fee2e2", fontFamily: "var(--font-display)" }}>{status}</p>
      <p style={{ margin: "0.35rem 0 0", color: "#cbd5e1", fontSize: 13 }}>{detail}</p>
    </Link>
  );
}

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
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 22-10 10 10 10" />
      <path d="m42 22 10 10-10 10" />
      <path d="M36 18 28 46" />
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
  const [submittingEmergencyRide, setSubmittingEmergencyRide] = useState(false);
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
  const emergencyRideEnabled = Boolean(profile?.emergencyRideAddressConsent);
  const firstName = profile?.firstName?.trim() || "";
  const displayName = firstName || user?.email?.split("@")[0] || "Operator";
  const userRoleLabel = profile?.flight ? `${profile.rank || "Member"} • ${profile.flight}` : profile?.rank || "Member";
  const showDevTile = Boolean(user);
  const emergencyRideBlockers = [
    !emergencyRideEnabled ? "One-tap emergency ride is off until you accept the App Permissions emergency ride setting." : null,
    profile?.locationServicesEnabled === false
      ? "One-tap emergency ride needs location services turned on so your current location can still be sent with the request."
      : null,
  ].filter(Boolean) as string[];
  const readinessCards = [
    !rideReady
      ? {
          href: "/account",
          title: "Ride Readiness",
          status: "Needs attention",
          detail: rideIssues[0] ?? "Complete your rider setup before requesting rides.",
        }
      : null,
    !driverReady
      ? {
          href: "/account",
          title: "Driver Readiness",
          status: "Needs attention",
          detail: driverIssues[0] ?? "Complete your driver setup before accessing the driver dashboard.",
        }
      : null,
    emergencyRideBlockers.length > 0
      ? {
          href: profile?.emergencyRideAddressConsent ? "/account" : "/account/permissions",
          title: "One-Tap Emergency",
          status: "Manual fallback",
          detail: emergencyRideBlockers[0] ?? "Update your emergency ride settings before using one-tap request.",
        }
      : null,
  ].filter((card): card is { href: string; title: string; status: string; detail: string } => card !== null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Logout failed");
    }
  };

  const submitEmergencyRide = async () => {
    if (!user || !profile) {
      return;
    }

    if (!emergencyRideEnabled) {
      router.push("/request");
      return;
    }

    if (!rideReady) {
      if (rideIssues[0]) {
        alert(rideIssues[0]);
      }
      return;
    }

    if (driverActiveRide) {
      router.push(`/driver/active/${driverActiveRide.id}`);
      return;
    }

    if (riderActiveRide) {
      router.push(`/ride-status?rideId=${riderActiveRide.id}`);
      return;
    }

    try {
      setSubmittingEmergencyRide(true);
      const existingRide = await getLatestActiveRideForRider(user.uid);

      if (existingRide) {
        alert("You already have an active ride request.");
        router.push(`/ride-status?rideId=${existingRide.id}`);
        return;
      }

      const pickupAddress = profile.homeAddress?.trim() || "";
      const riderDisplayName =
        [profile.rank?.trim(), profile.lastName?.trim()].filter(Boolean).join(" ").trim() ||
        profile.name;
      const riderLocation: Coordinates | null =
        profile.locationServicesEnabled === false
          ? null
          : await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
              if (typeof window === "undefined" || !("geolocation" in navigator)) {
                resolve(null);
                return;
              }

              navigator.geolocation.getCurrentPosition(
                (position) =>
                  resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  }),
                () => resolve(null),
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 60000,
                }
              );
            });
      const geocodedPickup =
        riderLocation
          ? await fetch("/api/geocode/reverse", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(riderLocation),
            })
              .then(async (response) => {
                if (!response.ok) {
                  return null;
                }

                return (await response.json()) as ReverseGeocodeResult;
              })
              .catch(() => null)
          : null;
      const resolvedPickup =
        geocodedPickup?.placeName ||
        geocodedPickup?.address ||
        geocodedPickup?.display ||
        (riderLocation ? "Current GPS location" : pickupAddress);
      const resolvedPickupAddress =
        geocodedPickup?.address ||
        geocodedPickup?.display ||
        (riderLocation ? "Current GPS location" : pickupAddress);
      const rideRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid,
        riderName: riderDisplayName,
        riderPhone: profile.phone,
        riderEmail: profile.email,
        riderPhotoUrl: profile.driverPhotoUrl || profile.riderPhotoUrl || null,
        riderRank: profile.rank?.trim() || null,
        riderLastName: profile.lastName?.trim() || null,
        pickup: resolvedPickup,
        pickupLocationName: geocodedPickup?.placeName || null,
        pickupLocationAddress: resolvedPickupAddress,
        destination: "Destination to be confirmed with rider",
        riderLocation,
        emergencySavedAddress: pickupAddress || null,
        status: "open",
        isEmergencyRide: true,
        createdAt: new Date(),
      });

      const idToken = await auth.currentUser?.getIdToken();

      if (idToken) {
        void fetch("/api/notifications/ride-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            rideId: rideRef.id,
          }),
        }).catch((error) => {
          console.error("Driver notification request failed", error);
        });
      }

      router.push(`/ride-status?rideId=${rideRef.id}`);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not request the emergency ride.");
    } finally {
      setSubmittingEmergencyRide(false);
    }
  };

  return (
    <main style={{ padding: 20, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p
            style={{
              margin: 0,
              color: "#7dd3fc",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            509 SFS
          </p>
          <h1 style={{ margin: "0.4rem 0 0" }}>Designated Defenders</h1>
        </div>
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
        <div style={{ marginTop: 24, display: "grid", gap: 20 }}>
          <section
            style={{
              ...homepageCardStyle,
              padding: "clamp(1.2rem, 3vw, 2rem)",
              display: "grid",
              gap: 18,
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <p style={{ margin: 0, color: "#cbd5e1", fontSize: "1.05rem" }}>
                Emergency ride coordination for squadron personnel. Request support fast, track live ride status, and keep leadership visibility tight through one shared operations platform.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/signup"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 180,
                  padding: "14px 18px",
                  background: "linear-gradient(180deg, rgba(37, 99, 235, 0.96) 0%, rgba(30, 64, 175, 0.98) 100%)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 14,
                  boxShadow: "0 14px 34px rgba(30, 64, 175, 0.28)",
                }}
              >
                Create Account
              </Link>
              <Link
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 140,
                  padding: "14px 18px",
                  backgroundColor: "#111827",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 14,
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                }}
              >
                Login
              </Link>
              <Link
                href="/admin/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 160,
                  padding: "14px 18px",
                  backgroundColor: "rgba(91, 33, 182, 0.9)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 14,
                  border: "1px solid rgba(196, 181, 253, 0.18)",
                }}
              >
                Admin Login
              </Link>
            </div>
          </section>

          <section
            style={{
              ...homepageCardStyle,
              padding: "1.1rem 1.2rem",
              display: "grid",
              gap: 10,
            }}
          >
            <h2 style={{ margin: 0 }}>What This Handles</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0, color: "#cbd5e1" }}>Rapid emergency ride requests with live driver response.</p>
              <p style={{ margin: 0, color: "#cbd5e1" }}>Driver availability and active-ride mission workflow.</p>
              <p style={{ margin: 0, color: "#cbd5e1" }}>Administrative oversight for accounts, requests, and ride history.</p>
            </div>
          </section>
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
            <div style={{ marginTop: 20, display: "grid", gap: 20 }}>
              <section
                style={{
                  ...homepageCardStyle,
                  padding: "clamp(1.15rem, 3vw, 1.8rem)",
                  display: "grid",
                  gap: 18,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "start" }}>
                  <div style={{ maxWidth: 700 }}>
                    <p
                      style={{
                        margin: 0,
                        color: "#7dd3fc",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        fontSize: 12,
                      }}
                    >
                      Mission Hub
                    </p>
                    <h2 style={{ margin: "0.45rem 0 0.5rem" }}>Welcome back, {displayName}</h2>
                    <p style={{ margin: 0, color: "#cbd5e1", maxWidth: 640 }}>
                      Launch an emergency ride fast, monitor your current mission status, or move into your assigned tools from one clean operations screen.
                    </p>
                  </div>

                  <div
                    style={{
                      minWidth: 220,
                      padding: "0.95rem 1rem",
                      borderRadius: 18,
                      border: "1px solid rgba(148, 163, 184, 0.16)",
                      background: "rgba(8, 14, 24, 0.76)",
                    }}
                  >
                    <p style={{ margin: 0, color: "#7dd3fc", letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12 }}>
                      Account Status
                    </p>
                    <p style={{ margin: "0.45rem 0 0", fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>{userRoleLabel}</p>
                    <p style={{ margin: "0.2rem 0 0", color: profile?.available ? "#86efac" : "#94a3b8" }}>
                      {profile?.available ? "Driver availability is active" : "Driver availability is currently off"}
                    </p>
                  </div>
                </div>

                {readinessCards.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                    {readinessCards.map((card) => (
                      <ReadinessActionCard
                        key={card.title}
                        href={card.href}
                        title={card.title}
                        status={card.status}
                        detail={card.detail}
                      />
                    ))}
                  </div>
                ) : null}
              </section>

              {rideReady ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (emergencyRideEnabled) {
                        void submitEmergencyRide();
                      } else {
                        router.push("/request");
                      }
                    }}
                    disabled={submittingEmergencyRide}
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: 680,
                      padding: "22px 24px",
                      background: "linear-gradient(180deg, #c01d1d 0%, #7f1212 100%)",
                      color: "white",
                      borderRadius: 18,
                      textAlign: "center",
                      fontSize: 21,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      boxShadow: "0 20px 44px rgba(127, 18, 18, 0.34)",
                    }}
                  >
                    {submittingEmergencyRide ? "Requesting..." : "Request Emergency Ride"}
                  </button>
                  {emergencyRideBlockers.length > 0 ? (
                    <p style={{ maxWidth: 680, marginTop: 10, marginBottom: 0, color: "#94a3b8", fontSize: 13 }}>
                      {emergencyRideBlockers.join(" ")}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: 680,
                      padding: "20px 24px",
                      background: "linear-gradient(180deg, rgba(71, 85, 105, 0.92) 0%, rgba(51, 65, 85, 0.96) 100%)",
                      color: "#cbd5e1",
                      borderRadius: 18,
                      textAlign: "center",
                      fontSize: 20,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      boxShadow: "0 16px 38px rgba(15, 23, 42, 0.18)",
                      opacity: 0.82,
                    }}
                  >
                    Request Ride
                  </div>
                  <p style={{ maxWidth: 680, marginTop: 10, color: "#94a3b8" }}>
                    You must complete additional account information in order to use this feature.
                  </p>
                  {rideIssues[0] ? <p style={{ maxWidth: 680, marginTop: 0, color: "#fca5a5" }}>{rideIssues[0]}</p> : null}
                </>
              )}

              <section
                style={{
                  ...homepageCardStyle,
                  maxWidth: 840,
                  padding: "1.1rem 1.15rem 1.2rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                  <h2 style={{ margin: 0 }}>Applications</h2>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>Operational tools and support modules</p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 14,
                  }}
                >
                  <AppTile href={driverReady ? "/driver" : undefined} disabled={!driverReady} icon={<SteeringWheelIcon />} label="Driver Dashboard" />
                  <AppTile href="/messages/direct" icon={<MessagesIcon />} label="Messages" />
                  {showDevTile ? <AppTile href="/developer" icon={<DevIcon />} label="Dev" /> : <PlaceholderTile />}
                  {Array.from({ length: showDevTile ? appTilePlaceholderCount : appTilePlaceholderCount + 1 }).map((_, index) => (
                    <PlaceholderTile key={index} />
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
              </section>
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
