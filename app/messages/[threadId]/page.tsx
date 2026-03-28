"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppLoadingState from "../../components/AppLoadingState";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import InboxThreadClient from "../InboxThreadClient";

export default function MessageThreadPage() {
  const params = useParams<{ threadId: string }>();
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
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Inbox" caption="Opening the selected inbox thread." /></main>;
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

  return <InboxThreadClient threadId={params.threadId} userId={user.uid} />;
}
