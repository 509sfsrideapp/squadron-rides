import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const DEVELOPER_COOKIE_NAME = "developer_access";
export const DEVELOPER_ACCESS_DISABLED_MESSAGE =
  "This feature is temporarily limited to developer access while we stabilize it.";

export function requestHasDeveloperAccess(
  request: Pick<NextRequest, "cookies"> | Pick<Request, "headers">
) {
  if ("cookies" in request) {
    return request.cookies.get(DEVELOPER_COOKIE_NAME)?.value === "granted";
  }

  return false;
}

export async function requireDeveloperAccess() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DEVELOPER_COOKIE_NAME);

  if (accessCookie?.value !== "granted") {
    redirect("/developer/unlock");
  }
}
