import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ChatClient from "./ChatClient";

const DEVELOPER_COOKIE_NAME = "developer_access";

export default async function ChatPage() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DEVELOPER_COOKIE_NAME);

  if (accessCookie?.value !== "granted") {
    redirect("/developer/unlock");
  }

  return <ChatClient />;
}
