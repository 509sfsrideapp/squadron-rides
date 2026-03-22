"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LiveRideMap, { type MapPoint } from "../components/LiveRideMap";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";

type Ride = {
  id: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  pickup?: string;
  destination?: string;
  status?: string;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
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

function getStatusAccent(status?: string) {
  switch (status) {
    case "open":
      return { backgroundColor: "rgba(77, 53, 15, 0.88)", color: "#fef3c7" };
    case "accepted":
      return { backgroundColor: "rgba(16, 44, 84, 0.88)", color: "#dbeafe" };
    case "arrived":
      return { backgroundColor: "rgba(86, 42, 19, 0.88)", color: "#ffedd5" };
    case "picked_up":
      return { backgroundColor: "rgba(10, 51, 44, 0.88)", color: "#ccfbf1" };
    case "completed":
      return { backgroundColor: "rgba(31, 41, 55, 0.88)", color: "#e5e7eb" };
    case "canceled":
      return { backgroundColor: "rgba(69, 10, 10, 0.9)", color: "#fecaca" };
    default:
      return { backgroundColor: "rgba(31, 41, 55, 0.88)", color: "#e5e7eb" };
  }
}

export default function RideStatusPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <p>Loading ride status...</p>
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
      <Link
        href="/"
        style={{
          display: "inline-block",
          marginBottom: 20,
          padding: "8px 14px",
          backgroundColor: "#1f2937",
          color: "white",
          textDecoration: "none",
          borderRadius: 8,
          marginRight: 12,
        }}
      >
        Home
      </Link>

      <Link
        href="/request"
        style={{
          display: "inline-block",
          marginBottom: 20,
          padding: "8px 14px",
          backgroundColor: "#0f766e",
          color: "white",
          textDecoration: "none",
          borderRadius: 8,
        }}
      >
        Request Another Ride
      </Link>

      <h1>Ride Status</h1>

      {!activeRide ? (
        <p>You do not have an active ride right now.</p>
      ) : (
        <>
          <p>{getStatusMessage(activeRide.status)}</p>
          <div
            style={{
              display: "inline-block",
              padding: "6px 10px",
              borderRadius: 999,
              fontWeight: 700,
              marginBottom: 16,
              ...getStatusAccent(activeRide.status),
            }}
          >
            {String(activeRide.status).replace("_", " ").toUpperCase()}
          </div>

          <div
            style={{
              border: "1px solid rgba(45, 212, 191, 0.22)",
              backgroundColor: "rgba(9, 15, 25, 0.88)",
              color: "#e5edf7",
              borderRadius: 12,
              padding: 16,
              maxWidth: 560,
              boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
            }}
          >
            <p>
              <strong>Status:</strong> {activeRide.status}
            </p>
            <p>
              <strong>Pickup:</strong> {activeRide.pickup || "N/A"}
            </p>
            <p>
              <strong>Destination:</strong> {activeRide.destination || "N/A"}
            </p>
            <p>
              <strong>Driver:</strong> {activeRide.driverName || "Waiting for driver"}
            </p>
            <p>
              <strong>Driver Phone:</strong> {activeRide.driverPhone || "Not available yet"}
            </p>
            <p>
              <strong>Driver Email:</strong> {activeRide.driverEmail || "Not available yet"}
            </p>
            {activeRide.driverPhone ? (
              <div style={{ marginBottom: 12 }}>
                <a
                  href={`tel:${activeRide.driverPhone}`}
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    backgroundColor: "#1d4ed8",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 8,
                    marginRight: 10,
                  }}
                >
                  Call Driver
                </a>
                <a
                  href={`sms:${activeRide.driverPhone}`}
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    backgroundColor: "#0f766e",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 8,
                  }}
                >
                  Text Driver
                </a>
              </div>
            ) : null}
            <p>
              <strong>Driver GPS:</strong>{" "}
              {activeRide.driverLocation?.latitude != null && activeRide.driverLocation?.longitude != null
                ? `${activeRide.driverLocation.latitude.toFixed(6)}, ${activeRide.driverLocation.longitude.toFixed(6)}`
                : "Driver location not shared yet"}
            </p>
            <p>
              <strong>Pickup GPS:</strong>{" "}
              {activeRide.riderLocation?.latitude != null && activeRide.riderLocation?.longitude != null
                ? `${activeRide.riderLocation.latitude.toFixed(6)}, ${activeRide.riderLocation.longitude.toFixed(6)}`
                : "Not shared"}
            </p>
          </div>

          <LiveRideMap riderLocation={riderLocation} driverLocation={driverLocation} />

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
              View Ride History
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
