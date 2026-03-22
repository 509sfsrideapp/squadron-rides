"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    default:
      return "No active ride right now.";
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
              border: "1px solid #0f766e",
              backgroundColor: "#ecfeff",
              color: "#0f172a",
              borderRadius: 12,
              padding: 16,
              maxWidth: 560,
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
        </>
      )}
    </main>
  );
}
