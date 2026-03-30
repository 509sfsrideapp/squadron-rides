import {
  MARKETPLACE_CATEGORY_OPTIONS,
  type MarketplaceCategory,
} from "./marketplace";

export type IsoPostType = "item" | "service";

export type IsoServiceCategory =
  | "moving_help"
  | "home_repair"
  | "cleaning"
  | "yard_work"
  | "vehicle_help"
  | "childcare"
  | "pet_care"
  | "tutoring"
  | "fitness_help"
  | "tech_help"
  | "furniture_assembly"
  | "ride_help"
  | "event_help"
  | "admin_help";

export type IsoCategory = MarketplaceCategory | IsoServiceCategory;

export type IsoUrgency = "routine" | "priority" | "urgent";

export type IsoStatus = "open" | "in_progress" | "fulfilled" | "closed";

export type IsoRequestDocument = {
  title: string;
  postType: IsoPostType;
  category: IsoCategory;
  location: string;
  address?: string | null;
  description: string;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
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

export const ISO_POST_TYPE_OPTIONS: Array<{ value: IsoPostType; label: string }> = [
  { value: "item", label: "Item" },
  { value: "service", label: "Service" },
];

export const ISO_ITEM_CATEGORY_OPTIONS = MARKETPLACE_CATEGORY_OPTIONS;

export const ISO_SERVICE_CATEGORY_OPTIONS: Array<{ value: IsoServiceCategory; label: string }> = [
  { value: "moving_help", label: "Moving Help" },
  { value: "home_repair", label: "Home Repair" },
  { value: "cleaning", label: "Cleaning" },
  { value: "yard_work", label: "Yard Work" },
  { value: "vehicle_help", label: "Vehicle Help (mechanic/basic fixes)" },
  { value: "childcare", label: "Childcare / Babysitting" },
  { value: "pet_care", label: "Pet Care" },
  { value: "tutoring", label: "Tutoring / School Help" },
  { value: "fitness_help", label: "Fitness / PT Help" },
  { value: "tech_help", label: "Tech Help" },
  { value: "furniture_assembly", label: "Furniture Assembly" },
  { value: "ride_help", label: "Ride / Transportation Help (non-emergency)" },
  { value: "event_help", label: "Event Help" },
  { value: "admin_help", label: "Admin / Paperwork Help" },
];

export const ISO_CATEGORY_OPTIONS: Array<{ value: IsoCategory; label: string }> = [
  ...ISO_ITEM_CATEGORY_OPTIONS,
  ...ISO_SERVICE_CATEGORY_OPTIONS,
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

export function formatIsoPostTypeLabel(postType?: IsoPostType | null) {
  return ISO_POST_TYPE_OPTIONS.find((option) => option.value === postType)?.label || "Item";
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

export function getIsoPhotoUrls(
  request: Pick<IsoRequestDocument, "photoUrl" | "photoUrls">
) {
  const normalizedPhotoUrls = (request.photoUrls || [])
    .map((photoUrl) => photoUrl?.trim() || "")
    .filter(Boolean);

  if (normalizedPhotoUrls.length > 0) {
    return normalizedPhotoUrls;
  }

  const fallbackPhotoUrl = request.photoUrl?.trim() || "";
  return fallbackPhotoUrl ? [fallbackPhotoUrl] : [];
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
