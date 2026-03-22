type TimestampLike =
  | Date
  | {
      seconds?: number;
      nanoseconds?: number;
    }
  | null
  | undefined;

type RideLifecycleShape = {
  status?: string;
  createdAt?: TimestampLike;
  acceptedAt?: TimestampLike;
  arrivedAt?: TimestampLike;
  pickedUpAt?: TimestampLike;
  completedAt?: TimestampLike;
  canceledAt?: TimestampLike;
};

type RideLifecycleStep = {
  key: string;
  label: string;
  at: Date | null;
  complete: boolean;
  current: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Requested",
  accepted: "Accepted",
  arrived: "Driver Arrived",
  picked_up: "Picked Up",
  completed: "Completed",
  canceled: "Canceled",
};

function toDate(value: TimestampLike): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000 + Math.round((value.nanoseconds ?? 0) / 1_000_000));
  }

  return null;
}

export function getRideStatusLabel(status?: string) {
  if (!status) return "Unknown";
  return STATUS_LABELS[status] || status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatRideTimestamp(value: TimestampLike) {
  const date = toDate(value);

  if (!date) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getRideLifecycleSteps(ride: RideLifecycleShape): RideLifecycleStep[] {
  const currentStatus = ride.status;

  return [
    {
      key: "open",
      label: "Requested",
      at: toDate(ride.createdAt),
      complete: true,
      current: currentStatus === "open",
    },
    {
      key: "accepted",
      label: "Accepted",
      at: toDate(ride.acceptedAt),
      complete: Boolean(ride.acceptedAt),
      current: currentStatus === "accepted",
    },
    {
      key: "arrived",
      label: "Driver Arrived",
      at: toDate(ride.arrivedAt),
      complete: Boolean(ride.arrivedAt),
      current: currentStatus === "arrived",
    },
    {
      key: "picked_up",
      label: "Picked Up",
      at: toDate(ride.pickedUpAt),
      complete: Boolean(ride.pickedUpAt),
      current: currentStatus === "picked_up",
    },
    {
      key: "completed",
      label: "Completed",
      at: toDate(ride.completedAt),
      complete: Boolean(ride.completedAt),
      current: currentStatus === "completed",
    },
    {
      key: "canceled",
      label: "Canceled",
      at: toDate(ride.canceledAt),
      complete: Boolean(ride.canceledAt),
      current: currentStatus === "canceled",
    },
  ];
}
