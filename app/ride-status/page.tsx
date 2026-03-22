"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";

type Ride = {
  id: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  pickup?: string;
  destination?: string;
  status?: string;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
  riderLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
  driverLocation?: {
    latitude?: number;
    longitude?: number;
  } | null;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
};

const ACTIVE_RIDE_STATUSES = ["open", "accepted", "arrived", "picked_up"] as const;

type Point = {
  latitude: number;
  longitude: number;
};

type LeafletMapInstance = {
  setView: (coords: [number, number], zoom: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]], options?: { padding?: [number, number] }) => void;
  remove: () => void;
};

type LeafletMarkerInstance = {
  setLatLng: (coords: [number, number]) => void;
  bindPopup: (content: string) => void;
  addTo: (map: LeafletMapInstance) => LeafletMarkerInstance;
  remove?: () => void;
};

type LeafletNamespace = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMapInstance;
  tileLayer: (
    url: string,
    options?: { attribution?: string; maxZoom?: number }
  ) => { addTo: (map: LeafletMapInstance) => void };
  marker: (coords: [number, number], options?: { icon?: unknown }) => LeafletMarkerInstance;
  divIcon: (options: { className: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] }) => unknown;
};

function getStatusMessage(status?: string) {
  switch (status) {
    case "open":
      return "Your ride request is out to drivers now.";
    case "accepted":
      return "A driver accepted your request and is heading your way.";
    case "arrived":
      return "Your driver has arrived at the pickup location.";
    case "picked_up":
      return "You have been picked up and the ride is in progress.";
    default:
      return "No active ride right now.";
  }
}

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

let leafletAssetsPromise: Promise<LeafletNamespace> | null = null;

function loadLeafletAssets() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only load in the browser."));
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (!leafletAssetsPromise) {
    leafletAssetsPromise = new Promise((resolve, reject) => {
      const existingStylesheet = document.querySelector('link[data-leaflet="true"]');

      if (!existingStylesheet) {
        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        stylesheet.crossOrigin = "";
        stylesheet.dataset.leaflet = "true";
        document.head.appendChild(stylesheet);
      }

      const existingScript = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.L) {
            resolve(window.L);
          } else {
            reject(new Error("Leaflet script loaded without exposing window.L"));
          }
        });
        existingScript.addEventListener("error", () => reject(new Error("Leaflet script failed to load.")));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.crossOrigin = "";
      script.dataset.leaflet = "true";
      script.onload = () => {
        if (window.L) {
          resolve(window.L);
        } else {
          reject(new Error("Leaflet script loaded without exposing window.L"));
        }
      };
      script.onerror = () => reject(new Error("Leaflet script failed to load."));
      document.body.appendChild(script);
    });
  }

  return leafletAssetsPromise;
}

function LiveRideMap({ riderLocation, driverLocation }: { riderLocation?: Point | null; driverLocation?: Point | null }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const riderMarkerRef = useRef<LeafletMarkerInstance | null>(null);
  const driverMarkerRef = useRef<LeafletMarkerInstance | null>(null);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!mapContainerRef.current || !riderLocation) {
      return;
    }

    loadLeafletAssets()
      .then((L) => {
        if (cancelled || !mapContainerRef.current) return;

        if (!mapRef.current) {
          const map = L.map(mapContainerRef.current, {
            zoomControl: true,
          });

          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map);

          mapRef.current = map;

          const riderIcon = L.divIcon({
            className: "",
            html:
              '<div style="width:18px;height:18px;border-radius:9999px;background:#f97316;border:3px solid #fff;box-shadow:0 0 0 2px rgba(154,52,18,0.35);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });

          const driverIcon = L.divIcon({
            className: "",
            html:
              '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px rgba(30,64,175,0.35);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });

          riderMarkerRef.current = L.marker([riderLocation.latitude, riderLocation.longitude], { icon: riderIcon }).addTo(map);
          riderMarkerRef.current.bindPopup("Pickup");

          if (driverLocation) {
            driverMarkerRef.current = L.marker([driverLocation.latitude, driverLocation.longitude], { icon: driverIcon }).addTo(map);
            driverMarkerRef.current.bindPopup("Driver");
          }
        } else {
          riderMarkerRef.current?.setLatLng([riderLocation.latitude, riderLocation.longitude]);

          if (driverLocation) {
            if (!driverMarkerRef.current) {
              const driverIcon = L.divIcon({
                className: "",
                html:
                  '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px rgba(30,64,175,0.35);"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              });
              driverMarkerRef.current = L.marker([driverLocation.latitude, driverLocation.longitude], { icon: driverIcon }).addTo(mapRef.current);
              driverMarkerRef.current.bindPopup("Driver");
            } else {
              driverMarkerRef.current.setLatLng([driverLocation.latitude, driverLocation.longitude]);
            }
          } else if (driverMarkerRef.current?.remove) {
            driverMarkerRef.current.remove();
            driverMarkerRef.current = null;
          }
        }

        if (mapRef.current) {
          if (driverLocation) {
            mapRef.current.fitBounds(
              [
                [riderLocation.latitude, riderLocation.longitude],
                [driverLocation.latitude, driverLocation.longitude],
              ],
              { padding: [40, 40] }
            );
          } else {
            mapRef.current.setView([riderLocation.latitude, riderLocation.longitude], 15);
          }
        }
      })
      .catch((error) => {
        console.error(error);
        setMapError("We could not load the live map right now.");
      });

    return () => {
      cancelled = true;
    };
  }, [driverLocation, riderLocation]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (!riderLocation) {
    return (
      <div
        style={{
          marginTop: 16,
          borderRadius: 12,
          padding: 16,
          backgroundColor: "#f8fafc",
          color: "#334155",
          border: "1px solid #cbd5e1",
          maxWidth: 560,
        }}
      >
        Pickup coordinates are not available yet, so the live map cannot be drawn.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 16,
        maxWidth: 560,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #bfdbfe",
        backgroundColor: "#ffffff",
      }}
    >
      <div style={{ padding: "12px 14px", color: "#0f172a", backgroundColor: "#eff6ff" }}>
        <strong>Live Map</strong>
      </div>

      <div ref={mapContainerRef} style={{ width: "100%", height: 320 }} />

      <div style={{ padding: 14, color: "#0f172a", backgroundColor: "#f8fafc" }}>
        {mapError ? mapError : driverLocation ? "Blue is your driver. Orange is your pickup spot." : "Waiting for your driver location to appear."}
      </div>
    </div>
  );
}

export default function RideStatusPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setRides([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const ridesQuery = query(collection(db, "rides"), where("riderId", "==", user.uid));

    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      const rideList = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Ride, "id">),
        }))
        .filter((ride) => ACTIVE_RIDE_STATUSES.includes(ride.status as (typeof ACTIVE_RIDE_STATUSES)[number]))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

      setRides(rideList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const activeRide = useMemo(() => rides[0] ?? null, [rides]);
  const riderLocation =
    activeRide?.riderLocation?.latitude != null && activeRide.riderLocation?.longitude != null
      ? {
          latitude: activeRide.riderLocation.latitude,
          longitude: activeRide.riderLocation.longitude,
        }
      : null;
  const driverLocation =
    activeRide?.driverLocation?.latitude != null && activeRide.driverLocation?.longitude != null
      ? {
          latitude: activeRide.driverLocation.latitude,
          longitude: activeRide.driverLocation.longitude,
        }
      : null;

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <p>Loading ride status...</p>
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
          marginRight: 12,
        }}
      >
        Home
      </Link>

      <Link
        href="/request"
        style={{
          display: "inline-block",
          marginBottom: 20,
          padding: "8px 14px",
          backgroundColor: "#0f766e",
          color: "white",
          textDecoration: "none",
          borderRadius: 8,
        }}
      >
        Request Another Ride
      </Link>

      <h1>Ride Status</h1>

      {!activeRide ? (
        <p>You do not have an active ride right now.</p>
      ) : (
        <>
          <p>{getStatusMessage(activeRide.status)}</p>

          <div
            style={{
              border: "1px solid #0f766e",
              backgroundColor: "#ecfeff",
              color: "#0f172a",
              borderRadius: 12,
              padding: 16,
              maxWidth: 560,
            }}
          >
            <p>
              <strong>Status:</strong> {activeRide.status}
            </p>
            <p>
              <strong>Pickup:</strong> {activeRide.pickup || "N/A"}
            </p>
            <p>
              <strong>Destination:</strong> {activeRide.destination || "N/A"}
            </p>
            <p>
              <strong>Driver:</strong> {activeRide.driverName || "Waiting for driver"}
            </p>
            <p>
              <strong>Driver Phone:</strong> {activeRide.driverPhone || "Not available yet"}
            </p>
            <p>
              <strong>Driver Email:</strong> {activeRide.driverEmail || "Not available yet"}
            </p>
            <p>
              <strong>Driver GPS:</strong>{" "}
              {activeRide.driverLocation?.latitude != null && activeRide.driverLocation?.longitude != null
                ? `${activeRide.driverLocation.latitude.toFixed(6)}, ${activeRide.driverLocation.longitude.toFixed(6)}`
                : "Driver location not shared yet"}
            </p>
            <p>
              <strong>Pickup GPS:</strong>{" "}
              {activeRide.riderLocation?.latitude != null && activeRide.riderLocation?.longitude != null
                ? `${activeRide.riderLocation.latitude.toFixed(6)}, ${activeRide.riderLocation.longitude.toFixed(6)}`
                : "Not shared"}
            </p>
          </div>

          <LiveRideMap riderLocation={riderLocation} driverLocation={driverLocation} />
        </>
      )}
    </main>
  );
}
