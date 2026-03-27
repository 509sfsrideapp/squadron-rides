"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth, db } from "../../../lib/firebase";
import { disablePushNotifications, enablePushNotifications } from "../../../lib/push-notifications";
import {
  DEFAULT_RIDE_DISPATCH_MODE,
  type EmergencyRideDispatchMode,
  RIDE_DISPATCH_OPTIONS,
  normalizeRideDispatchMode,
} from "../../../lib/ride-dispatch";
import { getLatestActiveRideForRider } from "../../../lib/ride-state";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, updateDoc } from "firebase/firestore";

type UserProfile = {
  name?: string;
  firstName?: string;
  lastName?: string;
  rank?: string;
  flight?: string;
  phone?: string;
  email?: string;
  homeAddress?: string;
  riderPhotoUrl?: string;
  driverPhotoUrl?: string;
  emergencyRideAddressConsent?: boolean;
  emergencyRideDispatchMode?: EmergencyRideDispatchMode;
  locationServicesEnabled?: boolean;
};

export default function AccountPermissionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningTestRide, setRunningTestRide] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emergencyRideAddressConsent, setEmergencyRideAddressConsent] = useState(false);
  const [emergencyRideDispatchMode, setEmergencyRideDispatchMode] =
    useState<EmergencyRideDispatchMode>(DEFAULT_RIDE_DISPATCH_MODE);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const [updatingLocationServices, setUpdatingLocationServices] = useState(false);
  const [notificationTokenCount, setNotificationTokenCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState("unknown");
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        const data = snap.exists() ? (snap.data() as UserProfile) : null;
        const idToken = await currentUser.getIdToken();
        const notificationResponse = await fetch("/api/notifications/debug", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }).catch(() => null);

        if (typeof window !== "undefined" && "Notification" in window) {
          setNotificationPermission(Notification.permission);
        }

        if (notificationResponse?.ok) {
          const notificationDetails = (await notificationResponse.json()) as { tokenCount?: number };
          setNotificationTokenCount(notificationDetails.tokenCount ?? 0);
        }

        setProfile(data);
        setEmergencyRideAddressConsent(Boolean(data?.emergencyRideAddressConsent));
        setEmergencyRideDispatchMode(normalizeRideDispatchMode(data?.emergencyRideDispatchMode));
        setLocationServicesEnabled(data?.locationServicesEnabled !== false);
      } catch (error) {
        console.error(error);
        setStatusMessage("Could not load app permissions.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const savePermissions = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setStatusMessage("Saving app permissions...");
      await updateDoc(doc(db, "users", user.uid), {
        emergencyRideAddressConsent,
        emergencyRideDispatchMode,
      });
      setStatusMessage("App permissions updated.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not save app permissions.");
    } finally {
      setSaving(false);
    }
  };

  const refreshNotificationStatus = async () => {
    const currentUser = auth.currentUser;

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    if (!currentUser) {
      return;
    }

    const idToken = await currentUser.getIdToken();
    const response = await fetch("/api/notifications/debug", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (response.ok) {
      const details = (await response.json()) as { tokenCount?: number };
      setNotificationTokenCount(details.tokenCount ?? 0);
    }
  };

  const handleNotificationToggle = async () => {
    try {
      setUpdatingNotifications(true);

      if (notificationTokenCount > 0 && notificationPermission === "granted") {
        await disablePushNotifications();
        setNotificationTokenCount(0);
        setStatusMessage("Notifications disabled on this device.");
        return;
      }

      await enablePushNotifications();
      await refreshNotificationStatus();

      setStatusMessage("Notifications enabled on this device.");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not update notification settings.");
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const handleLocationServicesToggle = async () => {
    if (!user) {
      setStatusMessage("You need to log in first.");
      return;
    }

    const nextValue = !locationServicesEnabled;

    try {
      setUpdatingLocationServices(true);
      await updateDoc(doc(db, "users", user.uid), {
        locationServicesEnabled: nextValue,
        updatedAt: new Date(),
      });

      setLocationServicesEnabled(nextValue);
      setStatusMessage(
        nextValue
          ? "Location services turned on for this account."
          : "Location services turned off. The app will stop using GPS until you turn it back on."
      );
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not update location services.");
    } finally {
      setUpdatingLocationServices(false);
    }
  };

  const captureCurrentLocation = async () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return null;
    }

    return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const runTestRide = async () => {
    if (!user || !profile) {
      setStatusMessage("You need to log in first.");
      return;
    }

    try {
      setRunningTestRide(true);
      setStatusMessage("Starting a test ride...");

      const existingRide = await getLatestActiveRideForRider(user.uid);

      if (existingRide) {
        router.push(`/ride-status?rideId=${existingRide.id}`);
        return;
      }

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        try {
          await enablePushNotifications();
          await refreshNotificationStatus();
        } catch (error) {
          console.error("Notification permission prompt failed during test ride", error);
        }
      }

      const riderLocation = locationServicesEnabled ? await captureCurrentLocation() : null;
      const riderDisplayName =
        [profile.rank?.trim(), profile.lastName?.trim()].filter(Boolean).join(" ").trim() ||
        profile.name ||
        user.email?.split("@")[0] ||
        "Test Rider";

      const rideRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid,
        riderName: riderDisplayName,
        riderPhone: profile.phone?.trim() || "",
        riderEmail: profile.email?.trim() || user.email || "",
        riderPhotoUrl: profile.driverPhotoUrl || profile.riderPhotoUrl || null,
        riderRank: profile.rank?.trim() || null,
        riderLastName: profile.lastName?.trim() || null,
        riderFlight: profile.flight?.trim() || null,
        pickup: riderLocation ? "Current GPS test location" : profile.homeAddress?.trim() || "Saved home address",
        pickupLocationName: "Test Ride",
        pickupLocationAddress: profile.homeAddress?.trim() || null,
        destination: profile.homeAddress?.trim() || "Test destination",
        riderLocation,
        dispatchMode: "all_drivers",
        dispatchFlight: profile.flight?.trim() || null,
        dispatchExpandedAt: null,
        status: "open",
        isTestRide: true,
        createdAt: new Date(),
      });

      setStatusMessage("Test ride created. Opening ride status...");
      router.push(`/ride-status?rideId=${rideRef.id}`);
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not start the test ride.");
    } finally {
      setRunningTestRide(false);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading App Permissions" caption="Opening your permission and emergency ride settings." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>App Permissions</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />
      <h1>App Permissions</h1>
      <p style={{ maxWidth: 760 }}>
        Review and update the permissions that control emergency ride behavior and future app access options.
      </p>

      {statusMessage ? <p style={{ marginTop: 12 }}>{statusMessage}</p> : null}

      <div
        style={{
          marginTop: 20,
          maxWidth: 760,
          padding: 18,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Emergency Ride Address Sharing</h2>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <input
            type="checkbox"
            checked={emergencyRideAddressConsent}
            onChange={(event) => setEmergencyRideAddressConsent(event.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            I understand that requesting an Emergency Ride will automatically share my saved pickup address with the
            assigned driver. This is intended to speed up the request process when I may be impaired. If I do not
            agree, I will be required to manually enter my pickup location each time, which may delay assistance.
          </span>
        </label>

        <p style={{ marginTop: 14, color: "#94a3b8" }}>
          If this is turned on, the home screen Emergency Ride button becomes a one-tap request using your saved
          address. If it is turned off, the button opens the normal request screen instead.
        </p>

        <div style={{ marginTop: 24, display: "grid", gap: 14 }}>
          <div className="settings-switch-row">
            <div>
              <h2 style={{ margin: 0 }}>Push Notifications</h2>
              <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
                {notificationTokenCount > 0 && notificationPermission === "granted"
                  ? "Enabled on this device for ride and status alerts."
                  : "Turn this on to receive ride requests and status notifications on this device."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationTokenCount > 0 && notificationPermission === "granted"}
              aria-label="Toggle push notifications"
              onClick={() => void handleNotificationToggle()}
              disabled={updatingNotifications}
              className={`settings-switch${notificationTokenCount > 0 && notificationPermission === "granted" ? " settings-switch-on" : ""}`}
            >
              <span className="settings-switch-knob" />
            </button>
          </div>

          <div className="settings-switch-row">
            <div>
              <h2 style={{ margin: 0 }}>Location Services</h2>
              <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
                {locationServicesEnabled
                  ? "GPS is enabled for ride requests and live ride location updates."
                  : "GPS is off for this account until you turn it back on."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={locationServicesEnabled}
              aria-label="Toggle location services"
              onClick={() => void handleLocationServicesToggle()}
              disabled={updatingLocationServices}
              className={`settings-switch${locationServicesEnabled ? " settings-switch-on" : ""}`}
            >
              <span className="settings-switch-knob" />
            </button>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <h2 style={{ marginBottom: 8 }}>Emergency Ride Driver Routing</h2>
          <p style={{ marginTop: 0, color: "#94a3b8" }}>
            Choose who gets your emergency ride request first. If the first group does not accept within 5 minutes,
            the request expands to the rest of the active driver pool.
          </p>

          <label style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <span>Initial driver audience</span>
            <select
              value={emergencyRideDispatchMode}
              onChange={(event) => setEmergencyRideDispatchMode(normalizeRideDispatchMode(event.target.value))}
            >
              {RIDE_DISPATCH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p style={{ marginTop: 10, color: "#94a3b8" }}>
            {RIDE_DISPATCH_OPTIONS.find((option) => option.value === emergencyRideDispatchMode)?.description}
          </p>
        </div>

        <div style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Test Ride</h2>
          <p style={{ marginTop: 0, color: "#94a3b8" }}>
            This opens a real rider-side test ride without notifying any drivers, so you can verify permission prompts
            and ride-screen behavior safely.
          </p>
          <button type="button" onClick={() => void runTestRide()} disabled={runningTestRide}>
            {runningTestRide ? "Starting Test Ride..." : "Run Test Ride"}
          </button>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={savePermissions} disabled={saving}>
            {saving ? "Saving..." : "Save Permissions"}
          </button>
          <Link
            href="/account"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: 10,
              backgroundColor: "#111827",
              color: "white",
              textDecoration: "none",
            }}
          >
            Back to Account Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
