"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomeIconLink from "../../components/HomeIconLink";
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
      await finalizeSignupFromDraft(draft);
      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      alert("Account created");
      window.location.href = "/login";
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
        <p>Loading terms...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />
      <h1>Terms of Service</h1>
      <p style={{ maxWidth: 760 }}>
        This is the placeholder Terms of Service step for account creation. We will add the real terms text here next.
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
        <h2 style={{ marginTop: 0 }}>Placeholder Terms</h2>
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
            I understand that requesting an Emergency Ride will automatically share my saved pickup address with the
            assigned driver. This is intended to speed up the request process when I may be impaired. If I do not
            agree, I will be required to manually enter my pickup location each time, which may delay assistance.
          </span>
        </label>
        <p>
          Future terms of service text will go here, including user responsibilities, acceptable use, and ride-system
          expectations.
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
          {submitting ? "Creating Account..." : "Agree and Create Account"}
        </button>
      </div>
    </main>
  );
}
