"use client";

import Link from "next/link";

type HomeIconLinkProps = {
  href?: string;
  style?: React.CSSProperties;
};

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 48,
  height: 48,
  background: "linear-gradient(180deg, rgba(33, 39, 47, 0.98) 0%, rgba(13, 18, 24, 0.99) 100%)",
  color: "#f8fafc",
  textDecoration: "none",
  borderRadius: 999,
  border: "1px solid rgba(126, 142, 160, 0.26)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 26px rgba(0, 0, 0, 0.28)",
};

export default function HomeIconLink({ href = "/", style }: HomeIconLinkProps) {
  return (
    <Link href={href} aria-label="Home" style={{ ...baseStyle, marginBottom: 20, ...style }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 10.5L12 4L20 10.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 9.5V19H17.5V9.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 19V13.5H14V19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
