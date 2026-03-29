"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "../../lib/firebase";
import { logFirestoreQueryResult, logFirestoreQueryRun, logFirestoreScreenMount } from "../../lib/firestore-read-debug";
import {
  formatConversationTimestamp,
  getOtherConversationParticipant,
  sortDirectMessageConversations,
  type DirectMessageBucket,
  type DirectMessageConversationRecord,
} from "../../lib/direct-messages";

function getBucketTabs() {
  return [
    { id: "direct", label: "Direct" },
    { id: "marketplace", label: "Marketplace" },
    { id: "iso", label: "ISO" },
  ] as const satisfies Array<{ id: DirectMessageBucket; label: string }>;
}

function ConversationRow({
  conversation,
  currentUserId,
  onOpen,
}: {
  conversation: DirectMessageConversationRecord;
  currentUserId: string;
  onOpen: () => void;
}) {
  const otherParticipant = getOtherConversationParticipant(conversation, currentUserId);
  const unreadCount = Number(conversation.unreadCounts?.[currentUserId] || 0) || 0;
  const rowTitle =
    conversation.type === "direct"
      ? otherParticipant?.displayName || "Unknown User"
      : conversation.relatedContext?.title?.trim() || "Conversation";
  const subtitle =
    conversation.type === "direct"
      ? [
          otherParticipant?.username?.trim()
            ? `@${otherParticipant.username.trim()}`
            : "",
          otherParticipant?.flight?.trim() || "",
        ]
          .filter(Boolean)
          .join(" // ")
      : otherParticipant?.displayName || "Context-linked thread";

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
        border:
          unreadCount > 0
            ? "1px solid rgba(125, 211, 252, 0.24)"
            : "1px solid rgba(148, 163, 184, 0.18)",
        background:
          unreadCount > 0
            ? "linear-gradient(180deg, rgba(18, 24, 34, 0.98) 0%, rgba(10, 15, 22, 0.99) 100%)"
            : "rgba(9, 15, 25, 0.88)",
        color: "#e5edf7",
        textAlign: "left",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <strong
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {rowTitle}
          </strong>
          {unreadCount > 0 ? (
            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: "0 6px",
                borderRadius: 999,
                display: "inline-grid",
                placeItems: "center",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </div>
        <span
          style={{
            color: unreadCount > 0 ? "#dbe7f5" : "#94a3b8",
            fontSize: 11,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display)",
            whiteSpace: "nowrap",
          }}
        >
          {formatConversationTimestamp(conversation.lastMessageAt)}
        </span>
      </div>
      {subtitle ? (
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, lineHeight: 1.35 }}>
          {subtitle}
        </p>
      ) : null}
      <p
        style={{
          margin: 0,
          color: unreadCount > 0 ? "#dbe7f5" : "#9fb1c7",
          lineHeight: 1.45,
          fontWeight: unreadCount > 0 ? 600 : 400,
        }}
      >
        {conversation.lastMessagePreview?.trim() || "No messages yet."}
      </p>
    </button>
  );
}

export default function MessagesAppClient({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedBucket: DirectMessageBucket =
    requestedTab === "marketplace" || requestedTab === "iso" || requestedTab === "direct"
      ? requestedTab
      : "direct";

  const [allConversations, setAllConversations] = useState<DirectMessageConversationRecord[]>([]);
  const [conversationLoading, setConversationLoading] = useState(true);

  const setQueryParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) nextParams.delete(key);
        else nextParams.set(key, value);
      });
      const queryString = nextParams.toString();
      router.replace(queryString ? `/messages?${queryString}` : "/messages");
    },
    [router, searchParams]
  );

  useEffect(() => {
    logFirestoreScreenMount("messages.list", { userId });
  }, [userId]);

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

        logFirestoreQueryRun("messages.list.conversations", { userId });
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
          logFirestoreQueryResult("messages.list.conversations", {
            userId,
            count: (payload.conversations || []).length,
          });
          setAllConversations(sortDirectMessageConversations(payload.conversations || []));
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
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  const searchText = (searchParams.get("search") || "").trim();
  const activeTab: DirectMessageBucket = requestedBucket;

  const activeDmConversations = useMemo(() => {
    const tabFiltered = allConversations.filter(
      (conversation) => conversation.type === activeTab
    );
    if (!searchText) return tabFiltered;
    const normalizedSearch = searchText.toLowerCase();
    return tabFiltered.filter((conversation) => {
      const otherParticipant = getOtherConversationParticipant(conversation, userId);
      const haystack = [
        otherParticipant?.displayName,
        otherParticipant?.username,
        otherParticipant?.flight,
        conversation.lastMessagePreview,
        conversation.relatedContext?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [activeTab, allConversations, searchText, userId]);

  const unreadCountsByBucket = useMemo(() => {
    return {
      direct: allConversations
        .filter((conversation) => conversation.type === "direct")
        .reduce(
          (sum, conversation) =>
            sum + (Number(conversation.unreadCounts?.[userId] || 0) || 0),
          0
        ),
      marketplace: allConversations
        .filter((conversation) => conversation.type === "marketplace")
        .reduce(
          (sum, conversation) =>
            sum + (Number(conversation.unreadCounts?.[userId] || 0) || 0),
          0
        ),
      iso: allConversations
        .filter((conversation) => conversation.type === "iso")
        .reduce(
          (sum, conversation) =>
            sum + (Number(conversation.unreadCounts?.[userId] || 0) || 0),
          0
        ),
    };
  }, [allConversations, userId]);

  return (
    <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 5 }}>
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
          Direct, marketplace, and ISO conversation routing
        </p>
        <h1 style={{ margin: 0 }}>Messages</h1>
      </div>

      <section
        style={{
          borderRadius: 18,
          border: "1px solid rgba(126, 142, 160, 0.18)",
          background:
            "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
          padding: "1rem",
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {getBucketTabs().map((tab) => {
            const active = tab.id === activeTab;
            const unreadCount = unreadCountsByBucket[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setQueryParams({
                    tab: tab.id,
                    search: null,
                  });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 38,
                  padding: "8px 12px",
                  borderRadius: 11,
                  border: active
                    ? "1px solid rgba(125, 211, 252, 0.32)"
                    : "1px solid rgba(126, 142, 160, 0.18)",
                  background: active
                    ? "linear-gradient(180deg, rgba(31, 48, 72, 0.98) 0%, rgba(17, 29, 44, 0.99) 100%)"
                    : "rgba(15, 23, 42, 0.72)",
                  color: active ? "#e0f2fe" : "#dbe7f5",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: 10.5,
                }}
              >
                <span>{tab.label}</span>
                {unreadCount > 0 ? (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: "0 5px",
                      borderRadius: 999,
                      display: "inline-grid",
                      placeItems: "center",
                      backgroundColor: "#dc2626",
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span
            style={{
              color: "#94a3b8",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)",
            }}
          >
            Search Conversations
          </span>
          <input
            value={searchText}
            onChange={(event) =>
              setQueryParams({ search: event.target.value.trim() || null })
            }
            placeholder={
              activeTab === "direct"
                ? "Search by user, username, or thread"
                : "Search by user or listing context"
            }
          />
        </label>

        <div style={{ display: "grid", gap: 10 }}>
          {conversationLoading ? (
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                border: "1px solid rgba(148, 163, 184, 0.14)",
                backgroundColor: "rgba(9, 15, 25, 0.88)",
                color: "#94a3b8",
              }}
            >
              Loading conversations...
            </div>
          ) : activeDmConversations.length > 0 ? (
            activeDmConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                currentUserId={userId}
                onOpen={() => router.push(`/messages/${conversation.id}?tab=${conversation.type}`)}
              />
            ))
          ) : (
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                border: "1px solid rgba(148, 163, 184, 0.14)",
                backgroundColor: "rgba(9, 15, 25, 0.88)",
                display: "grid",
                gap: 6,
              }}
            >
              <strong>
                {searchText
                  ? "No matching conversations"
                  : activeTab === "direct"
                    ? "No direct messages yet"
                    : activeTab === "marketplace"
                      ? "No marketplace conversations yet"
                      : "No ISO conversations yet"}
              </strong>
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
      </section>
    </div>
  );
}
