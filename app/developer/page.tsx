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
      </div>
    </main>
  );
}
