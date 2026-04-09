"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import HomeIconLink from "../../components/HomeIconLink";
import { auth } from "../../../lib/firebase";
import { enablePushNotifications } from "../../../lib/push-notifications";
import {
  finalizeSignupFromDraft,
  getSignupErrorMessage,
  SIGNUP_DRAFT_STORAGE_KEY,
  type SignupDraft,
} from "../../../lib/signup";

export default function SignupTermsPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<SignupDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [emergencyRideConsent, setEmergencyRideConsent] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState("unknown");
  const [locationPermission, setLocationPermission] = useState("unknown");
  const permissionPromptStartedRef = useRef(false);
  const interactionPromptArmedRef = useRef(false);

  const requestSystemPermissions = async () => {
    if (typeof window === "undefined") {
      return;
    }

    if ("Notification" in window) {
      const initialNotificationPermission = Notification.permission;
      setNotificationPermission(initialNotificationPermission);

      if (initialNotificationPermission === "default") {
        try {
          const nextPermission = await Notification.requestPermission();
          setNotificationPermission(nextPermission);
        } catch (error) {
          console.error("Notification permission request failed", error);
        }
      }
    }

    if (!("geolocation" in navigator)) {
      setLocationPermission("unsupported");
      return;
    }

    try {
      const permissionsApi = (navigator as Navigator & {
        permissions?: {
          query: (descriptor: { name: "geolocation" }) => Promise<{ state: string }>;
        };
      }).permissions;

      if (permissionsApi?.query) {
        const permissionStatus = await permissionsApi.query({ name: "geolocation" });
        setLocationPermission(permissionStatus.state);
      }
    } catch (error) {
      console.error("Location permission status check failed", error);
    }

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission("granted");
          resolve();
        },
        (error) => {
          setLocationPermission(error.code === error.PERMISSION_DENIED ? "denied" : "prompt");
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawDraft = window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);

      if (!rawDraft) {
        router.replace("/signup");
        return;
      }

      const parsed = JSON.parse(rawDraft) as SignupDraft;
      setDraft(parsed);
    } catch (error) {
      console.error(error);
      router.replace("/signup");
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined" || permissionPromptStartedRef.current) {
      return;
    }

    permissionPromptStartedRef.current = true;
    void requestSystemPermissions();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || interactionPromptArmedRef.current) {
      return;
    }

    interactionPromptArmedRef.current = true;

    const handleInteractionPrompt = () => {
      const needsNotificationPrompt = typeof window !== "undefined" && "Notification" in window && Notification.permission === "default";
      const needsLocationPrompt = locationPermission === "unknown" || locationPermission === "prompt";

      if (!needsNotificationPrompt && !needsLocationPrompt) {
        return;
      }

      void requestSystemPermissions();
    };

    window.addEventListener("pointerdown", handleInteractionPrompt, { once: true, passive: true });
    window.addEventListener("keydown", handleInteractionPrompt, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleInteractionPrompt);
      window.removeEventListener("keydown", handleInteractionPrompt);
    };
  }, [locationPermission]);

  const handleAcceptTerms = async () => {
    if (!draft) {
      setStatusMessage("Your signup information is missing. Please start again.");
      return;
    }

    if (!emergencyRideConsent) {
      setStatusMessage("You must acknowledge the Emergency Ride address-sharing term before creating your account.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Creating account...");

      if (
        (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") ||
        locationPermission === "unknown" ||
        locationPermission === "prompt"
      ) {
        await requestSystemPermissions();
      }

      await finalizeSignupFromDraft(draft, {
        emergencyRideAddressConsent: emergencyRideConsent,
        locationServicesEnabled: locationPermission !== "denied",
      });

      if (!auth.currentUser) {
        await signInWithEmailAndPassword(auth, draft.email.trim(), draft.password);
      }

      const idToken = await auth.currentUser?.getIdToken();

      if (idToken) {
        await fetch("/api/notifications/new-user", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          keepalive: true,
        }).catch((error) => {
          console.error("New user admin notification failed", error);
        });
      }

      if (notificationPermission === "granted") {
        try {
          await enablePushNotifications();
        } catch (error) {
          console.error("Post-signup notification enable failed", error);
        }
      }

      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      setStatusMessage("Account created. Redirecting to homepage...");
      router.replace("/");
    } catch (error) {
      console.error(error);
      setStatusMessage(getSignupErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <p>Loading app permissions...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />
      <h1>App Permissions</h1>
      <p style={{ maxWidth: 760 }}>
        Review and accept the app permissions tied to emergency ride behavior before creating your account.
      </p>

      <div
        style={{
          maxWidth: 760,
          marginTop: 20,
          padding: 18,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Account Creation Permissions</h2>
        <div
          style={{
            display: "grid",
            gap: 10,
            marginBottom: 18,
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backgroundColor: "rgba(7, 11, 18, 0.72)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <strong>Push Notifications</strong>
            <span style={{ color: notificationPermission === "granted" ? "#86efac" : notificationPermission === "denied" ? "#fca5a5" : "#cbd5e1" }}>
              {notificationPermission}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <strong>Location Services</strong>
            <span style={{ color: locationPermission === "granted" ? "#86efac" : locationPermission === "denied" ? "#fca5a5" : "#cbd5e1" }}>
              {locationPermission}
            </span>
          </div>
          <p style={{ margin: 0, color: "#94a3b8" }}>
            Notification and location permission prompts should appear automatically when this page opens. If iPhone
            blocks the first attempt, the next tap on this page or the Create Account button will trigger the real
            system request again.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void requestSystemPermissions()}
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backgroundColor: "rgba(15, 23, 42, 0.86)",
            color: "#e5edf7",
            cursor: "pointer",
          }}
        >
          Prompt Device Permissions
        </button>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <input
            type="checkbox"
            checked={emergencyRideConsent}
            onChange={(event) => setEmergencyRideConsent(event.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            I understand that requesting an Emergency Ride will automatically share my current GPS location and my
            home address for dropoff with the assigned driver. This is intended to speed up the request process when I
            may be impaired. If I do not agree, I will be required to manually enter my pickup location each time,
            which may delay assistance.
          </span>
        </label>
        <p>
          Future permissions and terms text will go here, including user responsibilities, acceptable use, and
          ride-system expectations.
        </p>
        <p>
          For now, this page exists as the required checkpoint before the account is actually created.
        </p>
      </div>

      {statusMessage ? <p style={{ marginTop: 16, maxWidth: 760 }}>{statusMessage}</p> : null}

      <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/signup"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            textDecoration: "none",
            borderRadius: 10,
            backgroundColor: "#1f2937",
            color: "white",
          }}
        >
          Back to Signup
        </Link>
        <button type="button" onClick={handleAcceptTerms} disabled={submitting}>
          {submitting ? "Creating Account..." : "Accept and Create Account"}
        </button>
      </div>
    </main>
  );
}
