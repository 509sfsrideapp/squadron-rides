"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
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
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  available?: boolean;
  accountFrozen?: boolean;
  homeAddress?: string;
  homeStreet?: string;
  homeCity?: string;
  homeState?: string;
  homeZip?: string;
  rank?: string;
  flight?: string;
  riderPhotoUrl?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  driverPhotoUrl?: string;
  locationServicesEnabled?: boolean;
  createdAt?: { seconds?: number };
  updatedAt?: { seconds?: number };
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<Ride[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedDriversByRide, setSelectedDriversByRide] = useState<Record<string, string>>({});
  const [accountSearch, setAccountSearch] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [flightFilter, setFlightFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("all");
  const [actingOnUserId, setActingOnUserId] = useState("");
  const [accountActionMessage, setAccountActionMessage] = useState("");

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

  const handleAccountAction = async (action: "freeze" | "unfreeze" | "delete", appUser: AppUser) => {
    if (!auth.currentUser) {
      setAccountActionMessage("Admin session expired. Please log in again.");
      return;
    }

    if (isAdminEmail(appUser.email)) {
      setAccountActionMessage("The admin account cannot be managed from this panel.");
      return;
    }

    const confirmed = window.confirm(
      action === "delete"
        ? `Delete ${appUser.name || appUser.email || appUser.id}? This removes the account entirely.`
        : action === "freeze"
          ? `Freeze ${appUser.name || appUser.email || appUser.id}? They will be signed out and blocked from login.`
          : `Unfreeze ${appUser.name || appUser.email || appUser.id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActingOnUserId(appUser.id);
      setAccountActionMessage(
        action === "delete"
          ? "Deleting account..."
          : action === "freeze"
            ? "Freezing account..."
            : "Unfreezing account..."
      );

      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action,
          userId: appUser.id,
          username: appUser.username || "",
          email: appUser.email || "",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "The account action failed.");
      }

      setAccountActionMessage(
        action === "delete"
          ? "Account deleted."
          : action === "freeze"
            ? "Account frozen."
            : "Account unfrozen."
      );
    } catch (error) {
      console.error(error);
      setAccountActionMessage(error instanceof Error ? error.message : "The account action failed.");
    } finally {
      setActingOnUserId("");
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
  const normalizedAccountSearch = accountSearch.trim().toLowerCase();
  const uniqueFlights = Array.from(new Set(users.map((appUser) => appUser.flight).filter(Boolean))).sort();
  const uniqueRanks = Array.from(new Set(users.map((appUser) => appUser.rank).filter(Boolean))).sort();
  const filteredUsers = users
    .filter((appUser) => {
      if (accountStatusFilter === "frozen" && !appUser.accountFrozen) return false;
      if (accountStatusFilter === "active" && appUser.accountFrozen) return false;
      if (availabilityFilter === "available" && !appUser.available) return false;
      if (availabilityFilter === "unavailable" && appUser.available) return false;
      if (flightFilter !== "all" && (appUser.flight || "") !== flightFilter) return false;
      if (rankFilter !== "all" && (appUser.rank || "") !== rankFilter) return false;

      if (!normalizedAccountSearch) {
        return true;
      }

      const searchableFields = [
        appUser.name,
        appUser.firstName,
        appUser.lastName,
        appUser.username,
        appUser.email,
        appUser.phone,
        appUser.rank,
        appUser.flight,
        appUser.homeAddress,
        appUser.homeStreet,
        appUser.homeCity,
        appUser.homeState,
        appUser.homeZip,
        appUser.carYear,
        appUser.carMake,
        appUser.carModel,
        appUser.carColor,
        appUser.carPlate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableFields.includes(normalizedAccountSearch);
    })
    .sort((left, right) => {
      const leftName = (left.name || left.email || left.id).toLowerCase();
      const rightName = (right.name || right.email || right.id).toLowerCase();
      return leftName.localeCompare(rightName);
    });

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
      {accountActionMessage ? (
        <p style={{ marginTop: 12, color: accountActionMessage.toLowerCase().includes("failed") || accountActionMessage.toLowerCase().includes("cannot") ? "#fca5a5" : "#bfdbfe" }}>
          {accountActionMessage}
        </p>
      ) : null}

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
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>Account Manager</h2>
        <div
          style={{
            marginBottom: 18,
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backgroundColor: "rgba(9, 15, 25, 0.88)",
            display: "grid",
            gap: 10,
          }}
        >
          <input
            value={accountSearch}
            onChange={(event) => setAccountSearch(event.target.value)}
            placeholder="Search by name, username, phone, rank, flight, vehicle, or address"
            style={{ width: "100%" }}
          />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <select value={accountStatusFilter} onChange={(event) => setAccountStatusFilter(event.target.value)}>
              <option value="all">All Account States</option>
              <option value="active">Active Accounts</option>
              <option value="frozen">Frozen Accounts</option>
            </select>
            <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
              <option value="all">All Availability</option>
              <option value="available">Clocked In Drivers</option>
              <option value="unavailable">Not Clocked In</option>
            </select>
            <select value={flightFilter} onChange={(event) => setFlightFilter(event.target.value)}>
              <option value="all">All Flights</option>
              {uniqueFlights.map((flight) => (
                <option key={flight} value={flight}>
                  {flight}
                </option>
              ))}
            </select>
            <select value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
              <option value="all">All Ranks</option>
              {uniqueRanks.map((rank) => (
                <option key={rank} value={rank}>
                  {rank}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredUsers.length === 0 ? (
          <p>No accounts match the current filters.</p>
        ) : (
          filteredUsers.map((appUser) => {
            const vehicleSummary = [appUser.carColor, appUser.carYear, appUser.carMake, appUser.carModel].filter(Boolean).join(" ").trim();
            const addressSummary =
              appUser.homeAddress ||
              [appUser.homeStreet, appUser.homeCity, appUser.homeState, appUser.homeZip].filter(Boolean).join(", ");
            const photoUrl = appUser.driverPhotoUrl || appUser.riderPhotoUrl || "";
            const busy = actingOnUserId === appUser.id;

            return (
              <div
                key={appUser.id}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  backgroundColor: "rgba(9, 15, 25, 0.88)",
                  color: "#e5edf7",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 14,
                  boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    {photoUrl ? (
                      <Link href={photoUrl} target="_blank" style={{ display: "inline-flex" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt={`${appUser.name || appUser.email || "User"} profile`}
                          style={{ width: 64, height: 64, borderRadius: 999, objectFit: "cover", border: "1px solid rgba(148, 163, 184, 0.22)" }}
                        />
                      </Link>
                    ) : (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: "rgba(18, 37, 63, 0.72)",
                          color: "#dbeafe",
                          border: "1px solid rgba(96, 165, 250, 0.2)",
                          fontFamily: "var(--font-display)",
                          fontSize: "1.3rem",
                        }}
                      >
                        {(appUser.firstName || appUser.name || appUser.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 style={{ margin: 0 }}>{appUser.name || "Unnamed Account"}</h3>
                      <p style={{ margin: "6px 0 0", color: "#cbd5e1" }}>
                        {appUser.rank || "No rank"} {appUser.flight ? `• ${appUser.flight}` : ""}
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: appUser.accountFrozen ? "rgba(127, 29, 29, 0.92)" : "rgba(10, 51, 44, 0.88)", color: "white", fontSize: 12 }}>
                          {appUser.accountFrozen ? "Frozen" : "Active"}
                        </span>
                        <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: appUser.available ? "rgba(15, 118, 110, 0.9)" : "rgba(30, 41, 59, 0.92)", color: "white", fontSize: 12 }}>
                          {appUser.available ? "Clocked In" : "Not Clocked In"}
                        </span>
                        {isAdminEmail(appUser.email) ? (
                          <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: "rgba(91, 33, 182, 0.92)", color: "white", fontSize: 12 }}>
                            Admin
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleAccountAction(appUser.accountFrozen ? "unfreeze" : "freeze", appUser)}
                      disabled={busy || isAdminEmail(appUser.email)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: appUser.accountFrozen ? "#0f766e" : "#7f1d1d",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      {busy && actingOnUserId === appUser.id
                        ? "Working..."
                        : appUser.accountFrozen
                          ? "Unfreeze"
                          : "Freeze"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccountAction("delete", appUser)}
                      disabled={busy || isAdminEmail(appUser.email)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#b91c1c",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      {busy && actingOnUserId === appUser.id ? "Working..." : "Delete"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 16 }}>
                  <div>
                    <strong>Email:</strong> {appUser.email || "N/A"}
                  </div>
                  <div>
                    <strong>Username:</strong> {appUser.username || "N/A"}
                  </div>
                  <div>
                    <strong>Phone:</strong> {appUser.phone || "N/A"}
                  </div>
                  <div>
                    <strong>User ID:</strong> {appUser.id}
                  </div>
                  <div>
                    <strong>Flight:</strong> {appUser.flight || "N/A"}
                  </div>
                  <div>
                    <strong>Rank:</strong> {appUser.rank || "N/A"}
                  </div>
                  <div>
                    <strong>Location Services:</strong> {appUser.locationServicesEnabled === false ? "Off" : "On"}
                  </div>
                  <div>
                    <strong>Vehicle:</strong> {vehicleSummary || "N/A"}
                  </div>
                  <div>
                    <strong>Plate:</strong> {appUser.carPlate || "N/A"}
                  </div>
                  <div>
                    <strong>Address:</strong> {addressSummary || "N/A"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

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

              {(ride.status === "open" || ride.status === "accepted" || ride.status === "arrived" || ride.status === "picked_up") ? (
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

              {(ride.status === "accepted" || ride.status === "arrived" || ride.status === "picked_up") ? (
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
