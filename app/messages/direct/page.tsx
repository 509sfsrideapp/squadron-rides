"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

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
        <HomeIconLink />
        <h1>Direct Messages</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />
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
          style={{
            display: "inline-block",
            marginTop: 16,
            color: "#b4d4a7",
            textDecoration: "none",
          }}
        >
          Open Inbox
        </Link>
      </div>
    </main>
  );
}
