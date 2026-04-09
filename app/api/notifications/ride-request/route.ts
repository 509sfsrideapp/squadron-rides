import { NextResponse } from "next/server";
import { isAdminEmail } from "../../../../lib/admin";
import { getRideDispatchTargeting, isRideDispatchExpanded, normalizeRideDispatchMode } from "../../../../lib/ride-dispatch";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import { getAvailableDriverNotificationTokens, getRideDoc, getUserDoc } from "../../../../lib/server/firestore-rest";
import { patchFirestoreDocument } from "../../../../lib/server/firestore-admin";
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
    const body = (await request.json()) as { rideId?: string; phase?: "initial" | "expand" };

    if (!body.rideId) {
      return NextResponse.json({ error: "Missing rideId" }, { status: 400 });
    }

    const ride = await getRideDoc(body.rideId);
    const phase = body.phase === "expand" ? "expand" : "initial";
    const normalizedMode = normalizeRideDispatchMode(ride.dispatchMode);

    if (ride.status !== "open") {
      return NextResponse.json({ error: "Ride is no longer open." }, { status: 409 });
    }

    if (phase === "initial" && ride.riderId !== decoded.sub) {
      return NextResponse.json({ error: "Unauthorized ride notification request." }, { status: 403 });
    }

    if (phase === "expand") {
      let canExpandRide = ride.riderId === decoded.sub || isAdminEmail(decoded.email);

      if (!canExpandRide) {
        const caller = await getUserDoc(decoded.sub).catch(() => null);
        canExpandRide = caller?.available === true;
      }

      if (!canExpandRide) {
        return NextResponse.json({ error: "Unauthorized ride expansion request." }, { status: 403 });
      }

      if (normalizedMode === "all_drivers") {
        return NextResponse.json({ ok: true, skipped: "all_drivers" });
      }

      if (
        !isRideDispatchExpanded({
          mode: normalizedMode,
          createdAt: ride.createdAt,
          expandedAt: ride.dispatchExpandedAt,
        })
      ) {
        return NextResponse.json({ ok: true, skipped: "not_due" });
      }

      if (ride.dispatchExpandedAt) {
        return NextResponse.json({ ok: true, skipped: "already_expanded" });
      }
    }

    const targeting = getRideDispatchTargeting(normalizedMode, ride.dispatchFlight || ride.riderFlight || null);
    const tokenFilters = phase === "expand" ? targeting.expansion : targeting.initial;
    const tokens = await getAvailableDriverNotificationTokens(tokenFilters);

    await sendPushMessage({
      tokens,
      title: "New Ride Request",
      body: `${ride.riderName || decoded.email || "A rider"} needs a pickup${ride.pickup ? ` near ${ride.pickup}` : ""}.`,
      link: "/driver",
      origin: new URL(request.url).origin,
    });

    if (phase === "expand" && !ride.dispatchExpandedAt) {
      await patchFirestoreDocument(`rides/${ride.id}`, {
        dispatchExpandedAt: new Date(),
      });
    }

    await writeAuditLog({
      action: phase === "expand" ? "notification.ride_request_expand" : "notification.ride_request",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "ride",
      targetId: ride.id,
      status: "success",
      message:
        phase === "expand"
          ? "Ride request notifications expanded to the fallback driver audience."
          : "Ride request notifications queued for the initial driver audience.",
      details: {
        phase,
        dispatchMode: normalizedMode,
        tokenCount: tokens.length,
        riderId: ride.riderId || null,
        dispatchFlight: ride.dispatchFlight || ride.riderFlight || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    await writeAuditLog({
      action: "notification.ride_request",
      status: "failure",
      message: error instanceof Error ? error.message : "Could not send ride request notifications.",
    }).catch((auditError) => {
      console.error("Audit log write failed", auditError);
    });
    return NextResponse.json({ error: "Could not send ride request notifications." }, { status: 500 });
  }
}
