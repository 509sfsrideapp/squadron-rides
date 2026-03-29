"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import {
  formatConversationTimestamp,
  getOtherConversationParticipant,
  sortDirectMessageConversations,
  type DirectMessageBucket,
  type DirectMessageConversationRecord,
  type DirectMessageRecord,
} from "../../lib/direct-messages";
import { getInboxUnreadCountsByThread, INBOX_READ_EVENT, loadInboxReadState } from "../../lib/inbox-badges";
import { getAllMessageThreads, isMessageThreadId, type MessageThreadDefinition, type MessageThreadId } from "../../lib/messages";

type InboxPost = {
  id: string;
  threadId: MessageThreadId;
  title: string;
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
  userId?: string;
  requiresResponse?: boolean;
  responseSubmittedAt?: { seconds?: number; nanoseconds?: number } | null;
};

const inboxNavButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  padding: "6px 13px",
  borderRadius: 10,
  textDecoration: "none",
  background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
  color: "#f8fafc",
  border: "1px solid rgba(126, 142, 160, 0.24)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  fontSize: 10.5,
};

function getBucketTabs() {
  return [
    { id: "direct", label: "Direct" },
    { id: "marketplace", label: "Marketplace" },
    { id: "iso", label: "ISO" },
    { id: "system", label: "System" },
  ] as const satisfies Array<{ id: DirectMessageBucket; label: string }>;
}

function toMessageTimestampMs(value?: { seconds?: number; nanoseconds?: number } | string | null) {
  if (!value) return 0;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return (value.seconds || 0) * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
}

function formatMessageTimestamp(value?: { seconds?: number; nanoseconds?: number } | string | null) {
  return formatConversationTimestamp(value) || "Just now";
}

function SystemThreadRow({
  thread,
  unreadCount,
}: {
  thread: MessageThreadDefinition;
  unreadCount: number;
}) {
  return (
    <Link
      href={`/messages/${thread.id}`}
      style={{
        display: "grid",
        gap: 4,
        padding: 14,
        borderRadius: 14,
        textDecoration: "none",
        color: "#e5edf7",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        backgroundColor: unreadCount > 0 ? "rgba(17, 24, 39, 0.94)" : "rgba(9, 15, 25, 0.88)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong>{thread.title}</strong>
        {unreadCount > 0 ? (
          <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, display: "inline-grid", placeItems: "center", backgroundColor: "#dc2626", color: "#ffffff", fontSize: 10, fontWeight: 800, lineHeight: 1 }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </div>
      <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.45 }}>{thread.subtitle}</p>
    </Link>
  );
}

function ConversationRow({
  conversation,
  currentUserId,
  active,
  onOpen,
}: {
  conversation: DirectMessageConversationRecord;
  currentUserId: string;
  active: boolean;
  onOpen: () => void;
}) {
  const otherParticipant = getOtherConversationParticipant(conversation, currentUserId);
  const unreadCount = Number(conversation.unreadCounts?.[currentUserId] || 0) || 0;
  const rowTitle = conversation.type === "direct" ? otherParticipant?.displayName || "Unknown User" : conversation.relatedContext?.title?.trim() || "Conversation";
  const subtitle = conversation.type === "direct" ? [otherParticipant?.username?.trim() ? `@${otherParticipant.username.trim()}` : "", otherParticipant?.flight?.trim() || ""].filter(Boolean).join(" // ") : otherParticipant?.displayName || "Context-linked thread";

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: "100%",
        display: "grid",
        gap: 5,
        padding: 14,
        borderRadius: 14,
        border: active ? "1px solid rgba(125, 211, 252, 0.32)" : "1px solid rgba(148, 163, 184, 0.18)",
        background: active ? "linear-gradient(180deg, rgba(14, 25, 39, 0.98) 0%, rgba(8, 15, 25, 0.99) 100%)" : unreadCount > 0 ? "linear-gradient(180deg, rgba(18, 24, 34, 0.98) 0%, rgba(10, 15, 22, 0.99) 100%)" : "rgba(9, 15, 25, 0.88)",
        color: "#e5edf7",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
          <strong style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rowTitle}</strong>
          {unreadCount > 0 ? <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, display: "inline-grid", placeItems: "center", backgroundColor: "#dc2626", color: "#ffffff", fontSize: 10, fontWeight: 800, lineHeight: 1 }}>{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
        </div>
        <span style={{ color: unreadCount > 0 ? "#dbe7f5" : "#94a3b8", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>{formatConversationTimestamp(conversation.lastMessageAt)}</span>
      </div>
      {subtitle ? <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, lineHeight: 1.35 }}>{subtitle}</p> : null}
      <p style={{ margin: 0, color: unreadCount > 0 ? "#dbe7f5" : "#9fb1c7", lineHeight: 1.45, fontWeight: unreadCount > 0 ? 600 : 400 }}>
        {conversation.lastMessagePreview?.trim() || "No messages yet."}
      </p>
    </button>
  );
}

function MessageBubble({ message, currentUserId }: { message: DirectMessageRecord; currentUserId: string }) {
  const ownMessage = message.senderId === currentUserId;

  return (
    <div style={{ display: "grid", justifyItems: ownMessage ? "end" : "start" }}>
      <div
        style={{
          maxWidth: "min(84%, 460px)",
          display: "grid",
          gap: 6,
          padding: "10px 12px",
          borderRadius: ownMessage ? "16px 16px 6px 16px" : "16px 16px 16px 6px",
          background: ownMessage ? "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)" : "linear-gradient(180deg, rgba(18, 23, 29, 0.98) 0%, rgba(9, 12, 17, 0.995) 100%)",
          border: ownMessage ? "1px solid rgba(126, 142, 160, 0.24)" : "1px solid rgba(148, 163, 184, 0.18)",
        }}
      >
        <p style={{ margin: 0, color: ownMessage ? "#ffffff" : "#dbe7f5", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{message.body}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: ownMessage ? "flex-end" : "flex-start", flexWrap: "wrap" }}>
          {!ownMessage ? <span style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>{message.senderLabel || "Incoming"}</span> : null}
          <span style={{ color: ownMessage ? "rgba(255,255,255,0.76)" : "#94a3b8", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>{formatMessageTimestamp(message.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function MessagesAppClient({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedConversationId = searchParams.get("conversationId") || "";
  const activeTab: DirectMessageBucket =
    requestedTab === "marketplace" || requestedTab === "iso" || requestedTab === "system" || requestedTab === "direct"
      ? requestedTab
      : "direct";

  const [allConversations, setAllConversations] = useState<DirectMessageConversationRecord[]>([]);
  const [messages, setMessages] = useState<DirectMessageRecord[]>([]);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageError, setMessageError] = useState("");
  const [sending, setSending] = useState(false);
  const [systemGlobalPosts, setSystemGlobalPosts] = useState<InboxPost[]>([]);
  const [systemPrivatePosts, setSystemPrivatePosts] = useState<InboxPost[]>([]);
  const [readVersion, setReadVersion] = useState(0);

  const setQueryParam = (key: string, value?: string | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (!value) nextParams.delete(key);
    else nextParams.set(key, value);
    const queryString = nextParams.toString();
    router.replace(queryString ? `/messages?${queryString}` : "/messages");
  };

  useEffect(() => {
    let cancelled = false;

    const loadConversations = async (showLoadingState: boolean) => {
      try {
        if (showLoadingState && !cancelled) {
          setConversationLoading(true);
        }

        const idToken = await auth.currentUser?.getIdToken();

        if (!idToken) {
          if (!cancelled) {
            setAllConversations([]);
            setConversationLoading(false);
          }
          return;
        }

        const response = await fetch("/api/messages/conversations", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const payload = (await response.json().catch(() => ({}))) as {
          conversations?: DirectMessageConversationRecord[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Could not load conversations.");
        }

        if (!cancelled) {
          setAllConversations(
            sortDirectMessageConversations(payload.conversations || [])
          );
          setConversationLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setConversationLoading(false);
        }
      }
    };

    void loadConversations(true);
    const interval = window.setInterval(() => {
      void loadConversations(false);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

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
    const unsubscribeGlobal = onSnapshot(query(collection(db, "inboxPosts"), orderBy("createdAt", "desc")), (snapshot) => {
      setSystemGlobalPosts(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<InboxPost, "id">) })).filter((post) => isMessageThreadId(post.threadId)));
    });
    const unsubscribePrivate = onSnapshot(query(collection(db, "userInboxPosts"), where("userId", "==", userId)), (snapshot) => {
      setSystemPrivatePosts(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<InboxPost, "id">) })).filter((post) => isMessageThreadId(post.threadId)));
    });
    return () => {
      unsubscribeGlobal();
      unsubscribePrivate();
    };
  }, [userId]);

  const searchText = (searchParams.get("search") || "").trim();
  const activeDmConversations = useMemo(() => {
    const tabFiltered = allConversations.filter((conversation) => conversation.type === activeTab);
    if (!searchText) return tabFiltered;
    const normalizedSearch = searchText.toLowerCase();
    return tabFiltered.filter((conversation) => {
      const otherParticipant = getOtherConversationParticipant(conversation, userId);
      const haystack = [otherParticipant?.displayName, otherParticipant?.username, otherParticipant?.flight, conversation.lastMessagePreview, conversation.relatedContext?.title].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [activeTab, allConversations, searchText, userId]);

  const activeConversation =
    activeTab === "system"
      ? null
      : activeDmConversations.find((conversation) => conversation.id === requestedConversationId) || null;

  useEffect(() => {
    if (!activeConversation || activeTab === "system") {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async (showLoadingState: boolean) => {
      try {
        if (showLoadingState && !cancelled) {
          setMessageLoading(true);
        }

        const idToken = await auth.currentUser?.getIdToken();

        if (!idToken) {
          if (!cancelled) {
            setMessages([]);
            setMessageLoading(false);
          }
          return;
        }

        const response = await fetch(
          `/api/messages/conversations/${activeConversation.id}/messages`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        const payload = (await response.json().catch(() => ({}))) as {
          messages?: DirectMessageRecord[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Could not load messages.");
        }

        if (!cancelled) {
          setMessages(payload.messages || []);
          setMessageLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setMessageLoading(false);
        }
      }
    };

    void loadMessages(true);
    const interval = window.setInterval(() => {
      void loadMessages(false);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeConversation, activeTab]);

  useEffect(() => {
    if (!activeConversation || activeTab === "system") return;
    const unreadCount = Number(activeConversation.unreadCounts?.[userId] || 0) || 0;
    if (unreadCount <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken || cancelled) return;
        await fetch(`/api/messages/conversations/${activeConversation.id}/read`, { method: "POST", headers: { Authorization: `Bearer ${idToken}` } });
      } catch (error) {
        console.error(error);
      }
    })();
    return () => { cancelled = true; };
  }, [activeConversation, activeTab, userId]);

  const unreadCountsByBucket = useMemo(() => {
    void readVersion;
    return {
      direct: allConversations.filter((conversation) => conversation.type === "direct").reduce((sum, conversation) => sum + (Number(conversation.unreadCounts?.[userId] || 0) || 0), 0),
      marketplace: allConversations.filter((conversation) => conversation.type === "marketplace").reduce((sum, conversation) => sum + (Number(conversation.unreadCounts?.[userId] || 0) || 0), 0),
      iso: allConversations.filter((conversation) => conversation.type === "iso").reduce((sum, conversation) => sum + (Number(conversation.unreadCounts?.[userId] || 0) || 0), 0),
      system: Object.values(getInboxUnreadCountsByThread([...systemGlobalPosts, ...systemPrivatePosts].sort((left, right) => toMessageTimestampMs(right.createdAt) - toMessageTimestampMs(left.createdAt)), loadInboxReadState())).reduce((sum, count) => sum + count, 0),
    };
  }, [allConversations, readVersion, systemGlobalPosts, systemPrivatePosts, userId]);

  const systemThreads = useMemo(() => {
    void readVersion;
    const allPosts = [...systemGlobalPosts, ...systemPrivatePosts].sort((left, right) => toMessageTimestampMs(right.createdAt) - toMessageTimestampMs(left.createdAt));
    const unreadCounts = getInboxUnreadCountsByThread(allPosts, loadInboxReadState());
    return getAllMessageThreads().map((thread) => ({ thread, unreadCount: unreadCounts[thread.id] || 0 }));
  }, [readVersion, systemGlobalPosts, systemPrivatePosts]);

  const handleSubmitMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!activeConversation) return;
    const normalizedMessage = messageDraft.trim();
    if (!normalizedMessage) return;
    try {
      setSending(true);
      setMessageError("");
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("You need to sign in again before sending.");
      const response = await fetch(`/api/messages/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ body: normalizedMessage }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not send the message.");
      setMessageDraft("");

      const refreshedResponse = await fetch(
        `/api/messages/conversations/${activeConversation.id}/messages`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      const refreshedPayload = (await refreshedResponse.json().catch(() => ({}))) as {
        messages?: DirectMessageRecord[];
      };
      if (refreshedResponse.ok && refreshedPayload.messages) {
        setMessages(refreshedPayload.messages);
      }
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  };

  const otherParticipant = activeConversation ? getOtherConversationParticipant(activeConversation, userId) : null;
  const showThreadPane = activeTab !== "system" && Boolean(activeConversation);

  return (
    <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 5 }}>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
          Direct, marketplace, ISO, and system inbox routing
        </p>
        <h1 style={{ margin: 0 }}>Messages</h1>
      </div>

      <section style={{ borderRadius: 18, border: "1px solid rgba(126, 142, 160, 0.18)", background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)", padding: "1rem", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {getBucketTabs().map((tab) => {
            const active = tab.id === activeTab;
            const unreadCount = unreadCountsByBucket[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setQueryParam("tab", tab.id);
                  setQueryParam("conversationId", null);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 38,
                  padding: "8px 12px",
                  borderRadius: 11,
                  border: active ? "1px solid rgba(125, 211, 252, 0.32)" : "1px solid rgba(126, 142, 160, 0.18)",
                  background: active ? "linear-gradient(180deg, rgba(31, 48, 72, 0.98) 0%, rgba(17, 29, 44, 0.99) 100%)" : "rgba(15, 23, 42, 0.72)",
                  color: active ? "#e0f2fe" : "#dbe7f5",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: 10.5,
                }}
              >
                <span>{tab.label}</span>
                {unreadCount > 0 ? (
                  <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, display: "inline-grid", placeItems: "center", backgroundColor: "#dc2626", color: "#ffffff", fontSize: 10, fontWeight: 800, lineHeight: 1 }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
            Search Conversations
          </span>
          <input
            value={searchText}
            onChange={(event) => setQueryParam("search", event.target.value.trim() || null)}
            placeholder={activeTab === "system" ? "Search system channels" : activeTab === "direct" ? "Search by user, username, or thread" : "Search by user or listing context"}
          />
        </label>

        {activeTab === "system" ? (
          <div style={{ display: "grid", gap: 12 }}>
            {systemThreads
              .filter(({ thread }) => {
                if (!searchText) return true;
                const haystack = `${thread.title} ${thread.subtitle} ${thread.description}`.toLowerCase();
                return haystack.includes(searchText.toLowerCase());
              })
              .map(({ thread, unreadCount }) => (
                <SystemThreadRow key={thread.id} thread={thread} unreadCount={unreadCount} />
              ))}
            {systemThreads.length === 0 ? (
              <div style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(148, 163, 184, 0.14)", backgroundColor: "rgba(9, 15, 25, 0.88)" }}>
                <strong>No system channels yet.</strong>
              </div>
            ) : null}
            {systemThreads.length > 0 &&
            systemThreads.filter(({ thread }) => {
              if (!searchText) return true;
              const haystack = `${thread.title} ${thread.subtitle} ${thread.description}`.toLowerCase();
              return haystack.includes(searchText.toLowerCase());
            }).length === 0 ? (
              <div style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(148, 163, 184, 0.14)", backgroundColor: "rgba(9, 15, 25, 0.88)" }}>
                <strong>No matching system channels</strong>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
            <div style={{ display: showThreadPane ? "none" : "grid", gap: 10 }}>
              {conversationLoading ? (
                <div style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(148, 163, 184, 0.14)", backgroundColor: "rgba(9, 15, 25, 0.88)", color: "#94a3b8" }}>
                  Loading conversations...
                </div>
              ) : activeDmConversations.length > 0 ? (
                activeDmConversations.map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    currentUserId={userId}
                    active={conversation.id === activeConversation?.id}
                    onOpen={() => setQueryParam("conversationId", conversation.id)}
                  />
                ))
              ) : (
                <div style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(148, 163, 184, 0.14)", backgroundColor: "rgba(9, 15, 25, 0.88)", display: "grid", gap: 6 }}>
                  <strong>{searchText ? "No matching conversations" : activeTab === "direct" ? "No direct messages yet" : activeTab === "marketplace" ? "No marketplace conversations yet" : "No ISO conversations yet"}</strong>
                  <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.5 }}>
                    {searchText
                      ? "Try a different name, username, or listing title."
                      : activeTab === "direct"
                        ? "Open a user preview anywhere in the app and press Message to start a direct thread."
                        : activeTab === "marketplace"
                          ? "Use Message Seller from a marketplace listing to start a listing-linked thread."
                          : "Use Message Requester from an ISO post to start a request-linked thread."}
                  </p>
                </div>
              )}
            </div>

            {showThreadPane ? (
              <section style={{ borderRadius: 18, border: "1px solid rgba(126, 142, 160, 0.18)", background: "linear-gradient(180deg, rgba(15, 20, 27, 0.98) 0%, rgba(8, 11, 16, 0.995) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)", overflow: "hidden", display: "grid" }}>
                <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(126, 142, 160, 0.14)", display: "grid", gap: 10, background: "linear-gradient(180deg, rgba(16, 24, 34, 0.98) 0%, rgba(10, 17, 24, 0.99) 100%)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                      <strong style={{ fontSize: 15 }}>{activeConversation?.type === "direct" ? otherParticipant?.displayName || "Conversation" : otherParticipant?.displayName || "Context Thread"}</strong>
                      <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, lineHeight: 1.4 }}>
                        {activeConversation?.type === "direct"
                          ? [otherParticipant?.username?.trim() ? `@${otherParticipant.username.trim()}` : "", otherParticipant?.flight?.trim() || ""].filter(Boolean).join(" // ") || "Direct message thread"
                          : `${activeConversation?.type === "marketplace" ? "Marketplace" : "ISO"} conversation`}
                      </p>
                    </div>
                    <button type="button" onClick={() => setQueryParam("conversationId", null)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 34, padding: "6px 12px", borderRadius: 10, border: "1px solid rgba(126, 142, 160, 0.18)", background: "rgba(15, 23, 42, 0.72)", color: "#dbe7f5", fontFamily: "var(--font-display)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10.5 }}>
                      Back to List
                    </button>
                  </div>

                  {activeConversation?.relatedContext ? (
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: 12, borderRadius: 14, border: "1px solid rgba(126, 142, 160, 0.14)", background: "rgba(9, 15, 25, 0.68)" }}>
                      <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                        <p style={{ margin: 0, color: "#7dd3fc", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                          {activeConversation.relatedContext.type === "marketplace" ? "Marketplace Context" : "ISO Context"}
                        </p>
                        <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeConversation.relatedContext.title}</strong>
                        {activeConversation.relatedContext.status?.trim() ? <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Status: {activeConversation.relatedContext.status.trim()}</p> : null}
                      </div>
                      <Link href={activeConversation.relatedContext.targetPath} style={inboxNavButtonStyle}>
                        View
                      </Link>
                    </div>
                  ) : null}
                </div>

                <div style={{ padding: "1rem", display: "grid", gap: 12, minHeight: 320, maxHeight: 520, overflowY: "auto", background: "linear-gradient(180deg, rgba(9, 14, 20, 0.98) 0%, rgba(3, 8, 14, 0.995) 100%)" }}>
                  {messageLoading ? (
                    <p style={{ margin: 0, color: "#94a3b8" }}>Loading messages...</p>
                  ) : messages.length > 0 ? (
                    messages.map((message) => <MessageBubble key={message.id} message={message} currentUserId={userId} />)
                  ) : (
                    <div style={{ alignSelf: "center", justifySelf: "center", maxWidth: 420, textAlign: "center", display: "grid", gap: 8 }}>
                      <strong>No messages yet</strong>
                      <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>
                        Start the thread below and this conversation will stay grouped inside the {activeConversation?.type === "direct" ? "Direct" : activeConversation?.type === "marketplace" ? "Marketplace" : "ISO"} inbox bucket.
                      </p>
                    </div>
                  )}
                </div>

                <form onSubmit={(event) => void handleSubmitMessage(event)} style={{ padding: "0.9rem 1rem 1rem", borderTop: "1px solid rgba(126, 142, 160, 0.14)", display: "grid", gap: 10, background: "linear-gradient(180deg, rgba(12, 18, 27, 0.98) 0%, rgba(7, 11, 17, 0.995) 100%)" }}>
                  <textarea
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    rows={2}
                    placeholder={activeConversation?.type === "direct" ? "Write a direct message..." : activeConversation?.type === "marketplace" ? "Write a listing message..." : "Write an ISO response..."}
                    style={{ resize: "none", minHeight: 74, maxHeight: 140 }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSubmitMessage();
                      }
                    }}
                  />
                  {messageError ? <p style={{ margin: 0, color: "#fca5a5" }}>{messageError}</p> : null}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Messages stay tied to this thread so you can pick them back up later.</p>
                    <button type="submit" disabled={!messageDraft.trim() || sending} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(126, 142, 160, 0.24)", background: !messageDraft.trim() || sending ? "linear-gradient(180deg, rgba(51, 65, 85, 0.82) 0%, rgba(30, 41, 59, 0.92) 100%)" : "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)", color: "#ffffff", fontFamily: "var(--font-display)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 11, opacity: !messageDraft.trim() || sending ? 0.7 : 1 }}>
                      {sending ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
