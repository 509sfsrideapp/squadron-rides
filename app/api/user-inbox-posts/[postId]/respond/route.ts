import { NextResponse } from "next/server";
import { writeAuditLog } from "../../../../../lib/server/audit-log";
import { getFirestoreDocument, patchFirestoreDocument } from "../../../../../lib/server/firestore-admin";
import { verifyFirebaseIdToken } from "../../../../../lib/server/firebase-auth";

type UserInboxPostRecord = {
  id: string;
  userId?: string;
  threadId?: string;
  title?: string;
  requiresResponse?: boolean;
  responsePrompt?: string | null;
  responseText?: string | null;
  responseSubmittedAt?: string | null;
  rideId?: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const { postId } = await context.params;
    const body = (await request.json()) as { responseText?: string };
    const responseText = body.responseText?.trim() || "";

    if (!responseText) {
      return NextResponse.json({ error: "Please enter a response before submitting." }, { status: 400 });
    }

    if (responseText.length > 1500) {
      return NextResponse.json({ error: "Responses must stay under 1,500 characters." }, { status: 400 });
    }

    const post = await getFirestoreDocument<UserInboxPostRecord>(`userInboxPosts/${postId}`);

    if (!post || post.threadId !== "notifications") {
      return NextResponse.json({ error: "Notification prompt not found." }, { status: 404 });
    }

    if (post.userId !== decoded.sub) {
      return NextResponse.json({ error: "Unauthorized inbox response." }, { status: 403 });
    }

    const allowsOptionalResponse = Boolean(post.responsePrompt?.trim());

    if (!post.requiresResponse && !allowsOptionalResponse) {
      return NextResponse.json({ error: "This inbox post does not accept a response." }, { status: 400 });
    }

    if (post.responseSubmittedAt) {
      return NextResponse.json({ error: "A response has already been submitted for this prompt." }, { status: 409 });
    }

    await patchFirestoreDocument(`userInboxPosts/${postId}`, {
      responseText,
      responseSubmittedAt: new Date(),
      responseAuthorUid: decoded.sub,
      readAt: new Date(),
      readByUserId: decoded.sub,
    });

    await writeAuditLog({
      action: "inbox_post.user_response",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "userInboxPost",
      targetId: postId,
      status: "success",
      message: post.requiresResponse
        ? "User submitted a required inbox response."
        : "User submitted an optional inbox comment.",
      details: {
        rideId: post.rideId || null,
        title: post.title || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    await writeAuditLog({
      action: "inbox_post.user_response",
      status: "failure",
      message: error instanceof Error ? error.message : "Could not save inbox response.",
    }).catch((auditError) => {
      console.error("Audit log write failed", auditError);
    });
    return NextResponse.json({ error: "Could not save your response." }, { status: 500 });
  }
}
