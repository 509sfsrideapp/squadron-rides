import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SubmissionInboxClient from "../SubmissionInboxClient";

const DEVELOPER_COOKIE_NAME = "developer_access";

export default async function DeveloperSuggestionsPage() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DEVELOPER_COOKIE_NAME);

  if (accessCookie?.value !== "granted") {
    redirect("/developer/unlock");
  }

  return (
    <SubmissionInboxClient
      type="suggestions"
      title="Suggestions"
      description="Review submitted suggestions and feedback here, including the reporter name and phone number."
    />
  );
}
