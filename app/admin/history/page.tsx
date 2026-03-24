"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth, db } from "../../../lib/firebase";
import { formatRideTimestamp, getRideStatusLabel } from "../../../lib/ride-lifecycle";
import { ADMIN_EMAIL, isAdminEmail } from "../../../lib/admin";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

type Ride = {
  id: string;
  riderName?: string;
  riderPhone?: string;
  pickup?: string;
  pickupLocationName?: string;
  pickupLocationAddress?: string;
  destination?: string;
  status?: string;
  driverName?: string;
  createdAt?: { seconds?: number };
  acceptedAt?: { seconds?: number };
  arrivedAt?: { seconds?: number };
  pickedUpAt?: { seconds?: number };
  completedAt?: { seconds?: number };
  canceledAt?: { seconds?: number };
};

function timestampToMillis(timestamp?: { seconds?: number }) {
  return timestamp?.seconds ? timestamp.seconds * 1000 : null;
}

function getTimeValueForFilter(ride: Ride, field: string) {
  switch (field) {
    case "accepted":
      return timestampToMillis(ride.acceptedAt);
    case "arrived":
      return timestampToMillis(ride.arrivedAt);
    case "picked_up":
      return timestampToMillis(ride.pickedUpAt);
    case "closed":
      return timestampToMillis(ride.completedAt) || timestampToMillis(ride.canceledAt);
    default:
      return timestampToMillis(ride.createdAt);
  }
}

export default function AdminRideHistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<Ride[]>([]);
  const [riderSearch, setRiderSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeField, setTimeField] = useState("created");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthorized(isAdminEmail(currentUser?.email));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const ridesQuery = query(collection(db, "rides"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      const rideList: Ride[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Ride, "id">),
      }));
      setRides(rideList);
    });

    return () => unsubscribe();
  }, [authorized]);

  const filteredRides = useMemo(() => {
    const riderNeedle = riderSearch.trim().toLowerCase();
    const driverNeedle = driverSearch.trim().toLowerCase();
    const startMillis = startDateTime ? new Date(startDateTime).getTime() : null;
    const endMillis = endDateTime ? new Date(endDateTime).getTime() : null;

    return rides.filter((ride) => {
      if (statusFilter !== "all" && (ride.status || "") !== statusFilter) {
        return false;
      }

      if (riderNeedle && !(ride.riderName || "").toLowerCase().includes(riderNeedle)) {
        return false;
      }

      if (driverNeedle && !(ride.driverName || "").toLowerCase().includes(driverNeedle)) {
        return false;
      }

      const timeValue = getTimeValueForFilter(ride, timeField);

      if (startMillis !== null && (timeValue === null || timeValue < startMillis)) {
        return false;
      }

      if (endMillis !== null && (timeValue === null || timeValue > endMillis)) {
        return false;
      }

      return true;
    });
  }, [driverSearch, endDateTime, riderSearch, rides, startDateTime, statusFilter, timeField]);

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Admin Ride History" caption="Preparing ride search and mission archives." />
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
        <p>You must sign in to view admin ride history.</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <p>This account does not have admin access.</p>
        <p>Authorized admin email: {ADMIN_EMAIL}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <HomeIconLink style={{ marginBottom: 0 }} />
        <Link
          href="/admin"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            backgroundColor: "#1f2937",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Admin Dashboard
        </Link>
      </div>

      <h1>Admin Ride History</h1>
      <p style={{ maxWidth: 760 }}>
        Search by rider, driver, status, and a detailed date/time range. The time filter can target requested, accepted, arrived, picked up, or closed timestamps.
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <input
            value={riderSearch}
            onChange={(event) => setRiderSearch(event.target.value)}
            placeholder="Search rider name"
          />
          <input
            value={driverSearch}
            onChange={(event) => setDriverSearch(event.target.value)}
            placeholder="Search driver name"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="accepted">Accepted</option>
            <option value="arrived">Arrived</option>
            <option value="picked_up">Picked Up</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
          <select value={timeField} onChange={(event) => setTimeField(event.target.value)}>
            <option value="created">Requested Time</option>
            <option value="accepted">Accepted Time</option>
            <option value="arrived">Arrived Time</option>
            <option value="picked_up">Picked Up Time</option>
            <option value="closed">Closed Time</option>
          </select>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(event) => setStartDateTime(event.target.value)}
          />
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(event) => setEndDateTime(event.target.value)}
          />
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
          Showing {filteredRides.length} ride{filteredRides.length === 1 ? "" : "s"} with the current filters.
        </p>
      </div>

      <section style={{ marginTop: 24 }}>
        {filteredRides.length === 0 ? (
          <p>No rides matched the current filters.</p>
        ) : (
          filteredRides.map((ride) => (
            <div
              key={ride.id}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.18)",
                backgroundColor: "rgba(9, 15, 25, 0.88)",
                color: "#e5edf7",
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
                boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
              }}
            >
              <p><strong>Status:</strong> {getRideStatusLabel(ride.status)}</p>
              <p><strong>Rider:</strong> {ride.riderName || "N/A"}</p>
              <p><strong>Driver:</strong> {ride.driverName || "Unassigned"}</p>
              <p><strong>Phone:</strong> {ride.riderPhone || "N/A"}</p>
              <p><strong>Pickup:</strong> {ride.pickupLocationName || ride.pickupLocationAddress || ride.pickup || "N/A"}</p>
              {ride.pickupLocationAddress && ride.pickupLocationAddress !== ride.pickupLocationName ? (
                <p><strong>Address:</strong> {ride.pickupLocationAddress}</p>
              ) : null}
              <p><strong>Destination:</strong> {ride.destination || "N/A"}</p>
              <p><strong>Requested:</strong> {formatRideTimestamp(ride.createdAt) || "N/A"}</p>
              <p><strong>Accepted:</strong> {formatRideTimestamp(ride.acceptedAt) || "N/A"}</p>
              <p><strong>Arrived:</strong> {formatRideTimestamp(ride.arrivedAt) || "N/A"}</p>
              <p><strong>Picked Up:</strong> {formatRideTimestamp(ride.pickedUpAt) || "N/A"}</p>
              <p><strong>Closed:</strong> {formatRideTimestamp(ride.completedAt || ride.canceledAt) || "N/A"}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
