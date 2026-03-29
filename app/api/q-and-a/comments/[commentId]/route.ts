import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../../lib/server/firebase-auth";
import { writeAuditLog } from "../../../../../lib/server/audit-log";
import { getFirestoreDocument, patchFirestoreDocument } from "../../../../../lib/server/firestore-admin";

type QACommentRecord = {
  authorId: string;
  postId: string;
  parentCommentId?: string | null;
  deleted?: boolean;
};

type RequestBody = {
  body?: string;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const { commentId } = await context.params;
    const body = (await request.json()) as RequestBody;
    const nextBody = body.body?.trim() || "";

    if (!nextBody) {
      return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
    }

    const existingComment = await getFirestoreDocument<QACommentRecord>(`qaComments/${commentId}`);

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    if (existingComment.authorId !== decoded.sub) {
      return NextResponse.json({ error: "You can only edit your own comments." }, { status: 403 });
    }

    await patchFirestoreDocument(`qaComments/${commentId}`, {
      body: nextBody,
      updatedAt: new Date(),
    });

    await writeAuditLog({
      action: "q_and_a.comment.update",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "qaComment",
      targetId: commentId,
      status: "success",
      message: "Updated Q&A comment.",
      details: {
        postId: existingComment.postId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the comment." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const { commentId } = await context.params;
    const existingComment = await getFirestoreDocument<QACommentRecord>(`qaComments/${commentId}`);

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    if (existingComment.authorId !== decoded.sub) {
      return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 });
    }

    await patchFirestoreDocument(`qaComments/${commentId}`, {
      body: "",
      deleted: true,
      updatedAt: new Date(),
    });

    await writeAuditLog({
      action: "q_and_a.comment.delete",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "qaComment",
      targetId: commentId,
      status: "success",
      message: "Soft-deleted Q&A comment.",
      details: {
        postId: existingComment.postId,
        parentCommentId: existingComment.parentCommentId || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete the comment." },
      { status: 500 }
    );
  }
}
