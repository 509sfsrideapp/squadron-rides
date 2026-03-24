"use client";

import { useEffect, useState } from "react";
import AppLoadingState from "../../components/AppLoadingState";
import DeveloperBackLink from "../../components/DeveloperBackLink";
import { auth, db } from "../../../lib/firebase";
import { isAdminEmail } from "../../../lib/admin";
import { formatRideTimestamp } from "../../../lib/ride-lifecycle";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

type Suggestion = {
  id: string;
  description?: string;
  contactConsentByPhone?: boolean;
  reporterName?: string;
  reporterPhone?: string;
  createdAt?: { seconds?: number };
};

export default function DeveloperSuggestionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthorized(isAdminEmail(currentUser?.email));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "suggestions"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const nextSuggestions: Suggestion[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Suggestion, "id">),
        }));
        setSuggestions(nextSuggestions);
      }
    );

    return () => unsubscribe();
  }, [authorized]);

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Suggestions" caption="Opening the developer feedback inbox." />
      </main>
    );
  }

  if (!user || !authorized) {
    return (
      <main style={{ padding: 20 }}>
        <DeveloperBackLink />
        <h1>Suggestions</h1>
        <p>This page is only available to the authorized developer/admin account.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <DeveloperBackLink />
      <h1>Suggestions</h1>
      <p style={{ maxWidth: 680 }}>
        Review submitted suggestions and feedback here, including the reporter name and phone number.
      </p>

      <section style={{ marginTop: 20 }}>
        {suggestions.length === 0 ? (
          <p>No suggestions have been submitted yet.</p>
        ) : (
          suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.18)",
                backgroundColor: "rgba(9, 15, 25, 0.88)",
                color: "#e5edf7",
                borderRadius: 12,
                padding: 16,
                marginBottom: 14,
                boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
              }}
            >
              <p><strong>Submitted:</strong> {formatRideTimestamp(suggestion.createdAt) || "Just now"}</p>
              <p><strong>Name:</strong> {suggestion.reporterName || "N/A"}</p>
              <p><strong>Phone:</strong> {suggestion.reporterPhone || "N/A"}</p>
              <p><strong>Phone Contact OK:</strong> {suggestion.contactConsentByPhone ? "Yes" : "No"}</p>
              <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                <strong>Description:</strong> {suggestion.description || "N/A"}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
