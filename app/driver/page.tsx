"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

type Ride = {
  id: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  pickup: string;
  destination: string;
  status: string;
  acceptedBy?: string;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
  driverPhotoUrl?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  riderLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
};

const ACTIVE_RIDE_STATUSES = ["accepted", "arrived", "picked_up"] as const;

type UserProfile = {
  name: string;
  phone: string;
  email: string;
  available: boolean;
  driverPhotoUrl?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
};

export default function DriverPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [openRides, setOpenRides] = useState<Ride[]>([]);
  const [acceptedRides, setAcceptedRides] = useState<Ride[]>([]);
  const [hasDriverHistory, setHasDriverHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));

        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserProfile);
        }
      }

      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "rides"), where("status", "==", "open"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rideList: Ride[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Ride, "id">),
      }));
      setOpenRides(rideList);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "rides"), where("acceptedBy", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDriverRides: Ride[] = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Ride, "id">),
        }));
      const rideList: Ride[] = allDriverRides
        .filter((ride) => ACTIVE_RIDE_STATUSES.includes(ride.status as (typeof ACTIVE_RIDE_STATUSES)[number]));
      setHasDriverHistory(allDriverRides.some((ride) => ride.status === "completed" || ride.status === "canceled"));
      setAcceptedRides(rideList);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (acceptedRides.length > 0) {
      router.replace(`/driver/active/${acceptedRides[0].id}`);
    }
  }, [acceptedRides, router]);

  const acceptRide = async (rideId: string) => {
    if (!user || !profile) {
      alert("Log in first");
      return;
    }

    if (acceptedRides.length > 0) {
      alert("You already have an active ride.");
      router.replace(`/driver/active/${acceptedRides[0].id}`);
      return;
    }

    try {
      const selectedRide = openRides.find((ride) => ride.id === rideId);
      const rideRef = doc(db, "rides", rideId);
      await updateDoc(rideRef, {
        status: "accepted",
        acceptedBy: user.uid,
        driverName: profile.name,
        driverPhone: profile.phone,
        driverEmail: profile.email,
        driverPhotoUrl: profile.driverPhotoUrl || null,
        carMake: profile.carMake || null,
        carModel: profile.carModel || null,
        carColor: profile.carColor || null,
        carPlate: profile.carPlate || null,
        acceptedAt: new Date(),
      });

      const idToken = await auth.currentUser?.getIdToken();

      if (idToken) {
        void fetch("/api/notifications/ride-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            rideId,
            riderId: selectedRide?.riderId,
            event: "accepted",
            driverName: profile.name,
          }),
        }).catch((error) => {
          console.error("Ride accepted notification failed", error);
        });
      }

      router.replace(`/driver/active/${rideId}`);
    } catch (error) {
      console.error(error);
      alert("Error accepting ride");
    }
  };

  const clockOut = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        available: false,
      });
      alert("Clocked out");
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Failed to clock out");
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
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

      <button
        onClick={clockOut}
        style={{
          padding: "8px 14px",
          backgroundColor: "#7f1d1d",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Clock Out
      </button>

      <h1 style={{ marginTop: 20 }}>Driver Dashboard</h1>

      <p>
        <strong>Driver:</strong> {profile?.name || user.email}
      </p>
      <p>
        <strong>Status:</strong> {profile?.available ? "Clocked In" : "Clocked Out"}
      </p>

      {hasDriverHistory ? (
        <div style={{ marginTop: 20 }}>
          <Link
            href="/driver/history"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              backgroundColor: "#111827",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Driver History
          </Link>
        </div>
      ) : null}

      <div style={{ marginTop: 30 }}>
        <h3>Current Accepted Rides</h3>

        {acceptedRides.length === 0 ? (
          <p>No active rides</p>
        ) : (
          acceptedRides.map((ride) => (
            <div
              key={ride.id}
              style={{
                border: "1px solid rgba(45, 212, 191, 0.22)",
                padding: 14,
                marginBottom: 12,
                borderRadius: 12,
                backgroundColor: "rgba(9, 15, 25, 0.88)",
                color: "#e5edf7",
                boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
              }}
            >
              <p>
                <strong>Rider:</strong> {ride.riderName || "N/A"}
              </p>
              <p>
                <strong>Phone:</strong> {ride.riderPhone || "N/A"}
              </p>
              <p>
                <strong>Stage:</strong> {ride.status}
              </p>
              <p>
                <strong>Pickup:</strong> {ride.pickup}
              </p>
              <p>
                <strong>Destination:</strong> {ride.destination}
              </p>
              <p>
                <strong>GPS:</strong>{" "}
                {ride.riderLocation?.latitude != null && ride.riderLocation?.longitude != null
                  ? `${ride.riderLocation.latitude.toFixed(6)}, ${ride.riderLocation.longitude.toFixed(6)}`
                  : "Not shared"}
              </p>

              <button
                onClick={() => router.push(`/driver/active/${ride.id}`)}
                style={{
                  padding: "8px 12px",
                  marginTop: 10,
                  backgroundColor: "#0f766e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Open Active Ride
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Open Ride Requests</h3>

        {openRides.length === 0 ? (
          <p>No open requests</p>
        ) : (
          openRides.map((ride) => (
            <div
              key={ride.id}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.18)",
                padding: 14,
                marginBottom: 12,
                borderRadius: 12,
                backgroundColor: "rgba(9, 15, 25, 0.88)",
                color: "#e5edf7",
                boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
              }}
            >
              <p>
                <strong>Rider:</strong> {ride.riderName || "N/A"}
              </p>
              <p>
                <strong>Phone:</strong> {ride.riderPhone || "N/A"}
              </p>
              <p>
                <strong>Pickup:</strong> {ride.pickup}
              </p>
              <p>
                <strong>Destination:</strong> {ride.destination}
              </p>

              <button
                onClick={() => acceptRide(ride.id)}
                style={{ padding: "8px 12px", marginTop: 10 }}
              >
                Accept Ride
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
