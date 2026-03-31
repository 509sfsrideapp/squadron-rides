import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "../../../../../../lib/server/admin-access";
import { writeAuditLog } from "../../../../../../lib/server/audit-log";
import { getFirestoreDocument } from "../../../../../../lib/server/firestore-admin";
import { archiveQAPost } from "../../../../../../lib/server/q-and-a";

type RequestBody = {
  reason?: string;
};

type QAPostArchiveRecord = {
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
    const postRecord = await getFirestoreDocument<QAPostArchiveRecord>(`qaPosts/${postId}`);

    if (!postId) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    if (!postRecord || postRecord.deleted) {
      return NextResponse.json({ error: "That post is unavailable." }, { status: 404 });
    }

    if (postRecord.archived) {
      return NextResponse.json({ ok: true, archived: true });
    }

    await archiveQAPost({
      postId,
      archivedByUid: adminToken.sub,
      reason: body.reason || "",
    });

    await writeAuditLog({
      action: "q_and_a.post.archive",
      actor: { uid: adminToken.sub, email: adminToken.email },
      targetType: "qaPost",
      targetId: postId,
      status: "success",
      message: "Archived forum post.",
      details: {
        reason: body.reason?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true, archived: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not archive the forum post." },
      { status: 500 }
    );
  }
}
