"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import PushNotificationsCard from "../components/PushNotificationsCard";
import { auth, db } from "../../lib/firebase";
import { canDrive, getDriverReadinessIssues } from "../../lib/profile-readiness";
import {
  canDriverSeeRideDuringDispatchWindow,
  isRideDispatchExpanded,
  normalizeRideDispatchMode,
  type EmergencyRideDispatchMode,
} from "../../lib/ride-dispatch";
import { getRideStatusLabel } from "../../lib/ride-lifecycle";
import { getLatestActiveRideForDriver } from "../../lib/ride-state";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  runTransaction,
} from "firebase/firestore";

type Ride = {
  id: string;
  riderId?: string;
  riderName?: string;
  riderRank?: string;
  riderLastName?: string;
  riderPhone?: string;
  riderEmail?: string;
  riderPhotoUrl?: string;
  pickup: string;
  pickupLocationName?: string;
  pickupLocationAddress?: string;
  destination: string;
  status: string;
  isTestRide?: boolean;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
  riderFlight?: string;
  dispatchMode?: EmergencyRideDispatchMode;
  dispatchFlight?: string;
  dispatchExpandedAt?: {
    seconds?: number;
    nanoseconds?: number;
  } | null;
  acceptedBy?: string;
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
};

const ACTIVE_RIDE_STATUSES = ["accepted", "arrived", "picked_up"] as const;

type UserProfile = {
  name: string;
  phone: string;
  email: string;
  available: boolean;
  driverPhotoUrl?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  flight?: string;
};

function renderPickupSummary(ride: Ride) {
  return ride.pickupLocationName || ride.pickupLocationAddress || ride.pickup || "Pickup location pending";
}

function renderRiderName(ride: Ride) {
  return [ride.riderRank?.trim(), ride.riderLastName?.trim()].filter(Boolean).join(" ").trim() || ride.riderName || "Rider";
}

const dashboardCardStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.18)",
  padding: 14,
  marginBottom: 12,
  borderRadius: 12,
  backgroundColor: "rgba(9, 15, 25, 0.88)",
  color: "#e5edf7",
  boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
};

export default function DriverPage() {
  const router = useRouter();
  const expandedRideRequestIdsRef = useRef<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [openRides, setOpenRides] = useState<Ride[]>([]);
  const [acceptedRides, setAcceptedRides] = useState<Ride[]>([]);
  const [completedRideCount, setCompletedRideCount] = useState(0);
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
    if (!user || !profile?.available) {
      return;
    }

    const q = query(collection(db, "rides"), where("status", "==", "open"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rideList: Ride[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Ride, "id">),
      })).filter((ride) => !ride.isTestRide);
      setOpenRides(rideList);
    });

    return () => unsubscribe();
  }, [profile?.available, user]);

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
      setAcceptedRides(rideList);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "rides"), where("acceptedBy", "==", user.uid), where("status", "==", "completed"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompletedRideCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const visibleOpenRides = openRides.filter((ride) =>
    canDriverSeeRideDuringDispatchWindow({
      mode: ride.dispatchMode,
      rideFlight: ride.dispatchFlight || ride.riderFlight,
      driverFlight: profile?.flight,
      createdAt: ride.createdAt,
      expandedAt: ride.dispatchExpandedAt,
    })
  );

  useEffect(() => {
    if (!user || !profile?.available) {
      return;
    }

    const dueRides = openRides.filter((ride) => {
      if (expandedRideRequestIdsRef.current.has(ride.id)) {
        return false;
      }

      const dispatchMode = normalizeRideDispatchMode(ride.dispatchMode);

      if (dispatchMode === "all_drivers") {
        return false;
      }

      return isRideDispatchExpanded({
        mode: dispatchMode,
        createdAt: ride.createdAt,
        expandedAt: ride.dispatchExpandedAt,
      }) && !ride.dispatchExpandedAt;
    });

    if (dueRides.length === 0) {
      return;
    }

    void (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();

        if (!idToken) {
          return;
        }

        await Promise.all(
          dueRides.map(async (ride) => {
            expandedRideRequestIdsRef.current.add(ride.id);

            const response = await fetch("/api/notifications/ride-request", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                rideId: ride.id,
                phase: "expand",
              }),
            });

            if (!response.ok) {
              expandedRideRequestIdsRef.current.delete(ride.id);
            }
          })
        );
      } catch (error) {
        console.error("Ride request expansion check failed", error);
      }
    })();
  }, [openRides, profile?.available, user]);

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

    const driverReadinessIssues = getDriverReadinessIssues(profile);

    if (driverReadinessIssues.length > 0) {
      alert(driverReadinessIssues[0]);
      router.push("/account");
      return;
    }

    if (acceptedRides.length > 0) {
      alert("You already have an active ride.");
      router.replace(`/driver/active/${acceptedRides[0].id}`);
      return;
    }

    try {
      const existingRide = await getLatestActiveRideForDriver(user.uid);

      if (existingRide) {
        alert("You already have an active ride.");
        router.replace(`/driver/active/${existingRide.id}`);
        return;
      }

      const selectedRide = openRides.find((ride) => ride.id === rideId);
      const rideRef = doc(db, "rides", rideId);
      await runTransaction(db, async (transaction) => {
        const rideSnap = await transaction.get(rideRef);

        if (!rideSnap.exists()) {
          throw new Error("That ride is no longer available.");
        }

        const rideData = rideSnap.data() as Ride;

        if (rideData.status !== "open") {
          throw new Error("This ride was already accepted by another driver.");
        }

        if (rideData.acceptedBy) {
          throw new Error("This ride was already assigned.");
        }

        transaction.update(rideRef, {
          status: "accepted",
          acceptedBy: user.uid,
          driverName: profile.name,
          driverPhone: profile.phone,
          driverEmail: profile.email,
          driverPhotoUrl: profile.driverPhotoUrl || null,
          carYear: profile.carYear || null,
          carMake: profile.carMake || null,
          carModel: profile.carModel || null,
          carColor: profile.carColor || null,
          carPlate: profile.carPlate || null,
          acceptedAt: new Date(),
          arrivedAt: null,
          pickedUpAt: null,
          completedAt: null,
          canceledAt: null,
        });
      });

      try {
        await updateDoc(doc(db, "users", user.uid), {
          available: false,
          updatedAt: new Date(),
        });
      } catch (availabilityError) {
        console.error("Driver availability update failed after ride accept", availabilityError);
      }

      setProfile((current) => (current ? { ...current, available: false } : current));

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
          }),
        }).catch((error) => {
          console.error("Ride accepted notification failed", error);
        });
      }

      router.replace(`/driver/active/${rideId}`);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error accepting ride");
    }
  };

  const clockOut = async () => {
    if (!user) return;

    try {
      const existingRide = await getLatestActiveRideForDriver(user.uid);

      if (existingRide) {
        alert("You can't clock out during an active ride.");
        router.replace(`/driver/active/${existingRide.id}`);
        return;
      }

      await updateDoc(doc(db, "users", user.uid), {
        available: false,
      });
      setProfile((current) => (current ? { ...current, available: false } : current));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to clock out");
    }
  };

  const clockIn = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        available: true,
      });
      setProfile((current) => (current ? { ...current, available: true } : current));
    } catch (error) {
      console.error(error);
      alert("Failed to clock in");
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Driver Dashboard" caption="Checking your availability and open ride queue." />
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <p>You need to log in first.</p>
      </main>
    );
  }

  const isClockedIn = Boolean(profile?.available);
  const statusTone = isClockedIn
    ? {
        label: "Clocked In",
        detail: "You are available to receive ride requests.",
        background: "rgba(15, 118, 110, 0.18)",
        border: "1px solid rgba(45, 212, 191, 0.28)",
        color: "#99f6e4",
      }
    : {
        label: "Clocked Out",
        detail: "You are currently offline and not receiving ride requests.",
        background: "rgba(30, 41, 59, 0.72)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        color: "#cbd5e1",
      };

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink style={{ marginRight: 12 }} />
      <h1 style={{ marginTop: 20, marginBottom: 8 }}>Driver Dashboard</h1>

      <p style={{ maxWidth: 720, color: "#cbd5e1", marginTop: 0 }}>
        Review your availability, active assignments, and open requests from one operational view.
      </p>

      <section
        style={{
          ...dashboardCardStyle,
          maxWidth: 920,
          padding: 18,
          borderRadius: 16,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "start" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong style={{ fontSize: "1.1rem" }}>{profile?.name || user.email}</strong>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "5px 10px",
                  borderRadius: 999,
                  backgroundColor: statusTone.background,
                  border: statusTone.border,
                  color: statusTone.color,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                {statusTone.label}
              </span>
            </div>
            <p style={{ margin: 0, color: "#94a3b8" }}>{statusTone.detail}</p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!isClockedIn ? (
              <button
                onClick={clockIn}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#0f766e",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Clock In
              </button>
            ) : null}

            {isClockedIn ? (
              <button
                onClick={clockOut}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#7f1d1d",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Clock Out
              </button>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "Open Requests", value: visibleOpenRides.length, note: isClockedIn ? "Visible in your queue" : "Clock in to receive" },
            { label: "Active Rides", value: acceptedRides.length, note: acceptedRides.length > 0 ? "Ready to continue" : "No current assignment" },
            { label: "Rides Given", value: completedRideCount, note: "Completed driver trips" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                borderRadius: 14,
                padding: 14,
                backgroundColor: "rgba(15, 23, 42, 0.72)",
                border: "1px solid rgba(148, 163, 184, 0.16)",
              }}
            >
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>{stat.label}</p>
              <p style={{ margin: "8px 0 4px", fontSize: "1.8rem", fontWeight: 700, lineHeight: 1 }}>{stat.value}</p>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>{stat.note}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 20, maxWidth: 640 }}>
        <PushNotificationsCard />
      </div>

      {!canDrive(profile) ? (
        <div
          style={{
            marginTop: 20,
            maxWidth: 640,
            padding: 18,
            borderRadius: 14,
            border: "1px solid rgba(248, 113, 113, 0.24)",
            backgroundColor: "rgba(69, 10, 10, 0.3)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Complete Driver Setup</h2>
          <p style={{ marginTop: 0, color: "#fecaca" }}>
            Driver access is almost ready. Finish the items below to accept ride requests.
          </p>
          {getDriverReadinessIssues(profile).map((issue) => (
            <p key={issue} style={{ marginBottom: 10 }}>
              {issue}
            </p>
          ))}
          <button type="button" onClick={() => router.push("/account")}>
            Open Account Settings
          </button>
        </div>
      ) : null}

      <div style={{ marginTop: 30 }}>
        <h3 style={{ marginBottom: 10 }}>Active Ride Assignments</h3>

        {acceptedRides.length === 0 ? (
          <div style={{ ...dashboardCardStyle, maxWidth: 720 }}>
            <p style={{ margin: 0, color: "#94a3b8" }}>No active rides are assigned to you right now.</p>
          </div>
        ) : (
          acceptedRides.map((ride) => (
            <div
              key={ride.id}
              style={{
                ...dashboardCardStyle,
                border: "1px solid rgba(45, 212, 191, 0.22)",
                borderRadius: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {ride.riderPhotoUrl ? (
                  <Image
                    src={ride.riderPhotoUrl}
                    alt={`${renderRiderName(ride)} profile`}
                    width={68}
                    height={68}
                    unoptimized
                    style={{
                      width: 68,
                      height: 68,
                      objectFit: "cover",
                      borderRadius: 999,
                      border: "1px solid rgba(96, 165, 250, 0.22)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: "rgba(18, 37, 63, 0.72)",
                      color: "#dbeafe",
                      border: "1px solid rgba(96, 165, 250, 0.2)",
                      fontFamily: "var(--font-display)",
                      fontSize: "1.35rem",
                    }}
                  >
                    {renderRiderName(ride).charAt(0).toUpperCase()}
                  </div>
                )}

                <div style={{ display: "grid", gap: 6 }}>
                  <p style={{ margin: 0, fontSize: "1.05rem" }}>
                    <strong>{renderRiderName(ride)}</strong>
                  </p>
                  <p style={{ margin: 0, color: "#94a3b8" }}>{getRideStatusLabel(ride.status)}</p>
                  <p style={{ margin: 0 }}>
                    <strong>Pickup:</strong> {renderPickupSummary(ride)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push(`/driver/active/${ride.id}`)}
                style={{
                  padding: "9px 14px",
                  marginTop: 14,
                  backgroundColor: "#0f766e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Open Active Ride
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 30 }}>
        <h3 style={{ marginBottom: 10 }}>Open Ride Requests</h3>

        {!isClockedIn ? (
          <div style={{ ...dashboardCardStyle, maxWidth: 720 }}>
            <p style={{ margin: 0, color: "#94a3b8" }}>Clock in to view open ride requests and receive alerts.</p>
          </div>
        ) : visibleOpenRides.length === 0 ? (
          <div style={{ ...dashboardCardStyle, maxWidth: 720 }}>
            <p style={{ margin: 0, color: "#94a3b8" }}>No open ride requests are waiting in your queue right now.</p>
          </div>
        ) : (
          visibleOpenRides.map((ride) => (
            <div key={ride.id} style={{ ...dashboardCardStyle, borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {ride.riderPhotoUrl ? (
                  <Image
                    src={ride.riderPhotoUrl}
                    alt={`${renderRiderName(ride)} profile`}
                    width={68}
                    height={68}
                    unoptimized
                    style={{
                      width: 68,
                      height: 68,
                      objectFit: "cover",
                      borderRadius: 999,
                      border: "1px solid rgba(96, 165, 250, 0.22)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: "rgba(18, 37, 63, 0.72)",
                      color: "#dbeafe",
                      border: "1px solid rgba(96, 165, 250, 0.2)",
                      fontFamily: "var(--font-display)",
                      fontSize: "1.35rem",
                    }}
                  >
                    {renderRiderName(ride).charAt(0).toUpperCase()}
                  </div>
                )}

                <div style={{ display: "grid", gap: 6 }}>
                  <p style={{ margin: 0, fontSize: "1.05rem" }}>
                    <strong>{renderRiderName(ride)}</strong>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Pickup:</strong> {renderPickupSummary(ride)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => acceptRide(ride.id)}
                style={{
                  padding: "9px 14px",
                  marginTop: 14,
                  backgroundColor: "#0f766e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Accept Request
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
