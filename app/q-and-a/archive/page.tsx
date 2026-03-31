"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth, db } from "../../../lib/firebase";
import { type QAPostRecord } from "../../../lib/q-and-a";
import QAPostCard from "../_components/QAPostCard";

const shellStyle: React.CSSProperties = {
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

const buttonStyle: React.CSSProperties = {
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

export default function QAArchivePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<QAPostRecord[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDocs(
          query(
            collection(db, "qaPosts"),
            where("archived", "==", true),
            limit(50)
          )
        );

        setPosts(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<QAPostRecord, "id">),
          })).sort((left, right) => {
            const leftTime = typeof left.archivedAt === "string" ? Date.parse(left.archivedAt) : ((left.archivedAt as { seconds?: number } | undefined)?.seconds || 0) * 1000;
            const rightTime = typeof right.archivedAt === "string" ? Date.parse(right.archivedAt) : ((right.archivedAt as { seconds?: number } | undefined)?.seconds || 0) * 1000;
            return rightTime - leftTime;
          })
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Archive" caption="Opening preserved forum threads." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Forum Archive</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <div style={{ display: "grid", gap: 6 }}>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                Preserved threads
              </p>
              <h1 style={{ margin: 0 }}>FORUM ARCHIVE</h1>
            </div>
          </div>
          <Link href="/q-and-a" style={buttonStyle}>Return to Forums</Link>
        </div>

        <section style={{ ...cardStyle, padding: "1rem", display: "grid", gap: 12 }}>
          <p style={{ margin: 0, color: "#cbd5e1" }}>
            Archived threads stay readable for reference, but nobody can vote, comment, or interact with them anymore.
          </p>
          {posts.length === 0 ? (
            <p style={{ margin: 0, color: "#94a3b8" }}>No forum threads have been archived yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {posts.map((post) => (
                <QAPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
