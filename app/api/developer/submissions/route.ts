import { NextRequest, NextResponse } from "next/server";
import { listFirestoreDocuments } from "../../../../lib/server/firestore-admin";

const DEVELOPER_COOKIE_NAME = "developer_access";

function getAllowedCollection(type: string | null) {
  if (type === "bugReports") {
    return "bugReports";
  }

  if (type === "suggestions") {
    return "suggestions";
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const accessCookie = request.cookies.get(DEVELOPER_COOKIE_NAME);

    if (accessCookie?.value !== "granted") {
      return NextResponse.json({ error: "Developer access required." }, { status: 403 });
    }

    const collectionName = getAllowedCollection(request.nextUrl.searchParams.get("type"));

    if (!collectionName) {
      return NextResponse.json({ error: "Unsupported submission type." }, { status: 400 });
    }

    const documents = await listFirestoreDocuments(collectionName);
    const sorted = documents.sort((a, b) => {
      const aTime = typeof a.createdAt === "string" ? Date.parse(a.createdAt) : 0;
      const bTime = typeof b.createdAt === "string" ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ items: sorted });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load submissions." },
      { status: 500 }
    );
  }
}
