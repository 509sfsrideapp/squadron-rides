"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

const inboxHomeButtonStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(24, 38, 29, 0.98) 0%, rgba(9, 17, 12, 0.99) 100%)",
  border: "1px solid rgba(134, 239, 172, 0.22)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 26px rgba(0, 0, 0, 0.28)",
};

const inboxNavButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "10px 16px",
  borderRadius: 12,
  textDecoration: "none",
  background: "linear-gradient(180deg, rgba(34, 197, 94, 0.94) 0%, rgba(21, 128, 61, 0.98) 100%)",
  color: "#f8fafc",
  border: "1px solid rgba(134, 239, 172, 0.28)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(6, 78, 59, 0.24)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 12,
};

export default function DirectMessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Direct Messages" caption="Opening your direct message workspace." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink style={inboxHomeButtonStyle} />
        <h1>Direct Messages</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink style={inboxHomeButtonStyle} />
      <h1>Direct Messages</h1>
      <p style={{ maxWidth: 700 }}>
        This is the future home for one-to-one user messaging. We can wire inbox threads, unread counts, and user search
        into this screen next.
      </p>
      <div
        style={{
          marginTop: 20,
          maxWidth: 760,
          padding: 18,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
        }}
      >
        <strong>Direct message threads are coming next.</strong>
        <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
          Once we add user-to-user messaging, your conversations will show up here as their own message list.
        </p>
        <Link
          href="/messages"
          style={{ ...inboxNavButtonStyle, marginTop: 16 }}
        >
          Open Inbox
        </Link>
      </div>
    </main>
  );
}
