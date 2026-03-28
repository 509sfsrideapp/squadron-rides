"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import FullscreenImageViewer from "../../components/FullscreenImageViewer";
import HomeIconLink from "../../components/HomeIconLink";
import { auth, db } from "../../../lib/firebase";
import { formatEventDateEntry, formatEventTypeLabel, formatRecurringRule, type EventRecord } from "../../../lib/events";

const sectionStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(126, 142, 160, 0.18)",
  background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
  padding: "1rem 1rem 1.1rem",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "8px 13px",
  borderRadius: 10,
  textDecoration: "none",
  background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
  color: "#ffffff",
  border: "1px solid rgba(126, 142, 160, 0.24)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  fontSize: 10.5,
};

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const [photoExpanded, setPhotoExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !params.eventId) return;

    const unsubscribe = onSnapshot(doc(db, "events", params.eventId), (snapshot) => {
      if (!snapshot.exists()) {
        setEventRecord(null);
        return;
      }

      setEventRecord({
        id: snapshot.id,
        ...(snapshot.data() as Omit<EventRecord, "id">),
      });
    });

    return () => unsubscribe();
  }, [params.eventId, user]);

  const scheduleLines = useMemo(() => {
    if (!eventRecord) {
      return [];
    }

    return eventRecord.scheduleMode === "recurring"
      ? [formatRecurringRule(eventRecord.recurrence)]
      : eventRecord.scheduleEntries
          .filter((entry) => entry.startDate.trim())
          .map((entry) => formatEventDateEntry(entry));
  }, [eventRecord]);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Event" caption="Opening event details and schedule." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Event Details</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  if (!eventRecord) {
    return (
      <main style={{ padding: 20 }}>
        <div style={{ maxWidth: 940, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <Link href="/events" style={primaryButtonStyle}>Back to Events</Link>
          </div>
          <section style={sectionStyle}>
            <h1 style={{ marginTop: 0 }}>Event Unavailable</h1>
            <p style={{ marginBottom: 0, color: "#94a3b8" }}>That event could not be found.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 940, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <Link href="/events" style={primaryButtonStyle}>Back to Events</Link>
          </div>

          <span
            style={{
              display: "inline-flex",
              padding: "6px 12px",
              borderRadius: 999,
              backgroundColor: "rgba(37, 99, 235, 0.18)",
              color: "#bfdbfe",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)",
            }}
          >
            {formatEventTypeLabel(eventRecord.type)}
          </span>
        </div>

        <section style={{ ...sectionStyle, display: "grid", gap: 18 }}>
          {eventRecord.photoUrl ? (
            <>
              <button
                type="button"
                onClick={() => setPhotoExpanded(true)}
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  boxShadow: "none",
                  cursor: "zoom-in",
                  borderRadius: 16,
                }}
                aria-label="Expand event image"
              >
                <div
                  style={{
                    minHeight: 260,
                    borderRadius: 16,
                    backgroundImage: `url(${eventRecord.photoUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                  }}
                />
              </button>

              <FullscreenImageViewer
                src={eventRecord.photoUrl}
                alt={eventRecord.name}
                open={photoExpanded}
                onClose={() => setPhotoExpanded(false)}
              />
            </>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            <h1 style={{ margin: 0 }}>{eventRecord.name}</h1>
            <p style={{ margin: 0, color: "#cbd5e1" }}>{eventRecord.location}</p>
            {eventRecord.address ? (
              <p style={{ margin: 0, color: "#94a3b8" }}>{eventRecord.address}</p>
            ) : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <strong style={{ display: "block", marginBottom: 8 }}>Schedule</strong>
              <div style={{ display: "grid", gap: 8 }}>
                {scheduleLines.length > 0 ? scheduleLines.map((line) => (
                  <p key={line} style={{ margin: 0, color: "#cbd5e1" }}>{line}</p>
                )) : (
                  <p style={{ margin: 0, color: "#94a3b8" }}>Schedule pending.</p>
                )}
              </div>
            </div>

            <div>
              <strong style={{ display: "block", marginBottom: 8 }}>Attendance</strong>
              <p style={{ margin: 0, color: "#cbd5e1" }}>
                {typeof eventRecord.neededPeople === "number" && eventRecord.neededPeople > 0
                  ? `${eventRecord.neededPeople} people needed`
                  : "No target headcount set"}
              </p>
            </div>
          </div>

          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>Description</strong>
            <p style={{ margin: 0, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
              {eventRecord.description}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
