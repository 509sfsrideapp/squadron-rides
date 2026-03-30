"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import ImageCropField from "../../components/ImageCropField";
import { auth, db } from "../../../lib/firebase";
import { formatAddressPart, formatStructuredText } from "../../../lib/text-format";
import {
  createEmptyEventDateEntry,
  EVENT_TYPE_OPTIONS,
  formatEventTypeLabel,
  formatRecurringRule,
  RECURRING_CADENCE_OPTIONS,
  RECURRING_MONTHLY_ORDINAL_OPTIONS,
  RECURRING_WEEKDAY_OPTIONS,
  type EventDateEntry,
  type EventRecurringCadence,
  type EventRecurringOrdinal,
  type EventRecurringRule,
  type EventType,
} from "../../../lib/events";

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

const sectionTitleStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
};

const helperTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.55,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "10px 15px",
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

const recurringPillStyle = (selected: boolean): React.CSSProperties => ({
  minHeight: 38,
  padding: "8px 12px",
  borderRadius: 999,
  background: selected
    ? "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)"
    : "linear-gradient(180deg, rgba(29, 36, 45, 0.98) 0%, rgba(13, 18, 24, 0.99) 100%)",
  border: selected
    ? "1px solid rgba(147, 197, 253, 0.42)"
    : "1px solid rgba(118, 132, 149, 0.26)",
  boxShadow: selected
    ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 24px rgba(17, 24, 39, 0.24)"
    : "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 18px rgba(0,0,0,0.22)",
});

export default function NewEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileSummary, setProfileSummary] = useState<{
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    rank?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [photoStatusMessages, setPhotoStatusMessages] = useState(["", "", ""]);
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<EventType>("fun");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrls, setPhotoUrls] = useState(["", "", ""]);
  const [neededPeople, setNeededPeople] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"specific_dates" | "recurring">("specific_dates");
  const [scheduleEntries, setScheduleEntries] = useState<EventDateEntry[]>([createEmptyEventDateEntry()]);
  const [recurrence, setRecurrence] = useState<EventRecurringRule>({
    cadence: "weekly",
    weekdays: ["Friday"],
    monthlyOrdinal: "first",
    startDate: "",
    endDate: "",
    timeText: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileSummary(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (!snapshot.exists() || cancelled) {
          return;
        }

        const profile = snapshot.data() as {
          name?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          rank?: string | null;
        };

        setProfileSummary(profile);
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedCadence = recurrence.cadence || "weekly";
  const selectedMonthlyWeekday = recurrence.weekdays?.[0] || "Monday";

  const schedulePreview = useMemo(() => {
    if (scheduleMode === "recurring") {
      const hasWeekdaySelection =
        selectedCadence === "monthly"
          ? Boolean(recurrence.weekdays?.[0])
          : Boolean(recurrence.weekdays?.length);

      return recurrence.startDate.trim() && hasWeekdaySelection
        ? formatRecurringRule(recurrence)
        : "Recurring schedule preview will appear here.";
    }

    const nextEntry = scheduleEntries.find((entry) => entry.startDate.trim() || entry.timeText.trim());
    return nextEntry
      ? `${nextEntry.startDate || "Date TBD"}${nextEntry.endDate?.trim() ? ` to ${nextEntry.endDate}` : ""}${nextEntry.timeText.trim() ? ` | ${nextEntry.timeText.trim()}` : ""}`
      : "Event date preview will appear here.";
  }, [recurrence, scheduleEntries, scheduleMode, selectedCadence]);

  const updateScheduleEntry = (entryId: string, patch: Partial<EventDateEntry>) => {
    setScheduleEntries((current) => current.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)));
  };

  const removeScheduleEntry = (entryId: string) => {
    setScheduleEntries((current) => (current.length > 1 ? current.filter((entry) => entry.id !== entryId) : current));
  };

  const toggleRecurringWeekday = (weekday: string) => {
    setRecurrence((current) => {
      const currentWeekdays = current.weekdays || [];
      const nextWeekdays = currentWeekdays.includes(weekday)
        ? currentWeekdays.filter((value) => value !== weekday)
        : [...currentWeekdays, weekday];

      return {
        ...current,
        weekdays: nextWeekdays,
      };
    });
  };

  const setRecurringCadence = (cadence: EventRecurringCadence) => {
    setRecurrence((current) => ({
      ...current,
      cadence,
      weekdays:
        cadence === "monthly"
          ? [current.weekdays?.[0] || "Monday"]
          : current.weekdays?.length
            ? current.weekdays
            : ["Friday"],
      monthlyOrdinal: current.monthlyOrdinal || "first",
    }));
  };

  const setMonthlyOrdinal = (monthlyOrdinal: EventRecurringOrdinal) => {
    setRecurrence((current) => ({
      ...current,
      monthlyOrdinal,
    }));
  };

  const setMonthlyWeekday = (weekday: string) => {
    setRecurrence((current) => ({
      ...current,
      weekdays: [weekday],
    }));
  };

  const submitEvent = async () => {
    if (!user) {
      setStatusMessage("You need to log in before creating an event.");
      return;
    }

    if (!eventName.trim()) {
      setStatusMessage("Event name is required.");
      return;
    }

    if (!location.trim()) {
      setStatusMessage("Location is required.");
      return;
    }

    if (!description.trim()) {
      setStatusMessage("Description is required.");
      return;
    }

    const cleanedEntries = scheduleEntries
      .map((entry) => ({
        ...entry,
        startDate: entry.startDate.trim(),
        endDate: entry.endDate?.trim() || "",
        timeText: entry.timeText.trim(),
      }))
      .filter((entry) => entry.startDate || entry.timeText);

    if (scheduleMode === "specific_dates") {
      if (cleanedEntries.length === 0) {
        setStatusMessage("Add at least one event date.");
        return;
      }

      if (cleanedEntries.some((entry) => !entry.startDate || !entry.timeText)) {
        setStatusMessage("Each event date needs a date and time.");
        return;
      }
    } else {
      if (!recurrence.startDate.trim()) {
        setStatusMessage("Recurring events need a start date.");
        return;
      }

      if (selectedCadence === "monthly") {
        if (!selectedMonthlyWeekday) {
          setStatusMessage("Choose the weekday for the monthly repeat.");
          return;
        }
      } else if (!recurrence.weekdays?.length) {
        setStatusMessage("Choose at least one recurring weekday.");
        return;
      }

      if (!recurrence.timeText.trim()) {
        setStatusMessage("Recurring events need a time or time range.");
        return;
      }
    }

    try {
      setSaving(true);
      setStatusMessage("Saving event...");
      const normalizedLocation = formatStructuredText(location);
      const normalizedAddress = formatAddressPart(address);

      const createdRef = await addDoc(collection(db, "events"), {
        name: eventName.trim(),
        type: eventType,
        location: normalizedLocation,
        address: normalizedAddress || null,
        description: description.trim(),
        photoUrl: photoUrls.map((photoUrl) => photoUrl.trim()).filter(Boolean)[0] || null,
        photoUrls: photoUrls.map((photoUrl) => photoUrl.trim()).filter(Boolean).slice(0, 3),
        neededPeople: neededPeople.trim() ? Number(neededPeople) : null,
        scheduleMode,
        scheduleEntries: scheduleMode === "specific_dates" ? cleanedEntries : [],
        recurrence:
          scheduleMode === "recurring"
            ? {
                cadence: selectedCadence,
                weekdays: selectedCadence === "monthly" ? [selectedMonthlyWeekday] : recurrence.weekdays || [],
                monthlyOrdinal: selectedCadence === "monthly" ? recurrence.monthlyOrdinal || "first" : null,
                intervalWeeks: selectedCadence === "biweekly" ? 2 : selectedCadence === "weekly" ? 1 : null,
                startDate: recurrence.startDate.trim(),
                endDate: recurrence.endDate?.trim() || null,
                timeText: recurrence.timeText.trim(),
              }
            : null,
        createdByUid: user.uid,
        createdByEmail: user.email || null,
        createdByName: profileSummary?.name?.trim() || user.displayName?.trim() || null,
        createdByFirstName: profileSummary?.firstName?.trim() || null,
        createdByLastName: profileSummary?.lastName?.trim() || null,
        createdByRank: profileSummary?.rank?.trim() || null,
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
            action: "created",
            eventId: createdRef.id,
          }),
        }).catch((error) => {
          console.error("Event creation notification dispatch failed", error);
        });
      }

      router.push(`/events/${createdRef.id}`);
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not create the event.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Event Form" caption="Preparing the new event workspace." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>New Event</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <div>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                Event planning
              </p>
              <h1 style={{ margin: "4px 0 0" }}>Add New Event</h1>
            </div>
          </div>

          <Link href="/events" style={primaryButtonStyle}>Back to Events</Link>
        </div>

        <section style={{ ...sectionStyle, display: "grid", gap: 16 }}>
          <div style={sectionTitleStyle}>
            <strong style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              Event Basics
            </strong>
            <p style={helperTextStyle}>
              Set the core identity of the event first, then add the richer schedule and description details below.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Event Name</span>
              <input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Squadron 5K Run" />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Event Type</span>
              <select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)}>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
              <span>Location</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Base fitness center, field 2, community park..." />
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
              <span>Address (Optional)</span>
              <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Main St, Whiteman AFB, MO 65305" />
            </label>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span>Photos</span>
            <div style={{ display: "grid", gap: 12 }}>
              {photoUrls.map((photoUrl, index) => (
                <ImageCropField
                  key={index}
                  value={photoUrl}
                  onChange={(nextValue) =>
                    setPhotoUrls((current) =>
                      current.map((value, valueIndex) => (valueIndex === index ? nextValue : value))
                    )
                  }
                  cropShape="square"
                  cropAspectRatio={2}
                  previewSize={120}
                  outputSize={960}
                  maxEncodedLength={220000}
                  helperText={
                    index === 0
                      ? "Primary event photo. You can add up to three total photos using the same 2:1 banner crop."
                      : `Optional additional photo ${index + 1}.`
                  }
                  statusMessage={photoStatusMessages[index] || ""}
                  onStatusMessageChange={(nextStatusMessage) =>
                    setPhotoStatusMessages((current) =>
                      current.map((value, valueIndex) => (valueIndex === index ? nextStatusMessage : value))
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div style={sectionTitleStyle}>
            <strong style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              Description
            </strong>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description and additional information like required gear, uniform, etc."
              rows={7}
            />
          </label>

          <label style={{ display: "grid", gap: 6, maxWidth: 240 }}>
            <span>Needed People (Optional)</span>
            <input
              type="number"
              min={0}
              value={neededPeople}
              onChange={(event) => setNeededPeople(event.target.value)}
              placeholder="12"
            />
          </label>
        </section>

        <section style={{ ...sectionStyle, display: "grid", gap: 16 }}>
          <div style={sectionTitleStyle}>
            <strong style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              Scheduling
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
              <span>Schedule Type</span>
              <select value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as "specific_dates" | "recurring")}>
                <option value="specific_dates">Specific Dates</option>
                <option value="recurring">Recurring Schedule</option>
              </select>
            </label>
          </div>

          {scheduleMode === "specific_dates" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {scheduleEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                    background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
                    padding: 14,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <strong>Date Block {index + 1}</strong>
                    {scheduleEntries.length > 1 ? (
                      <button type="button" onClick={() => removeScheduleEntry(entry.id)}>
                        Remove Date
                      </button>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span>Start Date</span>
                      <input type="date" value={entry.startDate} onChange={(event) => updateScheduleEntry(entry.id, { startDate: event.target.value })} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span>End Date (Optional)</span>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "end" }}>
                        <input type="date" value={entry.endDate || ""} onChange={(event) => updateScheduleEntry(entry.id, { endDate: event.target.value })} />
                        <button
                          type="button"
                          onClick={() => updateScheduleEntry(entry.id, { endDate: "" })}
                          style={{ minHeight: 42, padding: "10px 12px" }}
                        >
                          Clear
                        </button>
                      </div>
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span>Time / Range</span>
                      <input value={entry.timeText} onChange={(event) => updateScheduleEntry(entry.id, { timeText: event.target.value })} placeholder="1300 or 1300-1500" />
                    </label>
                  </div>
                </div>
              ))}

              <div>
                <button type="button" onClick={() => setScheduleEntries((current) => [...current, createEmptyEventDateEntry()])}>
                  Add Another Date
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
                borderRadius: 14,
                border: "1px solid rgba(126, 142, 160, 0.16)",
                background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
                padding: 14,
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <strong>Recurring Pattern</strong>
                <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>
                  Weekly and biweekly repeats can use multiple weekdays. Monthly repeats can target patterns like every third Monday.
                </p>
              </div>

              <label style={{ display: "grid", gap: 6, maxWidth: 280 }}>
                <span>Repeat Cadence</span>
                <select
                  value={selectedCadence}
                  onChange={(event) => setRecurringCadence(event.target.value as EventRecurringCadence)}
                >
                  {RECURRING_CADENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedCadence === "monthly" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Monthly Position</span>
                    <select
                      value={recurrence.monthlyOrdinal || "first"}
                      onChange={(event) => setMonthlyOrdinal(event.target.value as EventRecurringOrdinal)}
                    >
                      {RECURRING_MONTHLY_ORDINAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Weekday</span>
                    <select
                      value={selectedMonthlyWeekday}
                      onChange={(event) => setMonthlyWeekday(event.target.value)}
                    >
                      {RECURRING_WEEKDAY_OPTIONS.map((weekday) => (
                        <option key={weekday} value={weekday}>
                          {weekday}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  <span>Recurring Weekdays</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {RECURRING_WEEKDAY_OPTIONS.map((weekday) => {
                      const selected = Boolean(recurrence.weekdays?.includes(weekday));

                      return (
                        <button
                          key={weekday}
                          type="button"
                          onClick={() => toggleRecurringWeekday(weekday)}
                          style={recurringPillStyle(selected)}
                        >
                          {weekday}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
                    Examples: every Tuesday and Thursday, or every other Wednesday.
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Start Date</span>
                  <input type="date" value={recurrence.startDate} onChange={(event) => setRecurrence((current) => ({ ...current, startDate: event.target.value }))} />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>End Date (Optional)</span>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "end" }}>
                    <input type="date" value={recurrence.endDate || ""} onChange={(event) => setRecurrence((current) => ({ ...current, endDate: event.target.value }))} />
                    <button
                      type="button"
                      onClick={() => setRecurrence((current) => ({ ...current, endDate: "" }))}
                      style={{ minHeight: 42, padding: "10px 12px" }}
                    >
                      Clear
                    </button>
                  </div>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>Time / Range</span>
                  <input value={recurrence.timeText} onChange={(event) => setRecurrence((current) => ({ ...current, timeText: event.target.value }))} placeholder="1700 or 1700-1900" />
                </label>
              </div>
            </div>
          )}

          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(126, 142, 160, 0.16)",
              background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>Schedule Preview</strong>
            <p style={{ margin: 0, color: "#cbd5e1" }}>{schedulePreview}</p>
            <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>
              Type: {formatEventTypeLabel(eventType)}
            </p>
            <p style={{ margin: 0, color: "#7f8da3", fontSize: 13 }}>
              This preview helps confirm the board-facing event summary before you save it.
            </p>
          </div>
        </section>

        {statusMessage ? (
          <section
            style={{
              ...sectionStyle,
              padding: "0.9rem 1rem",
              borderColor: "rgba(126, 142, 160, 0.24)",
              background: "linear-gradient(180deg, rgba(26, 31, 38, 0.98) 0%, rgba(12, 16, 21, 0.99) 100%)",
            }}
          >
            <p style={{ margin: 0, color: "#dbe7f5", lineHeight: 1.55 }}>{statusMessage}</p>
          </section>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void submitEvent()} disabled={saving} style={primaryButtonStyle}>
            {saving ? "Saving Event..." : "Create Event"}
          </button>
          <Link href="/events" style={secondaryButtonStyle}>Cancel</Link>
        </div>
      </div>
    </main>
  );
}
