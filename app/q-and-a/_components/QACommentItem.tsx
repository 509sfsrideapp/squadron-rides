"use client";

import { useState } from "react";
import {
  countQACommentDescendants,
  formatRelativeTimestamp,
  type QACommentNode,
} from "../../../lib/q-and-a";
import QACommentComposer from "./QACommentComposer";
import QAVoteControls from "./QAVoteControls";

type QACommentItemProps = {
  comment: QACommentNode;
  depth: number;
  currentUserId: string | null;
  currentVote?: number;
  voteByCommentId?: Record<string, number>;
  onReply: (parentCommentId: string, body: string) => Promise<void>;
  onUpdate: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onVote: (commentId: string, value: 1 | -1) => Promise<void>;
};

export default function QACommentItem({
  comment,
  depth,
  currentUserId,
  currentVote = 0,
  voteByCommentId = {},
  onReply,
  onUpdate,
  onDelete,
  onVote,
}: QACommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const descendantCount = countQACommentDescendants(comment);
  const canReply = !comment.deleted;
  const isAuthor = currentUserId === comment.authorId;
  const leftOffset = Math.min(depth, 4) * 14;

  return (
    <div style={{ marginLeft: leftOffset }}>
      <div
        style={{
          display: "grid",
          gap: 10,
          padding: "0.9rem",
          borderRadius: 14,
          border: "1px solid rgba(126, 142, 160, 0.14)",
          background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "start" }}>
          <div style={{ display: "grid", gap: 6, minWidth: 0, flex: "1 1 360px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
              <strong style={{ color: comment.deleted ? "#94a3b8" : "#dbe7f5" }}>
                {comment.deleted ? "[deleted]" : comment.authorLabel}
              </strong>
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}
              >
                {formatRelativeTimestamp(comment.createdAt)}
              </span>
              {comment.children.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCollapsed((current) => !current)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(15, 23, 42, 0.74)",
                    color: "#dbe7f5",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                    fontSize: 11,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {collapsed ? `Expand (${descendantCount})` : "Collapse"}
                </button>
              ) : null}
              {canReply ? (
                <button
                  type="button"
                  onClick={() => {
                    setReplyOpen((current) => !current);
                    setEditOpen(false);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(15, 23, 42, 0.74)",
                    color: "#dbe7f5",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                    fontSize: 11,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Reply
                </button>
              ) : null}
              {isAuthor && !comment.deleted ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen((current) => !current);
                    setReplyOpen(false);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(15, 23, 42, 0.74)",
                    color: "#dbe7f5",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                    fontSize: 11,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Edit
                </button>
              ) : null}
              {isAuthor && !comment.deleted ? (
                <button
                  type="button"
                  onClick={() => void onDelete(comment.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(127, 29, 29, 0.9)",
                    color: "#fff5f5",
                    border: "1px solid rgba(248, 113, 113, 0.18)",
                    fontSize: 11,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {!comment.deleted ? (
              <QAVoteControls
                score={comment.score || 0}
                currentVote={currentVote}
                onVote={(value) => onVote(comment.id, value)}
                compact
              />
            ) : null}
          </div>
        </div>

        {editOpen ? (
          <QACommentComposer
            initialValue={comment.body}
            placeholder="Edit your comment"
            submitLabel="Save Edit"
            compact
            onCancel={() => setEditOpen(false)}
            onSubmit={async (body) => {
              await onUpdate(comment.id, body);
              setEditOpen(false);
            }}
          />
        ) : (
          <p style={{ margin: 0, color: comment.deleted ? "#94a3b8" : "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {comment.deleted ? "[deleted]" : comment.body}
          </p>
        )}

        {collapsed && descendantCount > 0 ? (
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>
            {descendantCount} repl{descendantCount === 1 ? "y" : "ies"} hidden in this branch.
          </p>
        ) : null}

        {replyOpen ? (
          <QACommentComposer
            placeholder="Write a reply..."
            submitLabel="Post Reply"
            compact
            onCancel={() => setReplyOpen(false)}
            onSubmit={async (body) => {
              await onReply(comment.id, body);
              setReplyOpen(false);
              setCollapsed(false);
            }}
          />
        ) : null}
      </div>

      {!collapsed && comment.children.length > 0 ? (
        <div
          style={{
            marginTop: 10,
            marginLeft: 10,
            paddingLeft: 12,
            borderLeft: "1px solid rgba(126, 142, 160, 0.16)",
            display: "grid",
            gap: 10,
          }}
        >
          {comment.children.map((child) => (
            <QACommentItem
              key={child.id}
              comment={child}
              depth={depth + 1}
              currentUserId={currentUserId}
              currentVote={voteByCommentId[child.id] || 0}
              voteByCommentId={voteByCommentId}
              onReply={onReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onVote={onVote}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
