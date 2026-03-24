"use client";

import { useEffect, useState } from "react";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";

type UserProfile = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export default function ReportBugPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const submitBug = async () => {
    if (!user) {
      setStatusMessage("You need to log in before sending a bug report.");
      return;
    }

    if (!description.trim()) {
      setStatusMessage("Enter the bug details before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Submitting bug report...");

      const profileSnap = await getDoc(doc(db, "users", user.uid));
      const profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
      const fullName =
        profile?.name ||
        `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() ||
        user.email ||
        "Unknown User";

      await addDoc(collection(db, "bugReports"), {
        description: description.trim(),
        contactConsentByPhone: contactConsent,
        reporterUid: user.uid,
        reporterName: fullName,
        reporterPhone: profile?.phone || "",
        reporterEmail: user.email || "",
        createdAt: serverTimestamp(),
      });

      setDescription("");
      setContactConsent(false);
      setStatusMessage("Bug report submitted.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not submit the bug report.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Bug Report" caption="Preparing the bug report form." />
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />
      <h1>Report Bug</h1>
      <p style={{ maxWidth: 680 }}>
        Report any bugs here. Be as descriptive as possible and try to include steps on how to replicate it.
      </p>

      {!user ? <p style={{ color: "#fca5a5" }}>You must be logged in to submit a bug report.</p> : null}
      {statusMessage ? <p style={{ marginTop: 12 }}>{statusMessage}</p> : null}

      <div
        style={{
          marginTop: 18,
          maxWidth: 760,
          padding: 18,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
        }}
      >
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe what happened, what you expected, and how to reproduce it."
          rows={10}
          style={{
            width: "100%",
            resize: "vertical",
            padding: 12,
            borderRadius: 12,
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            color: "white",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        />

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginTop: 14,
            color: "#dbeafe",
          }}
        >
          <input
            type="checkbox"
            checked={contactConsent}
            onChange={(event) => setContactConsent(event.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            I consent to being contacted by phone if further information is needed about this bug report.
          </span>
        </label>

        <button
          type="button"
          onClick={submitBug}
          disabled={submitting || !user}
          style={{ marginTop: 14, padding: "10px 16px" }}
        >
          {submitting ? "Submitting..." : "Submit Bug Report"}
        </button>
      </div>
    </main>
  );
}
