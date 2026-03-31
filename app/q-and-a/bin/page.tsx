"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth, db } from "../../../lib/firebase";
import { isAdminEmail } from "../../../lib/admin";
import { formatRelativeTimestamp, type QAPostRecord } from "../../../lib/q-and-a";

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
  minHeight: 40,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(126, 142, 160, 0.24)",
  background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
  color: "#ffffff",
  textDecoration: "none",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 11,
};

export default function QAForumBinPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<QAPostRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser || !isAdminEmail(currentUser.email)) {
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDocs(
          query(
            collection(db, "qaPosts"),
            where("pendingDeletionReview", "==", true),
            limit(50)
          )
        );

        setPosts(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<QAPostRecord, "id">),
          })).sort((left, right) => {
            const leftTime = typeof left.deleteRequestedAt === "string" ? Date.parse(left.deleteRequestedAt) : ((left.deleteRequestedAt as { seconds?: number } | undefined)?.seconds || 0) * 1000;
            const rightTime = typeof right.deleteRequestedAt === "string" ? Date.parse(right.deleteRequestedAt) : ((right.deleteRequestedAt as { seconds?: number } | undefined)?.seconds || 0) * 1000;
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

  const removePost = (postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
  };

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Forum Bin" caption="Opening deleted-thread review queue." /></main>;
  }

  if (!user || !isAdminEmail(user.email)) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Forum Bin</h1>
        <p>Admin access is required.</p>
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
                Deleted-thread review
              </p>
              <h1 style={{ margin: 0 }}>FORUM BIN</h1>
            </div>
          </div>
          <Link href="/q-and-a" style={buttonStyle}>Return to Forums</Link>
        </div>

        <section style={{ ...cardStyle, padding: "1rem", display: "grid", gap: 12 }}>
          <p style={{ margin: 0, color: "#cbd5e1" }}>
            User-deleted threads land here first so admin can review them, permanently remove them, or request permission to preserve them as read-only archive records.
          </p>
          {statusMessage ? <p style={{ margin: 0, color: "#7dd3fc" }}>{statusMessage}</p> : null}
          {posts.length === 0 ? (
            <p style={{ margin: 0, color: "#94a3b8" }}>No forum threads are waiting in the review bin right now.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {posts.map((post) => (
                <article key={post.id} style={{ ...cardStyle, padding: "1rem", display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <h2 style={{ margin: 0 }}>{post.title || "Untitled thread"}</h2>
                      <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font-display)" }}>
                        {post.authorLabel} {"//"} delete requested {formatRelativeTimestamp(post.deleteRequestedAt)}
                      </p>
                      <p style={{ margin: 0, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                        {post.body?.trim() || post.snippet?.trim() || "No saved body preview."}
                      </p>
                      {post.archivePermissionRequestedAt ? (
                        <p style={{ margin: 0, color: "#fcd34d", fontSize: 12 }}>
                          Archive permission requested {formatRelativeTimestamp(post.archivePermissionRequestedAt)}.
                          {post.archivePermissionResponseText ? ` User response: ${post.archivePermissionResponseText}` : " Awaiting user response."}
                        </p>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <Link href={`/q-and-a/${post.id}`} style={buttonStyle}>Open</Link>
                      <button
                        type="button"
                        onClick={async () => {
                          const idToken = await auth.currentUser?.getIdToken();
                          if (!idToken) return;
                          const message = window.prompt("Optional admin message for the archive permission request.", "") || "";
                          const response = await fetch(`/api/q-and-a/posts/${post.id}/archive-request`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${idToken}`,
                            },
                            body: JSON.stringify({ message }),
                          });
                          const payload = await response.json().catch(() => ({}));
                          if (!response.ok) {
                            window.alert(payload.error || "Could not request archive permission.");
                            return;
                          }
                          setPosts((current) =>
                            current.map((currentPost) =>
                              currentPost.id === post.id
                                ? {
                                    ...currentPost,
                                    archivePermissionRequestedAt: new Date().toISOString(),
                                  }
                                : currentPost
                            )
                          );
                          setStatusMessage("Archive permission request sent.");
                        }}
                        style={buttonStyle}
                      >
                        Request Archive
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const idToken = await auth.currentUser?.getIdToken();
                          if (!idToken) return;
                          const reason = window.prompt("Optional archive note for this thread.", "") || "";
                          const response = await fetch(`/api/q-and-a/posts/${post.id}/archive`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${idToken}`,
                            },
                            body: JSON.stringify({ reason }),
                          });
                          const payload = await response.json().catch(() => ({}));
                          if (!response.ok) {
                            window.alert(payload.error || "Could not archive this thread.");
                            return;
                          }
                          removePost(post.id);
                          setStatusMessage("Thread archived.");
                        }}
                        style={buttonStyle}
                      >
                        Archive Now
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const idToken = await auth.currentUser?.getIdToken();
                          if (!idToken) return;
                          const reason = window.prompt("Optional admin reason for permanently deleting this forum post.", "") || "";
                          const response = await fetch(`/api/q-and-a/posts/${post.id}`, {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${idToken}`,
                            },
                            body: JSON.stringify({ message: reason }),
                          });
                          const payload = await response.json().catch(() => ({}));
                          if (!response.ok) {
                            window.alert(payload.error || "Could not permanently delete this thread.");
                            return;
                          }
                          removePost(post.id);
                          setStatusMessage("Thread permanently deleted.");
                        }}
                        style={{
                          ...buttonStyle,
                          background: "linear-gradient(180deg, rgba(127, 29, 29, 0.96) 0%, rgba(82, 15, 15, 0.98) 100%)",
                        }}
                      >
                        Permanent Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
