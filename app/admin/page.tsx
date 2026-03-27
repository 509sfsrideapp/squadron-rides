"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import InboxPostComposer from "../components/InboxPostComposer";
import InboxPostManager from "../components/InboxPostManager";
import LiveRideMap, { type MapPoint } from "../components/LiveRideMap";
import { auth, db } from "../../lib/firebase";
import { formatRideTimestamp, getRideStatusLabel } from "../../lib/ride-lifecycle";
import { ADMIN_EMAIL, isAdminEmail } from "../../lib/admin";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";

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
  riderLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
  driverLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
  acceptedBy?: string;
  createdAt?: { seconds?: number };
  acceptedAt?: { seconds?: number };
  arrivedAt?: { seconds?: number };
  pickedUpAt?: { seconds?: number };
  completedAt?: { seconds?: number };
  canceledAt?: { seconds?: number };
};

type AppUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  available?: boolean;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  driverPhotoUrl?: string;
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<Ride[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedDriversByRide, setSelectedDriversByRide] = useState<Record<string, string>>({});

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

  const cancelRide = async (rideId: string) => {
    const confirmed = window.confirm("Cancel this ride?");
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "rides", rideId), {
        status: "canceled",
        canceledAt: new Date(),
        canceledBy: user?.uid ?? "admin",
      });
    } catch (error) {
      console.error(error);
      alert("Could not cancel the ride.");
    }
  };

  const reassignRide = async (rideId: string) => {
    const confirmed = window.confirm("Return this ride to the open queue so another driver can accept it?");
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "rides", rideId), {
        status: "open",
        acceptedBy: null,
        driverName: null,
        driverPhone: null,
        driverEmail: null,
        driverPhotoUrl: null,
        acceptedAt: null,
        arrivedAt: null,
        pickedUpAt: null,
        completedAt: null,
        canceledAt: null,
        carMake: null,
        carModel: null,
        carColor: null,
        carPlate: null,
        driverLocation: null,
        reassignedAt: new Date(),
      });
    } catch (error) {
      console.error(error);
      alert("Could not reassign the ride.");
    }
  };

  const assignRideToDriver = async (rideId: string) => {
    const driverId = selectedDriversByRide[rideId];

    if (!driverId) {
      alert("Select a driver first.");
      return;
    }

    const driver = users.find((appUser) => appUser.id === driverId);

    if (!driver) {
      alert("That driver is no longer available.");
      return;
    }

    try {
      await updateDoc(doc(db, "rides", rideId), {
        status: "accepted",
        acceptedBy: driver.id,
        driverName: driver.name || null,
        driverPhone: driver.phone || null,
        driverEmail: driver.email || null,
        driverPhotoUrl: driver.driverPhotoUrl || null,
        carYear: driver.carYear || null,
        carMake: driver.carMake || null,
        carModel: driver.carModel || null,
        carColor: driver.carColor || null,
        carPlate: driver.carPlate || null,
        acceptedAt: new Date(),
        arrivedAt: null,
        pickedUpAt: null,
        completedAt: null,
        canceledAt: null,
        assignedByAdminAt: new Date(),
        assignedByAdminUid: user?.uid ?? "admin",
      });
    } catch (error) {
      console.error(error);
      alert("Could not assign that ride.");
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Admin Dashboard" caption="Building the ride board and driver availability view." />
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
        <HomeIconLink />
        <p>This account does not have admin access.</p>
        <p>Authorized admin email: {ADMIN_EMAIL}</p>
      </main>
    );
  }

  const openRides = rides.filter((ride) => ride.status === "open");
  const acceptedRides = rides.filter((ride) => ride.status === "accepted");
  const arrivedRides = rides.filter((ride) => ride.status === "arrived");
  const pickedUpRides = rides.filter((ride) => ride.status === "picked_up");
  const completedRides = rides.filter((ride) => ride.status === "completed");
  const activeRideBoard = rides.filter(
    (ride) =>
      ride.status === "open" ||
      ride.status === "accepted" ||
      ride.status === "arrived" ||
      ride.status === "picked_up"
  );
  const availableDrivers = users.filter((appUser) => appUser.available);

  return (
    <main style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <HomeIconLink style={{ marginRight: 12, marginBottom: 0 }} />

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
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "rgba(18, 37, 63, 0.86)", color: "#dbeafe", border: "1px solid rgba(96, 165, 250, 0.2)" }}>
          <strong>Total Users:</strong> {users.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "rgba(10, 51, 44, 0.88)", color: "#ccfbf1", border: "1px solid rgba(45, 212, 191, 0.2)" }}>
          <strong>Available Drivers:</strong> {availableDrivers.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "rgba(77, 53, 15, 0.88)", color: "#fef3c7", border: "1px solid rgba(250, 204, 21, 0.2)" }}>
          <strong>Open Rides:</strong> {openRides.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "rgba(49, 27, 76, 0.88)", color: "#ede9fe", border: "1px solid rgba(167, 139, 250, 0.2)" }}>
          <strong>Accepted Rides:</strong> {acceptedRides.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "rgba(86, 42, 19, 0.88)", color: "#ffedd5", border: "1px solid rgba(251, 146, 60, 0.2)" }}>
          <strong>Arrived:</strong> {arrivedRides.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "rgba(16, 44, 84, 0.88)", color: "#dbeafe", border: "1px solid rgba(96, 165, 250, 0.2)" }}>
          <strong>Picked Up:</strong> {pickedUpRides.length}
        </div>
        <div style={{ padding: 14, borderRadius: 10, backgroundColor: "rgba(31, 41, 55, 0.88)", color: "#e5e7eb", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
          <strong>Completed Rides:</strong> {completedRides.length}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link
          href="/admin/history"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            backgroundColor: "#1d4ed8",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Open Ride History
        </Link>
        <Link
          href="/admin/accounts"
          style={{
            display: "inline-block",
            marginLeft: 12,
            padding: "10px 16px",
            backgroundColor: "#0f766e",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Open Accounts
        </Link>
        <Link
          href="/admin/audit"
          style={{
            display: "inline-block",
            marginLeft: 12,
            padding: "10px 16px",
            backgroundColor: "#7c3aed",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Open Audit Log
        </Link>
      </div>

      <section style={{ marginTop: 28 }}>
        <InboxPostComposer
          endpoint="/api/admin/inbox-posts"
          threadId="admin"
          heading="Post to Admin Inbox"
          description="Send a formatted admin post into the user inbox. Title and message text are required, and an optional photo will appear on the left side of the post."
          submitLabel="Send Admin Post"
        />
      </section>

      <InboxPostManager
        threadId="admin"
        endpointBase="/api/admin/inbox-posts"
        heading="Review Admin Inbox Posts"
        description="Review what has already been sent into the Admin inbox thread and edit or delete posts when needed."
      />

      <section style={{ marginTop: 32 }}>
        <h2>Available Drivers</h2>
        {availableDrivers.length === 0 ? (
          <p>No drivers are currently clocked in.</p>
        ) : (
          availableDrivers.map((driver) => (
            <div
              key={driver.id}
              style={{
                border: "1px solid rgba(96, 165, 250, 0.2)",
                backgroundColor: "rgba(10, 16, 27, 0.86)",
                color: "#e5edf7",
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
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
              <p>
                <strong>Vehicle:</strong>{" "}
                {[driver.carColor, driver.carYear, driver.carMake, driver.carModel].filter(Boolean).join(" ").trim() || "N/A"}
              </p>
              <p>
                <strong>Plate:</strong> {driver.carPlate || "N/A"}
              </p>
            </div>
          ))
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Live Ride Board</h2>
        <p style={{ maxWidth: 720 }}>
          This board stays focused on open and active rides. Completed and canceled rides now live under the separate ride history screen.
        </p>
        {activeRideBoard.length === 0 ? (
          <p>No open or active rides right now.</p>
        ) : (
          activeRideBoard.map((ride) => (
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
              <p>
                <strong>Status:</strong> {getRideStatusLabel(ride.status)}
              </p>
              <p>
                <strong>Rider:</strong> {ride.riderName || "N/A"}
              </p>
              <p>
                <strong>Phone:</strong> {ride.riderPhone || "N/A"}
              </p>
              <p>
                <strong>Pickup:</strong> {ride.pickupLocationName || ride.pickupLocationAddress || ride.pickup || "N/A"}
              </p>
              {ride.pickupLocationAddress && ride.pickupLocationAddress !== ride.pickupLocationName ? (
                <p>
                  <strong>Address:</strong> {ride.pickupLocationAddress}
                </p>
              ) : null}
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
                <strong>Requested:</strong> {formatRideTimestamp(ride.createdAt) || "N/A"}
              </p>
              <p>
                <strong>Accepted:</strong> {formatRideTimestamp(ride.acceptedAt) || "N/A"}
              </p>
              <p>
                <strong>Arrived:</strong> {formatRideTimestamp(ride.arrivedAt) || "N/A"}
              </p>
              <p>
                <strong>Picked Up:</strong> {formatRideTimestamp(ride.pickedUpAt) || "N/A"}
              </p>
              <p>
                <strong>Driver GPS:</strong>{" "}
                {ride.driverLocation?.latitude != null && ride.driverLocation?.longitude != null
                  ? `${ride.driverLocation.latitude.toFixed(6)}, ${ride.driverLocation.longitude.toFixed(6)}`
                  : "Not shared"}
              </p>

              {ride.status === "open" || ride.status === "accepted" || ride.status === "arrived" || ride.status === "picked_up" ? (
                <div style={{ marginTop: 12 }}>
                  {ride.status === "open" ? (
                    <div style={{ marginBottom: 12, maxWidth: 360 }}>
                      <label style={{ display: "block", marginBottom: 8 }}>
                        <strong>Assign Driver:</strong>
                      </label>
                      <select
                        value={selectedDriversByRide[ride.id] || ""}
                        onChange={(event) =>
                          setSelectedDriversByRide((current) => ({
                            ...current,
                            [ride.id]: event.target.value,
                          }))
                        }
                        style={{ marginBottom: 10 }}
                      >
                        <option value="">Select a clocked-in driver</option>
                        {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name || driver.email || driver.id}
                            {[driver.carColor, driver.carYear, driver.carMake, driver.carModel]
                              .filter(Boolean)
                              .join(" ")
                              .trim()
                              ? ` - ${[driver.carColor, driver.carYear, driver.carMake, driver.carModel].filter(Boolean).join(" ").trim()}`
                              : ""}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => assignRideToDriver(ride.id)}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#0f766e",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          marginRight: 10,
                        }}
                      >
                        Assign Ride
                      </button>
                    </div>
                  ) : null}

                  <button
                    onClick={() => cancelRide(ride.id)}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#b91c1c",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      marginRight: 10,
                    }}
                  >
                    Cancel Ride
                  </button>

                  {ride.status !== "open" ? (
                    <button
                      onClick={() => reassignRide(ride.id)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#92400e",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                      }}
                    >
                      Reassign Ride
                    </button>
                  ) : null}
                </div>
              ) : null}

              {ride.status === "accepted" || ride.status === "arrived" || ride.status === "picked_up" ? (
                <LiveRideMap
                  riderLocation={
                    ride.riderLocation?.latitude != null && ride.riderLocation?.longitude != null
                      ? ({
                          latitude: ride.riderLocation.latitude,
                          longitude: ride.riderLocation.longitude,
                        } satisfies MapPoint)
                      : null
                  }
                  driverLocation={
                    ride.driverLocation?.latitude != null && ride.driverLocation?.longitude != null
                      ? ({
                          latitude: ride.driverLocation.latitude,
                          longitude: ride.driverLocation.longitude,
                        } satisfies MapPoint)
                      : null
                  }
                  title="Dispatch Map"
                  emptyLabel="No rider coordinates have been shared for this active ride yet."
                  footerLabel="Blue is the driver. Orange is the pickup spot."
                  maxWidth={700}
                />
              ) : null}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
