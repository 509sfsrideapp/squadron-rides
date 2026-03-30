import { NextRequest, NextResponse } from "next/server";
import {
  DEVELOPER_ACCESS_DISABLED_MESSAGE,
  requestHasDeveloperAccess,
} from "../../../../../../lib/server/developer-access";
import { verifyFirebaseIdToken } from "../../../../../../lib/server/firebase-auth";
import {
  listDirectMessagesForConversation,
  sendDirectMessage,
} from "../../../../../../lib/server/direct-messages";

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

type RequestBody = {
  body?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
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
    const { conversationId } = await context.params;
    const body = (await request.json()) as RequestBody;
    const messageBody = body.body?.trim() || "";

    if (!messageBody) {
      return NextResponse.json({ error: "Message text is required." }, { status: 400 });
    }

    await sendDirectMessage({
      conversationId,
      senderId: decoded.sub,
      body: messageBody,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: getSafeMessagesError(error, "Could not send the message.") },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
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
    const { conversationId } = await context.params;
    const messages = await listDirectMessagesForConversation({
      conversationId,
      userId: decoded.sub,
    });

    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: getSafeMessagesError(error, "Could not load the messages.") },
      { status: 500 }
    );
  }
}
