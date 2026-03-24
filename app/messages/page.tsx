"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import { auth } from "../../lib/firebase";
import { getAllMessageThreads, type MessageThreadDefinition, type MessageThreadIconKey } from "../../lib/messages";
import { onAuthStateChanged, User } from "firebase/auth";

function ThreadIcon({ iconKey }: { iconKey: MessageThreadIconKey }) {
  if (iconKey === "bell") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 4a4 4 0 0 0-4 4v1.3c0 .8-.2 1.5-.6 2.2L6 14h12l-1.4-2.5c-.4-.7-.6-1.4-.6-2.2V8a4 4 0 0 0-4-4Z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
      </svg>
    );
  }

  if (iconKey === "shield") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 5 6v5c0 4.5 2.7 8.5 7 10 4.3-1.5 7-5.5 7-10V6l-7-3Z" />
        <path d="m9.5 12 1.7 1.7L14.8 10" />
      </svg>
    );
  }

  if (iconKey === "user") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.6-3.5 4.1-5.2 7-5.2s5.4 1.7 7 5.2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v4" />
      <path d="M6.6 6.6 9.4 9.4" />
      <path d="M3 12h4" />
      <path d="M6.6 17.4 9.4 14.6" />
      <path d="M12 17v4" />
      <path d="m17.4 14.6-2.8 2.8" />
      <path d="M17 12h4" />
      <path d="m17.4 6.6-2.8 2.8" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function ThreadCard({ thread }: { thread: MessageThreadDefinition }) {
  return (
    <Link
      href={`/messages/${thread.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 14,
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        textDecoration: "none",
        color: "#e5edf7",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        backgroundColor: "rgba(9, 15, 25, 0.88)",
        boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: "grid",
          placeItems: "center",
          backgroundColor: thread.iconBackground,
          color: thread.iconColor,
          border: "1px solid rgba(148, 163, 184, 0.16)",
        }}
      >
        <ThreadIcon iconKey={thread.iconKey} />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong>{thread.title}</strong>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{thread.channelLabel}</span>
        </div>
        <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>{thread.previewText}</p>
      </div>

      <span style={{ color: "#64748b", fontSize: 20 }}>&rsaquo;</span>
    </Link>
  );
}

export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const threads = useMemo(() => getAllMessageThreads(), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Messages" caption="Opening your inbox and message channels." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Messages</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />
      <h1>Messages</h1>
      <p style={{ maxWidth: 700 }}>
        This inbox is now set up for future notifications, admin/dev messages, and direct messages between users.
      </p>

      <div style={{ marginTop: 22, display: "grid", gap: 14, maxWidth: 780 }}>
        <h2 style={{ marginBottom: 0 }}>System Channels</h2>
        {threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </div>

      <div style={{ marginTop: 26, maxWidth: 780 }}>
        <h2>Direct Messages</h2>
        <div
          style={{
            padding: 18,
            borderRadius: 16,
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backgroundColor: "rgba(9, 15, 25, 0.88)",
            boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                backgroundColor: "rgba(59, 130, 246, 0.12)",
                color: "#dbeafe",
              }}
            >
              <ThreadIcon iconKey="user" />
            </div>
            <div>
              <strong>Direct messages are coming next.</strong>
              <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>
                This section is reserved for one-to-one user conversations once we wire those threads in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
