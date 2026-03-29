import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import { buildQAActorData, recountQACommentReplies, recountQAPostComments } from "../../../../lib/server/q-and-a";
import { createFirestoreDocument, getFirestoreDocument } from "../../../../lib/server/firestore-admin";

type RequestBody = {
  postId?: string;
  parentCommentId?: string | null;
  body?: string;
};

type QAPostRecord = {
  deleted?: boolean;
};

type QACommentRecord = {
  postId?: string;
  deleted?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Missing user token." }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const body = (await request.json()) as RequestBody;
    const postId = body.postId?.trim() || "";
    const parentCommentId = body.parentCommentId?.trim() || null;
    const commentBody = body.body?.trim() || "";

    if (!postId || !commentBody) {
      return NextResponse.json({ error: "postId and comment body are required." }, { status: 400 });
    }

    const postRecord = await getFirestoreDocument<QAPostRecord>(`qaPosts/${postId}`);

    if (!postRecord || postRecord.deleted) {
      return NextResponse.json({ error: "That post is unavailable." }, { status: 404 });
    }

    if (parentCommentId) {
      const parentComment = await getFirestoreDocument<QACommentRecord>(`qaComments/${parentCommentId}`);

      if (!parentComment || parentComment.deleted || parentComment.postId !== postId) {
        return NextResponse.json({ error: "That reply target is unavailable." }, { status: 404 });
      }
    }

    const actorData = await buildQAActorData(decoded.sub, decoded.email || null);
    const created = (await createFirestoreDocument("qaComments", {
      postId,
      parentCommentId,
      authorId: decoded.sub,
      authorLabel: actorData.authorLabel,
      authorPhotoUrl: actorData.authorPhotoUrl,
      body: commentBody,
      createdAt: new Date(),
      updatedAt: new Date(),
      score: 0,
      replyCount: 0,
      deleted: false,
    })) as { name?: string };

    if (parentCommentId) {
      await recountQACommentReplies(parentCommentId);
    }

    await recountQAPostComments(postId);

    const commentId = created.name?.split("/").pop() || "";

    await writeAuditLog({
      action: "q_and_a.comment.create",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "qaComment",
      targetId: commentId,
      status: "success",
      message: "Created Q&A comment.",
      details: {
        postId,
        parentCommentId,
      },
    });

    return NextResponse.json({ ok: true, commentId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the comment." },
      { status: 500 }
    );
  }
}
