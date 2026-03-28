"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneAuthProvider, RecaptchaVerifier } from "firebase/auth";
import HomeIconLink from "../../components/HomeIconLink";
import {
  formatUsPhoneNumber,
  finalizeSignupFromDraft,
  getPhoneE164,
  getSignupErrorMessage,
  SIGNUP_DRAFT_STORAGE_KEY,
  type SignupDraft,
} from "../../../lib/signup";
import { auth } from "../../../lib/firebase";

export default function SignupTermsPage() {
  const router = useRouter();
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [draft, setDraft] = useState<SignupDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [emergencyRideConsent, setEmergencyRideConsent] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

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

  const resetRecaptchaVerifier = () => {
    recaptchaVerifierRef.current?.clear();
    recaptchaVerifierRef.current = null;
  };

  const ensureRecaptchaVerifier = () => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const verifier = new RecaptchaVerifier(auth, "signup-phone-recaptcha", {
      size: "invisible",
    });

    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  useEffect(() => {
    if (!draft || typeof window === "undefined") {
      return;
    }

    auth.languageCode = "en";
    ensureRecaptchaVerifier();

    return () => {
      resetRecaptchaVerifier();
    };
  }, [draft]);

  const handleSendVerificationCode = async () => {
    if (!draft) {
      setStatusMessage("Your signup information is missing. Please start again.");
      return;
    }

    if (!emergencyRideConsent) {
      setStatusMessage("You must accept the app permissions before requesting a phone verification code.");
      return;
    }

    const phoneNumber = getPhoneE164(draft.phone);

    if (!phoneNumber) {
      setStatusMessage("Go back to signup and enter a valid 10-digit phone number.");
      return;
    }

    try {
      setSendingCode(true);
      setStatusMessage(`Sending verification code to ${formatUsPhoneNumber(draft.phone)}...`);
      const provider = new PhoneAuthProvider(auth);
      const nextVerificationId = await provider.verifyPhoneNumber(phoneNumber, ensureRecaptchaVerifier());
      setVerificationId(nextVerificationId);
      setVerificationCode("");
      setStatusMessage(`Verification code sent to ${formatUsPhoneNumber(draft.phone)}.`);
    } catch (error) {
      console.error(error);
      resetRecaptchaVerifier();
      ensureRecaptchaVerifier();
      setStatusMessage(getSignupErrorMessage(error));
    } finally {
      setSendingCode(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!draft) {
      setStatusMessage("Your signup information is missing. Please start again.");
      return;
    }

    if (!emergencyRideConsent) {
      setStatusMessage("You must acknowledge the Emergency Ride address-sharing term before creating your account.");
      return;
    }

    if (!verificationId) {
      setStatusMessage("Send a verification code to your phone before creating your account.");
      return;
    }

    if (!verificationCode.trim()) {
      setStatusMessage("Enter the verification code from the text message before creating your account.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Verifying phone and creating account...");
      await finalizeSignupFromDraft(draft, {
        emergencyRideAddressConsent: emergencyRideConsent,
        phoneVerification: {
          verificationId,
          verificationCode,
        },
      });
      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      alert("Phone verified and account created.");
      window.location.href = "/";
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
          Future permissions and terms text will go here, including user responsibilities, acceptable use, and
          ride-system expectations.
        </p>
        <p>
          For now, this page exists as the required checkpoint before the account is actually created.
        </p>
      </div>

      <div
        style={{
          maxWidth: 760,
          marginTop: 16,
          padding: 18,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <h2 style={{ margin: 0 }}>Phone Verification</h2>
          <p style={{ margin: 0, color: "#cbd5e1" }}>
            New accounts must verify a phone number by text message before the account is finished. Existing
            accounts are grandfathered in and will not be forced through this step.
          </p>
          <p style={{ margin: 0, color: "#94a3b8" }}>
            Verification code destination: <strong>{draft ? formatUsPhoneNumber(draft.phone) : "Unknown number"}</strong>
          </p>
        </div>

        <div style={{ display: "grid", gap: 10, maxWidth: 340 }}>
          <button type="button" onClick={handleSendVerificationCode} disabled={sendingCode || submitting}>
            {sendingCode ? "Sending Code..." : verificationId ? "Resend Verification Code" : "Send Verification Code"}
          </button>

          {verificationId ? (
            <>
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\s/g, ""))}
                placeholder="Enter verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
              />
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
                Enter the code from the text message, then finish creating the account.
              </p>
            </>
          ) : null}
        </div>

        <div id="signup-phone-recaptcha" />
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
          {submitting ? "Verifying and Creating..." : "Accept, Verify, and Create Account"}
        </button>
      </div>
    </main>
  );
}
