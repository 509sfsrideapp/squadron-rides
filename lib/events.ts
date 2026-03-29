export type EventType = "fun" | "sports" | "fitness" | "community_service" | "organizational" | "official" | "other";

export type EventScheduleMode = "specific_dates" | "recurring";

export type EventDateEntry = {
  id: string;
  startDate: string;
  endDate?: string | null;
  timeText: string;
};

export type EventRecurringCadence = "weekly" | "biweekly" | "monthly";

export type EventRecurringOrdinal = "first" | "second" | "third" | "fourth" | "fifth";

export type EventRecurringRule = {
  cadence?: EventRecurringCadence;
  weekday?: string;
  weekdays?: string[];
  intervalWeeks?: number | null;
  monthlyOrdinal?: EventRecurringOrdinal | null;
  startDate: string;
  endDate?: string | null;
  timeText: string;
};

export type EventDocument = {
  name: string;
  type: EventType;
  location: string;
  address?: string | null;
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
  { value: "organizational", label: "Organizational" },
  { value: "official", label: "Official" },
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

export const RECURRING_CADENCE_OPTIONS: Array<{ value: EventRecurringCadence; label: string }> = [
  { value: "weekly", label: "Every Week" },
  { value: "biweekly", label: "Every Other Week" },
  { value: "monthly", label: "Monthly" },
];

export const RECURRING_MONTHLY_ORDINAL_OPTIONS: Array<{ value: EventRecurringOrdinal; label: string }> = [
  { value: "first", label: "First" },
  { value: "second", label: "Second" },
  { value: "third", label: "Third" },
  { value: "fourth", label: "Fourth" },
  { value: "fifth", label: "Fifth" },
];

type NormalizedRecurringRule = {
  cadence: EventRecurringCadence;
  weekdays: string[];
  monthlyOrdinal: EventRecurringOrdinal;
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

function normalizeCadence(rule?: EventRecurringRule | null): EventRecurringCadence {
  if (rule?.cadence === "monthly") {
    return "monthly";
  }

  if (rule?.cadence === "biweekly" || rule?.intervalWeeks === 2) {
    return "biweekly";
  }

  return "weekly";
}

function normalizeMonthlyOrdinal(value?: EventRecurringOrdinal | null): EventRecurringOrdinal {
  if (value === "second" || value === "third" || value === "fourth" || value === "fifth") {
    return value;
  }

  return "first";
}

function getOrdinalIndex(value: EventRecurringOrdinal) {
  switch (value) {
    case "first":
      return 1;
    case "second":
      return 2;
    case "third":
      return 3;
    case "fourth":
      return 4;
    case "fifth":
      return 5;
  }
}

export function normalizeRecurringRule(rule?: EventRecurringRule | null): NormalizedRecurringRule | null {
  if (!rule) {
    return null;
  }

  const cadence = normalizeCadence(rule);
  const weekdays = normalizeWeekdays(rule.weekdays, rule.weekday);

  return {
    cadence,
    weekdays,
    monthlyOrdinal: normalizeMonthlyOrdinal(rule.monthlyOrdinal),
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

export function formatEventLocationLabel(location?: string | null) {
  const trimmedLocation = location?.trim() || "";
  return trimmedLocation ? `@${trimmedLocation}` : "@Location TBD";
}

export function formatEventDateEntry(entry: EventDateEntry) {
  const start = formatDateText(entry.startDate);
  const end = normalizeEndDate(entry.endDate, entry.startDate);
  const rangeLabel = end && end !== entry.startDate ? `${start} - ${formatDateText(end)}` : start;

  return entry.timeText.trim() ? `${rangeLabel} | ${entry.timeText.trim()}` : rangeLabel;
}

export function formatRecurringRule(rule?: EventRecurringRule | null) {
  const normalizedRule = normalizeRecurringRule(rule);

  if (!normalizedRule) {
    return "Recurring schedule";
  }

  const dayLabel =
    normalizedRule.cadence === "monthly"
      ? `${normalizeMonthlyOrdinal(normalizedRule.monthlyOrdinal)} ${normalizedRule.weekdays[0] || "day"}`
      : formatWeekdayList(normalizedRule.weekdays);
  const cadenceLabel =
    normalizedRule.cadence === "monthly"
      ? "Every"
      : normalizedRule.cadence === "biweekly"
        ? "Every other"
        : "Every";
  const recurrenceWindow = normalizedRule.endDate
    ? `${formatDateText(normalizedRule.startDate)} - ${formatDateText(normalizedRule.endDate)}`
    : `Starting ${formatDateText(normalizedRule.startDate)}`;
  const timeLabel = normalizedRule.timeText ? ` | ${normalizedRule.timeText}` : "";

  return `${cadenceLabel} ${dayLabel}${timeLabel} | ${recurrenceWindow}`;
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

function isNthWeekdayOfMonth(candidateDate: Date, ordinal: EventRecurringOrdinal) {
  const weekday = candidateDate.getDay();
  const targetMonth = candidateDate.getMonth();
  const targetYear = candidateDate.getFullYear();
  let count = 0;

  for (let day = 1; day <= candidateDate.getDate(); day += 1) {
    const probe = new Date(targetYear, targetMonth, day, 12, 0, 0, 0);
    if (probe.getDay() === weekday) {
      count += 1;
    }
  }

  return count === getOrdinalIndex(ordinal);
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

  if (rule.cadence === "monthly") {
    return isNthWeekdayOfMonth(candidateDate, rule.monthlyOrdinal);
  }

  const intervalWeeks = rule.cadence === "biweekly" ? 2 : 1;
  const startWeek = getStartOfWeek(asLocalDate(rule.startDate));
  const candidateWeek = getStartOfWeek(candidateDate);
  const weeksSinceStart = Math.floor((candidateWeek.getTime() - startWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));

  return weeksSinceStart >= 0 && weeksSinceStart % intervalWeeks === 0;
}

function getNextRecurringDate(rule: EventRecurringRule, referenceDateText: string) {
  const normalizedRule = normalizeRecurringRule(rule);

  if (!normalizedRule || !normalizedRule.startDate || normalizedRule.weekdays.length === 0) {
    return null;
  }

  const recurrenceStart = asLocalDate(normalizedRule.startDate);
  const rangeStart = asLocalDate(referenceDateText);
  const searchStart = rangeStart > recurrenceStart ? rangeStart : recurrenceStart;

  for (let dayOffset = 0; dayOffset <= 1095; dayOffset += 1) {
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

export function getRecurringOccurrenceDateTexts(
  rule?: EventRecurringRule | null,
  count = 1,
  referenceDateText = getTodayDateText()
) {
  if (!rule || count <= 0) {
    return [];
  }

  const results: string[] = [];
  let searchDateText = referenceDateText;

  while (results.length < count) {
    const nextDate = getNextRecurringDate(rule, searchDateText);

    if (!nextDate) {
      break;
    }

    const nextDateText = getDateText(nextDate);

    if (results.includes(nextDateText)) {
      break;
    }

    results.push(nextDateText);

    const nextSearchDate = new Date(nextDate);
    nextSearchDate.setDate(nextSearchDate.getDate() + 1);
    searchDateText = getDateText(nextSearchDate);
  }

  return results;
}

export function formatRecurringOccurrenceLabel(rule?: EventRecurringRule | null, referenceDateText = getTodayDateText()) {
  const nextDateText = getRecurringOccurrenceDateTexts(rule, 1, referenceDateText)[0];
  const normalizedRule = normalizeRecurringRule(rule);

  if (!nextDateText) {
    return "No upcoming dates";
  }

  const timeLabel = normalizedRule?.timeText ? ` | ${normalizedRule.timeText}` : "";
  return `${formatDateText(nextDateText)}${timeLabel}`;
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
    return formatRecurringOccurrenceLabel(event.recurrence);
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
