import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { getUserNotificationTokens } from "../../../../lib/server/firestore-rest";
import { sendPushMessage } from "../../../../lib/server/fcm";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const tokens = await getUserNotificationTokens(decoded.sub);

    if (tokens.length === 0) {
      return NextResponse.json({ error: "No notification tokens are saved for this account." }, { status: 400 });
    }

    await sendPushMessage({
      tokens,
      title: "Designated Defenders Test",
      body: "Push notifications are working on this device.",
      link: "/",
      origin: new URL(request.url).origin,
    });

    return NextResponse.json({ ok: true, tokenCount: tokens.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not send a test notification." }, { status: 500 });
  }
}
