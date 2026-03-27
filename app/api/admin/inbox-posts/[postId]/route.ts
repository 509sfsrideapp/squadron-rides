import { NextResponse } from "next/server";
import { verifyAdminRequest } from "../../../../../lib/server/admin-access";
import { writeAuditLog } from "../../../../../lib/server/audit-log";
import { deleteFirestoreDocument, getFirestoreDocument, patchFirestoreDocument } from "../../../../../lib/server/firestore-admin";

type RequestBody = {
  title?: string;
  body?: string;
  imageUrl?: string | null;
};

type InboxPostRecord = {
  threadId?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const adminToken = await verifyAdminRequest(request.headers);
    const { postId } = await params;
    const existingPost = await getFirestoreDocument<InboxPostRecord>(`inboxPosts/${postId}`);

    if (!existingPost || existingPost.threadId !== "admin") {
      return NextResponse.json({ error: "Inbox post not found." }, { status: 404 });
    }

    const body = (await request.json()) as RequestBody;

    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: "Title and message text are required." }, { status: 400 });
    }

    await patchFirestoreDocument(`inboxPosts/${postId}`, {
      title: body.title.trim(),
      body: body.body.trim(),
      imageUrl: body.imageUrl || null,
      updatedAt: new Date(),
      updatedByUid: adminToken.sub,
      updatedByEmail: adminToken.email || null,
    });

    await writeAuditLog({
      action: "inbox_post.admin_edit",
      actor: { uid: adminToken.sub, email: adminToken.email },
      targetType: "inboxPost",
      targetId: postId,
      status: "success",
      message: "Admin inbox post updated.",
      details: {
        threadId: "admin",
        hasImage: Boolean(body.imageUrl),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update inbox post." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const adminToken = await verifyAdminRequest(request.headers);
    const { postId } = await params;
    const existingPost = await getFirestoreDocument<InboxPostRecord>(`inboxPosts/${postId}`);

    if (!existingPost || existingPost.threadId !== "admin") {
      return NextResponse.json({ error: "Inbox post not found." }, { status: 404 });
    }

    await deleteFirestoreDocument(`inboxPosts/${postId}`);

    await writeAuditLog({
      action: "inbox_post.admin_delete",
      actor: { uid: adminToken.sub, email: adminToken.email },
      targetType: "inboxPost",
      targetId: postId,
      status: "success",
      message: "Admin inbox post deleted.",
      details: {
        threadId: "admin",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete inbox post." },
      { status: 500 }
    );
  }
}
