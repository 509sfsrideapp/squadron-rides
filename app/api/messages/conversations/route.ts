import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import {
  DEVELOPER_ACCESS_DISABLED_MESSAGE,
  requestHasDeveloperAccess,
} from "../../../../lib/server/developer-access";
import {
  listDirectMessageConversationsForUser,
  openDirectConversation,
  openIsoConversation,
  openMarketplaceConversation,
} from "../../../../lib/server/direct-messages";
import { getConversationBucket } from "../../../../lib/direct-messages";

function getSafeMessagesError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("quota exceeded") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("\"code\": 429")
  ) {
    return "Messages are temporarily busy right now. Give it a moment and try again.";
  }

  return message || fallback;
}

type RequestBody =
  | {
      type?: "direct";
      otherUserId?: string;
    }
  | {
      type?: "marketplace" | "iso";
      targetId?: string;
    };

export async function POST(request: NextRequest) {
  try {
    if (!requestHasDeveloperAccess(request)) {
      return NextResponse.json(
        { error: DEVELOPER_ACCESS_DISABLED_MESSAGE },
        { status: 403 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const body = (await request.json()) as RequestBody;

    if (body.type === "direct") {
      const otherUserId = body.otherUserId?.trim() || "";

      if (!otherUserId) {
        return NextResponse.json(
          { error: "A user must be selected before opening a direct thread." },
          { status: 400 }
        );
      }

      const conversation = await openDirectConversation({
        currentUserId: decoded.sub,
        currentUserEmail: decoded.email || null,
        otherUserId,
      });

      return NextResponse.json({
        ok: true,
        conversation,
        bucket: getConversationBucket(conversation.type),
      });
    }

    if (body.type === "marketplace") {
      const targetId = body.targetId?.trim() || "";

      if (!targetId) {
        return NextResponse.json(
          { error: "A marketplace listing is required before messaging." },
          { status: 400 }
        );
      }

      const conversation = await openMarketplaceConversation({
        currentUserId: decoded.sub,
        currentUserEmail: decoded.email || null,
        listingId: targetId,
      });

      return NextResponse.json({
        ok: true,
        conversation,
        bucket: getConversationBucket(conversation.type),
      });
    }

    if (body.type === "iso") {
      const targetId = body.targetId?.trim() || "";

      if (!targetId) {
        return NextResponse.json(
          { error: "An ISO request is required before messaging." },
          { status: 400 }
        );
      }

      const conversation = await openIsoConversation({
        currentUserId: decoded.sub,
        currentUserEmail: decoded.email || null,
        requestId: targetId,
      });

      return NextResponse.json({
        ok: true,
        conversation,
        bucket: getConversationBucket(conversation.type),
      });
    }

    return NextResponse.json(
      { error: "Unsupported conversation type." },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: getSafeMessagesError(error, "Could not open the conversation.") },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!requestHasDeveloperAccess(request)) {
      return NextResponse.json(
        { error: DEVELOPER_ACCESS_DISABLED_MESSAGE },
        { status: 403 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const conversations = await listDirectMessageConversationsForUser(decoded.sub);

    return NextResponse.json({ ok: true, conversations });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: getSafeMessagesError(error, "Could not load conversations.") },
      { status: 500 }
    );
  }
}
