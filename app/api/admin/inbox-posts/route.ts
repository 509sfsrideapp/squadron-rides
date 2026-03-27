import { NextResponse } from "next/server";
import { verifyAdminRequest } from "../../../../lib/server/admin-access";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import { createFirestoreDocument } from "../../../../lib/server/firestore-admin";

type InboxThreadId = "admin";

type RequestBody = {
  threadId?: InboxThreadId;
  title?: string;
  body?: string;
  imageUrl?: string | null;
};

export async function POST(request: Request) {
  try {
    const adminToken = await verifyAdminRequest(request.headers);
    const body = (await request.json()) as RequestBody;

    if (body.threadId !== "admin") {
      return NextResponse.json({ error: "Unsupported inbox thread." }, { status: 400 });
    }

    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: "Title and message text are required." }, { status: 400 });
    }

    await createFirestoreDocument("inboxPosts", {
      threadId: body.threadId,
      title: body.title.trim(),
      body: body.body.trim(),
      imageUrl: body.imageUrl || null,
      senderLabel: "Admin",
      senderType: "admin",
      createdAt: new Date(),
      createdByUid: adminToken.sub,
      createdByEmail: adminToken.email || null,
    });

    await writeAuditLog({
      action: "inbox_post.admin",
      actor: { uid: adminToken.sub, email: adminToken.email },
      targetType: "inboxThread",
      targetId: body.threadId,
      status: "success",
      message: "Admin inbox post created.",
      details: {
        threadId: body.threadId,
        hasImage: Boolean(body.imageUrl),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create inbox post." },
      { status: 500 }
    );
  }
}
