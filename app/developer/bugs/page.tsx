"use client";

import { useEffect, useState } from "react";
import AppLoadingState from "../../components/AppLoadingState";
import DeveloperBackLink from "../../components/DeveloperBackLink";
import { auth, db } from "../../../lib/firebase";
import { isAdminEmail } from "../../../lib/admin";
import { formatRideTimestamp } from "../../../lib/ride-lifecycle";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

type BugReport = {
  id: string;
  description?: string;
  contactConsentByPhone?: boolean;
  reporterName?: string;
  reporterPhone?: string;
  createdAt?: { seconds?: number };
};

export default function DeveloperBugPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<BugReport[]>([]);

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
      query(collection(db, "bugReports"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const nextReports: BugReport[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BugReport, "id">),
        }));
        setReports(nextReports);
      }
    );

    return () => unsubscribe();
  }, [authorized]);

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Bug Reports" caption="Opening the developer bug inbox." />
      </main>
    );
  }

  if (!user || !authorized) {
    return (
      <main style={{ padding: 20 }}>
        <DeveloperBackLink />
        <h1>Bug Reports</h1>
        <p>This page is only available to the authorized developer/admin account.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <DeveloperBackLink />
      <h1>Bug Reports</h1>
      <p style={{ maxWidth: 680 }}>
        Review all submitted bug reports here, including the reporter name and phone number.
      </p>

      <section style={{ marginTop: 20 }}>
        {reports.length === 0 ? (
          <p>No bug reports have been submitted yet.</p>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
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
              <p><strong>Submitted:</strong> {formatRideTimestamp(report.createdAt) || "Just now"}</p>
              <p><strong>Name:</strong> {report.reporterName || "N/A"}</p>
              <p><strong>Phone:</strong> {report.reporterPhone || "N/A"}</p>
              <p><strong>Phone Contact OK:</strong> {report.contactConsentByPhone ? "Yes" : "No"}</p>
              <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                <strong>Description:</strong> {report.description || "N/A"}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
