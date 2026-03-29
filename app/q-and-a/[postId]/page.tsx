"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth, db } from "../../../lib/firebase";
import {
  buildQACommentTree,
  formatRelativeTimestamp,
  type QACommentRecord,
  type QACommentSortMode,
  type QAPostRecord,
} from "../../../lib/q-and-a";
import QACommentComposer from "../_components/QACommentComposer";
import QACommentItem from "../_components/QACommentItem";

const sectionStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(126, 142, 160, 0.18)",
  background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
  padding: "1rem 1rem 1.1rem",
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

export default function QAPostDetailPage() {
  const params = useParams<{ postId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [postRecord, setPostRecord] = useState<QAPostRecord | null>(null);
  const [comments, setComments] = useState<QACommentRecord[]>([]);
  const [commentSortMode, setCommentSortMode] = useState<QACommentSortMode>("top");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !params.postId) {
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "qaPosts", params.postId), (snapshot) => {
      if (!snapshot.exists()) {
        setPostRecord(null);
        return;
      }

      setPostRecord({
        id: snapshot.id,
        ...(snapshot.data() as Omit<QAPostRecord, "id">),
      });
    });

    return () => unsubscribe();
  }, [params.postId, user]);

  useEffect(() => {
    if (!user || !params.postId) {
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "qaComments"), where("postId", "==", params.postId)),
      (snapshot) => {
        setComments(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<QACommentRecord, "id">),
          }))
        );
      }
    );

    return () => unsubscribe();
  }, [params.postId, user]);

  const commentTree = useMemo(() => buildQACommentTree(comments, commentSortMode), [commentSortMode, comments]);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Discussion" caption="Opening the full post and comment thread." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Q&amp;A Post</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  if (!postRecord) {
    return (
      <main style={{ padding: 20 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <Link
              href="/q-and-a"
              style={{
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
              }}
            >
              Return to Feed
            </Link>
          </div>

          <section style={sectionStyle}>
            <h1 style={{ marginTop: 0 }}>Post Unavailable</h1>
            <p style={{ marginBottom: 0, color: "#cbd5e1" }}>
              This discussion post could not be found.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <HomeIconLink style={{ marginBottom: 0 }} />
          <Link
            href="/q-and-a"
            style={{
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
            }}
          >
            Return to Feed
          </Link>
        </div>

        <section style={{ ...sectionStyle, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={infoPillStyle}>{postRecord.commentCount || 0} comments</span>
            <span style={infoPillStyle}>Score {postRecord.score || 0}</span>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <h1 style={{ margin: 0 }}>{postRecord.deleted ? "[deleted]" : postRecord.title}</h1>
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              {postRecord.authorLabel}
              {" // "}
              {formatRelativeTimestamp(postRecord.createdAt)}
            </p>
          </div>

          <p style={{ margin: 0, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {postRecord.deleted ? "[deleted]" : postRecord.body?.trim() || "No body text was added to this post."}
          </p>
        </section>

        <section style={{ ...sectionStyle, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <strong
              style={{
                fontSize: 15,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              Comments
            </strong>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                Sort
              </span>
              <select value={commentSortMode} onChange={(event) => setCommentSortMode(event.target.value as QACommentSortMode)}>
                <option value="top">Top</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {!postRecord.deleted ? (
            <QACommentComposer
              placeholder="Add a top-level comment..."
              submitLabel="Post Comment"
              onSubmit={async (body) => {
                const idToken = await auth.currentUser?.getIdToken();

                if (!idToken) {
                  throw new Error("You need to sign in again before commenting.");
                }

                const response = await fetch("/api/q-and-a/comments", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                  },
                  body: JSON.stringify({
                    postId: postRecord.id,
                    parentCommentId: null,
                    body,
                  }),
                });

                const payload = (await response.json().catch(() => ({}))) as { error?: string };

                if (!response.ok) {
                  throw new Error(payload.error || "Could not create the comment.");
                }
              }}
            />
          ) : null}

          {commentTree.length === 0 ? (
            <p style={{ margin: 0, color: "#cbd5e1" }}>No comments yet. Start the thread below this post.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {commentTree.map((comment) => (
                <QACommentItem
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  currentUserId={user.uid}
                  onReply={async (parentCommentId, body) => {
                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before replying.");
                    }

                    const response = await fetch("/api/q-and-a/comments", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                      },
                      body: JSON.stringify({
                        postId: postRecord.id,
                        parentCommentId,
                        body,
                      }),
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not create the reply.");
                    }
                  }}
                  onUpdate={async (commentId, body) => {
                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before editing.");
                    }

                    const response = await fetch(`/api/q-and-a/comments/${commentId}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                      },
                      body: JSON.stringify({ body }),
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not update the comment.");
                    }
                  }}
                  onDelete={async (commentId) => {
                    const confirmed = window.confirm("Delete this comment?");
                    if (!confirmed) {
                      return;
                    }

                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before deleting.");
                    }

                    const response = await fetch(`/api/q-and-a/comments/${commentId}`, {
                      method: "DELETE",
                      headers: {
                        Authorization: `Bearer ${idToken}`,
                      },
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not delete the comment.");
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
