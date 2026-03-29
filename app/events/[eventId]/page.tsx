"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import FullscreenImageViewer from "../../components/FullscreenImageViewer";
import HomeIconLink from "../../components/HomeIconLink";
import { auth, db } from "../../../lib/firebase";
import { formatEventDateEntry, formatEventTypeLabel, formatRecurringRule, getEventCardDateLabel, getRecurringOccurrenceDateTexts, type EventRecord } from "../../../lib/events";

type UserProfile = {
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
  riderPhotoUrl?: string | null;
  driverPhotoUrl?: string | null;
  name?: string | null;
};

type EventAttendeeRecord = {
  id: string;
  eventId: string;
  attendeeUid: string;
  attendeeLabel: string;
  attendeePhotoUrl?: string | null;
  createdAt?: { seconds?: number; nanoseconds?: number } | Date | null;
};

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

const metaPillStyle: React.CSSProperties = {
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

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [attendees, setAttendees] = useState<EventAttendeeRecord[]>([]);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("");
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

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (!snapshot.exists()) {
        setProfile(null);
        return;
      }

      setProfile(snapshot.data() as UserProfile);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !params.eventId) {
      setAttendees([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "eventAttendees"), where("eventId", "==", params.eventId)),
      (snapshot) => {
        const nextAttendees = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<EventAttendeeRecord, "id">),
        }));

        nextAttendees.sort((a, b) => a.attendeeLabel.localeCompare(b.attendeeLabel));
        setAttendees(nextAttendees);
      }
    );

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

  const recurringUpcomingLines = useMemo(() => {
    if (!eventRecord || eventRecord.scheduleMode !== "recurring") {
      return [];
    }

    return getRecurringOccurrenceDateTexts(eventRecord.recurrence, 3).map((dateText) =>
      new Date(`${dateText}T12:00:00`).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, [eventRecord]);

  const nextOccurrenceLabel = useMemo(() => {
    if (!eventRecord) {
      return "Schedule pending";
    }

    return getEventCardDateLabel(eventRecord);
  }, [eventRecord]);

  const currentUserAttending = useMemo(() => {
    if (!user) {
      return false;
    }

    return attendees.some((attendee) => attendee.attendeeUid === user.uid);
  }, [attendees, user]);

  const currentUserAttendanceId = user && params.eventId ? `${params.eventId}_${user.uid}` : null;

  const currentUserAttendanceLabel = useMemo(() => {
    const rank = profile?.rank?.trim() || "";
    const lastName = profile?.lastName?.trim() || "";
    const firstInitial = profile?.firstName?.trim()?.charAt(0).toUpperCase() || "";

    if (rank && lastName && firstInitial) {
      return `${rank} ${lastName}, ${firstInitial}`;
    }

    if (rank && lastName) {
      return `${rank} ${lastName}`;
    }

    if (profile?.name?.trim()) {
      return profile.name.trim();
    }

    return user?.email?.split("@")[0] || "Attendee";
  }, [profile, user]);

  const currentUserPhotoUrl = profile?.riderPhotoUrl?.trim() || profile?.driverPhotoUrl?.trim() || "";

  const toggleAttendance = async () => {
    if (!user || !params.eventId || !currentUserAttendanceId) {
      return;
    }

    try {
      setAttendanceSaving(true);
      setAttendanceStatus("");

      if (currentUserAttending) {
        await deleteDoc(doc(db, "eventAttendees", currentUserAttendanceId));
        setAttendanceStatus("You have been removed from the attendance list.");
        return;
      }

      await setDoc(doc(db, "eventAttendees", currentUserAttendanceId), {
        eventId: params.eventId,
        attendeeUid: user.uid,
        attendeeLabel: currentUserAttendanceLabel,
        attendeePhotoUrl: currentUserPhotoUrl || null,
        createdAt: new Date(),
      });
      setAttendanceStatus("You are on the attendance list.");
    } catch (error) {
      console.error(error);
      setAttendanceStatus(error instanceof Error ? error.message : "Could not update attendance.");
    } finally {
      setAttendanceSaving(false);
    }
  };

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
                    width: "100%",
                    aspectRatio: "2 / 1",
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={metaPillStyle}>{formatEventTypeLabel(eventRecord.type)}</span>
              <span style={metaPillStyle}>Next: {nextOccurrenceLabel}</span>
              {typeof eventRecord.neededPeople === "number" && eventRecord.neededPeople > 0 ? (
                <span style={metaPillStyle}>{eventRecord.neededPeople} needed</span>
              ) : (
                <span style={metaPillStyle}>Open attendance</span>
              )}
            </div>
            <h1 style={{ margin: 0 }}>{eventRecord.name}</h1>
            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.55 }}>{eventRecord.location}</p>
            {eventRecord.address ? (
              <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>{eventRecord.address}</p>
            ) : null}
            {eventRecord.photoUrl ? (
              <p style={{ margin: 0, color: "#7f8da3", fontSize: 12 }}>
                Tap the event photo to expand it.
              </p>
            ) : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(126, 142, 160, 0.14)",
                background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
                padding: 14,
              }}
            >
              <strong style={{ display: "block", marginBottom: 8 }}>Schedule</strong>
              <div style={{ display: "grid", gap: 8 }}>
                {scheduleLines.length > 0 ? scheduleLines.map((line) => (
                  <p key={line} style={{ margin: 0, color: "#cbd5e1" }}>{line}</p>
                )) : (
                  <p style={{ margin: 0, color: "#94a3b8" }}>Schedule pending.</p>
                )}
                {eventRecord.scheduleMode === "recurring" && recurringUpcomingLines.length > 0 ? (
                  <>
                    <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                      Next 3 Upcoming Dates
                    </p>
                    {recurringUpcomingLines.map((line) => (
                      <p key={line} style={{ margin: 0, color: "#cbd5e1" }}>{line}</p>
                    ))}
                  </>
                ) : null}
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(126, 142, 160, 0.14)",
                background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
                padding: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <strong style={{ display: "block" }}>Attendance</strong>
              <p style={{ margin: 0, color: "#cbd5e1" }}>
                {typeof eventRecord.neededPeople === "number" && eventRecord.neededPeople > 0
                  ? `${eventRecord.neededPeople} people needed`
                  : "No target headcount set"}
              </p>
              <div style={{ display: "grid", gap: 4 }}>
                <span style={{ color: "#94a3b8", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                  Event Format
                </span>
                <p style={{ margin: 0, color: "#cbd5e1" }}>
                  {eventRecord.scheduleMode === "recurring" ? "Recurring schedule with rolling upcoming dates." : "One-time event with specific date blocks."}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(126, 142, 160, 0.14)",
              background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
              padding: 14,
            }}
          >
            <strong style={{ display: "block", marginBottom: 8 }}>Description</strong>
            <p style={{ margin: 0, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
              {eventRecord.description}
            </p>
          </div>

          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(126, 142, 160, 0.14)",
              background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
              padding: 14,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 14, flexWrap: "wrap" }}>
              <div>
                <strong style={{ display: "block" }}>Attendance Roster</strong>
              </div>

              <button
                type="button"
                onClick={() => void toggleAttendance()}
                disabled={attendanceSaving}
                style={{
                  ...primaryButtonStyle,
                  minHeight: 40,
                  padding: "9px 15px",
                  background: currentUserAttending
                    ? "linear-gradient(180deg, rgba(32, 51, 79, 0.96) 0%, rgba(18, 31, 48, 0.99) 100%)"
                    : primaryButtonStyle.background,
                }}
              >
                {attendanceSaving ? "Saving..." : currentUserAttending ? "Attending" : "I'll Attend"}
              </button>
            </div>

            {attendanceStatus ? (
              <p style={{ margin: 0, color: "#cbd5e1" }}>{attendanceStatus}</p>
            ) : null}

            {attendees.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px minmax(0, 1fr)",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        background: attendee.attendeePhotoUrl
                          ? `center / cover no-repeat url(${attendee.attendeePhotoUrl})`
                          : "linear-gradient(180deg, rgba(47, 60, 79, 0.82) 0%, rgba(24, 33, 45, 0.95) 100%)",
                        border: "1px solid rgba(126, 142, 160, 0.18)",
                        display: "grid",
                        placeItems: "center",
                        color: "#dbe7f5",
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {!attendee.attendeePhotoUrl ? attendee.attendeeLabel.charAt(0).toUpperCase() : null}
                    </div>
                    <p style={{ margin: 0, color: "#cbd5e1" }}>{attendee.attendeeLabel}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#94a3b8" }}>Nobody has signed up for this event yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
