import type { CSSProperties } from "react";
import Link from "next/link";

const linkStyle: CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: 6,
  textDecoration: "none",
  color: "#dbe5f2",
  minWidth: 88,
};

const iconShellStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(180deg, rgba(18, 30, 49, 0.96) 0%, rgba(8, 13, 24, 0.98) 100%)",
  border: "1px solid rgba(96, 165, 250, 0.18)",
  boxShadow: "0 10px 24px rgba(2, 6, 23, 0.24)",
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.2,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textAlign: "center",
};

export default function BottomUtilityNav() {
  return (
    <nav
      aria-label="Feedback and developer tools"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 20,
        padding: "6px 16px 0",
        flexWrap: "wrap",
      }}
    >
      <Link href="/report-bug" style={linkStyle}>
        <span style={iconShellStyle} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 7.5V5.5C9 4.67157 9.67157 4 10.5 4H13.5C14.3284 4 15 4.67157 15 5.5V7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M8 8H16C17.6569 8 19 9.34315 19 11V15C19 17.2091 17.2091 19 15 19H9C6.79086 19 5 17.2091 5 15V11C5 9.34315 6.34315 8 8 8Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path d="M3 10H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M19 10H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M3 15H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M19 15H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="13.5" r="1.4" fill="currentColor" />
          </svg>
        </span>
        <span style={labelStyle}>Report Bug</span>
      </Link>

      <Link href="/suggestions" style={linkStyle}>
        <span style={iconShellStyle} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3.5C8.96243 3.5 6.5 5.96243 6.5 9C6.5 10.9688 7.53492 12.6959 9.08914 13.6667C9.65651 14.0211 10 14.6307 10 15.2998V16.5H14V15.2998C14 14.6307 14.3435 14.0211 14.9109 13.6667C16.4651 12.6959 17.5 10.9688 17.5 9C17.5 5.96243 15.0376 3.5 12 3.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M10.5 19H13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 1.75V0.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M19.25 9H20.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M3.75 9H2.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M17.1265 3.87354L17.8336 3.16643" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6.87354 3.87354L6.16643 3.16643" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span style={labelStyle}>Suggestions</span>
      </Link>

      <Link href="/developer" style={linkStyle}>
        <span style={iconShellStyle} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M13.5 5.5L18.5 10.5L16 13L11 8L13.5 5.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M10.5 8.5L8.5 10.5L6.5 8.5L4.5 10.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.5 12.5L15.5 14.5L13.5 16.5L15.5 18.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11 13L6 18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span style={labelStyle}>Dev</span>
      </Link>
    </nav>
  );
}
