"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getInboxUnreadCountsByThread, INBOX_READ_EVENT, loadInboxReadState } from "../../lib/inbox-badges";
import { getAllMessageThreads, isMessageThreadId, type MessageThreadDefinition, type MessageThreadIconKey, type MessageThreadId } from "../../lib/messages";

type InboxPost = {
  id: string;
  threadId: MessageThreadId;
  title: string;
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
  requiresResponse?: boolean;
  responseSubmittedAt?: { seconds?: number; nanoseconds?: number } | null;
};

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      style={{
        minWidth: 22,
        height: 22,
        padding: "0 7px",
        borderRadius: 999,
        display: "inline-grid",
        placeItems: "center",
        backgroundColor: "#dc2626",
        color: "#ffffff",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function ThreadIcon({ iconKey }: { iconKey: MessageThreadIconKey }) {
  if (iconKey === "bell") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17H9c-1.6 0-2.7-1.4-2.4-3l.5-2.5a9.2 9.2 0 0 0 .2-1.9V9a4.7 4.7 0 1 1 9.4 0v.6c0 .6.1 1.3.2 1.9l.5 2.5c.3 1.6-.8 3-2.4 3Z" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></svg>;
  }

  if (iconKey === "shield") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 5 6v5c0 4.5 2.7 8.5 7 10 4.3-1.5 7-5.5 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7L14.8 10" /></svg>;
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 8.5 4.5 12.1 8.5 15.5" />
      <path d="M15.5 8.5 19.5 12.1 15.5 15.5" />
      <path d="M10.2 17.2 13.8 6.8" />
    </svg>
  );
}

function ThreadCard({
  thread,
  latestPost,
  unreadCount,
}: {
  thread: MessageThreadDefinition;
  latestPost: InboxPost | null;
  unreadCount: number;
}) {
  return (
    <Link
      href={`/messages/${thread.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 14,
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        textDecoration: "none",
        color: "#e5edf7",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        backgroundColor: "rgba(9, 15, 25, 0.88)",
        boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", backgroundColor: thread.iconBackground, color: thread.iconColor, border: "1px solid rgba(148, 163, 184, 0.16)" }}>
        <ThreadIcon iconKey={thread.iconKey} />
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong>{thread.title}</strong>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{thread.channelLabel}</span>
          <NotificationBadge count={unreadCount} />
        </div>
        <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>{latestPost?.title || thread.previewText}</p>
      </div>
      <span style={{ color: "#64748b", fontSize: 20 }}>&rsaquo;</span>
    </Link>
  );
}

function sortPostsNewestFirst(posts: InboxPost[]) {
  return [...posts].sort((a, b) => {
    const aSeconds = a.createdAt?.seconds ?? 0;
    const bSeconds = b.createdAt?.seconds ?? 0;
    const aNanos = a.createdAt?.nanoseconds ?? 0;
    const bNanos = b.createdAt?.nanoseconds ?? 0;
    if (bSeconds !== aSeconds) {
      return bSeconds - aSeconds;
    }
    return bNanos - aNanos;
  });
}

export default function InboxPageClient({ userId }: { userId: string }) {
  const threads = useMemo(() => getAllMessageThreads(), []);
  const [globalPosts, setGlobalPosts] = useState<InboxPost[]>([]);
  const [privatePosts, setPrivatePosts] = useState<InboxPost[]>([]);
  const [readVersion, setReadVersion] = useState(0);

  useEffect(() => {
    const handleReadStateChange = () => setReadVersion((current) => current + 1);
    window.addEventListener("storage", handleReadStateChange);
    window.addEventListener(INBOX_READ_EVENT, handleReadStateChange as EventListener);

    return () => {
      window.removeEventListener("storage", handleReadStateChange);
      window.removeEventListener(INBOX_READ_EVENT, handleReadStateChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const postsQuery = query(collection(db, "inboxPosts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      setGlobalPosts(
        snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<InboxPost, "id">) }))
        .filter((post) => isMessageThreadId(post.threadId))
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const postsQuery = query(collection(db, "userInboxPosts"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      setPrivatePosts(
        snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<InboxPost, "id">) }))
          .filter((post) => isMessageThreadId(post.threadId))
      );
    });
    return () => unsubscribe();
  }, [userId]);

  const allPosts = useMemo(() => sortPostsNewestFirst([...globalPosts, ...privatePosts]), [globalPosts, privatePosts]);
  const latestPostsByThread = useMemo(() => {
    const nextMap: Partial<Record<MessageThreadId, InboxPost>> = {};
    allPosts.forEach((post) => {
      if (!nextMap[post.threadId]) {
        nextMap[post.threadId] = post;
      }
    });
    return nextMap;
  }, [allPosts]);

  const unreadCountsByThread = getInboxUnreadCountsByThread(allPosts, loadInboxReadState());
  void readVersion;

  return (
    <div style={{ marginTop: 22, display: "grid", gap: 14, maxWidth: 780 }}>
      {threads.map((thread) => (
        <ThreadCard
          key={thread.id}
          thread={thread}
          latestPost={latestPostsByThread[thread.id] || null}
          unreadCount={unreadCountsByThread[thread.id] || 0}
        />
      ))}
    </div>
  );
}
