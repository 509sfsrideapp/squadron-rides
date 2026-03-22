import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { getUserNotificationTokens } from "../../../../lib/server/firestore-rest";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const tokens = await getUserNotificationTokens(decoded.sub);

    return NextResponse.json({
      ok: true,
      userId: decoded.sub,
      tokenCount: tokens.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load notification debug info." }, { status: 500 });
  }
}
