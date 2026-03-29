"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import { auth, db } from "../../lib/firebase";
import { sortQAPosts, type QAPostRecord, type QAPostSortMode } from "../../lib/q-and-a";
import QAPostCard from "./_components/QAPostCard";

const pageShellStyle: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  display: "grid",
  gap: 18,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(126, 142, 160, 0.18)",
  background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "10px 16px",
  borderRadius: 12,
  textDecoration: "none",
  background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
  color: "#ffffff",
  border: "1px solid rgba(126, 142, 160, 0.24)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 12,
};

const infoPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 11px",
  borderRadius: 999,
  border: "1px solid rgba(126, 142, 160, 0.16)",
  background: "rgba(17, 24, 39, 0.62)",
  color: "#dbe7f5",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: "var(--font-display)",
};

export default function QAndAPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<QAPostRecord[]>([]);
  const [sortMode, setSortMode] = useState<QAPostSortMode>("newest");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = onSnapshot(collection(db, "qaPosts"), (snapshot) => {
      const nextPosts = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<QAPostRecord, "id">),
      }));

      setPosts(nextPosts);
    });

    return () => unsubscribe();
  }, [user]);

  const visiblePosts = useMemo(() => sortQAPosts(posts, sortMode), [posts, sortMode]);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Q&A" caption="Opening the discussion feed." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Q&amp;A</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={pageShellStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <div style={{ display: "grid", gap: 6 }}>
              <p
                style={{
                  margin: 0,
                  color: "#94a3b8",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}
              >
                Discussion feed
              </p>
              <h1 style={{ margin: "4px 0 0" }}>Q&amp;A</h1>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={infoPillStyle}>{visiblePosts.length} posts shown</span>
                <span style={infoPillStyle}>Threaded discussion enabled</span>
              </div>
            </div>
          </div>

          <Link href="/q-and-a/new" style={{ ...primaryButtonStyle, gap: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            <span>Create Post</span>
          </Link>
        </div>

        <section style={{ ...cardStyle, padding: "1rem 1rem 1.05rem", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <strong
              style={{
                fontSize: 15,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              Post Feed
            </strong>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                Sort
              </span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as QAPostSortMode)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="top">Top</option>
              </select>
            </div>
          </div>

          {visiblePosts.length === 0 ? (
            <div
              style={{
                borderRadius: 14,
                border: "1px dashed rgba(126, 142, 160, 0.16)",
                background: "rgba(12, 18, 26, 0.72)",
                padding: "1rem",
                display: "grid",
                gap: 10,
              }}
            >
              <p style={{ margin: 0, color: "#cbd5e1" }}>
                No posts yet. Start the discussion by creating the first thread.
              </p>
              <div>
                <Link href="/q-and-a/new" style={primaryButtonStyle}>
                  Create First Post
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {visiblePosts.map((post) => (
                <QAPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
