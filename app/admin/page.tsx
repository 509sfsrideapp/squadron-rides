"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { ADMIN_EMAIL, isAdminEmail } from "../../lib/admin";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

type Ride = {
  id: string;
  riderName?: string;
  riderPhone?: string;
  pickup?: string;
  destination?: string;
  status?: string;
  driverName?: string;
  riderLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
  driverLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
};

type AppUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  available?: boolean;
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<Ride[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthorized(isAdminEmail(currentUser?.email));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authorized) return;

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const userList: AppUser[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AppUser, "id">),
      }));
      setUsers(userList);
    });

    const ridesQuery = query(collection(db, "rides"), orderBy("createdAt", "desc"));
    const unsubscribeRides = onSnapshot(ridesQuery, (snapshot) => {
      const rideList: Ride[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Ride, "id">),
      }));
      setRides(rideList);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRides();
    };
  }, [authorized]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Logout failed");
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
          href="/admin/login"
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
          Admin Login
        </Link>
        <p>You must sign in to view the admin page.</p>
      </main>
    );
  }

  if (!authorized) {
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
        <p>This account does not have admin access.</p>
        <p>Authorized admin email: {ADMIN_EMAIL}</p>
      </main>
    );
  }

  const openRides = rides.filter((ride) => ride.status === "open");
  const acceptedRides = rides.filter((ride) => ride.status === "accepted");
  const completedRides = rides.filter((ride) => ride.status === "completed");
  const availableDrivers = users.filter((appUser) => appUser.available);

  return (
    <main style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginRight: 12,
            padding: "8px 14px",
            backgroundColor: "#1f2937",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Home
        </Link>

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 14px",
            backgroundColor: "#7f1d1d",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <h1>Admin Dashboard</h1>
      <p>
        <strong>Signed in as:</strong> {user.email}
      </p>

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#e0f2fe", color: "#0f172a" }}>
          <strong>Total Users:</strong> {users.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#dcfce7", color: "#14532d" }}>
          <strong>Available Drivers:</strong> {availableDrivers.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#fef3c7", color: "#78350f" }}>
          <strong>Open Rides:</strong> {openRides.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#ede9fe", color: "#4c1d95" }}>
          <strong>Accepted Rides:</strong> {acceptedRides.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#f3f4f6", color: "#111827" }}>
          <strong>Completed Rides:</strong> {completedRides.length}
        </div>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>Available Drivers</h2>
        {availableDrivers.length === 0 ? (
          <p>No drivers are currently clocked in.</p>
        ) : (
          availableDrivers.map((driver) => (
            <div
              key={driver.id}
              style={{
                border: "1px solid #bfdbfe",
                backgroundColor: "#eff6ff",
                color: "#0f172a",
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <p>
                <strong>Name:</strong> {driver.name || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {driver.email || "N/A"}
              </p>
              <p>
                <strong>Phone:</strong> {driver.phone || "N/A"}
              </p>
            </div>
          ))
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>All Ride Activity</h2>
        {rides.length === 0 ? (
          <p>No rides have been submitted yet.</p>
        ) : (
          rides.map((ride) => (
            <div
              key={ride.id}
              style={{
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                color: "#111827",
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <p>
                <strong>Status:</strong> {ride.status || "unknown"}
              </p>
              <p>
                <strong>Rider:</strong> {ride.riderName || "N/A"}
              </p>
              <p>
                <strong>Phone:</strong> {ride.riderPhone || "N/A"}
              </p>
              <p>
                <strong>Pickup:</strong> {ride.pickup || "N/A"}
              </p>
              <p>
                <strong>Rider GPS:</strong>{" "}
                {ride.riderLocation?.latitude != null && ride.riderLocation?.longitude != null
                  ? `${ride.riderLocation.latitude.toFixed(6)}, ${ride.riderLocation.longitude.toFixed(6)}`
                  : "Not shared"}
              </p>
              <p>
                <strong>Destination:</strong> {ride.destination || "N/A"}
              </p>
              <p>
                <strong>Driver:</strong> {ride.driverName || "Unassigned"}
              </p>
              <p>
                <strong>Driver GPS:</strong>{" "}
                {ride.driverLocation?.latitude != null && ride.driverLocation?.longitude != null
                  ? `${ride.driverLocation.latitude.toFixed(6)}, ${ride.driverLocation.longitude.toFixed(6)}`
                  : "Not shared"}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
