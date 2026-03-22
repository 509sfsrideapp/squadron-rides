import { NextResponse } from "next/server";
import { getRideDoc, getUserNotificationTokens } from "../../../../lib/server/firestore-rest";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { sendPushMessage } from "../../../../lib/server/fcm";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const body = (await request.json()) as {
      rideId?: string;
      riderId?: string;
      event?: "accepted" | "arrived";
      driverName?: string;
    };

    if (!body.rideId || !body.riderId || !body.event) {
      return NextResponse.json({ error: "Missing rider notification data." }, { status: 400 });
    }

    const ride = await getRideDoc(body.rideId);

    if (ride.acceptedBy !== decoded.sub || ride.riderId !== body.riderId) {
      return NextResponse.json({ error: "Unauthorized ride update notification request." }, { status: 403 });
    }

    const tokens = await getUserNotificationTokens(body.riderId);
    const title = body.event === "accepted" ? "Driver Accepted Your Ride" : "Your Driver Has Arrived";
    const messageBody =
      body.event === "accepted"
        ? `${body.driverName || "Your driver"} is heading to you now.`
        : `${body.driverName || "Your driver"} is at the pickup spot.`;

    await sendPushMessage({
      tokens,
      title,
      body: messageBody,
      link: "/ride-status",
      origin: new URL(request.url).origin,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not send ride update notifications." }, { status: 500 });
  }
}
