"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

type Ride = {
  id: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  pickup?: string;
  destination?: string;
  status?: string;
  acceptedBy?: string;
  riderLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
  driverLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

function buildMapsUrl(ride: Ride, userAgent: string) {
  const latitude = ride.riderLocation?.latitude;
  const longitude = ride.riderLocation?.longitude;
  const isIPhone = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const pickupLabel = ride.pickup ? encodeURIComponent(ride.pickup) : "Pickup";

  if (latitude != null && longitude != null) {
    if (isIPhone) {
      return `maps://?daddr=${latitude},${longitude}&q=${pickupLabel}`;
    }

    if (isAndroid) {
      return `geo:${latitude},${longitude}?q=${latitude},${longitude}(${pickupLabel})`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  if (ride.pickup) {
    if (isIPhone) {
      return `maps://?q=${encodeURIComponent(ride.pickup)}`;
    }

    if (isAndroid) {
      return `geo:0,0?q=${encodeURIComponent(ride.pickup)}`;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ride.pickup)}`;
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
    if (!user || !ride || ride.status !== "accepted" || ride.acceptedBy !== user.uid) {
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

  const completeRide = async () => {
    if (!ride) return;

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

  if (!ride || ride.status !== "accepted" || ride.acceptedBy !== user.uid) {
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

      <h1 style={{ marginTop: 20 }}>Active Ride</h1>

      <div
        style={{
          border: "1px solid #0f766e",
          padding: 16,
          borderRadius: 12,
          backgroundColor: "#ecfeff",
          color: "#0f172a",
          maxWidth: 560,
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
              ? "Your phone will prompt to open its maps app with the rider location ready."
              : "Use the button above to open turn-by-turn directions."
            : "No GPS coordinates available. Use the pickup details above."}
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
