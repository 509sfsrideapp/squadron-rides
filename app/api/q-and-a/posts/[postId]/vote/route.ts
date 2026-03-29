import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../../../lib/server/firebase-auth";
import { writeAuditLog } from "../../../../../../lib/server/audit-log";
import { getFirestoreDocument } from "../../../../../../lib/server/firestore-admin";
import { setQAPostVote } from "../../../../../../lib/server/q-and-a";
import { normalizeQAVoteValue } from "../../../../../../lib/q-and-a";

type RequestBody = {
  value?: number;
};

type QAPostRecord = {
  deleted?: boolean;
};

export async function POST(
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
    const value = normalizeQAVoteValue(Number(body.value || 0));

    const postRecord = await getFirestoreDocument<QAPostRecord>(`qaPosts/${postId}`);

    if (!postRecord || postRecord.deleted) {
      return NextResponse.json({ error: "That post is unavailable." }, { status: 404 });
    }

    const score = await setQAPostVote({
      postId,
      userId: decoded.sub,
      value,
    });

    await writeAuditLog({
      action: "q_and_a.post.vote",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "qaPost",
      targetId: postId,
      status: "success",
      message: "Updated Q&A post vote.",
      details: {
        value,
        score,
      },
    });

    return NextResponse.json({ ok: true, score });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the post vote." },
      { status: 500 }
    );
  }
}
