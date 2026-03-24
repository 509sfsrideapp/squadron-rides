"use client";

import { useRouter } from "next/navigation";

type BackIconButtonProps = {
  style?: React.CSSProperties;
};

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 42,
  height: 42,
  backgroundColor: "#1f2937",
  color: "white",
  textDecoration: "none",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 10px 24px rgba(2, 6, 23, 0.18)",
  cursor: "pointer",
};

export default function BackIconButton({ style }: BackIconButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={handleBack}
      style={{ ...baseStyle, ...style }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14.5 4.5 7 12l7.5 7.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 12h9"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
