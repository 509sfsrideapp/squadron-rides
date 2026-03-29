import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../lib/server/firebase-auth";
import { writeAuditLog } from "../../../lib/server/audit-log";
import { createFirestoreDocument } from "../../../lib/server/firestore-admin";
import {
  MARKETPLACE_CATEGORY_OPTIONS,
  MARKETPLACE_CONDITION_OPTIONS,
  MARKETPLACE_EXCHANGE_METHOD_OPTIONS,
  MARKETPLACE_STATUS_OPTIONS,
  type MarketplaceCategory,
  type MarketplaceCondition,
  type MarketplaceExchangeMethod,
  type MarketplaceStatus,
} from "../../../lib/marketplace";

type RequestBody = {
  title?: string;
  category?: MarketplaceCategory;
  exchangeMethod?: MarketplaceExchangeMethod;
  priceText?: string;
  condition?: MarketplaceCondition;
  status?: MarketplaceStatus;
  description?: string;
  photoUrl?: string | null;
};

function isValidOption<T extends string>(
  value: string,
  options: Array<{ value: T }>
): value is T {
  return options.some((option) => option.value === value);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const body = (await request.json()) as RequestBody;
    const title = body.title?.trim() || "";
    const description = body.description?.trim() || "";
    const photoUrl = body.photoUrl?.trim() || null;
    const priceText = body.priceText?.trim() || null;
    const category = body.category?.trim() || "";
    const exchangeMethod = body.exchangeMethod?.trim() || "";
    const condition = body.condition?.trim() || "";
    const status = body.status?.trim() || "";

    if (!title) {
      return NextResponse.json({ error: "Listing title is required." }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    if (!isValidOption(category, MARKETPLACE_CATEGORY_OPTIONS)) {
      return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
    }

    if (!isValidOption(exchangeMethod, MARKETPLACE_EXCHANGE_METHOD_OPTIONS)) {
      return NextResponse.json({ error: "Choose a valid exchange method." }, { status: 400 });
    }

    if (!isValidOption(condition, MARKETPLACE_CONDITION_OPTIONS)) {
      return NextResponse.json({ error: "Choose a valid condition." }, { status: 400 });
    }

    if (!isValidOption(status, MARKETPLACE_STATUS_OPTIONS)) {
      return NextResponse.json({ error: "Choose a valid listing status." }, { status: 400 });
    }

    const createdDocument = (await createFirestoreDocument("marketplaceListings", {
      title,
      category,
      exchangeMethod,
      description,
      photoUrl,
      priceText,
      condition,
      status,
      createdByUid: decoded.sub,
      createdByEmail: decoded.email || null,
      createdAt: new Date(),
    })) as { name?: string };

    const listingId = createdDocument.name?.split("/").pop() || "";

    if (!listingId) {
      throw new Error("Marketplace listing was created without an ID.");
    }

    await writeAuditLog({
      action: "marketplace.listing.create",
      actor: { uid: decoded.sub, email: decoded.email || null },
      targetType: "marketplaceListing",
      targetId: listingId,
      status: "success",
      message: "Created marketplace listing.",
      details: {
        category,
        exchangeMethod,
        hasPhoto: Boolean(photoUrl),
        hasPriceText: Boolean(priceText),
      },
    });

    return NextResponse.json({ ok: true, listingId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the listing." },
      { status: 500 }
    );
  }
}
