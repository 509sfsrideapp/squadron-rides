"use client";

import { useState } from "react";
import {
  buildQAPostSnippet,
  countQACommentDescendants,
  formatRelativeTimestamp,
  getVisibleQACommentAuthorLabel,
  type QACommentNode,
} from "../../../lib/q-and-a";
import { ReportableTarget } from "../../components/MisconductReporting";
import QACommentComposer from "./QACommentComposer";
import QAVoteControls from "./QAVoteControls";
import UserPreviewTrigger from "../../components/UserPreviewTrigger";

type QACommentItemProps = {
  comment: QACommentNode;
  depth: number;
  currentUserId: string | null;
  currentVote?: number;
  voteByCommentId?: Record<string, number>;
  showAdminIdentity?: boolean;
  onReply: (parentCommentId: string, body: string, anonymous?: boolean) => Promise<void>;
  onUpdate: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onVote: (commentId: string, value: 1 | -1) => Promise<void>;
  onLoadReplies?: (commentId: string, options?: { reset?: boolean }) => Promise<void>;
  loadingRepliesByCommentId?: Record<string, boolean>;
  moreRepliesByCommentId?: Record<string, boolean>;
  readOnly?: boolean;
};

export default function QACommentItem({
  comment,
  depth,
  currentUserId,
  currentVote = 0,
  voteByCommentId = {},
  showAdminIdentity = false,
  onReply,
  onUpdate,
  onDelete,
  onVote,
  onLoadReplies,
  loadingRepliesByCommentId = {},
  moreRepliesByCommentId = {},
  readOnly = false,
}: QACommentItemProps) {
  const [collapsed, setCollapsed] = useState(() => (comment.replyCount || 0) > 0 && comment.children.length === 0);
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const descendantCount = Math.max(comment.replyCount || 0, countQACommentDescendants(comment));
  const canReply = !comment.deleted && !readOnly;
  const isAuthor = currentUserId === comment.authorId;
  const visibleAuthorLabel = getVisibleQACommentAuthorLabel(comment, { showAdminIdentity });
  const adminAuthorLabel = comment.authorAdminLabel?.trim() || comment.authorLabel;
  const leftOffset = Math.min(depth, 4) * 10;
  const hasReplyBranch = comment.children.length > 0 || (comment.replyCount || 0) > 0;
  const loadingReplies = Boolean(loadingRepliesByCommentId[comment.id]);
  const hasMoreReplies = Boolean(moreRepliesByCommentId[comment.id]);
  const utilityChipStyle: React.CSSProperties = {
    minHeight: 26,
    padding: "4px 8px",
    borderRadius: 9,
    background: "rgba(15, 23, 42, 0.74)",
    color: "#dbe7f5",
    border: "1px solid rgba(126, 142, 160, 0.16)",
    fontSize: 10,
    fontFamily: "var(--font-display)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  };

  return (
    <div style={{ marginLeft: leftOffset }}>
      <ReportableTarget
        target={{
          targetType: "qa_comment",
          targetId: comment.id,
          targetLabel: comment.deleted ? "[deleted] comment" : `${comment.anonymous ? "Anon" : visibleAuthorLabel} comment`,
          targetPreview: buildQAPostSnippet(comment.body, 200),
          targetPath: `/q-and-a/${comment.postId}`,
          targetOwnerUid: comment.authorId,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: "0.7rem 0.75rem",
            borderRadius: 12,
            border: "1px solid rgba(126, 142, 160, 0.14)",
            background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0, flex: "1 1 180px" }}>
                {comment.deleted || comment.anonymous ? (
                  <strong style={{ color: comment.deleted ? "#94a3b8" : "#dbe7f5", fontSize: 13, lineHeight: 1.2 }}>
                    {comment.deleted ? "[deleted]" : visibleAuthorLabel}
                  </strong>
                ) : (
                  <UserPreviewTrigger
                    userId={comment.authorId}
                    displayLabel={visibleAuthorLabel}
                    triggerStyle={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <strong style={{ color: "#dbe7f5", fontSize: 13, lineHeight: 1.2 }}>
                      {visibleAuthorLabel}
                    </strong>
                  </UserPreviewTrigger>
                )}
                <span
                  style={{
                    color: "#94a3b8",
                    fontSize: 10,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-display)",
                    lineHeight: 1.1,
                  }}
                >
                  {formatRelativeTimestamp(comment.createdAt)}
                </span>
              </div>

              {!comment.deleted && !readOnly ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <QAVoteControls
                    score={comment.score || 0}
                    currentVote={currentVote}
                    onVote={(value) => onVote(comment.id, value)}
                    compact
                  />
                </div>
              ) : null}
            </div>

            {comment.anonymous && showAdminIdentity && !comment.deleted ? (
              <p
                style={{
                  margin: 0,
                  color: "#fca5a5",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}
              >
                Admin View // Commented by {adminAuthorLabel}
              </p>
            ) : null}

              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {hasReplyBranch ? (
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      if (comment.children.length === 0 && comment.replyCount && onLoadReplies) {
                        void onLoadReplies(comment.id, { reset: true });
                      }
                      return;
                    }

                    setCollapsed(true);
                  }}
                  style={utilityChipStyle}
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
                  style={utilityChipStyle}
                >
                  Reply
                </button>
              ) : null}
              {isAuthor && !comment.deleted && !readOnly ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen((current) => !current);
                    setReplyOpen(false);
                  }}
                  style={utilityChipStyle}
                >
                  Edit
                </button>
              ) : null}
              {isAuthor && !comment.deleted && !readOnly ? (
                <button
                  type="button"
                  onClick={() => void onDelete(comment.id)}
                  style={{
                    ...utilityChipStyle,
                    background: "rgba(127, 29, 29, 0.9)",
                    color: "#fff5f5",
                    border: "1px solid rgba(248, 113, 113, 0.18)",
                  }}
                >
                  Delete
                </button>
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
            <p style={{ margin: 0, color: comment.deleted ? "#94a3b8" : "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.45, fontSize: 14 }}>
              {comment.deleted ? "[deleted]" : comment.body}
            </p>
          )}

          {collapsed && descendantCount > 0 ? (
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 11 }}>
              {descendantCount} repl{descendantCount === 1 ? "y" : "ies"} hidden in this branch.
            </p>
          ) : null}

          {replyOpen ? (
            <QACommentComposer
              placeholder="Write a reply..."
              submitLabel="Post Reply"
              anonymousSubmitLabel="Anon Reply"
              compact
              onCancel={() => setReplyOpen(false)}
              onSubmit={async (body, anonymous) => {
                await onReply(comment.id, body, anonymous);
                setReplyOpen(false);
                setCollapsed(false);
              }}
            />
          ) : null}
        </div>
      </ReportableTarget>

      {!collapsed && hasReplyBranch ? (
        <div
          style={{
            marginTop: 8,
            marginLeft: 6,
            paddingLeft: 8,
            borderLeft: "1px solid rgba(126, 142, 160, 0.16)",
            display: "grid",
            gap: 8,
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
              showAdminIdentity={showAdminIdentity}
              onReply={onReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onVote={onVote}
              onLoadReplies={onLoadReplies}
              loadingRepliesByCommentId={loadingRepliesByCommentId}
              moreRepliesByCommentId={moreRepliesByCommentId}
              readOnly={readOnly}
            />
          ))}
          {loadingReplies && comment.children.length === 0 ? (
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 11 }}>Loading replies...</p>
          ) : null}
          {hasMoreReplies ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  if (!onLoadReplies) {
                    return;
                  }

                  void onLoadReplies(comment.id);
                }}
                disabled={loadingReplies}
                style={utilityChipStyle}
              >
                {loadingReplies ? "Loading..." : "Load More Replies"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
