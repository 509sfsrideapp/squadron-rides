"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { useActiveRides } from "../../lib/use-active-rides";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ReverseGeocodeResult = {
  placeName?: string | null;
  address?: string | null;
  display?: string | null;
};

type UserProfile = {
  name: string;
  username?: string;
  phone: string;
  email: string;
  homeAddress?: string;
  available: boolean;
  riderPhotoUrl?: string;
  driverPhotoUrl?: string;
  locationServicesEnabled?: boolean;
};

export default function RequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState("Detecting your current location...");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { riderActiveRide, driverActiveRide, loading: activeRideLoading } = useActiveRides(user);

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
    if (!user || activeRideLoading) return;

    if (driverActiveRide) {
      router.replace(`/driver/active/${driverActiveRide.id}`);
      return;
    }

    if (riderActiveRide) {
      router.replace(`/ride-status?rideId=${riderActiveRide.id}`);
    }
  }, [activeRideLoading, driverActiveRide, riderActiveRide, router, user]);

  useEffect(() => {
    if (loading) return;

    if (profile?.locationServicesEnabled === false) {
      setCoordinates(null);
      setLocationStatus("Location services are turned off in Account Settings. Enter pickup manually or turn them back on.");
      return;
    }

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
  }, [loading, profile?.locationServicesEnabled]);

  const refreshLocation = () => {
    if (profile?.locationServicesEnabled === false) {
      setCoordinates(null);
      setLocationStatus("Location services are turned off in Account Settings. Turn them back on to use GPS pickup.");
      return;
    }

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

  const resolvePickupLocation = async (nextCoordinates: Coordinates) => {
    const response = await fetch("/api/geocode/reverse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextCoordinates),
    });

    if (!response.ok) {
      throw new Error("Could not resolve pickup address.");
    }

    return (await response.json()) as ReverseGeocodeResult;
  };

  const submitRequest = async () => {
    if (!user || !profile) {
      alert("Log in first");
      return;
    }

    if (driverActiveRide) {
      router.push(`/driver/active/${driverActiveRide.id}`);
      return;
    }

    if (riderActiveRide) {
      router.push(`/ride-status?rideId=${riderActiveRide.id}`);
      return;
    }

    const resolvedPickup = pickup.trim() || (coordinates ? "Current GPS location" : "");
    const resolvedDestination = destination.trim() || profile.homeAddress?.trim() || "";

    if (!resolvedPickup) {
      alert("Allow location access or enter pickup details");
      return;
    }

    if (!resolvedDestination) {
      alert("Add a home address in Account Settings or enter a destination.");
      return;
    }

    try {
      setSubmitting(true);
      const geocodedPickup = coordinates ? await resolvePickupLocation(coordinates).catch(() => null) : null;
      const resolvedPickupLabel =
        pickup.trim() ||
        geocodedPickup?.placeName ||
        geocodedPickup?.address ||
        geocodedPickup?.display ||
        (coordinates ? "Current GPS location" : "");

      const rideRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid,
        riderName: profile.name,
        riderPhone: profile.phone,
        riderEmail: profile.email,
        riderPhotoUrl: profile.driverPhotoUrl || profile.riderPhotoUrl || null,
        pickup: resolvedPickupLabel,
        pickupLocationName: geocodedPickup?.placeName || null,
        pickupLocationAddress: geocodedPickup?.address || geocodedPickup?.display || null,
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
        })
          .then(async (response) => {
            if (!response.ok) {
              const details = await response.json().catch(() => null);
              console.error("Driver notification request failed", details || response.statusText);
            }
          })
          .catch((error) => {
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
      ) : driverActiveRide ? (
        <p>You already accepted a driver ride. Redirecting to the active driver screen...</p>
      ) : riderActiveRide ? (
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
              disabled={profile?.locationServicesEnabled === false}
              style={{ padding: 10, marginRight: 10 }}
            >
              {profile?.locationServicesEnabled === false ? "Location Services Off" : "Refresh Location"}
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
