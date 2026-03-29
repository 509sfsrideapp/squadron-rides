import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../../../lib/server/firebase-auth";
import { writeAuditLog } from "../../../../../../lib/server/audit-log";
import { getFirestoreDocument } from "../../../../../../lib/server/firestore-admin";
import { setQACommentVote } from "../../../../../../lib/server/q-and-a";
import { normalizeQAVoteValue } from "../../../../../../lib/q-and-a";

type RequestBody = {
  value?: number;
};

type QACommentRecord = {
  deleted?: boolean;
  postId?: string;
};

export async function POST(
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
    const value = normalizeQAVoteValue(Number(body.value || 0));

    const commentRecord = await getFirestoreDocument<QACommentRecord>(`qaComments/${commentId}`);

    if (!commentRecord || commentRecord.deleted) {
      return NextResponse.json({ error: "That comment is unavailable." }, { status: 404 });
    }

    const score = await setQACommentVote({
      commentId,
      userId: decoded.sub,
      value,
    });

    await writeAuditLog({
      action: "q_and_a.comment.vote",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "qaComment",
      targetId: commentId,
      status: "success",
      message: "Updated Q&A comment vote.",
      details: {
        postId: commentRecord.postId || null,
        value,
        score,
      },
    });

    return NextResponse.json({ ok: true, score });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the comment vote." },
      { status: 500 }
    );
  }
}
