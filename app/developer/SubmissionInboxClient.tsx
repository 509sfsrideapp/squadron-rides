"use client";

import { useEffect, useState } from "react";
import AppLoadingState from "../components/AppLoadingState";
import DeveloperBackLink from "../components/DeveloperBackLink";

type SubmissionItem = {
  id: string;
  description?: string;
  contactConsentByPhone?: boolean;
  reporterName?: string;
  reporterPhone?: string;
  createdAt?: string;
};

type SubmissionInboxClientProps = {
  type: "bugReports" | "suggestions";
  title: string;
  description: string;
};

function formatSubmittedAt(value?: string) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString();
}

export default function SubmissionInboxClient({
  type,
  title,
  description,
}: SubmissionInboxClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<SubmissionItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/developer/submissions?type=${type}`, {
          cache: "no-store",
          credentials: "include",
        });
        const payload = (await response.json().catch(() => null)) as
          | { items?: SubmissionItem[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not load submissions.");
        }

        if (!cancelled) {
          setItems(payload?.items || []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Could not load submissions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [type]);

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title={`Loading ${title}`} caption="Opening the developer submission inbox." />
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <DeveloperBackLink />
      <h1>{title}</h1>
      <p style={{ maxWidth: 680 }}>{description}</p>

      {error ? <p style={{ color: "#fca5a5" }}>{error}</p> : null}

      <section style={{ marginTop: 20 }}>
        {items.length === 0 ? (
          <p>No submissions have been received yet.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
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
              <p><strong>Submitted:</strong> {formatSubmittedAt(item.createdAt)}</p>
              <p><strong>Name:</strong> {item.reporterName || "N/A"}</p>
              <p><strong>Phone:</strong> {item.reporterPhone || "N/A"}</p>
              <p><strong>Phone Contact OK:</strong> {item.contactConsentByPhone ? "Yes" : "No"}</p>
              <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                <strong>Description:</strong> {item.description || "N/A"}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
