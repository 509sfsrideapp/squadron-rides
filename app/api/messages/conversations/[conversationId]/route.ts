import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../../lib/server/firebase-auth";
import { getDirectMessageConversation } from "../../../../../lib/server/direct-messages";

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const { conversationId } = await context.params;
    const conversation = await getDirectMessageConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "That conversation is unavailable." },
        { status: 404 }
      );
    }

    if (!conversation.participantIds.includes(decoded.sub)) {
      return NextResponse.json(
        { error: "You do not have access to that conversation." },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, conversation });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: getSafeMessagesError(error, "Could not load that conversation."),
      },
      { status: 500 }
    );
  }
}
