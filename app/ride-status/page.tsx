"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import LiveRideMap, { type MapPoint } from "../components/LiveRideMap";
import { formatEtaLabel } from "../../lib/eta";
import { auth, db } from "../../lib/firebase";
import { formatRideTimestamp, getRideLifecycleSteps, getRideStatusLabel } from "../../lib/ride-lifecycle";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, runTransaction, updateDoc, where } from "firebase/firestore";

type Ride = {
  id: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  pickup?: string;
  pickupLocationName?: string;
  pickupLocationAddress?: string;
  destination?: string;
  status?: string;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
  driverPhotoUrl?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  riderLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
  driverLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
  canceledBy?: string;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
  acceptedAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
  arrivedAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
  pickedUpAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
  completedAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
  canceledAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
};

type RiderProfile = {
  locationServicesEnabled?: boolean;
};

const ACTIVE_RIDE_STATUSES = ["open", "accepted", "arrived", "picked_up"] as const;

function getStatusMessage(status?: string) {
  switch (status) {
    case "open":
      return "Your ride request is out to drivers now.";
    case "accepted":
      return "A driver accepted your request and is heading your way.";
    case "arrived":
      return "Your driver has arrived at the pickup location.";
    case "picked_up":
      return "You have been picked up and the ride is in progress.";
    case "completed":
      return "Your ride has been completed.";
    case "canceled":
      return "This ride was canceled.";
    default:
      return "No active ride right now.";
  }
}

export default function RideStatusPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingRide, setCancelingRide] = useState(false);
  const [riderLocationServicesEnabled, setRiderLocationServicesEnabled] = useState(true);
  const riderWatchIdRef = useRef<number | null>(null);
  const lastRiderLocationSentRef = useRef<{ latitude: number; longitude: number; sentAt: number } | null>(null);
  const riderLocationUpdateInFlightRef = useRef(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setRides([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadRiderLocationPreference = async () => {
      try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));

        if (!profileSnap.exists()) return;

        const profile = profileSnap.data() as RiderProfile;
        setRiderLocationServicesEnabled(profile.locationServicesEnabled !== false);
      } catch (error) {
        console.error(error);
      }
    };

    void loadRiderLocationPreference();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const ridesQuery = query(collection(db, "rides"), where("riderId", "==", user.uid));

    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      const rideList = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Ride, "id">),
        }))
        .filter((ride) => ACTIVE_RIDE_STATUSES.includes(ride.status as (typeof ACTIVE_RIDE_STATUSES)[number]))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

      setRides(rideList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const activeRide = useMemo(() => rides[0] ?? null, [rides]);
  const riderLocation: MapPoint | null =
    activeRide?.riderLocation?.latitude != null && activeRide.riderLocation?.longitude != null
      ? {
          latitude: activeRide.riderLocation.latitude,
          longitude: activeRide.riderLocation.longitude,
        }
      : null;
  const driverLocation: MapPoint | null =
    activeRide?.driverLocation?.latitude != null && activeRide.driverLocation?.longitude != null
      ? {
          latitude: activeRide.driverLocation.latitude,
          longitude: activeRide.driverLocation.longitude,
        }
      : null;
  const canCancelRide = activeRide?.status === "open" || activeRide?.status === "accepted" || activeRide?.status === "arrived";
  const lifecycleSteps = activeRide ? getRideLifecycleSteps(activeRide) : [];
  const eta = formatEtaLabel(driverLocation, riderLocation);

  useEffect(() => {
    if (
      !user ||
      !activeRide ||
      !riderLocationServicesEnabled ||
      typeof window === "undefined" ||
      !("geolocation" in navigator) ||
      !ACTIVE_RIDE_STATUSES.includes(activeRide.status as (typeof ACTIVE_RIDE_STATUSES)[number])
    ) {
      return;
    }

    riderWatchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const nextCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const now = Date.now();
        const lastSent = lastRiderLocationSentRef.current;
        const latitudeChanged = !lastSent || Math.abs(lastSent.latitude - nextCoordinates.latitude) > 0.00035;
        const longitudeChanged = !lastSent || Math.abs(lastSent.longitude - nextCoordinates.longitude) > 0.00035;
        const enoughTimePassed = !lastSent || now - lastSent.sentAt > 30000;

        if ((!latitudeChanged && !longitudeChanged && !enoughTimePassed) || riderLocationUpdateInFlightRef.current) {
          return;
        }

        try {
          riderLocationUpdateInFlightRef.current = true;
          await updateDoc(doc(db, "rides", activeRide.id), {
            riderLocation: nextCoordinates,
            riderLocationUpdatedAt: new Date(),
          });
          lastRiderLocationSentRef.current = { ...nextCoordinates, sentAt: now };
        } catch (error) {
          console.error(error);
        } finally {
          riderLocationUpdateInFlightRef.current = false;
        }
      },
      (error) => {
        console.error("Rider location watch failed", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (riderWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(riderWatchIdRef.current);
        riderWatchIdRef.current = null;
      }
    };
  }, [activeRide, riderLocationServicesEnabled, user]);

  const cancelRide = async () => {
    if (!activeRide || !user) return;

    const confirmed = window.confirm("Cancel this ride request?");
    if (!confirmed) return;

    try {
      setCancelingRide(true);
      await runTransaction(db, async (transaction) => {
        const rideRef = doc(db, "rides", activeRide.id);
        const rideSnap = await transaction.get(rideRef);

        if (!rideSnap.exists()) {
          throw new Error("This ride is no longer available.");
        }

        const currentRide = rideSnap.data() as Ride;

        if (currentRide.riderId !== user.uid) {
          throw new Error("This ride belongs to another rider.");
        }

        if (!currentRide.status || !["open", "accepted", "arrived"].includes(currentRide.status)) {
          throw new Error("This ride can no longer be canceled from the rider screen.");
        }

        transaction.update(rideRef, {
          status: "canceled",
          canceledAt: new Date(),
          canceledBy: user.uid,
        });
      });
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "We could not cancel your ride.");
    } finally {
      setCancelingRide(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Ride Status" caption="Tracking your driver, route, and ride timeline." />
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            marginBottom: 20,
            padding: "8px 14px",
            backgroundColor: "#1f2937",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Login
        </Link>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      {!activeRide ? (
        <HomeIconLink style={{ marginRight: 12 }} />
      ) : null}

      <h1>Ride Status</h1>

      {!activeRide ? (
        <p>You do not have an active ride right now.</p>
      ) : (
        <>
          <p style={{ fontSize: "1.15rem", maxWidth: 620 }}>{getStatusMessage(activeRide.status)}</p>

          <div
            style={{
              border: "1px solid rgba(45, 212, 191, 0.22)",
              backgroundColor: "rgba(9, 15, 25, 0.88)",
              color: "#e5edf7",
              borderRadius: 16,
              padding: 20,
              maxWidth: 640,
              boxShadow: "0 16px 36px rgba(2, 6, 23, 0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 18,
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              {activeRide.driverPhotoUrl ? (
                <Image
                  src={activeRide.driverPhotoUrl}
                  alt={`${activeRide.driverName || "Driver"} profile`}
                  width={88}
                  height={88}
                  unoptimized
                  style={{
                    width: 88,
                    height: 88,
                    objectFit: "cover",
                    borderRadius: 999,
                    border: "1px solid rgba(96, 165, 250, 0.22)",
                    background: "linear-gradient(180deg, rgba(24,39,66,0.95) 0%, rgba(12,20,35,0.98) 100%)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(180deg, rgba(24,39,66,0.95) 0%, rgba(12,20,35,0.98) 100%)",
                    border: "1px solid rgba(96, 165, 250, 0.22)",
                    color: "#dbeafe",
                    fontSize: "1.8rem",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {activeRide.driverName ? activeRide.driverName.charAt(0).toUpperCase() : "?"}
                </div>
              )}

              <div style={{ flex: "1 1 260px" }}>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "#8ea1b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Your Driver
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "2rem", lineHeight: 1.05, fontFamily: "var(--font-display)", color: "#f8fbff" }}>
                  {activeRide.driverName || "Waiting for driver"}
                </p>
                <p style={{ margin: "10px 0 0", color: "#cbd5e1" }}>
                  {activeRide.carColor || activeRide.carMake || activeRide.carModel || activeRide.carPlate
                    ? [
                        [activeRide.carColor, activeRide.carYear, activeRide.carMake, activeRide.carModel].filter(Boolean).join(" ").trim(),
                        activeRide.carPlate ? `Plate ${activeRide.carPlate}` : "",
                      ]
                        .filter(Boolean)
                        .join(" • ")
                    : "Driver car details have not been added yet."}
                </p>
                {eta && activeRide.status === "accepted" ? (
                  <div
                    style={{
                      marginTop: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 999,
                      backgroundColor: "rgba(15, 118, 110, 0.2)",
                      border: "1px solid rgba(45, 212, 191, 0.25)",
                      color: "#ccfbf1",
                      fontWeight: 700,
                    }}
                  >
                    <span>{eta.summary}</span>
                    <span style={{ color: "#99f6e4", fontWeight: 500 }}>{eta.miles.toFixed(1)} mi</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 14,
                backgroundColor: "rgba(18, 37, 63, 0.62)",
                border: "1px solid rgba(96, 165, 250, 0.16)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ride Status
              </p>
              <p style={{ margin: "8px 0 0", fontSize: "2.35rem", lineHeight: 1, fontFamily: "var(--font-display)", color: "#f8fbff" }}>
                {getRideStatusLabel(activeRide.status).toUpperCase()}
              </p>
            </div>

            {activeRide.driverPhone ? (
              <div
                style={{
                  marginBottom: 20,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <a
                  href={`tel:${activeRide.driverPhone}`}
                  style={{
                    display: "block",
                    padding: "14px 20px",
                    backgroundColor: "#1d4ed8",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 12,
                    textAlign: "center",
                    fontSize: "1.05rem",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Call Driver
                </a>
                <a
                  href={`sms:${activeRide.driverPhone}`}
                  style={{
                    display: "block",
                    padding: "14px 20px",
                    backgroundColor: "#0f766e",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 12,
                    textAlign: "center",
                    fontSize: "1.05rem",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Text Driver
                </a>
              </div>
            ) : null}

            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 14,
                backgroundColor: "rgba(18, 37, 63, 0.4)",
                border: "1px solid rgba(96, 165, 250, 0.12)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ride Timeline
              </p>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {lifecycleSteps
                  .filter((step) => step.complete || step.current)
                  .map((step) => (
                    <div
                      key={step.key}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        backgroundColor: step.current ? "rgba(15, 118, 110, 0.22)" : "rgba(15, 23, 42, 0.68)",
                        border: step.current
                          ? "1px solid rgba(45, 212, 191, 0.3)"
                          : "1px solid rgba(148, 163, 184, 0.14)",
                      }}
                    >
                      <strong>{step.label}</strong>
                      <span style={{ marginLeft: 8, color: "#cbd5e1" }}>
                        {step.at ? formatRideTimestamp(step.at) : "In progress"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div
              style={{
                marginBottom: 18,
                padding: 16,
                borderRadius: 14,
                backgroundColor: "rgba(15, 23, 42, 0.5)",
                border: "1px solid rgba(148, 163, 184, 0.12)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#8ea1b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Pickup Spot
              </p>
              <p style={{ margin: "8px 0 0", fontSize: "1.45rem", lineHeight: 1.1, fontFamily: "var(--font-display)", color: "#f8fbff" }}>
                {activeRide.pickupLocationName || activeRide.pickup || "Not resolved yet"}
              </p>
              <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>
                {activeRide.pickupLocationAddress || activeRide.pickup || "No address available yet"}
              </p>
            </div>
            <p>
              <strong>Destination:</strong> {activeRide.destination || "N/A"}
            </p>
            <p>
              <strong>Driver Phone:</strong> {activeRide.driverPhone || "Not available yet"}
            </p>
          </div>

          <LiveRideMap riderLocation={riderLocation} driverLocation={driverLocation} />

          {canCancelRide ? (
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                onClick={cancelRide}
                disabled={cancelingRide}
                style={{
                  padding: "12px 18px",
                  backgroundColor: "#b91c1c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  cursor: cancelingRide ? "wait" : "pointer",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {cancelingRide ? "Canceling Ride..." : "Cancel Ride"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
