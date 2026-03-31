import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "../../../../../lib/admin";
import { verifyFirebaseIdToken } from "../../../../../lib/server/firebase-auth";
import { writeAuditLog } from "../../../../../lib/server/audit-log";
import { createAdminRemovalInboxNotice } from "../../../../../lib/server/admin-content-removal";
import { getFirestoreDocument } from "../../../../../lib/server/firestore-admin";
import { deleteQAPost, requestQAPostDeletionReview, updateQAPost } from "../../../../../lib/server/q-and-a";

type RequestBody = {
  title?: string;
  body?: string;
  message?: string;
};

type QAPostDeleteRecord = {
  authorId: string;
  title?: string | null;
  deleted?: boolean;
  pendingDeletionReview?: boolean;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const { postId } = await context.params;
    const body = (await request.json()) as RequestBody;
    const title = body.title?.trim() || "";
    const postBody = body.body?.trim() || "";

    if (!postId || !title) {
      return NextResponse.json({ error: "Post title is required." }, { status: 400 });
    }

    await updateQAPost({
      postId,
      authorId: decoded.sub,
      title,
      body: postBody,
    });

    await writeAuditLog({
      action: "q_and_a.post.update",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "qaPost",
      targetId: postId,
      status: "success",
      message: "Updated Q&A post.",
      details: {
        hasBody: Boolean(postBody),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the post." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const { postId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const postRecord = await getFirestoreDocument<QAPostDeleteRecord>(`qaPosts/${postId}`);

    if (!postId) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    if (!postRecord || postRecord.deleted) {
      return NextResponse.json({ error: "That post is unavailable." }, { status: 404 });
    }

    const adminDeletingSomeoneElse = isAdminEmail(decoded.email) && postRecord.authorId !== decoded.sub;

    if (adminDeletingSomeoneElse) {
      await deleteQAPost({
        postId,
        authorId: decoded.sub,
        allowAdminDelete: true,
      });
    } else {
      await requestQAPostDeletionReview({
        postId,
        authorId: decoded.sub,
      });
    }

    if (adminDeletingSomeoneElse) {
      await createAdminRemovalInboxNotice({
        userId: postRecord.authorId,
        contentTypeLabel: "forum post",
        contentTitle: postRecord.title || "Untitled Forum Post",
        reason: body.message || "",
        adminUid: decoded.sub,
        adminEmail: decoded.email || null,
      });
    }

    await writeAuditLog({
      action: "q_and_a.post.delete",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "qaPost",
      targetId: postId,
      status: "success",
      message: adminDeletingSomeoneElse ? "Deleted Q&A post." : "Sent Q&A post to admin review bin.",
      details: {
        adminMessage: body.message?.trim() || null,
        adminDelete: adminDeletingSomeoneElse,
        pendingDeletionReview: !adminDeletingSomeoneElse,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete the post." },
      { status: 500 }
    );
  }
}
