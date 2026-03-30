export const RIDE_DISPATCH_EXPANSION_MS = 5 * 60 * 1000;

export type EmergencyRideDispatchMode =
  | "all_drivers"
  | "same_flight_first"
  | "other_flights_first";

export const DEFAULT_RIDE_DISPATCH_MODE: EmergencyRideDispatchMode = "all_drivers";

export const RIDE_DISPATCH_OPTIONS: Array<{
  value: EmergencyRideDispatchMode;
  label: string;
  description: string;
}> = [
  {
    value: "all_drivers",
    label: "Send to everyone",
    description: "Emergency ride requests go to all active drivers right away.",
  },
  {
    value: "same_flight_first",
    label: "Send to my office first",
    description: "Only active drivers in your office are alerted for the first 5 minutes, then everyone else is notified.",
  },
  {
    value: "other_flights_first",
    label: "Send to everyone except my office first",
    description: "Active drivers outside your office are alerted first for 5 minutes, then your office is notified too.",
  },
];

type FirestoreTimestampLike =
  | Date
  | string
  | number
  | {
      seconds?: number;
      nanoseconds?: number;
    }
  | null
  | undefined;

export function normalizeRideDispatchMode(mode?: string | null): EmergencyRideDispatchMode {
  if (mode === "same_flight_first" || mode === "other_flights_first" || mode === "all_drivers") {
    return mode;
  }

  return DEFAULT_RIDE_DISPATCH_MODE;
}

export function toTimestampMs(value: FirestoreTimestampLike) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000);
  }

  return null;
}

export function rideDispatchWindowEndsAt(createdAt: FirestoreTimestampLike) {
  const createdAtMs = toTimestampMs(createdAt);

  if (createdAtMs == null) {
    return null;
  }

  return createdAtMs + RIDE_DISPATCH_EXPANSION_MS;
}

export function isRideDispatchExpanded({
  mode,
  createdAt,
  expandedAt,
  now = Date.now(),
}: {
  mode?: string | null;
  createdAt?: FirestoreTimestampLike;
  expandedAt?: FirestoreTimestampLike;
  now?: number;
}) {
  const normalizedMode = normalizeRideDispatchMode(mode);

  if (normalizedMode === "all_drivers") {
    return true;
  }

  if (toTimestampMs(expandedAt) != null) {
    return true;
  }

  const windowEndsAt = rideDispatchWindowEndsAt(createdAt);
  return windowEndsAt != null ? now >= windowEndsAt : false;
}

export function getRideDispatchTargeting(mode?: string | null, flight?: string | null) {
  const normalizedMode = normalizeRideDispatchMode(mode);
  const normalizedFlight = flight?.trim() || null;

  if (!normalizedFlight || normalizedMode === "all_drivers") {
    return {
      initial: {},
      expansion: {},
    } as const;
  }

  if (normalizedMode === "same_flight_first") {
    return {
      initial: { includeFlight: normalizedFlight },
      expansion: { excludeFlight: normalizedFlight },
    } as const;
  }

  return {
    initial: { excludeFlight: normalizedFlight },
    expansion: { includeFlight: normalizedFlight },
  } as const;
}

export function canDriverSeeRideDuringDispatchWindow({
  mode,
  rideFlight,
  driverFlight,
  createdAt,
  expandedAt,
}: {
  mode?: string | null;
  rideFlight?: string | null;
  driverFlight?: string | null;
  createdAt?: FirestoreTimestampLike;
  expandedAt?: FirestoreTimestampLike;
}) {
  const normalizedMode = normalizeRideDispatchMode(mode);
  const normalizedRideFlight = rideFlight?.trim() || null;
  const normalizedDriverFlight = driverFlight?.trim() || null;

  if (
    normalizedMode === "all_drivers" ||
    !normalizedRideFlight ||
    isRideDispatchExpanded({ mode: normalizedMode, createdAt, expandedAt })
  ) {
    return true;
  }

  if (!normalizedDriverFlight) {
    return false;
  }

  if (normalizedMode === "same_flight_first") {
    return normalizedDriverFlight === normalizedRideFlight;
  }

  return normalizedDriverFlight !== normalizedRideFlight;
}
