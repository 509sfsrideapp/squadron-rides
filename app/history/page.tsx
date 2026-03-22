"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";

type Ride = {
  id: string;
  pickup?: string;
  destination?: string;
  status?: string;
  driverName?: string;
  createdAt?: { seconds?: number };
};

export default function RiderHistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
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
        .filter((ride) => ride.status === "completed" || ride.status === "canceled")
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

      setRides(rideList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <main style={{ padding: 20 }}><p>Loading ride history...</p></main>;
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
        }}
      >
        Home
      </Link>

      <h1>Ride History</h1>

      {rides.length === 0 ? (
        <p>No completed or canceled rides yet.</p>
      ) : (
        rides.map((ride) => (
          <div
            key={ride.id}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.18)",
              backgroundColor: "rgba(9, 15, 25, 0.88)",
              color: "#e5edf7",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              maxWidth: 560,
              boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
            }}
          >
            <p><strong>Status:</strong> {ride.status}</p>
            <p><strong>Pickup:</strong> {ride.pickup || "N/A"}</p>
            <p><strong>Destination:</strong> {ride.destination || "N/A"}</p>
            <p><strong>Driver:</strong> {ride.driverName || "N/A"}</p>
          </div>
        ))
      )}
    </main>
  );
}
