import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DeveloperBackLink from "../../components/DeveloperBackLink";
import { CURRENT_APP_VERSION } from "../../../lib/app-version";
import { UPDATE_HISTORY } from "../../../lib/update-history";

const DEVELOPER_COOKIE_NAME = "developer_access";

const cardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  backgroundColor: "rgba(9, 15, 25, 0.88)",
  boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
};

export default async function DeveloperUpdatesPage() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DEVELOPER_COOKIE_NAME);

  if (accessCookie?.value !== "granted") {
    redirect("/developer/unlock");
  }

  return (
    <main style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <DeveloperBackLink />

      <h1>Update History</h1>
      <p style={{ maxWidth: 760 }}>
        Plain-language release log for the whole project. Newest updates are at the top, oldest ones are at the bottom.
      </p>

      <div
        style={{
          ...cardStyle,
          marginTop: 18,
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#b4d4a7", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12 }}>
            Current Build
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "1.5rem", fontFamily: "var(--font-display)" }}>Version {CURRENT_APP_VERSION}</p>
        </div>
        <Link
          href="/developer"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            backgroundColor: "#0f172a",
            color: "white",
            textDecoration: "none",
            borderRadius: 10,
            border: "1px solid rgba(132, 177, 116, 0.18)",
          }}
        >
          Back to Developer Tools
        </Link>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {UPDATE_HISTORY.map((entry, index) => (
          <section key={entry.commit} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
              <h2 style={{ margin: 0 }}>{entry.title}</h2>
              <p style={{ margin: 0, color: "#b4d4a7", fontSize: 13 }}>
                #{UPDATE_HISTORY.length - index} • {entry.commit}
              </p>
            </div>
            <p style={{ marginBottom: 0, color: "#cbd5e1" }}>{entry.summary}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
