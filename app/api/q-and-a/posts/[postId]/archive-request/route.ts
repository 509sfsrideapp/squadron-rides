import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "../../../../../../lib/server/admin-access";
import { writeAuditLog } from "../../../../../../lib/server/audit-log";
import { createUserInboxPostAndMaybeNotify } from "../../../../../../lib/server/user-notification-settings";
import { getFirestoreDocument, patchFirestoreDocument } from "../../../../../../lib/server/firestore-admin";

type RequestBody = {
  message?: string;
};

type QAPostArchiveRequestRecord = {
  authorId: string;
  title?: string | null;
  deleted?: boolean;
  archived?: boolean;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const adminToken = await verifyAdminRequest(request.headers);
    const { postId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const postRecord = await getFirestoreDocument<QAPostArchiveRequestRecord>(`qaPosts/${postId}`);

    if (!postId) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    if (!postRecord || postRecord.deleted) {
      return NextResponse.json({ error: "That post is unavailable." }, { status: 404 });
    }

    if (postRecord.archived) {
      return NextResponse.json({ error: "That post is already archived." }, { status: 400 });
    }

    const createdPostPath = await createUserInboxPostAndMaybeNotify({
      userId: postRecord.authorId,
      threadId: "notifications",
      senderLabel: "Admin",
      senderType: "admin",
      title: `Archive permission request: ${postRecord.title || "Forum thread"}`,
      body:
        body.message?.trim() ||
        "Admin is requesting your permission to archive this deleted forum thread so people can still read it later without interacting with it.",
      requiresResponse: true,
      responsePrompt:
        "Reply with your archive preference. For example: YES to allow archive, or NO if you do not want this thread archived.",
      createdByUid: adminToken.sub,
      createdByEmail: adminToken.email || null,
      link: "/inbox/notifications",
      origin: new URL(request.url).origin,
      suppressPush: true,
      extraFields: {
        archiveRequestForQAPostId: postId,
      },
    });

    const archiveRequestPostId = createdPostPath?.name?.split("/").pop() || null;

    await patchFirestoreDocument(`qaPosts/${postId}`, {
      archivePermissionRequestedAt: new Date(),
      archivePermissionRequestPostId: archiveRequestPostId,
      updatedAt: new Date(),
    });

    await writeAuditLog({
      action: "q_and_a.post.archive_request",
      actor: { uid: adminToken.sub, email: adminToken.email },
      targetType: "qaPost",
      targetId: postId,
      status: "success",
      message: "Requested forum archive permission from owner.",
      details: {
        inboxPostId: archiveRequestPostId,
      },
    });

    return NextResponse.json({ ok: true, archiveRequestPostId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not request archive permission." },
      { status: 500 }
    );
  }
}
