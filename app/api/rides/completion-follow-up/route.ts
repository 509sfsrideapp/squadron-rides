import { NextResponse } from "next/server";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import {
  getFirestoreDocument,
  patchFirestoreDocument,
} from "../../../../lib/server/firestore-admin";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { createUserInboxPostAndMaybeNotify } from "../../../../lib/server/user-notification-settings";

type RideRecord = {
  id: string;
  riderId?: string | null;
  riderName?: string | null;
  acceptedBy?: string | null;
  driverName?: string | null;
  status?: string | null;
  completionFollowUpQueuedAt?: string | null;
};

function buildRiderTitle() {
  return "Ride Complete Check-In";
}

function buildRiderBody(ride: RideRecord) {
  return `${ride.driverName || "Your driver"} has marked this ride as completed. We hope everything went smoothly. If you would like to leave a comment about how the ride went, you can add one below, but it is completely optional.`;
}

function buildDriverTitle() {
  return "Driver Ride Check-In";
}

function buildDriverBody(ride: RideRecord) {
  return `${ride.riderName || "The rider"}'s trip has been marked complete. If anything about the ride needs follow-up, you can leave an optional comment below.`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const body = (await request.json()) as { rideId?: string };

    if (!body.rideId) {
      return NextResponse.json({ error: "Missing ride id." }, { status: 400 });
    }

    const ride = await getFirestoreDocument<RideRecord>(`rides/${body.rideId}`);

    if (!ride) {
      return NextResponse.json({ error: "Ride not found." }, { status: 404 });
    }

    if (ride.acceptedBy !== decoded.sub) {
      return NextResponse.json({ error: "Only the assigned driver can queue this follow-up." }, { status: 403 });
    }

    if (ride.status !== "completed") {
      return NextResponse.json({ error: "Ride follow-up can only be queued after completion." }, { status: 409 });
    }

    if (ride.completionFollowUpQueuedAt) {
      return NextResponse.json({ ok: true, skipped: "already_queued" });
    }

    if (ride.riderId) {
      await createUserInboxPostAndMaybeNotify({
        userId: ride.riderId,
        threadId: "notifications",
        senderLabel: "Notifications",
        title: buildRiderTitle(),
        body: buildRiderBody(ride),
        responsePrompt: "If you want to share anything about how the ride went, you can leave an optional comment here.",
        link: "/inbox/notifications",
      });
    }

    await createUserInboxPostAndMaybeNotify({
      userId: decoded.sub,
      threadId: "notifications",
      senderLabel: "Notifications",
      title: buildDriverTitle(),
      body: buildDriverBody(ride),
      responsePrompt: "If you want to note anything about how the ride went, you can leave an optional comment here.",
      link: "/inbox/notifications",
    });

    await patchFirestoreDocument(`rides/${ride.id}`, {
      completionFollowUpQueuedAt: new Date(),
    });

    await writeAuditLog({
      action: "ride.complete_follow_up",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "ride",
      targetId: ride.id,
      status: "success",
      message: "Queued optional post-ride notification follow-up posts for rider and driver.",
      details: {
        riderId: ride.riderId || null,
        driverId: decoded.sub,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    await writeAuditLog({
      action: "ride.complete_follow_up",
      status: "failure",
      message: error instanceof Error ? error.message : "Could not queue ride completion follow-up notifications.",
    }).catch((auditError) => {
      console.error("Audit log write failed", auditError);
    });
    return NextResponse.json({ error: "Could not queue ride completion follow-up notifications." }, { status: 500 });
  }
}
