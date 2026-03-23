"use client";

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { enablePushNotifications } from "../../lib/push-notifications";

export default function PushNotificationsCard() {
  const [statusMessage, setStatusMessage] = useState("Enable notifications to get ride updates even when you switch apps.");
  const [enabling, setEnabling] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<string>("unknown");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
    }

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      setStatusMessage("Checking push notification setup on this device...");

      void enablePushNotifications()
        .then(() => {
          setStatusMessage("Push notifications are enabled on this device.");
        })
        .catch((error) => {
          console.error(error);
          setStatusMessage(error instanceof Error ? error.message : "Could not confirm push notifications on this device.");
        });
    }

    const currentUser = auth.currentUser;

    if (currentUser) {
      void currentUser.getIdToken()
        .then((idToken) =>
          fetch("/api/notifications/debug", {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          })
        )
        .then(async (response) => {
          if (!response?.ok) return;

          const details = (await response.json()) as { tokenCount?: number };
          setTokenCount(details.tokenCount ?? 0);

          if ((details.tokenCount ?? 0) > 0) {
            setStatusMessage(`Push notifications are linked on ${details.tokenCount} device${details.tokenCount === 1 ? "" : "s"}.`);
          }
        })
        .catch((error) => {
          console.error("Notification debug lookup failed", error);
        });
    }
  }, []);

  const handleEnable = async () => {
    try {
      setEnabling(true);
      setStatusMessage("Setting up push notifications...");
      await enablePushNotifications();
      setPermissionState("granted");
      setStatusMessage("Push notifications are enabled on this device.");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setEnabling(false);
    }
  };

  const handleSendTest = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setStatusMessage("You need to log in before sending a test notification.");
      return;
    }

    try {
      setSendingTest(true);
      setStatusMessage("Sending a test notification...");
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const details = (await response.json().catch(() => null)) as { error?: string; tokenCount?: number } | null;

      if (!response.ok) {
        throw new Error(details?.error || "Could not send a test notification.");
      }

      setTokenCount(details?.tokenCount ?? tokenCount);
      setStatusMessage("Test notification sent. Check this device now.");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not send a test notification.");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 20,
        padding: 16,
        borderRadius: 14,
        border: "1px solid rgba(96, 165, 250, 0.18)",
        backgroundColor: "rgba(9, 15, 25, 0.88)",
        color: "#e5edf7",
        maxWidth: 560,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Notifications</h2>
      <p style={{ marginBottom: 14 }}>{statusMessage}</p>
      <div style={{ marginBottom: 14, fontSize: 14, color: "#cbd5e1" }}>
        <p style={{ margin: "0 0 6px" }}>
          <strong>Browser permission:</strong> {permissionState}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Saved device tokens:</strong> {tokenCount == null ? "Checking..." : tokenCount}
        </p>
      </div>
      <p style={{ marginTop: 0, marginBottom: 14, color: "#cbd5e1", fontSize: 14 }}>
        On iPhone, open this site in Safari, tap Share, choose Add to Home Screen, then launch it from that Home Screen icon before enabling notifications.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={handleEnable} disabled={enabling}>
          {enabling ? "Enabling..." : "Enable Push Notifications"}
        </button>
        <button type="button" onClick={handleSendTest} disabled={sendingTest}>
          {sendingTest ? "Sending..." : "Send Test Notification"}
        </button>
      </div>
    </div>
  );
}
