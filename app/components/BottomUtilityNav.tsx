import type { CSSProperties } from "react";
import Link from "next/link";

const linkStyle: CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  color: "#94a3b8",
  fontSize: 12,
  letterSpacing: "0.03em",
};

export default function BottomUtilityNav() {
  return (
    <nav
      aria-label="Feedback links"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 18,
        padding: "4px 16px 0",
        flexWrap: "wrap",
      }}
    >
      <Link href="/report-bug" style={linkStyle}>Report Bug</Link>
      <Link href="/suggestions" style={linkStyle}>Suggestions</Link>
    </nav>
  );
}
