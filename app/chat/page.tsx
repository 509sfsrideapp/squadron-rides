"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import HomeIconLink from "../components/HomeIconLink";
import { auth, db } from "../../lib/firebase";
import { getChatDisplayNameParts } from "../../lib/chat";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

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

function formatMessageTime(message: ChatMessage) {
  const seconds = message.createdAt?.seconds;

  if (!seconds) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(seconds * 1000));
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
        setMessages(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<ChatMessage, "id">),
          }))
        );
      },
      (error) => {
        console.error(error);
        setStatusMessage("Chat could not load. Firestore access may still need to be deployed.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const canSend = Boolean(user && profile?.rank?.trim() && profile?.lastName?.trim() && profile?.flight?.trim());
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

  const sendMessage = async () => {
    if (!user || !profile) {
      setStatusMessage("You need to log in first.");
      return;
    }

    if (!canSend) {
      setStatusMessage("Add your rank, last name, and flight in Account Settings before joining chat.");
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
      await addDoc(collection(db, "globalMessages"), {
        text: trimmed,
        senderUid: user.uid,
        senderFirstName: profile.firstName?.trim() || "",
        senderRank: profile.rank?.trim() || "",
        senderLastName: profile.lastName?.trim() || "",
        senderFlight: profile.flight?.trim() || "",
        createdAt: new Date(),
      });
      setMessageText("");
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

  if (loading) {
    return <main style={{ padding: 20 }}><p>Loading chat...</p></main>;
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
      <HomeIconLink />

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
        </div>

        <div style={{ padding: 16, maxHeight: "58vh", overflowY: "auto", display: "grid", gap: 12 }}>
          {messages.length === 0 ? <p style={{ margin: 0 }}>No messages yet.</p> : null}
          {messages.map((message) => {
            const sender = getChatDisplayNameParts({
              firstName: message.senderFirstName,
              rank: message.senderRank,
              lastName: message.senderLastName,
              flight: message.senderFlight,
            });
            const ownMessage = message.senderUid === user.uid;

            return (
              <div
                key={message.id}
                style={{
                  justifySelf: ownMessage ? "end" : "start",
                  maxWidth: "min(92%, 520px)",
                  padding: "12px 14px",
                  borderRadius: 14,
                  backgroundColor: ownMessage ? "rgba(15, 118, 110, 0.22)" : "rgba(15, 23, 42, 0.72)",
                  border: ownMessage
                    ? "1px solid rgba(45, 212, 191, 0.25)"
                    : "1px solid rgba(148, 163, 184, 0.14)",
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <strong>{sender.primary}</strong>
                  {sender.secondary ? <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8" }}>{sender.secondary}</span> : null}
                  <span style={{ marginLeft: 10, fontSize: 12, color: "#94a3b8" }}>{formatMessageTime(message)}</span>
                </div>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message.text || ""}</p>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 16, borderTop: "1px solid rgba(148, 163, 184, 0.12)" }}>
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value.slice(0, 500))}
            placeholder={
              canSend
                ? "Type a message to everyone..."
                : "Set your rank, last name, and flight in Account Settings to send messages."
            }
            rows={4}
            style={{ maxWidth: "100%", resize: "vertical", marginBottom: 12 }}
          />
          {statusMessage ? <p style={{ marginTop: 0, marginBottom: 12, color: "#fbbf24" }}>{statusMessage}</p> : null}
          <button type="button" onClick={sendMessage} disabled={sending || !canSend}>
            {sending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </main>
  );
}
