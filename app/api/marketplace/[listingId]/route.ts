import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { deleteFirestoreDocument } from "../../../../lib/server/firestore-admin";
import {
  canDeleteMarketplaceListing,
  getMarketplaceListingWithCreator,
} from "../../../../lib/server/marketplace";

type RouteContext = {
  params: Promise<{
    listingId: string;
  }>;
};

function getSafeMarketplaceError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("quota exceeded") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("\"code\": 429")
  ) {
    return "Marketplace is temporarily unavailable right now. Give it a moment and try again.";
  }

  return message || fallback;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    await verifyFirebaseIdToken(idToken);
    const { listingId } = await context.params;
    const payload = await getMarketplaceListingWithCreator(listingId);

    if (!payload.listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: getSafeMarketplaceError(
          error,
          "Could not load marketplace listing."
        ),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const { listingId } = await context.params;
    const deleteCheck = await canDeleteMarketplaceListing(decoded.sub, decoded.email, listingId);

    if (!deleteCheck.allowed) {
      const status = deleteCheck.reason === "Listing not found." ? 404 : 403;
      return NextResponse.json({ error: deleteCheck.reason }, { status });
    }

    await deleteFirestoreDocument(`marketplaceListings/${listingId}`);
    await writeAuditLog({
      action: "marketplace.listing.delete",
      actor: { uid: decoded.sub, email: decoded.email || null },
      targetType: "marketplaceListing",
      targetId: listingId,
      status: "success",
      message: "Deleted marketplace listing.",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: getSafeMarketplaceError(
          error,
          "Could not delete marketplace listing."
        ),
      },
      { status: 500 }
    );
  }
}
