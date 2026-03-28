"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import { auth, db } from "../../lib/firebase";
import { EVENT_TYPE_OPTIONS, eventMatchesDateRange, eventMatchesType, formatEventTypeLabel, getEventCardDateLabel, isUpcomingEvent, sortEventsByUpcomingDate, type EventRecord } from "../../lib/events";

const pageShellStyle: React.CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  display: "grid",
  gap: 18,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(126, 142, 160, 0.18)",
  background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
};

const primaryButtonStyle: React.CSSProperties = {
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
};

export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedType, setSelectedType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const nextEvents = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<EventRecord, "id">),
      }));

      setEvents(sortEventsByUpcomingDate(nextEvents));
    });

    return () => unsubscribe();
  }, [user]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      return (
        isUpcomingEvent(event) &&
        eventMatchesType(event, selectedType) &&
        eventMatchesDateRange(event, dateFrom, dateTo)
      );
    });
  }, [dateFrom, dateTo, events, selectedType]);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Events" caption="Opening the upcoming events board." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Events</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={pageShellStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <div>
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
                Scheduling and group coordination
              </p>
              <h1 style={{ margin: "4px 0 0" }}>Events</h1>
            </div>
          </div>

          <Link href="/events/new" style={{ ...primaryButtonStyle, gap: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            <span>Add Event</span>
          </Link>
        </div>

        <section style={{ ...cardStyle, padding: "1rem 1rem 1.05rem", display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <strong style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              Upcoming Events
            </strong>
            <p style={{ margin: 0, color: "#94a3b8" }}>
              Scroll through the current event board, then filter by type or date range to narrow it down.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Event Type</span>
              <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                <option value="all">All types</option>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>From Date</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>To Date</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>
        </section>

        <section style={{ display: "grid", gap: 14 }}>
          {filteredEvents.length > 0 ? filteredEvents.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              style={{
                ...cardStyle,
                display: "grid",
                gridTemplateColumns: event.photoUrl ? "150px minmax(0, 1fr)" : "minmax(0, 1fr)",
                gap: 16,
                padding: 16,
                textDecoration: "none",
                color: "#e5edf7",
              }}
            >
              {event.photoUrl ? (
                <div
                  style={{
                    minHeight: 140,
                    borderRadius: 14,
                    backgroundImage: `url(${event.photoUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                  }}
                />
              ) : null}

              <div style={{ minWidth: 0, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        justifySelf: "start",
                        padding: "5px 10px",
                        borderRadius: 999,
                        backgroundColor: "rgba(37, 99, 235, 0.18)",
                        color: "#bfdbfe",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {formatEventTypeLabel(event.type)}
                    </span>
                    <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{event.name}</h2>
                  </div>

                  <span style={{ color: "#9cc2ee", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                    View Event
                  </span>
                </div>

                <div style={{ display: "grid", gap: 5, color: "#cbd5e1" }}>
                  <p style={{ margin: 0 }}><strong>When:</strong> {getEventCardDateLabel(event)}</p>
                  <p style={{ margin: 0 }}><strong>Where:</strong> {event.location}</p>
                  {event.address ? (
                    <p style={{ margin: 0 }}><strong>Address:</strong> {event.address}</p>
                  ) : null}
                  {typeof event.neededPeople === "number" && event.neededPeople > 0 ? (
                    <p style={{ margin: 0 }}><strong>People Needed:</strong> {event.neededPeople}</p>
                  ) : null}
                </div>

                <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>
                  {event.description.length > 220 ? `${event.description.slice(0, 220).trim()}...` : event.description}
                </p>
              </div>
            </Link>
          )) : (
            <div style={{ ...cardStyle, padding: "1rem 1rem 1.1rem" }}>
              <strong style={{ display: "block", marginBottom: 8 }}>No matching upcoming events</strong>
              <p style={{ margin: 0, color: "#94a3b8" }}>
                Try widening the date range, clearing the type filter, or add the first event from the button above.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
