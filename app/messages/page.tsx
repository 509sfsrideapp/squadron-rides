"use client";

import { useEffect, useState } from "react";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import InboxPageClient from "./InboxPageClient";

const inboxHomeButtonStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(24, 38, 29, 0.98) 0%, rgba(9, 17, 12, 0.99) 100%)",
  border: "1px solid rgba(134, 239, 172, 0.22)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 26px rgba(0, 0, 0, 0.28)",
};

export default function MessagesPage() {
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
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Inbox" caption="Opening your inbox and message channels." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink style={inboxHomeButtonStyle} />
        <h1>Inbox</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink style={inboxHomeButtonStyle} />
      <h1>Inbox</h1>

      <InboxPageClient userId={user.uid} />
    </main>
  );
}
