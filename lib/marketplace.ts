export type MarketplaceCategory =
  | "gear"
  | "electronics"
  | "furniture"
  | "vehicle"
  | "uniform"
  | "other";

export type MarketplaceCondition =
  | "new"
  | "like_new"
  | "good"
  | "fair"
  | "for_parts";

export type MarketplaceStatus = "available" | "pending" | "sold" | "removed";

export type MarketplaceListingDocument = {
  title: string;
  category: MarketplaceCategory;
  location: string;
  address?: string | null;
  description: string;
  photoUrl?: string | null;
  priceText?: string | null;
  condition: MarketplaceCondition;
  status: MarketplaceStatus;
  createdByUid?: string | null;
  createdByEmail?: string | null;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  } | Date | null;
};

export type MarketplaceListingRecord = MarketplaceListingDocument & {
  id: string;
};

export const MARKETPLACE_CATEGORY_OPTIONS: Array<{ value: MarketplaceCategory; label: string }> = [
  { value: "gear", label: "Gear" },
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "vehicle", label: "Vehicle" },
  { value: "uniform", label: "Uniform" },
  { value: "other", label: "Other" },
];

export const MARKETPLACE_CONDITION_OPTIONS: Array<{ value: MarketplaceCondition; label: string }> = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "for_parts", label: "For Parts" },
];

export const MARKETPLACE_STATUS_OPTIONS: Array<{ value: MarketplaceStatus; label: string }> = [
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "removed", label: "Removed" },
];

function getCreatedAtMs(
  createdAt?: MarketplaceListingDocument["createdAt"]
) {
  if (!createdAt) {
    return 0;
  }

  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  return (createdAt.seconds || 0) * 1000;
}

export function formatMarketplaceCategoryLabel(category: MarketplaceCategory) {
  return MARKETPLACE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || "Other";
}

export function formatMarketplaceConditionLabel(condition: MarketplaceCondition) {
  return MARKETPLACE_CONDITION_OPTIONS.find((option) => option.value === condition)?.label || "Good";
}

export function formatMarketplaceStatusLabel(status: MarketplaceStatus) {
  return MARKETPLACE_STATUS_OPTIONS.find((option) => option.value === status)?.label || "Available";
}

export function formatMarketplaceLocationLabel(location?: string | null) {
  const trimmedLocation = location?.trim() || "";
  return trimmedLocation ? `@${trimmedLocation}` : "@Location TBD";
}

export function getMarketplacePreviewText(description?: string | null) {
  return description?.trim() || "Listing details pending.";
}

export function marketplaceMatchesCategory(
  listing: MarketplaceListingDocument,
  selectedCategory: string
) {
  return !selectedCategory || selectedCategory === "all" || listing.category === selectedCategory;
}

export function marketplaceMatchesStatus(
  listing: MarketplaceListingDocument,
  selectedStatus: string
) {
  return !selectedStatus || selectedStatus === "all" || listing.status === selectedStatus;
}

export function sortMarketplaceListings(listings: MarketplaceListingRecord[]) {
  return [...listings].sort((a, b) => {
    const timeDifference = getCreatedAtMs(b.createdAt) - getCreatedAtMs(a.createdAt);

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return a.title.localeCompare(b.title);
  });
}
