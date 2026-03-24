"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLoadingState from "../components/AppLoadingState";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getRequiredAccountIssues } from "../../lib/profile-readiness";

type GateProfile = {
  firstName?: string;
  lastName?: string;
  rank?: string;
  flight?: string;
  username?: string;
  phone?: string;
};

export default function AccountRequiredPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", currentUser.uid)).catch(() => null);
      const profile = snap?.exists() ? (snap.data() as GateProfile) : null;
      setIssues(getRequiredAccountIssues(profile));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Checking Account Requirements" caption="Reviewing the required profile details for access." />
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <p>You need to log in first.</p>
        <Link href="/login">Go to Login</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div
        style={{
          maxWidth: 620,
          margin: "40px auto 0",
          padding: 24,
          borderRadius: 18,
          border: "1px solid rgba(248, 113, 113, 0.24)",
          backgroundColor: "rgba(69, 10, 10, 0.34)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Complete Required Account Information</h1>
        <p style={{ maxWidth: 560 }}>
          This account is missing required information. Until it is completed, only Account Settings will be available.
        </p>
        {issues.map((issue) => (
          <p key={issue} style={{ marginBottom: 10 }}>
            {issue}
          </p>
        ))}
        <Link
          href="/account"
          style={{
            display: "inline-block",
            marginTop: 10,
            padding: "10px 16px",
            borderRadius: 10,
            backgroundColor: "#1f2937",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          Open Account Settings
        </Link>
      </div>
    </main>
  );
}
