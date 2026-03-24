import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "../../../../lib/admin";
import { verifyFirebaseIdToken } from "../../../../lib/server/firebase-auth";
import { deleteFirestoreDocument } from "../../../../lib/server/firestore-admin";

type RequestBody = {
  action?: "delete";
  messageId?: string;
};

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export async function POST(request: NextRequest) {
  try {
    const idToken = getBearerToken(request);

    if (!idToken) {
      return NextResponse.json({ error: "Missing admin token." }, { status: 401 });
    }

    const adminToken = await verifyFirebaseIdToken(idToken);

    if (!isAdminEmail(adminToken.email)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = (await request.json()) as RequestBody;
    const action = body.action;
    const messageId = body.messageId?.trim();

    if (action !== "delete" || !messageId) {
      return NextResponse.json({ error: "Delete action and messageId are required." }, { status: 400 });
    }

    await deleteFirestoreDocument(`globalMessages/${messageId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not manage that chat message." },
      { status: 500 }
    );
  }
}
