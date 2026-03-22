"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type UserProfile = {
  name: string;
  username?: string;
  phone: string;
  email: string;
  homeAddress?: string;
  available: boolean;
};

type ActiveRide = {
  id: string;
  status?: string;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
};

const ACTIVE_RIDE_STATUSES = ["open", "accepted", "arrived", "picked_up"] as const;

export default function RequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState("Detecting your current location...");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (userSnap.exists()) {
          const profileData = userSnap.data() as UserProfile;
          setProfile(profileData);
          setDestination(profileData.homeAddress || "");
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const ridesQuery = query(collection(db, "rides"), where("riderId", "==", user.uid));
    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      const currentRide =
        snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<ActiveRide, "id">),
          }))
          .filter((ride) => ACTIVE_RIDE_STATUSES.includes(ride.status as (typeof ACTIVE_RIDE_STATUSES)[number]))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))[0] ?? null;

      setActiveRide(currentRide);

      if (currentRide) {
        router.replace(`/ride-status?rideId=${currentRide.id}`);
      }
    });

    return () => unsubscribe();
  }, [router, user]);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("Live location is not available in this browser. Enter pickup manually.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("Current location captured. Drivers will receive your GPS pickup point.");
      },
      () => {
        setCoordinates(null);
        setLocationStatus("Location permission was denied or unavailable. Enter pickup manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const refreshLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("Live location is not available in this browser. Enter pickup manually.");
      return;
    }

    setLocationStatus("Refreshing current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("Current location refreshed and ready to send.");
      },
      () => {
        setCoordinates(null);
        setLocationStatus("We could not refresh your location. You can still submit with manual pickup details.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const submitRequest = async () => {
    if (!user || !profile) {
      alert("Log in first");
      return;
    }

    if (activeRide) {
      router.push(`/ride-status?rideId=${activeRide.id}`);
      return;
    }

    const resolvedPickup = pickup.trim() || (coordinates ? "Current GPS location" : "");
    const resolvedDestination = destination.trim() || profile.homeAddress?.trim() || "";

    if (!resolvedPickup) {
      alert("Allow location access or enter pickup details");
      return;
    }

    if (!resolvedDestination) {
      alert("Add a home address in Account Details or enter a destination.");
      return;
    }

    try {
      setSubmitting(true);

      const rideRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid,
        riderName: profile.name,
        riderPhone: profile.phone,
        riderEmail: profile.email,
        pickup: resolvedPickup,
        destination: resolvedDestination,
        riderLocation: coordinates,
        status: "open",
        createdAt: new Date(),
      });

      const idToken = await auth.currentUser?.getIdToken();

      if (idToken) {
        void fetch("/api/notifications/ride-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            rideId: rideRef.id,
          }),
        }).catch((error) => {
          console.error("Driver notification request failed", error);
        });
      }

      alert("Ride requested!");
      setPickup("");
      setDestination(profile.homeAddress || "");
      setLocationStatus(
        coordinates
          ? "Ride submitted with your current GPS location."
          : "Ride submitted with manual pickup details."
      );
      router.push(`/ride-status?rideId=${rideRef.id}`);
    } catch (error) {
      console.error(error);
      alert("Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><p>Loading...</p></main>;
  }

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

      <h1>Request a Ride</h1>

      {!user || !profile ? (
        <p>You need to log in first.</p>
      ) : activeRide ? (
        <p>You already have an active ride. Redirecting to ride status...</p>
      ) : (
        <>
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Phone:</strong> {profile.phone}</p>
          <p><strong>Location Status:</strong> {locationStatus}</p>

          {coordinates ? (
            <p>
              <strong>Current GPS:</strong> {coordinates.latitude.toFixed(6)},{" "}
              {coordinates.longitude.toFixed(6)}
            </p>
          ) : (
            <p>Manual pickup details are required if location is unavailable.</p>
          )}

          <div style={{ marginTop: 20 }}>
            <p style={{ marginBottom: 8 }}>
              <strong>Pickup details:</strong> add a landmark only if needed.
            </p>

            <input
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder={coordinates ? "Landmark or pickup notes" : "Pickup location or landmark"}
              style={{ display: "block", marginBottom: 10, maxWidth: 420 }}
            />

            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination (defaults to your saved home address)"
              style={{ display: "block", marginBottom: 10, maxWidth: 420 }}
            />

            <button
              onClick={refreshLocation}
              style={{ padding: 10, marginRight: 10 }}
            >
              Refresh Location
            </button>

            <button onClick={submitRequest} style={{ padding: 10 }} disabled={submitting}>
              {coordinates ? "Request Ride" : "Submit Request"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
