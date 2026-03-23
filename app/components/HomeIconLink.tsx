import Link from "next/link";

type HomeIconLinkProps = {
  href?: string;
  style?: React.CSSProperties;
};

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 42,
  height: 42,
  marginBottom: 20,
  backgroundColor: "#1f2937",
  color: "white",
  textDecoration: "none",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 10px 24px rgba(2, 6, 23, 0.18)",
};

export default function HomeIconLink({ href = "/", style }: HomeIconLinkProps) {
  return (
    <Link href={href} aria-label="Home" style={{ ...baseStyle, ...style }}>
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
