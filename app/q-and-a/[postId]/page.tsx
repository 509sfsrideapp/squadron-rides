"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { ReportableTarget } from "../../components/MisconductReporting";
import { auth, db } from "../../../lib/firebase";
import { isAdminEmail } from "../../../lib/admin";
import { buildMisconductPreviewText } from "../../../lib/misconduct";
import {
  buildQACommentTree,
  formatRelativeTimestamp,
  getVisibleQAPostAuthorLabel,
  normalizeQAVoteValue,
  type QACommentRecord,
  type QACommentSortMode,
  type QAPostRecord,
  type QAVoteDocument,
} from "../../../lib/q-and-a";
import QACommentComposer from "../_components/QACommentComposer";
import QACommentItem from "../_components/QACommentItem";
import QAVoteControls from "../_components/QAVoteControls";

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [postRecord, setPostRecord] = useState<QAPostRecord | null>(null);
  const [comments, setComments] = useState<QACommentRecord[]>([]);
  const [postVote, setPostVote] = useState(0);
  const [commentVotesById, setCommentVotesById] = useState<Record<string, number>>({});
  const [commentSortMode, setCommentSortMode] = useState<QACommentSortMode>("top");
  const [editingPost, setEditingPost] = useState(false);
  const [postDraftTitle, setPostDraftTitle] = useState("");
  const [postDraftBody, setPostDraftBody] = useState("");
  const [postActionError, setPostActionError] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

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
      setPostVote(0);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "qaPostVotes"), where("userId", "==", user.uid)),
      (snapshot) => {
        const firstVote = snapshot.docs
          .map((docSnap) => docSnap.data() as QAVoteDocument)
          .find((vote) => vote.postId === params.postId);
        setPostVote(normalizeQAVoteValue(Number(firstVote?.value || 0)));
      }
    );

    return () => unsubscribe();
  }, [params.postId, user]);

  useEffect(() => {
    if (!user) {
      setCommentVotesById({});
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "qaCommentVotes"), where("userId", "==", user.uid)),
      (snapshot) => {
        const nextVotes: Record<string, number> = {};

        snapshot.docs.forEach((docSnap) => {
          const vote = docSnap.data() as QAVoteDocument;
          if (vote.commentId) {
            nextVotes[vote.commentId] = normalizeQAVoteValue(Number(vote.value || 0));
          }
        });

        setCommentVotesById(nextVotes);
      }
    );

    return () => unsubscribe();
  }, [user]);

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
  const showAdminIdentity = isAdminEmail(user?.email);
  const canEditPost = Boolean(user && postRecord && !postRecord.deleted && postRecord.authorId === user.uid);
  const canDeletePost = Boolean(
    user &&
      postRecord &&
      !postRecord.deleted &&
      (postRecord.authorId === user.uid || showAdminIdentity)
  );
  const visibleAuthorLabel = postRecord ? getVisibleQAPostAuthorLabel(postRecord, { showAdminIdentity }) : "";
  const adminAuthorLabel = postRecord ? (postRecord.authorAdminLabel?.trim() || postRecord.authorLabel) : "";

  useEffect(() => {
    if (!postRecord || editingPost) {
      return;
    }

    setPostDraftTitle(postRecord.title || "");
    setPostDraftBody(postRecord.body || "");
  }, [editingPost, postRecord]);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Discussion" caption="Opening the full post and comment thread." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Forum Post</h1>
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

        <ReportableTarget
          target={{
            targetType: "qa_post",
            targetId: postRecord.id,
            targetLabel: postRecord.title,
            targetPreview: buildMisconductPreviewText(postRecord.body || postRecord.snippet || postRecord.title),
            targetPath: `/q-and-a/${postRecord.id}`,
            targetOwnerUid: postRecord.authorId,
          }}
        >
        <section style={{ ...sectionStyle, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={infoPillStyle}>{postRecord.commentCount || 0} comments</span>
              <QAVoteControls
                score={postRecord.score || 0}
                currentVote={postVote}
                onVote={async (value) => {
                  const idToken = await auth.currentUser?.getIdToken();

                  if (!idToken) {
                    throw new Error("You need to sign in again before voting.");
                  }

                  const nextValue = postVote === value ? 0 : value;
                  const response = await fetch(`/api/q-and-a/posts/${postRecord.id}/vote`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ value: nextValue }),
                  });

                  const payload = (await response.json().catch(() => ({}))) as { error?: string };

                  if (!response.ok) {
                    throw new Error(payload.error || "Could not update the vote.");
                  }
                }}
                compact
              />
            </div>
            {canEditPost || canDeletePost ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canEditPost ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPostDraftTitle(postRecord.title || "");
                      setPostDraftBody(postRecord.body || "");
                      setPostActionError("");
                      setEditingPost((current) => !current);
                    }}
                    style={{
                      minHeight: 38,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(126, 142, 160, 0.22)",
                      background: "linear-gradient(180deg, rgba(39, 50, 68, 0.96) 0%, rgba(19, 28, 40, 0.98) 100%)",
                      color: "#e5edf7",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontSize: 11,
                    }}
                  >
                    {editingPost ? "Cancel Edit" : "Edit Post"}
                  </button>
                ) : null}
                {canDeletePost ? (
                  <button
                    type="button"
                    disabled={deletingPost}
                    onClick={async () => {
                      const confirmed = window.confirm("Delete this post? It will be removed from the feed.");

                      if (!confirmed) {
                        return;
                      }

                      const idToken = await auth.currentUser?.getIdToken();

                      if (!idToken) {
                        setPostActionError("You need to sign in again before deleting.");
                        return;
                      }

                      setDeletingPost(true);
                      setPostActionError("");

                      try {
                        const response = await fetch(`/api/q-and-a/posts/${postRecord.id}`, {
                          method: "DELETE",
                          headers: {
                            Authorization: `Bearer ${idToken}`,
                          },
                        });

                        const payload = (await response.json().catch(() => ({}))) as { error?: string };

                        if (!response.ok) {
                          throw new Error(payload.error || "Could not delete the post.");
                        }

                        router.replace("/q-and-a");
                      } catch (error) {
                        setPostActionError(error instanceof Error ? error.message : "Could not delete the post.");
                      } finally {
                        setDeletingPost(false);
                      }
                    }}
                    style={{
                      minHeight: 38,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(248, 113, 113, 0.28)",
                      background: "linear-gradient(180deg, rgba(127, 29, 29, 0.92) 0%, rgba(69, 10, 10, 0.98) 100%)",
                      color: "#fee2e2",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontSize: 11,
                      opacity: deletingPost ? 0.7 : 1,
                    }}
                  >
                    {deletingPost ? "Deleting..." : canEditPost ? "Delete Post" : "Admin Delete"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {editingPost && canEditPost ? (
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                  Title
                </span>
                <input
                  value={postDraftTitle}
                  onChange={(event) => setPostDraftTitle(event.target.value)}
                  placeholder="Post title"
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                  Body
                </span>
                <textarea
                  value={postDraftBody}
                  onChange={(event) => setPostDraftBody(event.target.value)}
                  rows={8}
                  placeholder="Add more detail to your post."
                  style={{ resize: "vertical" }}
                />
              </label>
              {postActionError ? <p style={{ margin: 0, color: "#fca5a5" }}>{postActionError}</p> : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={savingPost}
                  onClick={async () => {
                    const title = postDraftTitle.trim();
                    const body = postDraftBody.trim();

                    if (!title) {
                      setPostActionError("Post title is required.");
                      return;
                    }

                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      setPostActionError("You need to sign in again before editing.");
                      return;
                    }

                    setSavingPost(true);
                    setPostActionError("");

                    try {
                      const response = await fetch(`/api/q-and-a/posts/${postRecord.id}`, {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${idToken}`,
                        },
                        body: JSON.stringify({
                          title,
                          body,
                        }),
                      });

                      const payload = (await response.json().catch(() => ({}))) as { error?: string };

                      if (!response.ok) {
                        throw new Error(payload.error || "Could not update the post.");
                      }

                      setEditingPost(false);
                    } catch (error) {
                      setPostActionError(error instanceof Error ? error.message : "Could not update the post.");
                    } finally {
                      setSavingPost(false);
                    }
                  }}
                  style={{
                    minHeight: 40,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(126, 142, 160, 0.24)",
                    background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
                    color: "#ffffff",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: 11,
                    opacity: savingPost ? 0.7 : 1,
                  }}
                >
                  {savingPost ? "Saving..." : "Save Post"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPost(false);
                    setPostActionError("");
                    setPostDraftTitle(postRecord.title || "");
                    setPostDraftBody(postRecord.body || "");
                  }}
                  style={{
                    minHeight: 40,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(126, 142, 160, 0.22)",
                    background: "linear-gradient(180deg, rgba(39, 50, 68, 0.96) 0%, rgba(19, 28, 40, 0.98) 100%)",
                    color: "#e5edf7",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: 11,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
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
                  {visibleAuthorLabel}
                  {" // "}
                  {formatRelativeTimestamp(postRecord.createdAt)}
                </p>
                {postRecord.anonymous && showAdminIdentity ? (
                  <p
                    style={{
                      margin: 0,
                      color: "#fca5a5",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    Admin View // Posted by {adminAuthorLabel}
                  </p>
                ) : null}
              </div>

              <p style={{ margin: 0, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {postRecord.deleted ? "[deleted]" : postRecord.body?.trim() || "No body text was added to this post."}
              </p>
              {postActionError ? <p style={{ margin: 0, color: "#fca5a5" }}>{postActionError}</p> : null}
            </>
          )}
        </section>
        </ReportableTarget>

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
                  currentVote={commentVotesById[comment.id] || 0}
                  voteByCommentId={commentVotesById}
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
                  onVote={async (commentId, value) => {
                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before voting.");
                    }

                    const currentVote = commentVotesById[commentId] || 0;
                    const nextValue = currentVote === value ? 0 : value;
                    const response = await fetch(`/api/q-and-a/comments/${commentId}/vote`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                      },
                      body: JSON.stringify({ value: nextValue }),
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not update the vote.");
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
