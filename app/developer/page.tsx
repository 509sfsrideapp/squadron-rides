import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DeveloperLogoutButton from "../components/DeveloperLogoutButton";
import HomeIconLink from "../components/HomeIconLink";

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
  border: "1px solid rgba(96, 165, 250, 0.18)",
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

      <div
        style={{
          marginTop: 22,
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Dev Inbox</h2>
          <p style={{ maxWidth: 320 }}>Open the developer inbox tools to send updates, then review and manage sent posts from there.</p>
          <Link href="/developer/inbox" style={featureLinkStyle}>
            Open Dev Inbox
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Initial Loader Test</h2>
          <p style={{ maxWidth: 320 }}>Replay the app’s full loading screen, then jump straight back here when it finishes.</p>
          <Link href="/developer/loading-test" style={featureLinkStyle}>
            Run Loader Test
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Update History</h2>
          <p style={{ maxWidth: 320 }}>Read the full plain-language release log from the start of the project up to the newest shipped build.</p>
          <Link href="/developer/updates" style={featureLinkStyle}>
            Open Update History
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Messages</h2>
          <p style={{ maxWidth: 320 }}>Open the direct-message feature from here too while we keep building on top of it.</p>
          <Link href="/messages/direct" prefetch={false} style={featureLinkStyle}>
            Open Messages
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>Marketplace</h2>
          <p style={{ maxWidth: 320 }}>Open the Marketplace feature from here for quick testing and iteration.</p>
          <Link href="/marketplace" prefetch={false} style={featureLinkStyle}>
            Open Marketplace
          </Link>
        </div>

        <div style={featureCardStyle}>
          <h2 style={{ marginTop: 0 }}>ISO</h2>
          <p style={{ maxWidth: 320 }}>Open the ISO board from here for quick testing and iteration.</p>
          <Link href="/iso" prefetch={false} style={featureLinkStyle}>
            Open ISO
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

      </div>
    </main>
  );
}
