import Link from "next/link";

type DeveloperBackLinkProps = {
  label?: string;
  style?: React.CSSProperties;
};

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(132, 177, 116, 0.18)",
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  color: "white",
  textDecoration: "none",
  boxShadow: "0 10px 28px rgba(2, 6, 23, 0.28)",
};

export default function DeveloperBackLink({
  label = "Back to Dev",
  style,
}: DeveloperBackLinkProps) {
  return (
    <Link href="/developer" style={{ ...baseStyle, ...style }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M15 18L9 12L15 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
