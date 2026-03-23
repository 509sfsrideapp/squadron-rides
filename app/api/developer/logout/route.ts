import { NextResponse } from "next/server";

const DEVELOPER_COOKIE_NAME = "developer_access";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DEVELOPER_COOKIE_NAME);
  return response;
}
