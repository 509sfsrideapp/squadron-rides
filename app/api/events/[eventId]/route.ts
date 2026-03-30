import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "../../../../lib/server/admin-access";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import { createAdminRemovalInboxNotice } from "../../../../lib/server/admin-content-removal";
import {
  deleteFirestoreDocument,
  getFirestoreDocument,
  listFirestoreDocumentsByField,
} from "../../../../lib/server/firestore-admin";

type EventRecord = {
  name?: string | null;
  createdByUid?: string | null;
};

type EventAttendanceRecord = {
  id: string;
  path: string;
};

type RequestBody = {
  message?: string;
};

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const adminToken = await verifyAdminRequest(request.headers);
    const { eventId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as RequestBody;

    if (!eventId) {
      return NextResponse.json({ error: "Event id is required." }, { status: 400 });
    }

    const eventRecord = await getFirestoreDocument<EventRecord>(`events/${eventId}`);

    if (!eventRecord) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const attendees = (await listFirestoreDocumentsByField("eventAttendees", "eventId", eventId)) as EventAttendanceRecord[];
    await Promise.all(attendees.map((attendee) => deleteFirestoreDocument(attendee.path)));
    await deleteFirestoreDocument(`events/${eventId}`);

    if (eventRecord.createdByUid && eventRecord.createdByUid !== adminToken.sub) {
      await createAdminRemovalInboxNotice({
        userId: eventRecord.createdByUid,
        contentTypeLabel: "event",
        contentTitle: eventRecord.name || "Untitled Event",
        reason: body.message || "",
        adminUid: adminToken.sub,
        adminEmail: adminToken.email || null,
      });
    }

    await writeAuditLog({
      action: "event.delete.admin",
      actor: { uid: adminToken.sub, email: adminToken.email },
      targetType: "event",
      targetId: eventId,
      status: "success",
      message: "Deleted event as admin.",
      details: {
        eventName: eventRecord.name || null,
        adminMessage: body.message?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete event." },
      { status: 500 }
    );
  }
}
