"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { markInboxThreadRead } from "../../lib/inbox-badges";
import { toTimestampMs } from "../../lib/ride-dispatch";
import FullscreenImageViewer from "../components/FullscreenImageViewer";
import { getMessageThreadDefinition, getSystemThreadMessages, isMessageThreadId, type MessageThreadIconKey, type MessageThreadId } from "../../lib/messages";

type InboxPost = {
  id: string;
  threadId: MessageThreadId;
  title: string;
  body: string;
  imageUrl?: string | null;
  senderLabel: string;
  requiresResponse?: boolean;
  responsePrompt?: string | null;
  responseText?: string | null;
  responseSubmittedAt?: { seconds?: number; nanoseconds?: number } | null;
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
};

function ThreadIcon({ iconKey }: { iconKey: MessageThreadIconKey }) {
  if (iconKey === "bell") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17H9c-1.6 0-2.7-1.4-2.4-3l.5-2.5a9.2 9.2 0 0 0 .2-1.9V9a4.7 4.7 0 1 1 9.4 0v.6c0 .6.1 1.3.2 1.9l.5 2.5c.3 1.6-.8 3-2.4 3Z" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></svg>;
  }

  if (iconKey === "shield") return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 5 6v5c0 4.5 2.7 8.5 7 10 4.3-1.5 7-5.5 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7L14.8 10" /></svg>;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 8.5 4.5 12.1 8.5 15.5" />
      <path d="M15.5 8.5 19.5 12.1 15.5 15.5" />
      <path d="M10.2 17.2 13.8 6.8" />
    </svg>
  );
}

function formatTimestamp(createdAt?: { seconds?: number; nanoseconds?: number } | null) {
  if (!createdAt?.seconds) return "Moments ago";
  return new Date(createdAt.seconds * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function InboxThreadClient({ threadId, userId }: { threadId: string; userId: string }) {
  const thread = getMessageThreadDefinition(threadId);
  const [posts, setPosts] = useState<InboxPost[]>([]);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [submittingResponseId, setSubmittingResponseId] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string>("");

  useEffect(() => {
    if (!thread) return;
    const postsQuery =
      thread.id === "notifications"
        ? query(collection(db, "userInboxPosts"), where("userId", "==", userId))
        : query(collection(db, "inboxPosts"), where("threadId", "==", thread.id));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const nextPosts = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<InboxPost, "id">) }))
        .filter((post) => isMessageThreadId(post.threadId))
        .filter((post) => post.threadId === thread.id)
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPosts(nextPosts);
    });
    return () => unsubscribe();
  }, [thread, userId]);

  const fallbackMessages = useMemo(() => (thread ? getSystemThreadMessages(thread.id) : []), [thread]);

  const submitResponse = async (event: FormEvent<HTMLFormElement>, post: InboxPost) => {
    event.preventDefault();
    if (!thread) return;
    const responseText = (responseDrafts[post.id] || "").trim();

    if (!responseText) {
      setResponseError("Please enter a response before submitting.");
      return;
    }

    try {
      setSubmittingResponseId(post.id);
      setResponseError("");
      const idToken = await auth.currentUser?.getIdToken();

      if (!idToken) {
        throw new Error("You need to log in again before submitting this response.");
      }

      const response = await fetch(`/api/user-inbox-posts/${post.id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ responseText }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not submit your response.");
      }

      markInboxThreadRead(thread.id, toTimestampMs(posts[0]?.createdAt));
      setResponseDrafts((current) => ({ ...current, [post.id]: "" }));
    } catch (error) {
      console.error(error);
      setResponseError(error instanceof Error ? error.message : "Could not submit your response.");
    } finally {
      setSubmittingResponseId(null);
    }
  };

  if (!thread) {
    return (
      <main style={{ padding: 20 }}>
        <Link href="/messages" style={{ display: "inline-block", marginBottom: 20, color: "#93c5fd", textDecoration: "none" }}>Return to Inbox</Link>
        <h1>Thread Unavailable</h1>
        <p>That inbox thread could not be found.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <Link href="/messages" style={{ display: "inline-block", marginBottom: 18, color: "#93c5fd", textDecoration: "none" }}>Return to Inbox</Link>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", backgroundColor: thread.iconBackground, color: thread.iconColor, border: "1px solid rgba(148, 163, 184, 0.16)" }}>
          <ThreadIcon iconKey={thread.iconKey} />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{thread.title}</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>{thread.subtitle}</p>
        </div>
      </div>
      <div style={{ maxWidth: 820, border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: 16, backgroundColor: "rgba(9, 15, 25, 0.88)", boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid rgba(148, 163, 184, 0.12)", backgroundColor: "rgba(15, 23, 42, 0.6)" }}>
          <strong>{thread.channelLabel}</strong>
          <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>{thread.description}</p>
        </div>
        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          {posts.length > 0 ? posts.map((post) => (
            <div key={post.id} style={{ maxWidth: "min(100%, 720px)", borderRadius: 14, backgroundColor: "rgba(15, 23, 42, 0.72)", border: "1px solid rgba(148, 163, 184, 0.14)", overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => {
                  const nextExpanded = expandedPostId === post.id ? null : post.id;
                  setExpandedPostId(nextExpanded);

                  if (nextExpanded) {
                    markInboxThreadRead(thread.id, toTimestampMs(posts[0]?.createdAt));
                    setResponseError("");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "transparent",
                  border: "none",
                  color: "#e5edf7",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{post.senderLabel}</strong>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{formatTimestamp(post.createdAt)}</span>
                    </div>
                    <h3 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</h3>
                  </div>
                  <span style={{ color: "#94a3b8", fontSize: 20 }}>{expandedPostId === post.id ? "−" : "+"}</span>
                </div>
              </button>

              {expandedPostId === post.id ? (
                <div style={{ padding: "0 16px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: post.imageUrl ? "120px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
                    {post.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setViewerImage({ src: post.imageUrl || "", alt: post.title })}
                        style={{ padding: 0, background: "transparent", border: "none", cursor: "zoom-in" }}
                      >
                        <img src={post.imageUrl} alt={post.title} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(148, 163, 184, 0.14)" }} />
                      </button>
                    ) : null}
                    <div>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{post.body}</p>

                      {post.requiresResponse ? (
                        <div
                          style={{
                            marginTop: 14,
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: "rgba(8, 47, 73, 0.38)",
                            border: "1px solid rgba(56, 189, 248, 0.18)",
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <strong style={{ color: "#e0f2fe" }}>
                            {post.responseSubmittedAt ? "Response received" : "Response required"}
                          </strong>
                          <p style={{ margin: 0, color: "#cbd5e1" }}>
                            {post.responsePrompt || "Please tell us why this action was taken so dispatch can track issues and improve operations."}
                          </p>

                          {post.responseSubmittedAt ? (
                            <div
                              style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                backgroundColor: "rgba(15, 23, 42, 0.72)",
                                border: "1px solid rgba(148, 163, 184, 0.14)",
                              }}
                            >
                              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{post.responseText || "Response saved."}</p>
                              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#94a3b8" }}>
                                Submitted {formatTimestamp(post.responseSubmittedAt)}
                              </p>
                            </div>
                          ) : (
                            <form onSubmit={(event) => void submitResponse(event, post)} style={{ display: "grid", gap: 10 }}>
                              <textarea
                                value={responseDrafts[post.id] || ""}
                                onChange={(event) =>
                                  setResponseDrafts((current) => ({
                                    ...current,
                                    [post.id]: event.target.value,
                                  }))
                                }
                                rows={4}
                                placeholder="Enter your explanation here."
                                style={{
                                  width: "100%",
                                  padding: 12,
                                  borderRadius: 10,
                                  border: "1px solid rgba(148, 163, 184, 0.18)",
                                  backgroundColor: "rgba(15, 23, 42, 0.78)",
                                  color: "#e5edf7",
                                  resize: "vertical",
                                }}
                              />
                              {responseError && expandedPostId === post.id ? (
                                <p style={{ margin: 0, color: "#fca5a5" }}>{responseError}</p>
                              ) : null}
                              <button
                                type="submit"
                                disabled={submittingResponseId === post.id}
                                style={{
                                  justifySelf: "start",
                                  padding: "10px 14px",
                                  backgroundColor: "#0f766e",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: 10,
                                  cursor: submittingResponseId === post.id ? "wait" : "pointer",
                                  fontWeight: 700,
                                }}
                              >
                                {submittingResponseId === post.id ? "Submitting..." : "Submit Response"}
                              </button>
                            </form>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )) : fallbackMessages.map((message) => (
            <div key={message.id} style={{ maxWidth: "min(92%, 560px)", padding: "12px 14px", borderRadius: 14, backgroundColor: "rgba(15, 23, 42, 0.72)", border: "1px solid rgba(148, 163, 184, 0.14)" }}>
              <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong>{message.senderLabel}</strong>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{message.timestampLabel}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.text}</p>
            </div>
          ))}
        </div>
      </div>
      <FullscreenImageViewer
        src={viewerImage?.src || ""}
        alt={viewerImage?.alt || "Inbox image"}
        open={Boolean(viewerImage)}
        onClose={() => setViewerImage(null)}
      />
    </main>
  );
}
