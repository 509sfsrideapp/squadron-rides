"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AppLoadingState from "../components/AppLoadingState";
import DeveloperBackLink from "../components/DeveloperBackLink";
import { auth, db } from "../../lib/firebase";
import { isAdminEmail } from "../../lib/admin";
import { getChatDisplayNameParts } from "../../lib/chat";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";

type UserProfile = {
  firstName?: string;
  lastName?: string;
  rank?: string;
  flight?: string;
  name?: string;
  driverPhotoUrl?: string;
  riderPhotoUrl?: string;
};

type ChatMessage = {
  id: string;
  text?: string;
  senderUid?: string;
  senderFirstName?: string;
  senderRank?: string;
  senderLastName?: string;
  senderFlight?: string;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
};

const CHAT_COOLDOWN_MS = 3000;
const NEAR_BOTTOM_PX = 96;

function formatMessageTime(message: ChatMessage) {
  const seconds = message.createdAt?.seconds;

  if (!seconds) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(seconds * 1000));
}

function isNearBottom(element: HTMLDivElement | null) {
  if (!element) return true;

  return element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
}

export default function ChatClient() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadAnchorId, setUnreadAnchorId] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasInitialMessagesRef = useRef(false);
  const lastOwnMessageIdRef = useRef<string | null>(null);
  const cooldownEndsAtRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const messagesQuery = query(collection(db, "globalMessages"), orderBy("createdAt", "asc"), limit(150));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const nextMessages = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ChatMessage, "id">),
        }));

        setMessages((currentMessages) => {
          const previousIds = new Set(currentMessages.map((message) => message.id));
          const appendedMessages = nextMessages.filter((message) => !previousIds.has(message.id));
          const newestAppended = appendedMessages[0] ?? null;
          const shouldStickToBottom =
            !hasInitialMessagesRef.current ||
            isNearBottom(messagesContainerRef.current) ||
            appendedMessages.some((message) => message.id === lastOwnMessageIdRef.current);

          if (appendedMessages.length > 0 && !shouldStickToBottom && newestAppended) {
            setUnreadCount((count) => count + appendedMessages.length);
            setUnreadAnchorId((currentAnchor) => currentAnchor || newestAppended.id);
          }

          if (appendedMessages.some((message) => message.id === lastOwnMessageIdRef.current)) {
            lastOwnMessageIdRef.current = null;
          }

          hasInitialMessagesRef.current = true;

          requestAnimationFrame(() => {
            if (shouldStickToBottom) {
              messagesEndRef.current?.scrollIntoView({ behavior: currentMessages.length ? "smooth" : "auto" });
              setUnreadCount(0);
              setUnreadAnchorId(null);
            }
          });

          return nextMessages;
        });
      },
      (error) => {
        console.error(error);
        setStatusMessage("Chat could not load. Firestore access may still need to be deployed.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, cooldownEndsAtRef.current - Date.now());
      setCooldownRemaining(remaining);
    }, 250);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  const canSendIdentity = Boolean(user && profile?.rank?.trim() && profile?.lastName?.trim() && profile?.flight?.trim());
  const canSend = canSendIdentity && cooldownRemaining <= 0;
  const isAdmin = isAdminEmail(user?.email);
  const identity = useMemo(
    () =>
      getChatDisplayNameParts({
        firstName: profile?.firstName,
        rank: profile?.rank,
        lastName: profile?.lastName,
        flight: profile?.flight,
      }),
    [profile?.firstName, profile?.flight, profile?.lastName, profile?.rank]
  );

  const jumpToLatest = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadCount(0);
    setUnreadAnchorId(null);
  };

  const handleMessagesScroll = () => {
    const nearBottom = isNearBottom(messagesContainerRef.current);
    setIsAtBottom(nearBottom);

    if (nearBottom && unreadCount > 0) {
      setUnreadCount(0);
      setUnreadAnchorId(null);
    }
  };

  const sendMessage = async () => {
    if (!user || !profile) {
      setStatusMessage("You need to log in first.");
      return;
    }

    if (!canSendIdentity) {
      setStatusMessage("Add your rank, last name, and flight in Account Settings before joining chat.");
      return;
    }

    if (cooldownRemaining > 0) {
      setStatusMessage(`Please wait ${Math.ceil(cooldownRemaining / 1000)}s before sending again.`);
      return;
    }

    const trimmed = messageText.trim();

    if (!trimmed) {
      setStatusMessage("Type a message first.");
      return;
    }

    try {
      setSending(true);
      setStatusMessage("");
      const createdRef = await addDoc(collection(db, "globalMessages"), {
        text: trimmed,
        senderUid: user.uid,
        senderFirstName: profile.firstName?.trim() || "",
        senderRank: profile.rank?.trim() || "",
        senderLastName: profile.lastName?.trim() || "",
        senderFlight: profile.flight?.trim() || "",
        createdAt: serverTimestamp(),
      });
      lastOwnMessageIdRef.current = createdRef.id;
      cooldownEndsAtRef.current = Date.now() + CHAT_COOLDOWN_MS;
      setCooldownRemaining(CHAT_COOLDOWN_MS);
      setMessageText("");
      requestAnimationFrame(() => jumpToLatest());
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error instanceof Error && error.message.toLowerCase().includes("permission")
          ? "Chat send is blocked right now. Firestore rules may still need to be deployed."
          : "Could not send that message."
      );
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user || !isAdmin) {
      setStatusMessage("Only the admin account can remove chat messages.");
      return;
    }

    try {
      setDeletingId(messageId);
      setStatusMessage("");
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "delete",
          messageId,
        }),
      });

      if (!response.ok) {
        const details = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatusMessage(details?.error || "Could not remove that message.");
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not remove that message.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Chat" caption="Pulling the latest squadron-wide message traffic." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            marginBottom: 20,
            padding: "8px 14px",
            backgroundColor: "#1f2937",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Login
        </Link>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <DeveloperBackLink />

      <h1>Global Chat</h1>
      <p style={{ maxWidth: 720 }}>
        Everyone in the app can read and send messages here. Your messages show as your rank and last name, with your
        flight listed in smaller text.
      </p>

      <div
        style={{
          maxWidth: 760,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: 16,
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
          }}
        >
          <strong>{identity.primary}</strong>
          {identity.secondary ? <span style={{ marginLeft: 8, fontSize: 13, color: "#94a3b8" }}>{identity.secondary}</span> : null}
          {cooldownRemaining > 0 ? (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Cooldown active. You can send again in {Math.ceil(cooldownRemaining / 1000)}s.
            </p>
          ) : null}
        </div>

        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          style={{ padding: 16, maxHeight: "58vh", overflowY: "auto", display: "grid", gap: 10 }}
        >
          {messages.length === 0 ? <p style={{ margin: 0 }}>No messages yet.</p> : null}
          {messages.map((message, index) => {
            const sender = getChatDisplayNameParts({
              firstName: message.senderFirstName,
              rank: message.senderRank,
              lastName: message.senderLastName,
              flight: message.senderFlight,
            });
            const ownMessage = message.senderUid === user.uid;
            const previousMessage = messages[index - 1];
            const groupedWithPrevious =
              previousMessage &&
              previousMessage.senderUid === message.senderUid &&
              previousMessage.senderRank === message.senderRank &&
              previousMessage.senderLastName === message.senderLastName &&
              previousMessage.senderFlight === message.senderFlight;
            const showUnreadDivider = unreadAnchorId === message.id;

            return (
              <div key={message.id} style={{ display: "grid", gap: showUnreadDivider ? 10 : 0 }}>
                {showUnreadDivider ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "#7dd3fc",
                      fontSize: 12,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    <div style={{ flex: 1, height: 1, backgroundColor: "rgba(125, 211, 252, 0.28)" }} />
                    New messages
                    <div style={{ flex: 1, height: 1, backgroundColor: "rgba(125, 211, 252, 0.28)" }} />
                  </div>
                ) : null}

                <div
                  style={{
                    justifySelf: ownMessage ? "end" : "start",
                    maxWidth: "min(92%, 520px)",
                    padding: groupedWithPrevious ? "10px 14px" : "12px 14px",
                    borderRadius: groupedWithPrevious
                      ? ownMessage
                        ? "14px 14px 14px 10px"
                        : "14px 14px 10px 14px"
                      : 14,
                    backgroundColor: ownMessage ? "rgba(15, 118, 110, 0.22)" : "rgba(15, 23, 42, 0.72)",
                    border: ownMessage
                      ? "1px solid rgba(45, 212, 191, 0.25)"
                      : "1px solid rgba(148, 163, 184, 0.14)",
                  }}
                >
                  {!groupedWithPrevious ? (
                    <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{sender.primary}</strong>
                      {sender.secondary ? <span style={{ fontSize: 12, color: "#94a3b8" }}>{sender.secondary}</span> : null}
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{formatMessageTime(message)}</span>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => void deleteMessage(message.id)}
                          disabled={deletingId === message.id}
                          style={{
                            marginLeft: "auto",
                            padding: "4px 8px",
                            fontSize: 11,
                            borderRadius: 999,
                            background: "rgba(127, 29, 29, 0.84)",
                            textTransform: "none",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {deletingId === message.id ? "Removing..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 4, fontSize: 11, color: "#64748b" }}>{formatMessageTime(message)}</div>
                  )}
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message.text || ""}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {unreadCount > 0 && !isAtBottom ? (
          <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={jumpToLatest}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "linear-gradient(180deg, rgba(14, 116, 144, 0.94) 0%, rgba(8, 47, 73, 0.98) 100%)",
                textTransform: "none",
                letterSpacing: "0.03em",
              }}
            >
              Jump to latest ({unreadCount})
            </button>
          </div>
        ) : null}

        <div style={{ padding: 16, borderTop: "1px solid rgba(148, 163, 184, 0.12)" }}>
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value.slice(0, 500))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={
              canSendIdentity
                ? "Type a message to everyone..."
                : "Set your rank, last name, and flight in Account Settings to send messages."
            }
            rows={4}
            style={{ maxWidth: "100%", resize: "vertical", marginBottom: 12 }}
          />
          <p style={{ marginTop: 0, marginBottom: 12, color: "#94a3b8", fontSize: 13 }}>
            Press Enter to send. Use Shift+Enter for a new line.
          </p>
          {statusMessage ? <p style={{ marginTop: 0, marginBottom: 12, color: "#fbbf24" }}>{statusMessage}</p> : null}
          <button type="button" onClick={() => void sendMessage()} disabled={sending || !canSend}>
            {sending ? "Sending..." : cooldownRemaining > 0 ? `Wait ${Math.ceil(cooldownRemaining / 1000)}s` : "Send Message"}
          </button>
        </div>
      </div>
    </main>
  );
}
