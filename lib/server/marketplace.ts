import { isAdminEmail } from "../admin";
import type { MarketplaceListingRecord } from "../marketplace";
import { getFirestoreDocument, listFirestoreDocuments } from "./firestore-admin";

export type MarketplaceCreatorSummary = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
};

type MarketplaceUserDocument = MarketplaceCreatorSummary;

export type MarketplaceListResponse = {
  listings: MarketplaceListingRecord[];
  creatorDirectory: Record<string, MarketplaceCreatorSummary>;
};

export type MarketplaceDetailResponse = {
  listing: MarketplaceListingRecord | null;
  creatorProfile: MarketplaceCreatorSummary | null;
};

function toMarketplaceCreatorSummary(
  userDocument: ({ id: string } & MarketplaceUserDocument) | null
): MarketplaceCreatorSummary | null {
  if (!userDocument) {
    return null;
  }

  return {
    name: userDocument.name ?? null,
    firstName: userDocument.firstName ?? null,
    lastName: userDocument.lastName ?? null,
    rank: userDocument.rank ?? null,
  };
}

export async function listMarketplaceListingsWithCreators(): Promise<MarketplaceListResponse> {
  const listings = (await listFirestoreDocuments("marketplaceListings")) as MarketplaceListingRecord[];
  const creatorIds = Array.from(
    new Set(
      listings
        .map((listing) => listing.createdByUid?.trim() || "")
        .filter(Boolean)
    )
  );

  const creatorEntries = await Promise.all(
    creatorIds.map(async (creatorId) => {
      const userDocument = await getFirestoreDocument<MarketplaceUserDocument>(`users/${creatorId}`);
      return [creatorId, toMarketplaceCreatorSummary(userDocument)] as const;
    })
  );

  return {
    listings,
    creatorDirectory: Object.fromEntries(
      creatorEntries.filter((entry): entry is readonly [string, MarketplaceCreatorSummary] => Boolean(entry[1]))
    ),
  };
}

export async function getMarketplaceListingWithCreator(listingId: string): Promise<MarketplaceDetailResponse> {
  const listing = await getFirestoreDocument<Omit<MarketplaceListingRecord, "id">>(`marketplaceListings/${listingId}`);

  if (!listing) {
    return {
      listing: null,
      creatorProfile: null,
    };
  }

  const creatorProfile = listing.createdByUid
    ? toMarketplaceCreatorSummary(
        await getFirestoreDocument<MarketplaceUserDocument>(`users/${listing.createdByUid}`)
      )
    : null;

  return {
    listing: listing as MarketplaceListingRecord,
    creatorProfile,
  };
}

export async function canDeleteMarketplaceListing(
  currentUserId: string,
  currentUserEmail: string | null | undefined,
  listingId: string
) {
  const listing = await getFirestoreDocument<Omit<MarketplaceListingRecord, "id">>(`marketplaceListings/${listingId}`);

  if (!listing) {
    return {
      allowed: false,
      reason: "Listing not found.",
    } as const;
  }

  const isOwner = listing.createdByUid === currentUserId;
  const isAdmin = isAdminEmail(currentUserEmail);

  if (!isOwner && !isAdmin) {
    return {
      allowed: false,
      reason: "You do not have permission to delete this listing.",
    } as const;
  }

  return {
    allowed: true,
    listing,
  } as const;
}
