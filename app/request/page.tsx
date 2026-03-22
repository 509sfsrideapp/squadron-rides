"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type UserProfile = {
  name: string;
  phone: string;
  email: string;
  available: boolean;
};

export default function RequestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
          setProfile(userSnap.data() as UserProfile);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

    const resolvedPickup = pickup.trim() || (coordinates ? "Current GPS location" : "");

    if (!resolvedPickup) {
      alert("Allow location access or enter pickup details");
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "rides"), {
        riderId: user.uid,
        riderName: profile.name,
        riderPhone: profile.phone,
        riderEmail: profile.email,
        pickup: resolvedPickup,
        destination,
        riderLocation: coordinates,
        status: "open",
        createdAt: new Date(),
      });

      alert("Ride requested!");
      setPickup("");
      setDestination("");
      setLocationStatus(
        coordinates
          ? "Ride submitted with your current GPS location."
          : "Ride submitted with manual pickup details."
      );
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
              placeholder="Destination"
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
