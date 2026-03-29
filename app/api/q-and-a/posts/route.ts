import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import { createQAPost } from "../../../../lib/server/q-and-a";

type RequestBody = {
  title?: string;
  body?: string;
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
    const title = body.title?.trim() || "";
    const postBody = body.body?.trim() || "";

    if (!title) {
      return NextResponse.json({ error: "Post title is required." }, { status: 400 });
    }

    const postId = await createQAPost({
      authorId: decoded.sub,
      authorEmail: decoded.email || null,
      title,
      body: postBody,
    });

    await writeAuditLog({
      action: "q_and_a.post.create",
      actor: { uid: decoded.sub, email: decoded.email },
      targetType: "qaPost",
      targetId: postId,
      status: "success",
      message: "Created Q&A post.",
      details: {
        hasBody: Boolean(postBody),
      },
    });

    return NextResponse.json({ ok: true, postId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the post." },
      { status: 500 }
    );
  }
}
