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
};

function buildMapsUrl(ride: Ride) {
  const latitude = ride.riderLocation?.latitude;
  const longitude = ride.riderLocation?.longitude;

  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  if (ride.pickup) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ride.pickup)}`;
  }

  return null;
}

export default function ActiveRidePage(props: PageProps<"/driver/active/[rideId]">) {
  const router = useRouter();
  const { rideId } = use(props.params);
  const [user, setUser] = useState<User | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const launchedRideIdRef = useRef<string | null>(null);

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

  const mapsUrl = useMemo(() => (ride ? buildMapsUrl(ride) : null), [ride]);

  useEffect(() => {
    if (!ride || !mapsUrl) return;
    if (launchedRideIdRef.current === ride.id) return;

    launchedRideIdRef.current = ride.id;
    const timeoutId = window.setTimeout(() => {
      window.location.href = mapsUrl;
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [mapsUrl, ride]);

  const completeRide = async () => {
    if (!ride) return;

    try {
      await updateDoc(doc(db, "rides", ride.id), {
        status: "completed",
        completedAt: new Date(),
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
            ? "Maps will open automatically for turn-by-turn directions."
            : "No GPS coordinates available. Use the pickup details above."}
        </p>
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
