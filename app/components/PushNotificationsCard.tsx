"use client";

import { useEffect, useState } from "react";
import { attachForegroundNotificationListener, enablePushNotifications } from "../../lib/push-notifications";

export default function PushNotificationsCard() {
  const [statusMessage, setStatusMessage] = useState("Enable notifications to get ride updates even when you switch apps.");
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void attachForegroundNotificationListener(({ title, body }) => {
      setStatusMessage(`${title}: ${body}`);
    }).then((detach) => {
      unsubscribe = detach;
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleEnable = async () => {
    try {
      setEnabling(true);
      setStatusMessage("Setting up push notifications...");
      await enablePushNotifications();
      setStatusMessage("Push notifications are enabled on this device.");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setEnabling(false);
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
      <button type="button" onClick={handleEnable} disabled={enabling}>
        {enabling ? "Enabling..." : "Enable Push Notifications"}
      </button>
    </div>
  );
}
