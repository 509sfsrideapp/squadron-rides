import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DeveloperLogoutButton from "../components/DeveloperLogoutButton";
import HomeIconLink from "../components/HomeIconLink";
import InboxPostComposer from "../components/InboxPostComposer";
import InboxPostManager from "../components/InboxPostManager";

const DEVELOPER_COOKIE_NAME = "developer_access";

const featureCardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  backgroundColor: "rgba(9, 15, 25, 0.88)",
  boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
};

const featureLinkStyle: CSSProperties = {
  display: "inline-block",
  padding: "10px 16px",
  backgroundColor: "#0f172a",
  color: "white",
  textDecoration: "none",
  borderRadius: 10,
  border: "1px solid rgba(132, 177, 116, 0.18)",
};

export default async function DeveloperPage() {
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
      </div>

      <h1>Developer Tools</h1>
      <p style={{ maxWidth: 720 }}>
        Temporary home for in-progress features so the main screen stays clean while we keep building.
      </p>

      <div style={{ marginTop: 22 }}>
        <InboxPostComposer
          endpoint="/api/developer/inbox-posts"
          threadId="dev"
          heading="Post to Dev Inbox"
          description="Send a developer update or follow-up into the Dev inbox thread. An optional photo will appear on the left side of the post."
          submitLabel="Send Dev Post"
        />
      </div>
      <InboxPostManager
        threadId="dev"
        endpointBase="/api/developer/inbox-posts"
        heading="Review Dev Inbox Posts"
        description="Review Dev inbox posts here and edit or delete them without leaving the Developer page."
      />

      <div
        style={{
          marginTop: 22,
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Update History</h2>
          <p style={{ maxWidth: 320 }}>Read the full plain-language release log from the start of the project up to the newest shipped build.</p>
          <Link href="/developer/updates" style={featureLinkStyle}>
            Open Update History
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Global Chat</h2>
          <p style={{ maxWidth: 320 }}>Open the live chat page while we keep refining the feature.</p>
          <Link href="/chat" style={featureLinkStyle}>
            Open Chat
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Full Loader</h2>
          <p style={{ maxWidth: 320 }}>Preview the full-screen mission loading page for as long as you want.</p>
          <Link href="/loading-preview/full" style={featureLinkStyle}>
            Preview Full Loader
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Inline Loader</h2>
          <p style={{ maxWidth: 320 }}>Preview the smaller in-page mission loading state.</p>
          <Link href="/loading-preview/inline" style={featureLinkStyle}>
            Preview Inline Loader
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Bug Reports</h2>
          <p style={{ maxWidth: 320 }}>Review bug reports submitted from the live report-bug page.</p>
          <Link href="/developer/bugs" style={featureLinkStyle}>
            Open Bug Reports
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Suggestions</h2>
          <p style={{ maxWidth: 320 }}>Review submitted suggestions and feedback from the live suggestions page.</p>
          <Link href="/developer/suggestions" style={featureLinkStyle}>
            Open Suggestions
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Driving Simulator</h2>
          <p style={{ maxWidth: 320 }}>Open the polished impairment-driving simulator prototype while it stays hidden from the main app.</p>
          <Link href="/developer/driving-sim" style={featureLinkStyle}>
            Launch Simulator
          </Link>
        </div>
      </div>
    </main>
  );
}
