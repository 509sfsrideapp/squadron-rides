"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";

type Ride = {
  id: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  riderPhotoUrl?: string;
  pickup?: string;
  destination?: string;
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
};

type RiderProfile = {
  driverPhotoUrl?: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const ACTIVE_RIDE_STATUSES = ["accepted", "arrived", "picked_up"] as const;

function buildMapsUrl(ride: Ride, userAgent: string) {
  const isIPhone = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const navigatingToDestination = ride.status === "picked_up";
  const targetLabel = navigatingToDestination
    ? ride.destination?.trim() || "Destination"
    : ride.pickup?.trim() || "Pickup";
  const targetLatitude = navigatingToDestination ? undefined : ride.riderLocation?.latitude;
  const targetLongitude = navigatingToDestination ? undefined : ride.riderLocation?.longitude;
  const encodedLabel = encodeURIComponent(targetLabel);

  if (targetLatitude != null && targetLongitude != null) {
    if (isIPhone) {
      return `maps://?daddr=${targetLatitude},${targetLongitude}&q=${encodedLabel}`;
    }

    if (isAndroid) {
      return `geo:${targetLatitude},${targetLongitude}?q=${targetLatitude},${targetLongitude}(${encodedLabel})`;
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
  const [driverLocationStatus, setDriverLocationStatus] = useState("Waiting to start driver location sharing...");
  const [driverCoordinates, setDriverCoordinates] = useState<Coordinates | null>(null);
  const launchedNavigationKeyRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ latitude: number; longitude: number; sentAt: number } | null>(null);

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

      if (nextRide.status === "completed") {
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

        if (!riderProfile.driverPhotoUrl) return;

        await updateDoc(doc(db, "rides", ride.id), {
          riderPhotoUrl: riderProfile.driverPhotoUrl,
        });
      } catch (error) {
        console.error(error);
      }
    };

    void syncRiderPhoto();
  }, [ride, user]);

  const mapsUrl = useMemo(() => (ride ? buildMapsUrl(ride, userAgent) : null), [ride, userAgent]);

  useEffect(() => {
    if (!ride || !mapsUrl || !isMobileDevice) return;
    const navigationKey = `${ride.id}:${ride.status}:${mapsUrl}`;
    if (launchedNavigationKeyRef.current === navigationKey) return;

    launchedNavigationKeyRef.current = navigationKey;
    const timeoutId = window.setTimeout(() => {
      window.location.href = mapsUrl;
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [isMobileDevice, mapsUrl, ride]);

  useEffect(() => {
    if (
      !user ||
      !ride ||
      !ACTIVE_RIDE_STATUSES.includes(ride.status as (typeof ACTIVE_RIDE_STATUSES)[number]) ||
      ride.acceptedBy !== user.uid
    ) {
      return;
    }

    if (!geolocationAvailable) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const nextCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setDriverCoordinates(nextCoordinates);

        const now = Date.now();
        const lastSent = lastSentRef.current;
        const latitudeChanged = !lastSent || Math.abs(lastSent.latitude - nextCoordinates.latitude) > 0.0001;
        const longitudeChanged = !lastSent || Math.abs(lastSent.longitude - nextCoordinates.longitude) > 0.0001;
        const enoughTimePassed = !lastSent || now - lastSent.sentAt > 15000;

        if (!latitudeChanged && !longitudeChanged && !enoughTimePassed) {
          setDriverLocationStatus("Live driver location is active.");
          return;
        }

        try {
          await updateDoc(doc(db, "rides", ride.id), {
            driverLocation: nextCoordinates,
            driverLocationUpdatedAt: new Date(),
          });
          lastSentRef.current = { ...nextCoordinates, sentAt: now };
          setDriverLocationStatus("Live driver location is active.");
        } catch (error) {
          console.error(error);
          setDriverLocationStatus("We could not update live driver location.");
        }
      },
      () => {
        setDriverLocationStatus("Driver location permission was denied or unavailable.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [geolocationAvailable, ride, user]);

  const updateRideStage = async (status: "arrived" | "picked_up") => {
    if (!ride) return;

    const updates =
      status === "arrived"
        ? {
            status,
            arrivedAt: new Date(),
          }
        : {
            status,
            pickedUpAt: new Date(),
          };

    try {
      await updateDoc(doc(db, "rides", ride.id), updates);

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
      alert(`Error updating ride to ${status}.`);
    }
  };

  const completeRide = async () => {
    if (!ride) return;

    const confirmed = window.confirm("Mark this ride as completed?");
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "rides", ride.id), {
        status: "completed",
        completedAt: new Date(),
        driverLocation: driverCoordinates ?? ride.driverLocation ?? null,
      });
      alert("Ride completed");
      router.replace("/driver");
    } catch (error) {
      console.error(error);
      alert("Error completing ride");
    }
  };

  const relaunchMaps = () => {
    if (!mapsUrl) {
      alert("No rider location is available for maps.");
      return;
    }

    window.location.href = mapsUrl;
  };

  const riderPhone = ride?.riderPhone ?? null;
  const riderCallHref = riderPhone ? `tel:${riderPhone}` : null;
  const riderTextHref = riderPhone ? `sms:${riderPhone}` : null;

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <p>Loading ride...</p>
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
          <strong>Pickup:</strong> {ride.pickup || "N/A"}
        </p>
        <p>
          <strong>Destination:</strong> {ride.destination || "N/A"}
        </p>
        <p>
          <strong>Navigation:</strong>{" "}
          {mapsUrl
            ? isMobileDevice
              ? ride.status === "picked_up"
                ? "Your phone will prompt to open its maps app with the destination ready."
                : "Your phone will prompt to open its maps app with the rider location ready."
              : ride.status === "picked_up"
                ? "Use the button above to open directions to the destination."
                : "Use the button above to open turn-by-turn directions to pickup."
            : "No map destination is available. Use the ride details above."}
        </p>
        <p>
          <strong>Driver Location:</strong>{" "}
          {geolocationAvailable ? driverLocationStatus : "This browser cannot share live driver location."}
        </p>
      </div>

      <div style={{ marginTop: 20, maxWidth: 640, marginInline: "auto" }}>
        <button
          onClick={relaunchMaps}
          style={{
            width: "100%",
            padding: "16px 18px",
            backgroundColor: "#0f766e",
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: "1rem",
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
              padding: "14px 16px",
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
              padding: "14px 16px",
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
              padding: "14px 16px",
              backgroundColor: ride.status === "arrived" ? "#1d4ed8" : "#b45309",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
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
            padding: "14px 16px",
            backgroundColor: "#7f1d1d",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Complete Ride
        </button>
      </div>
    </main>
  );
}
