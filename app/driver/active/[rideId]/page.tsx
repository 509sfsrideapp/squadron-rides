"use client";

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
  pickup?: string;
  destination?: string;
  status?: string;
  acceptedBy?: string;
  driverName?: string;
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
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
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
  const launchedRideIdRef = useRef<string | null>(null);
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

  const mapsUrl = useMemo(() => (ride ? buildMapsUrl(ride, userAgent) : null), [ride, userAgent]);

  useEffect(() => {
    if (!ride || !mapsUrl || !isMobileDevice) return;
    if (launchedRideIdRef.current === ride.id) return;

    launchedRideIdRef.current = ride.id;
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
          marginRight: 12,
        }}
      >
        Back to Driver Dashboard
      </Link>

      <button
        onClick={relaunchMaps}
        style={{
          padding: "8px 14px",
          backgroundColor: "#0f766e",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Open Maps
      </button>

      {riderCallHref ? (
        <a
          href={riderCallHref}
          style={{
            display: "inline-block",
            marginLeft: 12,
            padding: "8px 14px",
            backgroundColor: "#1d4ed8",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Call Rider
        </a>
      ) : null}

      {riderTextHref ? (
        <a
          href={riderTextHref}
          style={{
            display: "inline-block",
            marginLeft: 12,
            padding: "8px 14px",
            backgroundColor: "#0f766e",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Text Rider
        </a>
      ) : null}

      <h1 style={{ marginTop: 20 }}>Active Ride</h1>

      <div
        style={{
          border: "1px solid rgba(45, 212, 191, 0.22)",
          padding: 16,
          borderRadius: 12,
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          color: "#e5edf7",
          maxWidth: 560,
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
          <strong>Email:</strong> {ride.riderEmail || "N/A"}
        </p>
        <p>
          <strong>Stage:</strong> {ride.status}
        </p>
        <p>
          <strong>Pickup:</strong> {ride.pickup || "N/A"}
        </p>
        <p>
          <strong>Destination:</strong> {ride.destination || "N/A"}
        </p>
        <p>
          <strong>GPS:</strong>{" "}
          {ride.riderLocation?.latitude != null && ride.riderLocation?.longitude != null
            ? `${ride.riderLocation.latitude.toFixed(6)}, ${ride.riderLocation.longitude.toFixed(6)}`
            : "Not shared"}
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
        {driverCoordinates ? (
          <p>
            <strong>Your GPS:</strong> {driverCoordinates.latitude.toFixed(6)},{" "}
            {driverCoordinates.longitude.toFixed(6)}
          </p>
        ) : null}
      </div>

      <div style={{ marginTop: 20 }}>
        {ride.status === "accepted" ? (
          <button
            onClick={() => updateRideStage("arrived")}
            style={{
              padding: "10px 16px",
              backgroundColor: "#b45309",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              marginRight: 12,
            }}
          >
            I&apos;m Here
          </button>
        ) : null}

        {ride.status === "arrived" ? (
          <button
            onClick={() => updateRideStage("picked_up")}
            style={{
              padding: "10px 16px",
              backgroundColor: "#1d4ed8",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              marginRight: 12,
            }}
          >
            Picked Up
          </button>
        ) : null}

        <button
          onClick={completeRide}
          style={{
            padding: "10px 16px",
            backgroundColor: "#7f1d1d",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Complete Ride
        </button>
      </div>
    </main>
  );
}
