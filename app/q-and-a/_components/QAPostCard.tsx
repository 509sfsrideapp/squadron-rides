"use client";

import Link from "next/link";
import {
  formatQAPostTagLabel,
  formatRelativeTimestamp,
  getVisibleQAPostAuthorLabel,
  type QAPostRecord,
} from "../../../lib/q-and-a";
import { buildMisconductPreviewText } from "../../../lib/misconduct";
import { ReportableTarget } from "../../components/MisconductReporting";
import QAVoteControls from "./QAVoteControls";

type QAPostCardProps = {
  post: QAPostRecord;
  currentVote?: number;
  onVote?: (value: 1 | -1) => Promise<void>;
  showAdminIdentity?: boolean;
};

export default function QAPostCard({ post, currentVote = 0, onVote, showAdminIdentity = false }: QAPostCardProps) {
  const preview = post.snippet?.trim() || post.body?.trim() || "";
  const visibleAuthorLabel = getVisibleQAPostAuthorLabel(post, { showAdminIdentity });
  const adminAuthorLabel = post.authorAdminLabel?.trim() || post.authorLabel;

  return (
    <ReportableTarget
      target={{
        targetType: "qa_post",
        targetId: post.id,
        targetLabel: post.title,
        targetPreview: buildMisconductPreviewText(preview || post.title),
        targetPath: `/q-and-a/${post.id}`,
        targetOwnerUid: post.authorId,
      }}
    >
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
              {visibleAuthorLabel}
              {" // "}
              {formatRelativeTimestamp(post.createdAt)}
            </p>
            {post.anonymous && showAdminIdentity ? (
              <p
                style={{
                  margin: 0,
                  color: "#fca5a5",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}
              >
                Admin View // Posted by {adminAuthorLabel}
              </p>
            ) : null}
          </div>
          <span
            style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "end" }}
          >
            {post.archived ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: "1px solid rgba(250, 204, 21, 0.22)",
                  background: "rgba(48, 39, 12, 0.62)",
                  color: "#fde68a",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}
              >
                Archived
              </span>
            ) : null}
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

        {post.tags?.length ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(125, 211, 252, 0.18)",
                  background: "rgba(12, 18, 26, 0.72)",
                  color: "#bae6fd",
                  fontSize: 10.5,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}
              >
                {formatQAPostTagLabel(tag)}
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onVote ? <QAVoteControls score={post.score || 0} currentVote={currentVote} onVote={onVote} compact /> : null}
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
    </ReportableTarget>
  );
}
