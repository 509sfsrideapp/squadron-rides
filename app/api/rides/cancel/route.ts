import { NextResponse } from "next/server";
import { createFirestoreDocument, getFirestoreDocument, patchFirestoreDocument } from "../../../../lib/server/firestore-admin";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import { getAvailableDriverNotificationTokens, getUserNotificationTokens } from "../../../../lib/server/firestore-rest";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { sendPushMessage } from "../../../../lib/server/fcm";

type RideRecord = {
  id: string;
  riderId?: string;
  riderName?: string;
  pickup?: string;
  status?: string;
  acceptedBy?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverEmail?: string | null;
  driverPhotoUrl?: string | null;
  carYear?: string | null;
  carMake?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carPlate?: string | null;
  dispatchExpandedAt?: string | null;
};

function buildNotificationTitle(actor: "rider" | "driver") {
  return actor === "driver" ? "Ride Release Follow-Up Required" : "Ride Cancellation Follow-Up Required";
}

function buildNotificationBody(actor: "rider" | "driver") {
  return actor === "driver"
    ? "You released an assigned ride back to the dispatch queue. Please tell dispatch what happened so the handoff can be tracked correctly."
    : "You canceled this ride request. Please tell dispatch why the ride was canceled so issues can be tracked correctly.";
}

function buildNotificationPrompt(actor: "rider" | "driver") {
  return actor === "driver"
    ? "Why did you release this ride back to the queue?"
    : "Why did you cancel this ride request?";
}

async function createUserNotificationPost(input: {
  userId: string;
  title: string;
  body: string;
  rideId: string;
  requiresResponse?: boolean;
  responsePrompt?: string;
}) {
  await createFirestoreDocument("userInboxPosts", {
    userId: input.userId,
    threadId: "notifications",
    senderLabel: "Notifications",
    title: input.title,
    body: input.body,
    rideId: input.rideId,
    requiresResponse: input.requiresResponse === true,
    responsePrompt: input.responsePrompt || null,
    responseText: null,
    responseSubmittedAt: null,
    createdAt: new Date(),
  });
}

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
      actor?: "rider" | "driver";
      reason?: string;
    };

    if (!body.rideId || !body.actor) {
      return NextResponse.json({ error: "Missing ride cancellation data." }, { status: 400 });
    }

    const ride = await getFirestoreDocument<RideRecord>(`rides/${body.rideId}`);

    if (!ride) {
      return NextResponse.json({ error: "Ride not found." }, { status: 404 });
    }

    if (body.actor === "rider") {
      if (ride.riderId !== decoded.sub) {
        return NextResponse.json({ error: "Unauthorized ride cancellation." }, { status: 403 });
      }

      if (!ride.status || !["open", "accepted", "arrived"].includes(ride.status)) {
        return NextResponse.json({ error: "This ride can no longer be canceled." }, { status: 409 });
      }

      await patchFirestoreDocument(`rides/${ride.id}`, {
        status: "canceled",
        canceledAt: new Date(),
        canceledBy: decoded.sub,
      });

      if (ride.acceptedBy) {
        await patchFirestoreDocument(`users/${ride.acceptedBy}`, {
          available: true,
          updatedAt: new Date(),
        }).catch((error) => {
          console.error("Driver availability reset failed after rider cancel", error);
        });

        const driverTokens = await getUserNotificationTokens(ride.acceptedBy).catch(() => []);
        await sendPushMessage({
          tokens: driverTokens,
          title: "Ride Canceled",
          body: `${ride.riderName || "The rider"} canceled this ride request.`,
          link: "/driver",
          origin: new URL(request.url).origin,
        });

        await createUserNotificationPost({
          userId: ride.acceptedBy,
          rideId: ride.id,
          title: "Ride Canceled",
          body: "The rider canceled this request. You have been returned to the driver queue.",
        }).catch((error) => {
          console.error("Driver cancellation notice post failed", error);
        });
      }

      await createUserNotificationPost({
        userId: decoded.sub,
        rideId: ride.id,
        title: buildNotificationTitle("rider"),
        body: buildNotificationBody("rider"),
        requiresResponse: true,
        responsePrompt: buildNotificationPrompt("rider"),
      });

      await writeAuditLog({
        action: "ride.cancel_rider",
        actor: { uid: decoded.sub, email: decoded.email },
        targetType: "ride",
        targetId: ride.id,
        status: "success",
        message: "Rider canceled a ride and follow-up notifications were queued.",
        details: {
          acceptedBy: ride.acceptedBy || null,
        },
      });

      return NextResponse.json({ ok: true, status: "canceled" });
    }

    if (ride.acceptedBy !== decoded.sub) {
      return NextResponse.json({ error: "Unauthorized driver ride release." }, { status: 403 });
    }

    if (!ride.status || !["accepted", "arrived"].includes(ride.status)) {
      return NextResponse.json({ error: "This ride can no longer be released back to the queue." }, { status: 409 });
    }

    const releaseReason = body.reason?.trim();

    if (!releaseReason) {
      return NextResponse.json({ error: "A release reason is required before sending this ride back to the queue." }, { status: 400 });
    }

    await patchFirestoreDocument(`rides/${ride.id}`, {
      status: "open",
      acceptedBy: null,
      driverName: null,
      driverPhone: null,
      driverEmail: null,
      driverPhotoUrl: null,
      carYear: null,
      carMake: null,
      carModel: null,
      carColor: null,
      carPlate: null,
      acceptedAt: null,
      arrivedAt: null,
      pickedUpAt: null,
      completedAt: null,
      canceledAt: null,
      canceledBy: null,
      dispatchExpandedAt: new Date(),
    });

    await patchFirestoreDocument(`users/${decoded.sub}`, {
      available: true,
      updatedAt: new Date(),
    }).catch((error) => {
      console.error("Driver availability reset failed after ride release", error);
    });

    if (ride.riderId) {
      const riderTokens = await getUserNotificationTokens(ride.riderId).catch(() => []);
      await sendPushMessage({
        tokens: riderTokens,
        title: "Ride Re-dispatched",
        body: "Your driver could not continue the ride. Your request has been sent back to available drivers.",
        link: `/ride-status?rideId=${ride.id}`,
        origin: new URL(request.url).origin,
      });

      await createUserNotificationPost({
        userId: ride.riderId,
        rideId: ride.id,
        title: "Ride Re-dispatched",
        body: "Your driver could not continue this ride. The request is active again and has been pushed back out to available drivers.",
      }).catch((error) => {
        console.error("Rider repush notice post failed", error);
      });
    }

    const driverTokens = await getAvailableDriverNotificationTokens();
    await sendPushMessage({
      tokens: driverTokens,
      title: "Ride Request Reopened",
      body: `${ride.riderName || "A rider"} still needs pickup${ride.pickup ? ` near ${ride.pickup}` : ""}.`,
      link: "/driver",
      origin: new URL(request.url).origin,
    });

    await createUserNotificationPost({
      userId: decoded.sub,
      rideId: ride.id,
      title: "Ride Release Logged",
      body: `You released this ride back to the queue.\n\nReason: ${releaseReason}`,
    });

    await writeAuditLog({
      action: "ride.release_driver",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "ride",
      targetId: ride.id,
      status: "success",
      message: "Driver released a ride back to the queue and notifications were queued.",
      details: {
        riderId: ride.riderId || null,
        releaseReason,
      },
    });

    return NextResponse.json({ ok: true, status: "reopened" });
  } catch (error) {
    console.error(error);
    await writeAuditLog({
      action: "ride.cancel_or_release",
      status: "failure",
      message: error instanceof Error ? error.message : "Could not process ride cancellation.",
    }).catch((auditError) => {
      console.error("Audit log write failed", auditError);
    });
    return NextResponse.json({ error: "Could not process this ride action." }, { status: 500 });
  }
}
