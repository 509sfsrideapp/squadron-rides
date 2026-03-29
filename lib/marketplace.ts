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
export type MarketplaceExchangeMethod = "buyer_pickup" | "seller_dropoff" | "set_meet";

export type MarketplaceListingDocument = {
  title: string;
  category: MarketplaceCategory;
  exchangeMethod?: MarketplaceExchangeMethod | null;
  location?: string | null;
  address?: string | null;
  description: string;
  photoUrl?: string | null;
  priceAmount?: number | null;
  isTrade?: boolean | null;
  tradeForText?: string | null;
  priceText?: string | null;
  condition: MarketplaceCondition;
  status: MarketplaceStatus;
  createdByUid?: string | null;
  createdByEmail?: string | null;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  } | Date | string | null;
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

export const MARKETPLACE_EXCHANGE_METHOD_OPTIONS: Array<{
  value: MarketplaceExchangeMethod;
  label: string;
}> = [
  { value: "buyer_pickup", label: "Buyer Pickup" },
  { value: "seller_dropoff", label: "Seller Dropoff" },
  { value: "set_meet", label: "Set Meet" },
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

  if (typeof createdAt === "string") {
    const parsed = Date.parse(createdAt);
    return Number.isFinite(parsed) ? parsed : 0;
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

export function formatMarketplaceExchangeMethodLabel(exchangeMethod?: MarketplaceExchangeMethod | null) {
  return (
    MARKETPLACE_EXCHANGE_METHOD_OPTIONS.find((option) => option.value === exchangeMethod)?.label ||
    "Buyer Pickup"
  );
}

export function formatMarketplaceFulfillmentLabel(listing: Pick<MarketplaceListingDocument, "exchangeMethod" | "location">) {
  if (listing.exchangeMethod) {
    return formatMarketplaceExchangeMethodLabel(listing.exchangeMethod);
  }

  const trimmedLocation = listing.location?.trim() || "";
  return trimmedLocation ? `@${trimmedLocation}` : "Buyer Pickup";
}

export function getMarketplacePreviewText(description?: string | null) {
  return description?.trim() || "Listing details pending.";
}

export function formatMarketplacePriceLabel(
  listing: Pick<MarketplaceListingDocument, "priceAmount" | "isTrade" | "tradeForText" | "priceText">
) {
  if (listing.isTrade) {
    const tradeFor = listing.tradeForText?.trim() || "";
    return tradeFor ? `Trade for ${tradeFor}` : "Trade";
  }

  if (typeof listing.priceAmount === "number" && Number.isFinite(listing.priceAmount)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: listing.priceAmount % 1 === 0 ? 0 : 2,
    }).format(listing.priceAmount);
  }

  const trimmedPriceText = listing.priceText?.trim() || "";
  return trimmedPriceText || "Price TBD";
}

export function getMarketplacePriceAmount(listing: Pick<MarketplaceListingDocument, "priceAmount" | "isTrade" | "priceText">) {
  if (listing.isTrade) {
    return null;
  }

  if (typeof listing.priceAmount === "number" && Number.isFinite(listing.priceAmount)) {
    return listing.priceAmount;
  }

  const trimmedPriceText = listing.priceText?.trim() || "";
  const matchedValue = trimmedPriceText.match(/-?\d+(?:\.\d+)?/);
  if (!matchedValue) {
    return null;
  }

  const parsedValue = Number(matchedValue[0]);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function marketplaceMatchesCategory(
  listing: MarketplaceListingDocument,
  selectedCategory: string
) {
  return !selectedCategory || selectedCategory === "all" || listing.category === selectedCategory;
}

export function marketplaceMatchesSearch(
  listing: Pick<MarketplaceListingDocument, "title" | "description">,
  searchText: string
) {
  const normalizedSearch = searchText.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  return `${listing.title} ${listing.description}`.toLowerCase().includes(normalizedSearch);
}

export function marketplaceMatchesPriceRange(
  listing: Pick<MarketplaceListingDocument, "priceAmount" | "isTrade" | "priceText">,
  minPriceText: string,
  maxPriceText: string
) {
  const normalizedMin = minPriceText.trim();
  const normalizedMax = maxPriceText.trim();

  if (!normalizedMin && !normalizedMax) {
    return true;
  }

  const priceAmount = getMarketplacePriceAmount(listing);
  if (priceAmount === null) {
    return false;
  }

  const minPrice = normalizedMin ? Number(normalizedMin) : null;
  const maxPrice = normalizedMax ? Number(normalizedMax) : null;

  if (minPrice !== null && Number.isFinite(minPrice) && priceAmount < minPrice) {
    return false;
  }

  if (maxPrice !== null && Number.isFinite(maxPrice) && priceAmount > maxPrice) {
    return false;
  }

  return true;
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
