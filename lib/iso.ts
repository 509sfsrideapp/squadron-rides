export type IsoCategory =
  | "gear"
  | "vehicle"
  | "equipment"
  | "uniform"
  | "household"
  | "other";

export type IsoUrgency = "routine" | "priority" | "urgent";

export type IsoStatus = "open" | "in_progress" | "fulfilled" | "closed";

export type IsoRequestDocument = {
  title: string;
  category: IsoCategory;
  location: string;
  address?: string | null;
  description: string;
  photoUrl?: string | null;
  quantityText?: string | null;
  neededByDate?: string | null;
  urgency: IsoUrgency;
  status: IsoStatus;
  createdByUid?: string | null;
  createdByEmail?: string | null;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  } | Date | null;
};

export type IsoRequestRecord = IsoRequestDocument & {
  id: string;
};

export const ISO_CATEGORY_OPTIONS: Array<{ value: IsoCategory; label: string }> = [
  { value: "gear", label: "Gear" },
  { value: "vehicle", label: "Vehicle" },
  { value: "equipment", label: "Equipment" },
  { value: "uniform", label: "Uniform" },
  { value: "household", label: "Household" },
  { value: "other", label: "Other" },
];

export const ISO_URGENCY_OPTIONS: Array<{ value: IsoUrgency; label: string }> = [
  { value: "routine", label: "Routine" },
  { value: "priority", label: "Priority" },
  { value: "urgent", label: "Urgent" },
];

export const ISO_STATUS_OPTIONS: Array<{ value: IsoStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "closed", label: "Closed" },
];

function getCreatedAtMs(createdAt?: IsoRequestDocument["createdAt"]) {
  if (!createdAt) {
    return 0;
  }

  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  return (createdAt.seconds || 0) * 1000;
}

export function formatIsoCategoryLabel(category: IsoCategory) {
  return ISO_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || "Other";
}

export function formatIsoUrgencyLabel(urgency: IsoUrgency) {
  return ISO_URGENCY_OPTIONS.find((option) => option.value === urgency)?.label || "Routine";
}

export function formatIsoStatusLabel(status: IsoStatus) {
  return ISO_STATUS_OPTIONS.find((option) => option.value === status)?.label || "Open";
}

export function formatIsoLocationLabel(location?: string | null) {
  const trimmedLocation = location?.trim() || "";
  return trimmedLocation ? `@${trimmedLocation}` : "@Location TBD";
}

export function formatIsoNeedByLabel(neededByDate?: string | null) {
  const trimmedDate = neededByDate?.trim() || "";

  if (!trimmedDate) {
    return "Need-by TBD";
  }

  return new Date(`${trimmedDate}T12:00:00`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isoMatchesCategory(request: IsoRequestDocument, selectedCategory: string) {
  return !selectedCategory || selectedCategory === "all" || request.category === selectedCategory;
}

export function isoMatchesStatus(request: IsoRequestDocument, selectedStatus: string) {
  return !selectedStatus || selectedStatus === "all" || request.status === selectedStatus;
}

export function sortIsoRequests(requests: IsoRequestRecord[]) {
  return [...requests].sort((a, b) => {
    const timeDifference = getCreatedAtMs(b.createdAt) - getCreatedAtMs(a.createdAt);

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return a.title.localeCompare(b.title);
  });
}
