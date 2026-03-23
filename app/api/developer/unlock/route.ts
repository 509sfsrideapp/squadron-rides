import { NextResponse } from "next/server";

const DEVELOPER_COOKIE_NAME = "developer_access";
const DEFAULT_DEVELOPER_CODE = "509SFSDEV";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const submittedCode = body?.code?.trim() || "";
  const expectedCode = process.env.DEVELOPER_ACCESS_CODE?.trim() || DEFAULT_DEVELOPER_CODE;

  if (!submittedCode || submittedCode !== expectedCode) {
    return NextResponse.json(
      { ok: false, message: "Incorrect developer code." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEVELOPER_COOKIE_NAME, "granted", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
