import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import HomeIconLink from "../../../components/HomeIconLink";
import DeveloperLogoutButton from "../../../components/DeveloperLogoutButton";
import InboxPostManager from "../../../components/InboxPostManager";

const DEVELOPER_COOKIE_NAME = "developer_access";

export default async function DeveloperInboxManagePage() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DEVELOPER_COOKIE_NAME);

  if (accessCookie?.value !== "granted") {
    redirect("/developer/unlock");
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <HomeIconLink style={{ marginBottom: 0 }} />
        <DeveloperLogoutButton />
        <Link
          href="/developer/inbox"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            backgroundColor: "#0f172a",
            color: "white",
            textDecoration: "none",
            borderRadius: 10,
            border: "1px solid rgba(96, 165, 250, 0.18)",
          }}
        >
          Return to Dev Inbox
        </Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>Review Sent Messages</h1>
      <p style={{ maxWidth: 720, marginTop: 0, color: "#94a3b8" }}>
        Review developer inbox posts here and edit or delete them without going back to the main Developer page.
      </p>

      <InboxPostManager
        threadId="dev"
        endpointBase="/api/developer/inbox-posts"
        heading="Sent Dev Inbox Posts"
        description="Edit or delete any post that has already been sent into the Dev inbox thread."
      />
    </main>
  );
}
