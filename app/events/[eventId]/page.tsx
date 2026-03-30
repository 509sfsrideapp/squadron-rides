"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import FullscreenImageViewer from "../../components/FullscreenImageViewer";
import HomeIconLink from "../../components/HomeIconLink";
import { ReportableTarget } from "../../components/MisconductReporting";
import UserPreviewTrigger from "../../components/UserPreviewTrigger";
import { isAdminEmail } from "../../../lib/admin";
import { openEventConversation } from "../../../lib/direct-message-launch";
import { auth, db } from "../../../lib/firebase";
import { buildMisconductPreviewText } from "../../../lib/misconduct";
import { formatEventCreatorLabel, formatEventDateEntry, formatEventLocationLabel, formatEventTypeLabel, formatRecurringRule, getEventCardDateLabel, getEventPhotoUrls, getRecurringOccurrenceDateTexts, type EventRecord } from "../../../lib/events";

type UserProfile = {
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
  riderPhotoUrl?: string | null;
  driverPhotoUrl?: string | null;
  name?: string | null;
};

type EventCreatorProfile = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
};

type EventAttendeeRecord = {
  id: string;
  eventId: string;
  attendeeUid: string;
  attendeeLabel: string;
  attendeePhotoUrl?: string | null;
  createdAt?: { seconds?: number; nanoseconds?: number } | Date | null;
};

const rankOrder = [
  "Gen",
  "Lt Gen",
  "Maj Gen",
  "Brig Gen",
  "Col",
  "Lt Col",
  "Maj",
  "Capt",
  "1st Lt",
  "2d Lt",
  "CMSgt",
  "SMSgt",
  "MSgt",
  "TSgt",
  "SSgt",
  "SrA",
  "A1C",
  "Amn",
  "AB",
  "CIV",
] as const;

function getAttendeeRankPriority(label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  const rankIndex = rankOrder.findIndex((rank) => normalizedLabel.startsWith(rank.toLowerCase()));
  return rankIndex === -1 ? rankOrder.length : rankIndex;
}

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<EventCreatorProfile | null>(null);
  const [attendees, setAttendees] = useState<EventAttendeeRecord[]>([]);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [messageOpening, setMessageOpening] = useState(false);

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

        nextAttendees.sort((a, b) => {
          const rankDifference = getAttendeeRankPriority(a.attendeeLabel) - getAttendeeRankPriority(b.attendeeLabel);
          if (rankDifference !== 0) {
            return rankDifference;
          }

          return a.attendeeLabel.localeCompare(b.attendeeLabel);
        });
        setAttendees(nextAttendees);
      }
    );

    return () => unsubscribe();
  }, [params.eventId, user]);

  useEffect(() => {
    if (!user || !eventRecord?.createdByUid) {
      setCreatorProfile(null);
      return;
    }

    if (formatEventCreatorLabel(eventRecord) !== "POC: Not listed") {
      setCreatorProfile(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await getDoc(doc(db, "users", eventRecord.createdByUid!));
        if (!snapshot.exists() || cancelled) {
          return;
        }

        setCreatorProfile(snapshot.data() as EventCreatorProfile);
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventRecord, user]);

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
  const eventPhotoUrls = useMemo(
    () => (eventRecord ? getEventPhotoUrls(eventRecord) : []),
    [eventRecord]
  );

  const organizerLabel = useMemo(() => {
    if (!eventRecord) {
      return "POC: Not listed";
    }

    const embeddedLabel = formatEventCreatorLabel(eventRecord);
    if (embeddedLabel !== "POC: Not listed") {
      return embeddedLabel;
    }

    return creatorProfile ? formatEventCreatorLabel({
      createdByName: creatorProfile.name,
      createdByFirstName: creatorProfile.firstName,
      createdByLastName: creatorProfile.lastName,
      createdByRank: creatorProfile.rank,
    }) : "POC: Not listed";
  }, [creatorProfile, eventRecord]);

  const currentUserAttending = useMemo(() => {
    if (!user) {
      return false;
    }

    return attendees.some((attendee) => attendee.attendeeUid === user.uid);
  }, [attendees, user]);

  const currentUserAttendanceId = user && params.eventId ? `${params.eventId}_${user.uid}` : null;
  const isAdminViewer = isAdminEmail(user?.email);

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

      const idToken = await user.getIdToken().catch(() => null);

      if (idToken) {
        await fetch("/api/events/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            action: "rsvp",
            eventId: params.eventId,
            attendeeLabel: currentUserAttendanceLabel,
          }),
        }).catch((error) => {
          console.error("Event RSVP notification dispatch failed", error);
        });
      }

      setAttendanceStatus("You are on the attendance list.");
    } catch (error) {
      console.error(error);
      setAttendanceStatus(error instanceof Error ? error.message : "Could not update attendance.");
    } finally {
      setAttendanceSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!isAdminViewer || !params.eventId || deletingEvent) {
      return;
    }

    const adminMessage = window.prompt(
      "Optional admin reason for deleting this event. Leave blank to delete without a reason."
    );

    if (adminMessage === null) {
      return;
    }

    try {
      setDeletingEvent(true);
      setAttendanceStatus("");
      const idToken = await user?.getIdToken();

      if (!idToken) {
        throw new Error("You need to sign in again before deleting this event.");
      }

      const response = await fetch(`/api/events/${params.eventId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: adminMessage.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not delete event.");
      }

      router.replace("/events");
    } catch (error) {
      console.error(error);
      setAttendanceStatus(error instanceof Error ? error.message : "Could not delete event.");
      setDeletingEvent(false);
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
            {isAdminViewer ? (
              <button
                type="button"
                onClick={() => void handleDeleteEvent()}
                disabled={deletingEvent}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 38,
                  padding: "8px 13px",
                  borderRadius: 10,
                  border: "1px solid rgba(248, 113, 113, 0.34)",
                  background: "linear-gradient(180deg, rgba(95, 28, 38, 0.9) 0%, rgba(59, 17, 25, 0.96) 100%)",
                  color: "#fecaca",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: 10.5,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 28px rgba(41, 10, 16, 0.3)",
                  cursor: deletingEvent ? "wait" : "pointer",
                  opacity: deletingEvent ? 0.7 : 1,
                }}
              >
                {deletingEvent ? "Deleting..." : "Admin Delete"}
              </button>
            ) : null}
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

        <ReportableTarget
          target={{
            targetType: "event",
            targetId: eventRecord.id,
            targetLabel: eventRecord.name,
            targetPreview: buildMisconductPreviewText(eventRecord.description),
            targetPath: `/events/${eventRecord.id}`,
            targetOwnerUid: eventRecord.createdByUid || null,
          }}
        >
        <section style={{ ...sectionStyle, display: "grid", gap: 18 }}>
          {eventPhotoUrls[0] ? (
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
                    backgroundImage: `url(${eventPhotoUrls[0]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                  }}
                />
              </button>

              <FullscreenImageViewer
                src={eventPhotoUrls[0]}
                alt={eventRecord.name}
                open={photoExpanded}
                onClose={() => setPhotoExpanded(false)}
              />

              {eventPhotoUrls.length > 1 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                  {eventPhotoUrls.slice(1).map((photoUrl, index) => (
                    <div
                      key={`${photoUrl}-${index}`}
                      style={{
                        width: "100%",
                        aspectRatio: "2 / 1",
                        borderRadius: 12,
                        backgroundImage: `url(${photoUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid rgba(126, 142, 160, 0.16)",
                      }}
                    />
                  ))}
                </div>
              ) : null}
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {eventRecord.createdByUid ? (
                <UserPreviewTrigger
                  userId={eventRecord.createdByUid}
                  displayLabel={organizerLabel.replace(/^POC:\s*/, "")}
                  triggerStyle={{
                    color: "#dbe7f5",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  <span>{organizerLabel}</span>
                </UserPreviewTrigger>
              ) : (
                <span
                  style={{
                    color: "#dbe7f5",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {organizerLabel}
                </span>
              )}
              {eventRecord.createdByUid && eventRecord.createdByUid !== user.uid ? (
                <button
                  type="button"
                  disabled={messageOpening}
                  onClick={async () => {
                    try {
                      setMessageOpening(true);
                      setAttendanceStatus("");
                      await openEventConversation(router, eventRecord.id);
                    } catch (error) {
                      setAttendanceStatus(error instanceof Error ? error.message : "Could not open the POC thread.");
                    } finally {
                      setMessageOpening(false);
                    }
                  }}
                  style={primaryButtonStyle}
                >
                  {messageOpening ? "Opening..." : "Message POC"}
                </button>
              ) : null}
            </div>
            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.55 }}>{formatEventLocationLabel(eventRecord.location)}</p>
            {eventRecord.address ? (
              <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>{eventRecord.address}</p>
            ) : null}
            {eventPhotoUrls[0] ? (
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
                    <UserPreviewTrigger
                      userId={attendee.attendeeUid}
                      displayLabel={attendee.attendeeLabel}
                      triggerStyle={{ color: "#cbd5e1", justifySelf: "start" }}
                    >
                      <span>{attendee.attendeeLabel}</span>
                    </UserPreviewTrigger>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#94a3b8" }}>Nobody has signed up for this event yet.</p>
            )}
          </div>
        </section>
        </ReportableTarget>
      </div>
    </main>
  );
}
