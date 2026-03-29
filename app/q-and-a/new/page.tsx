"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth } from "../../../lib/firebase";
import QAPostComposer from "../_components/QAPostComposer";

export default function NewQAPostPage() {
  const router = useRouter();
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
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Post Composer" caption="Preparing the discussion composer." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Create Post</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <HomeIconLink style={{ marginBottom: 0 }} />
        </div>

        <QAPostComposer
          onSubmit={async ({ title, body }) => {
            const idToken = await auth.currentUser?.getIdToken();

            if (!idToken) {
              throw new Error("You need to sign in again before posting.");
            }

            const response = await fetch("/api/q-and-a/posts", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                title,
                body,
              }),
            });

            const payload = (await response.json().catch(() => ({}))) as { error?: string; postId?: string };

            if (!response.ok || !payload.postId) {
              throw new Error(payload.error || "Could not create the post.");
            }

            router.push(`/q-and-a/${payload.postId}`);
          }}
        />
      </div>
    </main>
  );
}
