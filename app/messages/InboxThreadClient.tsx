"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
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
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
};

function ThreadIcon({ iconKey }: { iconKey: MessageThreadIconKey }) {
  if (iconKey === "shield") return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 5 6v5c0 4.5 2.7 8.5 7 10 4.3-1.5 7-5.5 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7L14.8 10" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v4" /><path d="M6.6 6.6 9.4 9.4" /><path d="M3 12h4" /><path d="M6.6 17.4 9.4 14.6" /><path d="M12 17v4" /><path d="m17.4 14.6-2.8 2.8" /><path d="M17 12h4" /><path d="m17.4 6.6-2.8 2.8" /><circle cx="12" cy="12" r="3.5" /></svg>;
}

function formatTimestamp(createdAt?: { seconds?: number; nanoseconds?: number } | null) {
  if (!createdAt?.seconds) return "Just now";
  return new Date(createdAt.seconds * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function InboxThreadClient({ threadId }: { threadId: string }) {
  const thread = getMessageThreadDefinition(threadId);
  const [posts, setPosts] = useState<InboxPost[]>([]);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!thread) return;
    const postsQuery = query(collection(db, "inboxPosts"), where("threadId", "==", thread.id));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const nextPosts = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<InboxPost, "id">) }))
        .filter((post) => isMessageThreadId(post.threadId))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPosts(nextPosts);
    });
    return () => unsubscribe();
  }, [thread]);

  const fallbackMessages = useMemo(() => (thread ? getSystemThreadMessages(thread.id) : []), [thread]);

  if (!thread) {
    return (
      <main style={{ padding: 20 }}>
        <Link href="/messages" style={{ display: "inline-block", marginBottom: 20, color: "#93c5fd", textDecoration: "none" }}>Back to Inbox</Link>
        <h1>Message Not Found</h1>
        <p>This thread does not exist yet.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <Link href="/messages" style={{ display: "inline-block", marginBottom: 18, color: "#93c5fd", textDecoration: "none" }}>Back to Inbox</Link>
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
