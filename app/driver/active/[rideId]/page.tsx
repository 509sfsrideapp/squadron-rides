"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppLoadingState from "../../../components/AppLoadingState";
import LiveRideMap, { type MapPoint } from "../../../components/LiveRideMap";
import { auth, db } from "../../../../lib/firebase";
import { formatRideTimestamp, getRideLifecycleSteps, getRideStatusLabel } from "../../../../lib/ride-lifecycle";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";

type Ride = {
  id: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  riderPhotoUrl?: string;
  pickup?: string;
  pickupLocationName?: string;
  pickupLocationAddress?: string;
  destination?: string;
  emergencySavedAddress?: string;
  status?: string;
  acceptedBy?: string;
  driverName?: string;
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
  driverPhone?: string;
  riderId?: string;
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

type DriverProfile = {
  name?: string;
  phone?: string;
  email?: string;
  driverPhotoUrl?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  locationServicesEnabled?: boolean;
};

type RiderProfile = {
  riderPhotoUrl?: string;
  driverPhotoUrl?: string;
};

const ACTIVE_RIDE_STATUSES = ["accepted", "arrived", "picked_up"] as const;

function isPlaceholderDestination(destination?: string | null) {
  const normalized = destination?.trim().toLowerCase() || "";
  return normalized === "" || normalized === "destination to be confirmed with rider";
}

function resolveDestinationLabel(ride: Ride) {
  if (!isPlaceholderDestination(ride.destination)) {
    return ride.destination?.trim() || "";
  }

  return ride.emergencySavedAddress?.trim() || "";
}

function buildMapsUrl(ride: Ride, userAgent: string) {
  const isIPhone = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const navigatingToDestination = ride.status === "picked_up";
  const targetLabel = navigatingToDestination
    ? resolveDestinationLabel(ride) || "Destination"
    : ride.pickup?.trim() || "Pickup";
  const targetLatitude = navigatingToDestination ? undefined : ride.riderLocation?.latitude;
  const targetLongitude = navigatingToDestination ? undefined : ride.riderLocation?.longitude;
  const encodedLabel = encodeURIComponent(targetLabel);

  if (targetLatitude != null && targetLongitude != null) {
    if (isIPhone) {
      return `maps://?daddr=${targetLatitude},${targetLongitude}`;
    }

    if (isAndroid) {
      return `geo:${targetLatitude},${targetLongitude}?q=${targetLatitude},${targetLongitude}`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${targetLatitude},${targetLongitude}`;
  }

  if (targetLabel) {
    if (isIPhone) {
      return `maps://?q=${encodedLabel}`;
    }

    if (isAndroid) {
      return `geo:0,0?q=${encodedLabel}`;
    }

    return navigatingToDestination
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodedLabel}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedLabel}`;
  }

  return null;
}

export default function ActiveRidePage(props: PageProps<"/driver/active/[rideId]">) {
  const router = useRouter();
  const { rideId } = use(props.params);
  const geolocationAvailable = typeof window !== "undefined" && "geolocation" in navigator;
  const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : "";
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const [user, setUser] = useState<User | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const launchedNavigationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "rides", rideId), (snapshot) => {
      if (!snapshot.exists()) {
        setRide(null);
        setLoading(false);
        return;
      }

      const nextRide = {
        id: snapshot.id,
        ...(snapshot.data() as Omit<Ride, "id">),
      };

      setRide(nextRide);
      setLoading(false);

      if (nextRide.status === "completed" || nextRide.status === "canceled") {
        router.replace("/driver");
      }
    });

    return () => unsubscribe();
  }, [rideId, router, user]);

  useEffect(() => {
    if (!user || !ride) return;

    if (ride.acceptedBy && ride.acceptedBy !== user.uid) {
      router.replace("/driver");
    }
  }, [ride, router, user]);

  useEffect(() => {
    if (!user || !ride || ride.acceptedBy !== user.uid) return;

    if (ride.status !== "canceled" && ride.status !== "completed") {
      return;
    }

    void updateDoc(doc(db, "users", user.uid), {
      available: true,
      updatedAt: new Date(),
    }).catch((error) => {
      console.error(error);
    });
  }, [ride, user]);

  useEffect(() => {
    if (!user) return;

    const loadLocationPreference = async () => {
      try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));

        if (!profileSnap.exists()) return;

        const profile = profileSnap.data() as DriverProfile;
        setLocationServicesEnabled(profile.locationServicesEnabled !== false);
      } catch (error) {
        console.error(error);
      }
    };

    void loadLocationPreference();
  }, [user]);

  useEffect(() => {
    if (!user || !ride || ride.acceptedBy !== user.uid) return;

    const missingDriverDetails =
      !ride.driverPhotoUrl ||
      !ride.driverName ||
      !ride.driverPhone ||
      !ride.driverEmail ||
      !ride.carYear ||
      !ride.carMake ||
      !ride.carModel ||
      !ride.carColor ||
      !ride.carPlate;

    if (!missingDriverDetails) return;

    const syncDriverProfile = async () => {
      try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));

        if (!profileSnap.exists()) return;

        const profile = profileSnap.data() as DriverProfile;

        await updateDoc(doc(db, "rides", ride.id), {
          driverName: ride.driverName || profile.name || null,
          driverPhone: ride.driverPhone || profile.phone || null,
          driverEmail: ride.driverEmail || profile.email || null,
          driverPhotoUrl: ride.driverPhotoUrl || profile.driverPhotoUrl || null,
          carYear: ride.carYear || profile.carYear || null,
          carMake: ride.carMake || profile.carMake || null,
          carModel: ride.carModel || profile.carModel || null,
          carColor: ride.carColor || profile.carColor || null,
          carPlate: ride.carPlate || profile.carPlate || null,
        });
      } catch (error) {
        console.error(error);
      }
    };

    void syncDriverProfile();
  }, [ride, user]);

  useEffect(() => {
    if (!user || !ride || ride.acceptedBy !== user.uid || ride.riderPhotoUrl || !ride.riderId) return;

    const syncRiderPhoto = async () => {
      try {
        const riderSnap = await getDoc(doc(db, "users", ride.riderId as string));

        if (!riderSnap.exists()) return;

        const riderProfile = riderSnap.data() as RiderProfile;

        const riderPhotoUrl = riderProfile.driverPhotoUrl || riderProfile.riderPhotoUrl;

        if (!riderPhotoUrl) return;

        await updateDoc(doc(db, "rides", ride.id), {
          riderPhotoUrl,
        });
      } catch (error) {
        console.error(error);
      }
    };

    void syncRiderPhoto();
  }, [ride, user]);

  const mapsUrl = useMemo(() => (ride ? buildMapsUrl(ride, userAgent) : null), [ride, userAgent]);
  const lifecycleSteps = useMemo(() => (ride ? getRideLifecycleSteps(ride) : []), [ride]);
  const riderLocation: MapPoint | null =
    ride?.riderLocation?.latitude != null && ride.riderLocation?.longitude != null
      ? {
          latitude: ride.riderLocation.latitude,
          longitude: ride.riderLocation.longitude,
        }
      : null;
  const liveDriverLocation: MapPoint | null =
    ride?.driverLocation?.latitude != null && ride.driverLocation?.longitude != null
      ? {
          latitude: ride.driverLocation.latitude,
          longitude: ride.driverLocation.longitude,
        }
      : null;
  const shouldAutoLaunchMaps =
    Boolean(ride && mapsUrl && isMobileDevice) &&
    ACTIVE_RIDE_STATUSES.includes(ride?.status as (typeof ACTIVE_RIDE_STATUSES)[number]);

  useEffect(() => {
    if (!ride || !mapsUrl || !shouldAutoLaunchMaps) return;
    const navigationKey = `${ride.id}:${ride.status}:${mapsUrl}`;
    if (launchedNavigationKeyRef.current === navigationKey) return;

    launchedNavigationKeyRef.current = navigationKey;
    const timeoutId = window.setTimeout(() => {
      window.location.href = mapsUrl;
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [mapsUrl, ride, shouldAutoLaunchMaps]);

  const updateRideStage = async (status: "arrived" | "picked_up") => {
    if (!ride || !user) return;

    try {
      await runTransaction(db, async (transaction) => {
        const rideRef = doc(db, "rides", ride.id);
        const rideSnap = await transaction.get(rideRef);

        if (!rideSnap.exists()) {
          throw new Error("This ride is no longer available.");
        }

        const currentRide = rideSnap.data() as Ride;

        if (currentRide.acceptedBy !== user.uid) {
          throw new Error("This ride is assigned to another driver.");
        }

        if (status === "arrived" && currentRide.status !== "accepted") {
          throw new Error("You can only mark the ride as arrived after it has been accepted.");
        }

        if (status === "picked_up" && currentRide.status !== "arrived") {
          throw new Error("Mark the driver as arrived before moving to picked up.");
        }

        transaction.update(rideRef, status === "arrived"
          ? {
              status,
              arrivedAt: new Date(),
            }
          : {
              status,
              pickedUpAt: new Date(),
              destination: resolveDestinationLabel(currentRide) || currentRide.destination || null,
            });
      });

      if (status === "arrived") {
        const idToken = await auth.currentUser?.getIdToken();

        if (idToken && ride.riderId) {
          void fetch("/api/notifications/ride-update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              rideId: ride.id,
              riderId: ride.riderId,
              event: "arrived",
            }),
          }).catch((error) => {
            console.error("Ride arrived notification failed", error);
          });
        }
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : `Error updating ride to ${status}.`);
    }
  };

  const completeRide = async () => {
    if (!ride || !user) return;

    const confirmed = window.confirm("Mark this ride as completed?");
    if (!confirmed) return;

    try {
      await runTransaction(db, async (transaction) => {
        const rideRef = doc(db, "rides", ride.id);
        const driverRef = doc(db, "users", user.uid);
        const rideSnap = await transaction.get(rideRef);

        if (!rideSnap.exists()) {
          throw new Error("This ride is no longer available.");
        }

        const currentRide = rideSnap.data() as Ride;

        if (currentRide.acceptedBy !== user.uid) {
          throw new Error("This ride is assigned to another driver.");
        }

        if (currentRide.status !== "picked_up") {
          throw new Error("A ride must be marked as picked up before it can be completed.");
        }

        transaction.update(rideRef, {
          status: "completed",
          completedAt: new Date(),
          driverLocation: currentRide.driverLocation ?? null,
        });
        transaction.update(driverRef, {
          available: true,
          updatedAt: new Date(),
        });
      });
      alert("Ride completed");
      router.replace("/driver");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error completing ride");
    }
  };

  const relaunchMaps = () => {
    if (!mapsUrl) {
      alert("No rider location is available for maps.");
      return;
    }

    window.location.href = mapsUrl;
  };

  const copyPickupAddress = async () => {
    const value = ride?.pickupLocationAddress || ride?.pickupLocationName || ride?.pickup || "";

    if (!value) {
      setCopyStatus("No pickup address to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("Pickup copied.");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch (error) {
      console.error(error);
      setCopyStatus("Could not copy pickup.");
    }
  };

  const riderPhone = ride?.riderPhone ?? null;
  const riderCallHref = riderPhone ? `tel:${riderPhone}` : null;
  const riderTextHref = riderPhone ? `sms:${riderPhone}` : null;
  const displayedDriverLocationStatus = locationServicesEnabled
    ? geolocationAvailable
      ? "Live driver location sharing is temporarily turned off while stability fixes are in progress."
      : "This browser cannot share live driver location."
    : "Location services are turned off in Account Settings.";

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Active Ride" caption="Building your live driver mission card now." />
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

  if (
    !ride ||
    !ACTIVE_RIDE_STATUSES.includes(ride.status as (typeof ACTIVE_RIDE_STATUSES)[number]) ||
    ride.acceptedBy !== user.uid
  ) {
    return (
      <main style={{ padding: 20 }}>
        <Link
          href="/driver"
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
          Driver Dashboard
        </Link>
        <p>This active ride is not available.</p>
      </main>
    );
  }

  const statusActionLabel =
    ride.status === "arrived" ? "Picked Up" : ride.status === "accepted" ? "I'm Here" : null;
  const handleStatusAction =
    ride.status === "arrived"
      ? () => updateRideStage("picked_up")
      : ride.status === "accepted"
        ? () => updateRideStage("arrived")
        : null;

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ marginTop: 20, marginBottom: 24, textAlign: "center" }}>Active Ride</h1>

      <div
        style={{
          border: "1px solid rgba(45, 212, 191, 0.22)",
          padding: 16,
          borderRadius: 12,
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          color: "#e5edf7",
          maxWidth: 640,
          margin: "0 auto",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          {ride.riderPhotoUrl ? (
            <Image
              src={ride.riderPhotoUrl}
              alt={`${ride.riderName || "Rider"} profile`}
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
              {ride.riderName ? ride.riderName.charAt(0).toUpperCase() : "?"}
            </div>
          )}

          <div style={{ flex: "1 1 240px" }}>
            <p style={{ margin: 0, color: "#8ea1b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Rider
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "2rem", lineHeight: 1.05, fontFamily: "var(--font-display)", color: "#f8fbff" }}>
              {ride.riderName || "N/A"}
            </p>
            <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>
              {ride.riderPhone || "No rider phone on file"}
            </p>
          </div>
        </div>

        <p>
          <strong>Status:</strong> {getRideStatusLabel(ride.status)}
        </p>
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
          <p style={{ margin: "8px 0 0", color: "#facc15", fontSize: "0.95rem" }}>
            Resolved pickup location may be slightly inaccurate. It&apos;s recommended you call your rider when getting near to verify the pickup location.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: "1.45rem", lineHeight: 1.1, fontFamily: "var(--font-display)", color: "#f8fbff" }}>
            {ride.pickupLocationName || ride.pickup || "Not resolved yet"}
          </p>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>
            {ride.pickupLocationAddress || ride.pickup || "No address available yet"}
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={copyPickupAddress}
              style={{
                padding: "10px 14px",
                backgroundColor: "#111827",
                color: "white",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Copy Address
            </button>
            {copyStatus ? <span style={{ color: "#cbd5e1", alignSelf: "center" }}>{copyStatus}</span> : null}
          </div>
        </div>
        <p>
          <strong>Driver Location:</strong>{" "}
          {displayedDriverLocationStatus}
        </p>

        <div
          style={{
            marginTop: 18,
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
      </div>

      <div style={{ marginTop: 20, maxWidth: 640, marginInline: "auto" }}>
        <button
          onClick={relaunchMaps}
          style={{
            width: "100%",
            padding: "18px 20px",
            backgroundColor: "#0f766e",
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: "1.05rem",
            fontWeight: 700,
          }}
        >
          Open Maps
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          maxWidth: 640,
          marginInline: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {riderCallHref ? (
          <a
            href={riderCallHref}
            style={{
              display: "inline-block",
              padding: "16px 16px",
              backgroundColor: "#1d4ed8",
              color: "white",
              textDecoration: "none",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            Call Rider
          </a>
        ) : (
          <div />
        )}

        {riderTextHref ? (
          <a
            href={riderTextHref}
            style={{
              display: "inline-block",
              padding: "16px 16px",
              backgroundColor: "#0f766e",
              color: "white",
              textDecoration: "none",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            Text Rider
          </a>
        ) : (
          <div />
        )}
      </div>

      <div
        style={{
          marginTop: 14,
          maxWidth: 640,
          marginInline: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {statusActionLabel && handleStatusAction ? (
          <button
            onClick={handleStatusAction}
            style={{
              padding: "16px 16px",
              backgroundColor: ride.status === "arrived" ? "#1d4ed8" : "#b45309",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {statusActionLabel}
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={completeRide}
          style={{
            padding: "16px 16px",
            backgroundColor: "#7f1d1d",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Complete Ride
        </button>
      </div>

      <LiveRideMap
        riderLocation={riderLocation}
        driverLocation={liveDriverLocation}
        title="Live Ride Map"
        emptyLabel="Pickup coordinates are not available yet, so the live map cannot be drawn."
        footerLabel={
          liveDriverLocation
            ? "Blue is your live driver location. Orange is the rider pickup spot."
            : "Waiting for driver location to appear on the live map."
        }
        maxWidth={640}
      />
    </main>
  );
}
