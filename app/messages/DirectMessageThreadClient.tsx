"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { auth } from "../../lib/firebase";
import { logFirestoreQueryResult, logFirestoreQueryRun, logFirestoreScreenMount } from "../../lib/firestore-read-debug";
import {
  formatConversationTimestamp,
  getOtherConversationParticipant,
  type DirectMessageBucket,
  type DirectMessageConversationRecord,
  type DirectMessageRecord,
} from "../../lib/direct-messages";

const inboxNavButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  padding: "6px 13px",
  borderRadius: 10,
  textDecoration: "none",
  background:
    "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
  color: "#f8fafc",
  border: "1px solid rgba(126, 142, 160, 0.24)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  fontSize: 10.5,
};

function formatMessageTimestamp(
  value?: { seconds?: number; nanoseconds?: number } | string | null
) {
  return formatConversationTimestamp(value) || "Just now";
}

function MessageBubble({
  message,
  currentUserId,
}: {
  message: DirectMessageRecord;
  currentUserId: string;
}) {
  const ownMessage = message.senderId === currentUserId;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: ownMessage ? "flex-end" : "flex-start",
        alignSelf: ownMessage ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          width: "fit-content",
          maxWidth: "min(92%, 560px)",
          display: "grid",
          gap: 6,
          padding: "10px 13px",
          borderRadius: ownMessage ? "16px 16px 6px 16px" : "16px 16px 16px 6px",
          background: ownMessage
            ? "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)"
            : "linear-gradient(180deg, rgba(18, 23, 29, 0.98) 0%, rgba(9, 12, 17, 0.995) 100%)",
          border: ownMessage
            ? "1px solid rgba(126, 142, 160, 0.24)"
            : "1px solid rgba(148, 163, 184, 0.18)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: ownMessage ? "#ffffff" : "#dbe7f5",
            whiteSpace: "pre-wrap",
            lineHeight: 1.55,
          }}
        >
          {message.body}
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: ownMessage ? "flex-end" : "flex-start",
            flexWrap: "wrap",
          }}
        >
          {!ownMessage ? (
            <span
              style={{
                color: "#94a3b8",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              {message.senderLabel || "Incoming"}
            </span>
          ) : null}
          <span
            style={{
              color: ownMessage ? "rgba(255,255,255,0.76)" : "#94a3b8",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)",
            }}
          >
            {formatMessageTimestamp(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DirectMessageThreadClient({
  userId,
  conversationId,
  requestedTab,
}: {
  userId: string;
  conversationId: string;
  requestedTab?: DirectMessageBucket | null;
}) {
  const [conversation, setConversation] =
    useState<DirectMessageConversationRecord | null>(null);
  const [messages, setMessages] = useState<DirectMessageRecord[]>([]);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(true);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageError, setMessageError] = useState("");
  const [threadError, setThreadError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    logFirestoreScreenMount("messages.thread", { userId, conversationId });
  }, [conversationId, userId]);

  useEffect(() => {
    let cancelled = false;

    const loadConversation = async (showLoadingState: boolean) => {
      try {
        if (showLoadingState && !cancelled) {
          setConversationLoading(true);
          setThreadError("");
        }

        const idToken = await auth.currentUser?.getIdToken();

        if (!idToken) {
          if (!cancelled) {
            setConversation(null);
            setConversationLoading(false);
          }
          return;
        }

        logFirestoreQueryRun("messages.thread.conversation", { conversationId, userId });
        const response = await fetch(`/api/messages/conversations/${conversationId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const payload = (await response.json().catch(() => ({}))) as {
          conversation?: DirectMessageConversationRecord;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Could not load that conversation.");
        }

        if (!cancelled) {
          logFirestoreQueryResult("messages.thread.conversation", {
            conversationId,
            count: payload.conversation ? 1 : 0,
          });
          setConversation(payload.conversation || null);
          setConversationLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setThreadError(
            error instanceof Error ? error.message : "Could not load that conversation."
          );
          setConversation(null);
          setConversationLoading(false);
        }
      }
    };

    void loadConversation(true);
    const interval = window.setInterval(() => {
      void loadConversation(false);
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async (showLoadingState: boolean) => {
      try {
        if (showLoadingState && !cancelled) {
          setMessageLoading(true);
          setThreadError("");
        }

        const idToken = await auth.currentUser?.getIdToken();

        if (!idToken) {
          if (!cancelled) {
            setMessages([]);
            setMessageLoading(false);
          }
          return;
        }

        logFirestoreQueryRun("messages.thread.messages", { conversationId, userId });
        const response = await fetch(
          `/api/messages/conversations/${conversationId}/messages`,
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
          logFirestoreQueryResult("messages.thread.messages", {
            conversationId,
            count: (payload.messages || []).length,
          });
          setMessages(payload.messages || []);
          setMessageLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setThreadError(
            error instanceof Error ? error.message : "Could not load messages."
          );
          setMessageLoading(false);
        }
      }
    };

    void loadMessages(true);
    const interval = window.setInterval(() => {
      void loadMessages(false);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversation) return;
    const unreadCount = Number(conversation.unreadCounts?.[userId] || 0) || 0;
    if (unreadCount <= 0) return;
    let cancelled = false;

    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken || cancelled) return;
        await fetch(`/api/messages/conversations/${conversationId}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversation, conversationId, userId]);

  const otherParticipant = useMemo(
    () => (conversation ? getOtherConversationParticipant(conversation, userId) : null),
    [conversation, userId]
  );

  const activeTab = conversation?.type || requestedTab || "direct";
  const backHref = `/messages?tab=${activeTab}`;

  const handleSubmitMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const normalizedMessage = messageDraft.trim();
    if (!normalizedMessage) return;
    try {
      setSending(true);
      setMessageError("");
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("You need to sign in again before sending.");
      const response = await fetch(
        `/api/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ body: normalizedMessage }),
        }
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not send the message.");
      setMessageDraft("");

      const refreshedResponse = await fetch(
        `/api/messages/conversations/${conversationId}/messages`,
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
      setMessageError(
        error instanceof Error ? error.message : "Could not send the message."
      );
    } finally {
      setSending(false);
    }
  };

  if (conversationLoading && !conversation) {
    return (
      <section
        style={{
          borderRadius: 18,
          border: "1px solid rgba(126, 142, 160, 0.18)",
          background:
            "linear-gradient(180deg, rgba(15, 20, 27, 0.98) 0%, rgba(8, 11, 16, 0.995) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          display: "grid",
        }}
      >
        <div
          style={{
            padding: "0.9rem 1rem",
            borderBottom: "1px solid rgba(126, 142, 160, 0.14)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            background:
              "linear-gradient(180deg, rgba(16, 24, 34, 0.98) 0%, rgba(10, 17, 24, 0.99) 100%)",
          }}
        >
          <strong>Opening conversation...</strong>
          <Link href={backHref} style={inboxNavButtonStyle}>
            Back to List
          </Link>
        </div>
        <div style={{ padding: "1rem", color: "#94a3b8" }}>Loading messages...</div>
      </section>
    );
  }

  if (!conversation) {
    return (
      <section
        style={{
          borderRadius: 18,
          border: "1px solid rgba(126, 142, 160, 0.18)",
          background:
            "linear-gradient(180deg, rgba(15, 20, 27, 0.98) 0%, rgba(8, 11, 16, 0.995) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          display: "grid",
        }}
      >
        <div
          style={{
            padding: "0.9rem 1rem",
            borderBottom: "1px solid rgba(126, 142, 160, 0.14)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            background:
              "linear-gradient(180deg, rgba(16, 24, 34, 0.98) 0%, rgba(10, 17, 24, 0.99) 100%)",
          }}
        >
          <strong>Conversation Unavailable</strong>
          <Link href={backHref} style={inboxNavButtonStyle}>
            Back to List
          </Link>
        </div>
        <div style={{ padding: "1rem", display: "grid", gap: 6 }}>
          <p style={{ margin: 0, color: "#fca5a5" }}>
            {threadError || "That conversation could not be found."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        borderRadius: 18,
        border: "1px solid rgba(126, 142, 160, 0.18)",
        background:
          "linear-gradient(180deg, rgba(15, 20, 27, 0.98) 0%, rgba(8, 11, 16, 0.995) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
        overflow: "hidden",
        display: "grid",
      }}
    >
      <div
        style={{
          padding: "0.9rem 1rem",
          borderBottom: "1px solid rgba(126, 142, 160, 0.14)",
          display: "grid",
          gap: 10,
          background:
            "linear-gradient(180deg, rgba(16, 24, 34, 0.98) 0%, rgba(10, 17, 24, 0.99) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
            <strong style={{ fontSize: 15 }}>
              {conversation.type === "direct"
                ? otherParticipant?.displayName || "Conversation"
                : otherParticipant?.displayName || "Context Thread"}
            </strong>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, lineHeight: 1.4 }}>
              {conversation.type === "direct"
                ? [
                    otherParticipant?.username?.trim()
                      ? `@${otherParticipant.username.trim()}`
                      : "",
                    otherParticipant?.flight?.trim() || "",
                  ]
                    .filter(Boolean)
                    .join(" // ") || "Direct message thread"
                : `${conversation.type === "marketplace" ? "Marketplace" : "ISO"} conversation`}
            </p>
          </div>
          <Link href={backHref} style={inboxNavButtonStyle}>
            Back to List
          </Link>
        </div>

        {conversation.relatedContext ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 12,
              alignItems: "center",
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(126, 142, 160, 0.14)",
              background: "rgba(9, 15, 25, 0.68)",
            }}
          >
            <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
              <p
                style={{
                  margin: 0,
                  color: "#7dd3fc",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}
              >
                {conversation.relatedContext.type === "marketplace"
                  ? "Marketplace Context"
                  : "ISO Context"}
              </p>
              <strong
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {conversation.relatedContext.title}
              </strong>
              {conversation.relatedContext.status?.trim() ? (
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>
                  Status: {conversation.relatedContext.status.trim()}
                </p>
              ) : null}
            </div>
            <Link href={conversation.relatedContext.targetPath} style={inboxNavButtonStyle}>
              View
            </Link>
          </div>
        ) : null}
      </div>

      <div
        style={{
          padding: "0.9rem 0.8rem",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 320,
          maxHeight: 520,
          overflowY: "auto",
          background:
            "linear-gradient(180deg, rgba(9, 14, 20, 0.98) 0%, rgba(3, 8, 14, 0.995) 100%)",
        }}
      >
        {messageLoading ? (
          <p style={{ margin: 0, color: "#94a3b8" }}>Loading messages...</p>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} currentUserId={userId} />
          ))
        ) : (
          <div
            style={{
              alignSelf: "center",
              justifySelf: "center",
              maxWidth: 420,
              textAlign: "center",
              display: "grid",
              gap: 8,
            }}
          >
            <strong>No messages yet</strong>
            <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>
              Start the thread below and this conversation will stay grouped inside the{" "}
              {conversation.type === "direct"
                ? "Direct"
                : conversation.type === "marketplace"
                  ? "Marketplace"
                  : "ISO"}{" "}
              inbox bucket.
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => void handleSubmitMessage(event)}
        style={{
          padding: "0.9rem 1rem 1rem",
          borderTop: "1px solid rgba(126, 142, 160, 0.14)",
          display: "grid",
          gap: 10,
          background:
            "linear-gradient(180deg, rgba(12, 18, 27, 0.98) 0%, rgba(7, 11, 17, 0.995) 100%)",
        }}
      >
        <textarea
          value={messageDraft}
          onChange={(event) => setMessageDraft(event.target.value)}
          rows={2}
          placeholder={
            conversation.type === "direct"
              ? "Write a direct message..."
              : conversation.type === "marketplace"
                ? "Write a listing message..."
                : "Write an ISO response..."
          }
          style={{ resize: "none", minHeight: 74, maxHeight: 140 }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmitMessage();
            }
          }}
        />
        {threadError ? <p style={{ margin: 0, color: "#fca5a5" }}>{threadError}</p> : null}
        {messageError ? <p style={{ margin: 0, color: "#fca5a5" }}>{messageError}</p> : null}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>
            Messages stay tied to this thread so you can pick them back up later.
          </p>
          <button
            type="submit"
            disabled={!messageDraft.trim() || sending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 40,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(126, 142, 160, 0.24)",
              background:
                !messageDraft.trim() || sending
                  ? "linear-gradient(180deg, rgba(51, 65, 85, 0.82) 0%, rgba(30, 41, 59, 0.92) 100%)"
                  : "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
              color: "#ffffff",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: 11,
              opacity: !messageDraft.trim() || sending ? 0.7 : 1,
            }}
          >
            {sending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </section>
  );
}
