"use client";

import { useState } from "react";
import HomeIconLink from "../../components/HomeIconLink";

export default function DeveloperUnlockPage() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Enter the developer code to unlock internal tools.");

  const submitCode = async () => {
    if (!code.trim()) {
      setStatusMessage("Enter the developer code first.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Checking developer access...");

      const response = await fetch("/api/developer/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const details = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(details?.message || "Developer access denied.");
        return;
      }

      window.location.href = "/developer";
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not verify developer access.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />
      <h1>Developer Access</h1>
      <p style={{ maxWidth: 640 }}>
        This is a hidden tools area for features still being tuned before we decide what belongs on the main experience.
      </p>

      <div
        style={{
          marginTop: 20,
          maxWidth: 520,
          padding: 20,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
        }}
      >
        <p style={{ marginTop: 0, color: "#cbd5e1" }}>{statusMessage}</p>
        <input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Developer code"
          style={{ marginBottom: 12 }}
        />
        <button type="button" onClick={submitCode} disabled={submitting}>
          {submitting ? "Unlocking..." : "Unlock Developer Tools"}
        </button>
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: "#94a3b8" }}>
          Default code fallback is <strong>509SFSDEV</strong> unless you later set a `DEVELOPER_ACCESS_CODE` environment variable.
        </p>
      </div>
    </main>
  );
}
