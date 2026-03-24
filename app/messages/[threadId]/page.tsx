"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppLoadingState from "../../components/AppLoadingState";
import { auth } from "../../../lib/firebase";
import { getMessageThreadDefinition, getSystemThreadMessages, type MessageThreadIconKey } from "../../../lib/messages";
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

export default function MessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const thread = getMessageThreadDefinition(params.threadId);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const messages = useMemo(() => (thread ? getSystemThreadMessages(thread.id) : []), [thread]);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Messages" caption="Opening the selected message thread." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <Link href="/login" style={{ display: "inline-block", padding: "8px 14px", backgroundColor: "#1f2937", color: "white", textDecoration: "none", borderRadius: 8 }}>
          Login
        </Link>
        <p style={{ marginTop: 20 }}>You need to log in first.</p>
      </main>
    );
  }

  if (!thread) {
    return (
      <main style={{ padding: 20 }}>
        <Link href="/messages" style={{ display: "inline-block", marginBottom: 20, color: "#93c5fd", textDecoration: "none" }}>
          Back to Messages
        </Link>
        <h1>Message Not Found</h1>
        <p>This thread does not exist yet.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <Link href="/messages" style={{ display: "inline-block", marginBottom: 18, color: "#93c5fd", textDecoration: "none" }}>
        Back to Messages
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
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
          <h1 style={{ margin: 0 }}>{thread.title}</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>{thread.subtitle}</p>
        </div>
      </div>

      <div
        style={{
          maxWidth: 760,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: 16,
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid rgba(148, 163, 184, 0.12)", backgroundColor: "rgba(15, 23, 42, 0.6)" }}>
          <strong>{thread.channelLabel}</strong>
          <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>{thread.description}</p>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                maxWidth: "min(92%, 560px)",
                padding: "12px 14px",
                borderRadius: 14,
                backgroundColor: "rgba(15, 23, 42, 0.72)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong>{message.senderLabel}</strong>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{message.timestampLabel}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.text}</p>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid rgba(148, 163, 184, 0.12)", color: "#94a3b8" }}>
          Replies and new message delivery will be wired in here next.
        </div>
      </div>
    </main>
  );
}
