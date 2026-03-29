"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import { auth, db } from "../../lib/firebase";
import { EVENT_TYPE_OPTIONS, eventMatchesDateRange, eventMatchesType, formatEventTypeLabel, getEventCardDateLabel, isUpcomingEvent, sortEventsByUpcomingDate, type EventRecord } from "../../lib/events";

type EventCreatorProfile = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
};

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

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "9px 14px",
  borderRadius: 12,
  textDecoration: "none",
  background: "linear-gradient(180deg, rgba(24, 31, 40, 0.98) 0%, rgba(11, 16, 22, 0.99) 100%)",
  color: "#dbe7f5",
  border: "1px solid rgba(126, 142, 160, 0.2)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 20px rgba(0, 0, 0, 0.22)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 11,
};

const infoPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 11px",
  borderRadius: 999,
  border: "1px solid rgba(126, 142, 160, 0.16)",
  background: "rgba(17, 24, 39, 0.62)",
  color: "#dbe7f5",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: "var(--font-display)",
};

export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [creatorDirectory, setCreatorDirectory] = useState<Record<string, EventCreatorProfile>>({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const nextDirectory: Record<string, EventCreatorProfile> = {};

      snapshot.docs.forEach((docSnap) => {
        nextDirectory[docSnap.id] = docSnap.data() as EventCreatorProfile;
      });

      setCreatorDirectory(nextDirectory);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredEvents = useMemo(() => {
    return sortEventsByUpcomingDate(
      events.filter((event) => {
        return (
          isUpcomingEvent(event) &&
          eventMatchesType(event, selectedType) &&
          eventMatchesDateRange(event, dateFrom, dateTo)
        );
      })
    );
  }, [dateFrom, dateTo, events, selectedType]);

  const hasActiveFilters = selectedType !== "all" || Boolean(dateFrom) || Boolean(dateTo);
  const nextEvent = filteredEvents[0] || null;

  const getOrganizerLabel = (event: EventRecord) => {
    const creator = event.createdByUid ? creatorDirectory[event.createdByUid] : null;
    const rank = creator?.rank?.trim() || "";
    const lastName = creator?.lastName?.trim() || "";
    const firstInitial = creator?.firstName?.trim()?.charAt(0).toUpperCase() || "";

    if (rank && lastName && firstInitial) {
      return `POC: ${rank} ${lastName}, ${firstInitial}`;
    }

    if (rank && lastName) {
      return `POC: ${rank} ${lastName}`;
    }

    if (creator?.name?.trim()) {
      return `POC: ${creator.name.trim()}`;
    }

    if (event.createdByEmail?.trim()) {
      return `POC: ${event.createdByEmail.trim()}`;
    }

    return "POC: Not listed";
  };

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
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <div style={{ display: "grid", gap: 6 }}>
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
                Scheduling and group coordination board
              </p>
              <h1 style={{ margin: "4px 0 0" }}>Events</h1>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={infoPillStyle}>{filteredEvents.length} upcoming shown</span>
                {nextEvent ? <span style={infoPillStyle}>Next up: {nextEvent.name}</span> : null}
              </div>
            </div>
          </div>

          <Link href="/events/new" style={{ ...primaryButtonStyle, gap: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            <span>Add Event</span>
          </Link>
        </div>

        <section style={{ ...cardStyle, padding: "1rem 1rem 1.05rem", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "grid", minWidth: 0 }}>
              <strong style={{ fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                Filter
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setFiltersExpanded((current) => !current)}
              aria-expanded={filtersExpanded}
              aria-label={filtersExpanded ? "Collapse filters" : "Expand filters"}
              style={{
                width: 40,
                minWidth: 40,
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(126, 142, 160, 0.2)",
                background: "linear-gradient(180deg, rgba(24, 31, 40, 0.98) 0%, rgba(11, 16, 22, 0.99) 100%)",
                color: "#dbe7f5",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 20px rgba(0, 0, 0, 0.22)",
                fontFamily: "var(--font-display)",
                fontSize: 20,
                lineHeight: 1,
                padding: 0,
              }}
            >
              {filtersExpanded ? "−" : "+"}
            </button>
          </div>

          <div
            className={`app-collapsible-panel${filtersExpanded ? " app-collapsible-panel-open" : ""}`}
            style={{
              display: "grid",
              gap: 12,
              maxHeight: filtersExpanded ? 320 : 0,
            }}
            aria-hidden={!filtersExpanded}
          >
            <div
              style={{
                display: "grid",
                gap: 12,
                paddingTop: 2,
              }}
            >
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

              {hasActiveFilters ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType("all");
                      setDateFrom("");
                      setDateTo("");
                    }}
                    style={secondaryButtonStyle}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : null}
            </div>
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
                gap: 14,
                padding: 16,
                textDecoration: "none",
                color: "#e5edf7",
              }}
            >
              {event.photoUrl ? (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "2 / 1",
                    borderRadius: 14,
                    backgroundImage: `url(${event.photoUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                  }}
                />
              ) : null}

              <div style={{ minWidth: 0, display: "grid", gap: 10, position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    color: "#9cc2ee",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  View Details
                </span>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start", paddingRight: 112 }}>
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
                    <p style={{ margin: 0, color: "#9fb1c7", fontSize: 13, letterSpacing: "0.03em" }}>
                      {getOrganizerLabel(event)}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={infoPillStyle}>{getEventCardDateLabel(event)}</span>
                  <span style={infoPillStyle}>{event.location}</span>
                  {typeof event.neededPeople === "number" && event.neededPeople > 0 ? (
                    <span style={infoPillStyle}>{event.neededPeople} needed</span>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 5, color: "#cbd5e1" }}>
                  {event.address ? (
                    <p style={{ margin: 0 }}><strong>Address:</strong> {event.address}</p>
                  ) : null}
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#94a3b8",
                    lineHeight: 1.55,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {event.description}
                </p>
              </div>
            </Link>
          )) : (
            <div style={{ ...cardStyle, padding: "1rem 1rem 1.1rem" }}>
              <strong style={{ display: "block", marginBottom: 8 }}>No matching upcoming events</strong>
              <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>
                Try widening the date range, clearing the type filter, or add the first event from the button above.
              </p>
              {hasActiveFilters ? (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType("all");
                      setDateFrom("");
                      setDateTo("");
                    }}
                    style={secondaryButtonStyle}
                  >
                    Reset Filters
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
