export type EventType = "fun" | "sports" | "fitness" | "community_service" | "other";

export type EventScheduleMode = "specific_dates" | "recurring";

export type EventDateEntry = {
  id: string;
  startDate: string;
  endDate?: string | null;
  timeText: string;
};

export type EventRecurringRule = {
  weekday?: string;
  weekdays?: string[];
  intervalWeeks?: number | null;
  startDate: string;
  endDate?: string | null;
  timeText: string;
};

export type EventDocument = {
  name: string;
  type: EventType;
  location: string;
  description: string;
  photoUrl?: string | null;
  neededPeople?: number | null;
  scheduleMode: EventScheduleMode;
  scheduleEntries: EventDateEntry[];
  recurrence?: EventRecurringRule | null;
  createdByUid?: string | null;
  createdByEmail?: string | null;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  } | Date | null;
};

export type EventRecord = EventDocument & {
  id: string;
};

export const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "fun", label: "Fun" },
  { value: "sports", label: "Sports" },
  { value: "fitness", label: "Fitness" },
  { value: "community_service", label: "Community Service" },
  { value: "other", label: "Other" },
];

export const RECURRING_WEEKDAY_OPTIONS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const RECURRING_INTERVAL_OPTIONS = [
  { value: 1, label: "Every Week" },
  { value: 2, label: "Every Other Week" },
] as const;

type NormalizedRecurringRule = {
  weekdays: string[];
  intervalWeeks: 1 | 2;
  startDate: string;
  endDate: string;
  timeText: string;
};

function asLocalDate(dateText: string) {
  return new Date(`${dateText}T12:00:00`);
}

function getDateText(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getStartOfWeek(value: Date) {
  const next = new Date(value);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function formatDateText(dateText: string) {
  if (!dateText) {
    return "Date TBD";
  }

  return asLocalDate(dateText).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeEndDate(endDate?: string | null, fallback?: string) {
  return endDate?.trim() || fallback || "";
}

function isRecurringWeekday(value: string): value is (typeof RECURRING_WEEKDAY_OPTIONS)[number] {
  return RECURRING_WEEKDAY_OPTIONS.includes(value as (typeof RECURRING_WEEKDAY_OPTIONS)[number]);
}

function normalizeWeekdays(weekdays?: string[] | null, weekday?: string | null) {
  const rawValues = Array.isArray(weekdays) ? weekdays : weekday ? [weekday] : [];
  const normalizedValues = rawValues.filter(isRecurringWeekday);
  return Array.from(new Set(normalizedValues));
}

function normalizeIntervalWeeks(intervalWeeks?: number | null): 1 | 2 {
  return intervalWeeks === 2 ? 2 : 1;
}

export function normalizeRecurringRule(rule?: EventRecurringRule | null): NormalizedRecurringRule | null {
  if (!rule) {
    return null;
  }

  return {
    weekdays: normalizeWeekdays(rule.weekdays, rule.weekday),
    intervalWeeks: normalizeIntervalWeeks(rule.intervalWeeks),
    startDate: rule.startDate?.trim() || "",
    endDate: rule.endDate?.trim() || "",
    timeText: rule.timeText?.trim() || "",
  };
}

function formatWeekdayList(weekdays: string[]) {
  if (weekdays.length === 0) {
    return "day";
  }

  if (weekdays.length === 1) {
    return weekdays[0];
  }

  if (weekdays.length === 2) {
    return `${weekdays[0]} and ${weekdays[1]}`;
  }

  return `${weekdays.slice(0, -1).join(", ")}, and ${weekdays[weekdays.length - 1]}`;
}

export function createEmptyEventDateEntry(): EventDateEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startDate: "",
    endDate: "",
    timeText: "",
  };
}

export function formatEventTypeLabel(type: EventType) {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.label || "Other";
}

export function formatEventDateEntry(entry: EventDateEntry) {
  const start = formatDateText(entry.startDate);
  const end = normalizeEndDate(entry.endDate, entry.startDate);
  const rangeLabel = end && end !== entry.startDate ? `${start} - ${formatDateText(end)}` : start;

  return entry.timeText.trim() ? `${rangeLabel} • ${entry.timeText.trim()}` : rangeLabel;
}

export function formatRecurringRule(rule?: EventRecurringRule | null) {
  const normalizedRule = normalizeRecurringRule(rule);

  if (!normalizedRule) {
    return "Recurring schedule";
  }

  const cadenceLabel = normalizedRule.intervalWeeks === 2 ? "Every other" : "Every";
  const dayLabel = formatWeekdayList(normalizedRule.weekdays);
  const recurrenceWindow = normalizedRule.endDate
    ? `${formatDateText(normalizedRule.startDate)} - ${formatDateText(normalizedRule.endDate)}`
    : `Starting ${formatDateText(normalizedRule.startDate)}`;
  const timeLabel = normalizedRule.timeText ? ` • ${normalizedRule.timeText}` : "";

  return `${cadenceLabel} ${dayLabel}${timeLabel} • ${recurrenceWindow}`;
}

export function formatEventScheduleSummary(event: EventDocument) {
  if (event.scheduleMode === "recurring") {
    return formatRecurringRule(event.recurrence);
  }

  const validEntries = event.scheduleEntries.filter((entry) => entry.startDate.trim());

  if (validEntries.length === 0) {
    return "Schedule pending";
  }

  const firstEntry = formatEventDateEntry(validEntries[0]);
  return validEntries.length === 1 ? firstEntry : `${firstEntry} +${validEntries.length - 1} more`;
}

function matchesRecurringDate(rule: NormalizedRecurringRule, candidateDate: Date) {
  if (!rule.startDate || rule.weekdays.length === 0) {
    return false;
  }

  const candidateDateText = getDateText(candidateDate);

  if (candidateDateText < rule.startDate) {
    return false;
  }

  if (rule.endDate && candidateDateText > rule.endDate) {
    return false;
  }

  const weekdayLabel = RECURRING_WEEKDAY_OPTIONS[candidateDate.getDay()];
  if (!rule.weekdays.includes(weekdayLabel)) {
    return false;
  }

  const startWeek = getStartOfWeek(asLocalDate(rule.startDate));
  const candidateWeek = getStartOfWeek(candidateDate);
  const weeksSinceStart = Math.floor((candidateWeek.getTime() - startWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));

  return weeksSinceStart >= 0 && weeksSinceStart % rule.intervalWeeks === 0;
}

function getNextRecurringDate(rule: EventRecurringRule, referenceDateText: string) {
  const normalizedRule = normalizeRecurringRule(rule);

  if (!normalizedRule || !normalizedRule.startDate || normalizedRule.weekdays.length === 0) {
    return null;
  }

  const recurrenceStart = asLocalDate(normalizedRule.startDate);
  const rangeStart = asLocalDate(referenceDateText);
  const searchStart = rangeStart > recurrenceStart ? rangeStart : recurrenceStart;

  for (let dayOffset = 0; dayOffset <= 730; dayOffset += 1) {
    const next = new Date(searchStart);
    next.setDate(next.getDate() + dayOffset);

    if (normalizedRule.endDate && getDateText(next) > normalizedRule.endDate) {
      return null;
    }

    if (matchesRecurringDate(normalizedRule, next)) {
      return next;
    }
  }

  return null;
}

export function getEventNextOccurrenceDateText(event: EventDocument, referenceDateText = getTodayDateText()) {
  if (event.scheduleMode === "recurring") {
    const nextRecurringDate = event.recurrence ? getNextRecurringDate(event.recurrence, referenceDateText) : null;
    return nextRecurringDate ? getDateText(nextRecurringDate) : null;
  }

  const upcomingEntries = event.scheduleEntries
    .filter((entry) => entry.startDate.trim())
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const nextEntry = upcomingEntries.find((entry) => normalizeEndDate(entry.endDate, entry.startDate) >= referenceDateText);
  return nextEntry?.startDate || null;
}

export function getTodayDateText() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function isUpcomingEvent(event: EventDocument, referenceDateText = getTodayDateText()) {
  return getEventNextOccurrenceDateText(event, referenceDateText) !== null;
}

export function eventMatchesType(event: EventDocument, selectedType: string) {
  return !selectedType || selectedType === "all" || event.type === selectedType;
}

export function eventMatchesDateRange(event: EventDocument, dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) {
    return true;
  }

  const rangeStart = dateFrom || getTodayDateText();
  const rangeEnd = dateTo || "9999-12-31";

  if (event.scheduleMode === "recurring") {
    if (!event.recurrence) {
      return false;
    }

    const nextRecurringDate = getNextRecurringDate(event.recurrence, rangeStart);
    if (!nextRecurringDate) {
      return false;
    }

    return getDateText(nextRecurringDate) <= rangeEnd;
  }

  return event.scheduleEntries.some((entry) => {
    if (!entry.startDate.trim()) {
      return false;
    }

    const entryEnd = normalizeEndDate(entry.endDate, entry.startDate);
    return entry.startDate <= rangeEnd && entryEnd >= rangeStart;
  });
}

export function getEventCardDateLabel(event: EventDocument) {
  if (event.scheduleMode === "recurring") {
    return formatRecurringRule(event.recurrence);
  }

  const nextDateText = getEventNextOccurrenceDateText(event);

  if (!nextDateText) {
    return "Past event";
  }

  const matchingEntry = event.scheduleEntries.find((entry) => entry.startDate === nextDateText);
  return matchingEntry ? formatEventDateEntry(matchingEntry) : formatDateText(nextDateText);
}

export function sortEventsByUpcomingDate(events: EventRecord[]) {
  const today = getTodayDateText();

  return [...events].sort((a, b) => {
    const nextA = getEventNextOccurrenceDateText(a, today) || "9999-12-31";
    const nextB = getEventNextOccurrenceDateText(b, today) || "9999-12-31";

    if (nextA !== nextB) {
      return nextA.localeCompare(nextB);
    }

    return a.name.localeCompare(b.name);
  });
}
