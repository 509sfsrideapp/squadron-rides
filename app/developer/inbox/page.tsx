import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import HomeIconLink from "../../components/HomeIconLink";
import DeveloperLogoutButton from "../../components/DeveloperLogoutButton";
import InboxPostComposer from "../../components/InboxPostComposer";

const DEVELOPER_COOKIE_NAME = "developer_access";

export default async function DeveloperInboxPage() {
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
          href="/developer"
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
          Return to Developer Tools
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Dev Inbox</h1>
          <p style={{ maxWidth: 720, marginTop: 0, color: "#94a3b8" }}>
            Send a developer update or follow-up into the Dev inbox thread. When you need to clean up old posts, open the sent-message manager from here.
          </p>
        </div>
        <Link
          href="/developer/inbox/manage"
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
          Review Sent Messages
        </Link>
      </div>

      <InboxPostComposer
        endpoint="/api/developer/inbox-posts"
        threadId="dev"
        heading="Send Dev Message"
        description="Post a developer update or follow-up into the Dev inbox thread. An optional photo will appear on the left side of the post."
        submitLabel="Send Dev Post"
      />
    </main>
  );
}
