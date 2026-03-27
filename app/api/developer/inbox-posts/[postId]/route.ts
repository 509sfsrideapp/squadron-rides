import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "../../../../../lib/server/audit-log";
import { deleteFirestoreDocument, getFirestoreDocument, patchFirestoreDocument } from "../../../../../lib/server/firestore-admin";
import { verifyFirebaseIdToken } from "../../../../../lib/server/firebase-auth";

const DEVELOPER_COOKIE_NAME = "developer_access";

type RequestBody = {
  title?: string;
  body?: string;
  imageUrl?: string | null;
};

type InboxPostRecord = {
  threadId?: string;
};

async function verifyDeveloperRequest(request: NextRequest) {
  const accessCookie = request.cookies.get(DEVELOPER_COOKIE_NAME);

  if (accessCookie?.value !== "granted") {
    throw new Error("Developer access required.");
  }

  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!idToken) {
    throw new Error("Missing developer token.");
  }

  return await verifyFirebaseIdToken(idToken);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const decoded = await verifyDeveloperRequest(request);
    const { postId } = await params;
    const existingPost = await getFirestoreDocument<InboxPostRecord>(`inboxPosts/${postId}`);

    if (!existingPost || existingPost.threadId !== "dev") {
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
      updatedByUid: decoded.sub,
      updatedByEmail: decoded.email || null,
    });

    await writeAuditLog({
      action: "inbox_post.dev_edit",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "inboxPost",
      targetId: postId,
      status: "success",
      message: "Developer inbox post updated.",
      details: {
        threadId: "dev",
        hasImage: Boolean(body.imageUrl),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update inbox post." },
      { status: error instanceof Error && error.message.includes("required") ? 403 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const decoded = await verifyDeveloperRequest(request);
    const { postId } = await params;
    const existingPost = await getFirestoreDocument<InboxPostRecord>(`inboxPosts/${postId}`);

    if (!existingPost || existingPost.threadId !== "dev") {
      return NextResponse.json({ error: "Inbox post not found." }, { status: 404 });
    }

    await deleteFirestoreDocument(`inboxPosts/${postId}`);

    await writeAuditLog({
      action: "inbox_post.dev_delete",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "inboxPost",
      targetId: postId,
      status: "success",
      message: "Developer inbox post deleted.",
      details: {
        threadId: "dev",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete inbox post." },
      { status: error instanceof Error && error.message.includes("required") ? 403 : 500 }
    );
  }
}
