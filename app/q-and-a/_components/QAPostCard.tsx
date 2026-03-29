import Link from "next/link";
import { formatRelativeTimestamp, type QAPostRecord } from "../../../lib/q-and-a";

type QAPostCardProps = {
  post: QAPostRecord;
};

export default function QAPostCard({ post }: QAPostCardProps) {
  const preview = post.snippet?.trim() || post.body?.trim() || "";

  return (
    <Link
      href={`/q-and-a/${post.id}`}
      style={{
        display: "grid",
        gap: 10,
        borderRadius: 18,
        border: "1px solid rgba(126, 142, 160, 0.18)",
        background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 36px rgba(0, 0, 0, 0.26)",
        padding: "1rem 1rem 1.05rem",
        textDecoration: "none",
        color: "#e5edf7",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1rem, 3.6vw, 1.15rem)", lineHeight: 1.35 }}>{post.title}</h2>
          <p
            style={{
            margin: 0,
            color: "#94a3b8",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display)",
            }}
          >
            {post.authorLabel}
            {" // "}
            {formatRelativeTimestamp(post.createdAt)}
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 11px",
            borderRadius: 999,
            border: "1px solid rgba(126, 142, 160, 0.16)",
            background: "rgba(17, 24, 39, 0.62)",
            color: "#dbe7f5",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display)",
          }}
        >
          {post.commentCount || 0} comments
        </span>
      </div>

      {preview ? (
        <p
          style={{
            margin: 0,
            color: "#cbd5e1",
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {preview}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 11px",
            borderRadius: 999,
            border: "1px solid rgba(126, 142, 160, 0.16)",
            background: "rgba(17, 24, 39, 0.62)",
            color: "#dbe7f5",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display)",
          }}
        >
          Score {post.score || 0}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 11px",
            borderRadius: 999,
            border: "1px solid rgba(126, 142, 160, 0.16)",
            background: "rgba(17, 24, 39, 0.62)",
            color: "#dbe7f5",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display)",
          }}
        >
          Open Discussion
        </span>
      </div>
    </Link>
  );
}
