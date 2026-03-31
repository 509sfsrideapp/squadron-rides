"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { ReportableTarget } from "../../components/MisconductReporting";
import UserPreviewTrigger from "../../components/UserPreviewTrigger";
import { auth, db } from "../../../lib/firebase";
import { isAdminEmail } from "../../../lib/admin";
import { logFirestoreQueryResult, logFirestoreQueryRun, logFirestoreScreenMount } from "../../../lib/firestore-read-debug";
import { buildMisconductPreviewText } from "../../../lib/misconduct";
import {
  buildQACommentTree,
  dedupeQARecordsById,
  formatQAPostTagLabel,
  formatRelativeTimestamp,
  getVisibleQAPostAuthorLabel,
  normalizeQAVoteValue,
  type QACommentRecord,
  type QACommentSortMode,
  type QAPostRecord,
  type QAVoteDocument,
} from "../../../lib/q-and-a";
import QACommentComposer from "../_components/QACommentComposer";
import QACommentItem from "../_components/QACommentItem";
import QAVoteControls from "../_components/QAVoteControls";

const sectionStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(126, 142, 160, 0.18)",
  background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
  padding: "1rem 1rem 1.1rem",
};

const infoPillStyle: React.CSSProperties = {
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
};

const FORUM_TOP_LEVEL_COMMENTS_PAGE_SIZE = 10;
const FORUM_REPLY_PAGE_SIZE = 10;

function isTopLevelCommentRecord(comment: Pick<QACommentRecord, "parentCommentId">) {
  return !comment.parentCommentId;
}

export default function QAPostDetailPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [postRecord, setPostRecord] = useState<QAPostRecord | null>(null);
  const [topLevelComments, setTopLevelComments] = useState<QACommentRecord[]>([]);
  const [loadedRepliesByParentId, setLoadedRepliesByParentId] = useState<Record<string, QACommentRecord[]>>({});
  const [postVote, setPostVote] = useState(0);
  const [commentVotesById, setCommentVotesById] = useState<Record<string, number>>({});
  const [commentSortMode, setCommentSortMode] = useState<QACommentSortMode>("top");
  const [hasMoreTopLevelComments, setHasMoreTopLevelComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [hasMoreRepliesByParentId, setHasMoreRepliesByParentId] = useState<Record<string, boolean>>({});
  const [loadingRepliesByParentId, setLoadingRepliesByParentId] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState(false);
  const [postDraftTitle, setPostDraftTitle] = useState("");
  const [postDraftBody, setPostDraftBody] = useState("");
  const [postActionError, setPostActionError] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const initializedCommentsRef = useRef(false);
  const allCommentsRef = useRef<QACommentRecord[]>([]);
  const topLevelCommentOffsetRef = useRef(0);
  const replyOffsetsByParentIdRef = useRef<Record<string, number>>({});

  const loadPostRecord = useCallback(async (postId: string) => {
    logFirestoreQueryRun("forums.post.detail", { postId });
    const snapshot = await getDoc(doc(db, "qaPosts", postId));

    if (!snapshot.exists()) {
      logFirestoreQueryResult("forums.post.detail", { postId, count: 0 });
      setPostRecord(null);
      return;
    }

    setPostRecord({
      id: snapshot.id,
      ...(snapshot.data() as Omit<QAPostRecord, "id">),
    });
    logFirestoreQueryResult("forums.post.detail", { postId, count: 1 });
  }, []);

  const loadPostVote = useCallback(async (currentUser: User, postId: string) => {
    logFirestoreQueryRun("forums.post.vote", { postId, userId: currentUser.uid });
    const postVotesSnapshot = await getDocs(
      query(collection(db, "qaPostVotes"), where("userId", "==", currentUser.uid))
    );
    const firstVote = postVotesSnapshot.docs
      .map((docSnap) => docSnap.data() as QAVoteDocument)
      .find((vote) => vote.postId === postId);
    setPostVote(normalizeQAVoteValue(Number(firstVote?.value || 0)));
    logFirestoreQueryResult("forums.post.vote", { postId, count: postVotesSnapshot.size });
  }, []);

  const loadCommentVotes = useCallback(async (currentUser: User, postId: string) => {
    logFirestoreQueryRun("forums.post.comment-votes", { postId, userId: currentUser.uid });
    const commentVotesSnapshot = await getDocs(
      query(collection(db, "qaCommentVotes"), where("userId", "==", currentUser.uid))
    );
    const nextCommentVotes: Record<string, number> = {};

    commentVotesSnapshot.docs.forEach((docSnap) => {
      const vote = docSnap.data() as QAVoteDocument;
      if (vote.commentId) {
        nextCommentVotes[vote.commentId] = normalizeQAVoteValue(Number(vote.value || 0));
      }
    });

    setCommentVotesById(nextCommentVotes);
    logFirestoreQueryResult("forums.post.comment-votes", { postId, count: commentVotesSnapshot.size });
  }, []);

  const fetchCommentRecord = useCallback(async (commentId: string) => {
    const commentSnapshot = await getDoc(doc(db, "qaComments", commentId));

    if (!commentSnapshot.exists()) {
      return null;
    }

    return {
      id: commentSnapshot.id,
      ...(commentSnapshot.data() as Omit<QACommentRecord, "id">),
    } satisfies QACommentRecord;
  }, []);

  const loadAllCommentsForPost = useCallback(async (postId: string) => {
    logFirestoreQueryRun("forums.post.comments.all", { postId });
    const commentsSnapshot = await getDocs(
      query(collection(db, "qaComments"), where("postId", "==", postId), limit(300))
    );

    const nextComments = commentsSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<QACommentRecord, "id">),
    }));

    allCommentsRef.current = dedupeQARecordsById(nextComments);
    logFirestoreQueryResult("forums.post.comments.all", { postId, count: allCommentsRef.current.length });
  }, []);

  const getSortedTopLevelComments = useCallback(() => {
    const topLevelComments = allCommentsRef.current.filter(isTopLevelCommentRecord);
    return buildQACommentTree(topLevelComments, commentSortMode).map(({ children, ...comment }) => ({
      ...comment,
      children,
    }));
  }, [commentSortMode]);

  const loadTopLevelComments = useCallback(async (postId: string, options?: { reset?: boolean }) => {
    const reset = Boolean(options?.reset);

    setLoadingMoreComments(true);
    try {
      if (reset || allCommentsRef.current.length === 0) {
        await loadAllCommentsForPost(postId);
        replyOffsetsByParentIdRef.current = {};
        setLoadedRepliesByParentId({});
        setHasMoreRepliesByParentId({});
      }

      const sortedTopLevelComments = getSortedTopLevelComments();
      const nextOffset = reset ? 0 : topLevelCommentOffsetRef.current;
      const nextComments = sortedTopLevelComments.slice(
        nextOffset,
        nextOffset + FORUM_TOP_LEVEL_COMMENTS_PAGE_SIZE
      );

      topLevelCommentOffsetRef.current = nextOffset + nextComments.length;

      setTopLevelComments((current) => (reset ? nextComments : dedupeQARecordsById([...current, ...nextComments])));
      setHasMoreTopLevelComments(
        topLevelCommentOffsetRef.current < sortedTopLevelComments.length
      );
      logFirestoreQueryResult("forums.post.comments.top-level", { postId, count: nextComments.length });
    } finally {
      setLoadingMoreComments(false);
    }
  }, [getSortedTopLevelComments, loadAllCommentsForPost]);

  const loadReplies = useCallback(async (parentCommentId: string, options?: { reset?: boolean }) => {
    const reset = Boolean(options?.reset);

    setLoadingRepliesByParentId((current) => ({
      ...current,
      [parentCommentId]: true,
    }));

    try {
      const sortedReplies = [...allCommentsRef.current]
        .filter((comment) => comment.parentCommentId === parentCommentId)
        .sort((left, right) => {
          const leftTime = left.createdAt instanceof Date ? left.createdAt.getTime() : typeof left.createdAt === "string" ? Date.parse(left.createdAt) : ((left.createdAt as { seconds?: number } | undefined)?.seconds || 0) * 1000;
          const rightTime = right.createdAt instanceof Date ? right.createdAt.getTime() : typeof right.createdAt === "string" ? Date.parse(right.createdAt) : ((right.createdAt as { seconds?: number } | undefined)?.seconds || 0) * 1000;
          return leftTime - rightTime;
        });

      const nextOffset = reset ? 0 : replyOffsetsByParentIdRef.current[parentCommentId] || 0;
      const nextReplies = sortedReplies.slice(nextOffset, nextOffset + FORUM_REPLY_PAGE_SIZE);

      replyOffsetsByParentIdRef.current = {
        ...replyOffsetsByParentIdRef.current,
        [parentCommentId]: nextOffset + nextReplies.length,
      };

      setLoadedRepliesByParentId((current) => ({
        ...current,
        [parentCommentId]: reset ? nextReplies : dedupeQARecordsById([...(current[parentCommentId] || []), ...nextReplies]),
      }));
      setHasMoreRepliesByParentId((current) => ({
        ...current,
        [parentCommentId]: (replyOffsetsByParentIdRef.current[parentCommentId] || 0) < sortedReplies.length,
      }));
      logFirestoreQueryResult("forums.post.comments.replies", { parentCommentId, count: nextReplies.length });
    } finally {
      setLoadingRepliesByParentId((current) => ({
        ...current,
        [parentCommentId]: false,
      }));
    }
  }, []);

  const updateCommentRecord = useCallback((commentId: string, updater: (comment: QACommentRecord) => QACommentRecord) => {
    allCommentsRef.current = allCommentsRef.current.map((comment) =>
      comment.id === commentId ? updater(comment) : comment
    );

    let handled = false;

    setTopLevelComments((current) =>
      current.map((comment) => {
        if (comment.id !== commentId) {
          return comment;
        }

        handled = true;
        return updater(comment);
      })
    );

    if (handled) {
      return;
    }

    setLoadedRepliesByParentId((current) => {
      const nextEntries = Object.entries(current).map(([parentId, replies]) => [
        parentId,
        replies.map((comment) => (comment.id === commentId ? updater(comment) : comment)),
      ] as const);

      return Object.fromEntries(nextEntries);
    });
  }, []);

  useEffect(() => {
    logFirestoreScreenMount("forums.post");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !params.postId) {
      initializedCommentsRef.current = false;
      setPostRecord(null);
      setTopLevelComments([]);
      setLoadedRepliesByParentId({});
      setPostVote(0);
      setCommentVotesById({});
      allCommentsRef.current = [];
      topLevelCommentOffsetRef.current = 0;
      setHasMoreTopLevelComments(false);
      replyOffsetsByParentIdRef.current = {};
      setHasMoreRepliesByParentId({});
      setLoadingRepliesByParentId({});
      return;
    }

    initializedCommentsRef.current = false;
    setLoading(true);
    setTopLevelComments([]);
    setLoadedRepliesByParentId({});
    allCommentsRef.current = [];
    topLevelCommentOffsetRef.current = 0;
    setHasMoreTopLevelComments(false);
    replyOffsetsByParentIdRef.current = {};
    setHasMoreRepliesByParentId({});
    setLoadingRepliesByParentId({});

    void Promise.all([
      loadPostRecord(params.postId),
      loadPostVote(user, params.postId),
      loadCommentVotes(user, params.postId),
      loadTopLevelComments(params.postId, { reset: true }),
    ]).finally(() => {
      initializedCommentsRef.current = true;
      setLoading(false);
    });
  }, [loadCommentVotes, loadPostRecord, loadPostVote, loadTopLevelComments, params.postId, user]);

  useEffect(() => {
    if (!user || !params.postId || !initializedCommentsRef.current) {
      return;
    }

    setLoadedRepliesByParentId({});
    topLevelCommentOffsetRef.current = 0;
    setHasMoreTopLevelComments(false);
    replyOffsetsByParentIdRef.current = {};
    setHasMoreRepliesByParentId({});
    setLoadingRepliesByParentId({});

    void loadTopLevelComments(params.postId, { reset: true }).catch((error) => {
      console.error(error);
    });
  }, [commentSortMode, loadTopLevelComments, params.postId, user]);

  const loadedComments = useMemo(
    () => dedupeQARecordsById([
      ...topLevelComments,
      ...Object.values(loadedRepliesByParentId).flat(),
    ]),
    [loadedRepliesByParentId, topLevelComments]
  );
  const commentTree = useMemo(() => buildQACommentTree(loadedComments, commentSortMode), [commentSortMode, loadedComments]);
  const showAdminIdentity = isAdminEmail(user?.email);
  const postIsReadOnly = Boolean(postRecord?.archived);
  const postHiddenForReview = Boolean(postRecord?.pendingDeletionReview && !showAdminIdentity);
  const canEditPost = Boolean(
    user &&
      postRecord &&
      !postRecord.deleted &&
      !postRecord.archived &&
      !postRecord.pendingDeletionReview &&
      postRecord.authorId === user.uid
  );
  const canDeletePost = Boolean(
    user &&
      postRecord &&
      !postRecord.deleted &&
      !postRecord.archived &&
      (postRecord.authorId === user.uid || showAdminIdentity)
  );
  const canArchivePost = Boolean(
    user &&
      postRecord &&
      showAdminIdentity &&
      !postRecord.deleted &&
      !postRecord.archived
  );
  const visibleAuthorLabel = postRecord ? getVisibleQAPostAuthorLabel(postRecord, { showAdminIdentity }) : "";
  const adminAuthorLabel = postRecord ? (postRecord.authorAdminLabel?.trim() || postRecord.authorLabel) : "";

  useEffect(() => {
    if (!postRecord || editingPost) {
      return;
    }

    setPostDraftTitle(postRecord.title || "");
    setPostDraftBody(postRecord.body || "");
  }, [editingPost, postRecord]);

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Discussion" caption="Opening the full post and comment thread." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Forum Post</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  if (!postRecord) {
    return (
      <main style={{ padding: 20 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <Link
              href="/q-and-a"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                padding: "10px 16px",
                borderRadius: 12,
                textDecoration: "none",
                background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
                color: "#ffffff",
                border: "1px solid rgba(126, 142, 160, 0.24)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: 12,
              }}
            >
              Return to Feed
            </Link>
          </div>

          <section style={sectionStyle}>
            <h1 style={{ marginTop: 0 }}>Post Unavailable</h1>
            <p style={{ marginBottom: 0, color: "#cbd5e1" }}>
              This discussion post could not be found.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (postHiddenForReview) {
    return (
      <main style={{ padding: 20 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <Link
              href="/q-and-a"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                padding: "10px 16px",
                borderRadius: 12,
                textDecoration: "none",
                background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
                color: "#ffffff",
                border: "1px solid rgba(126, 142, 160, 0.24)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: 12,
              }}
            >
              Return to Feed
            </Link>
          </div>

          <section style={sectionStyle}>
            <h1 style={{ marginTop: 0 }}>Thread In Review</h1>
            <p style={{ marginBottom: 0, color: "#cbd5e1" }}>
              This forum thread was removed by its owner and is currently in the admin review bin.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <HomeIconLink style={{ marginBottom: 0 }} />
          <Link
            href="/q-and-a"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 42,
              padding: "10px 16px",
              borderRadius: 12,
              textDecoration: "none",
              background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
              color: "#ffffff",
              border: "1px solid rgba(126, 142, 160, 0.24)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            Return to Feed
          </Link>
        </div>

        <ReportableTarget
          target={{
            targetType: "qa_post",
            targetId: postRecord.id,
            targetLabel: postRecord.title,
            targetPreview: buildMisconductPreviewText(postRecord.body || postRecord.snippet || postRecord.title),
            targetPath: `/q-and-a/${postRecord.id}`,
            targetOwnerUid: postRecord.authorId,
          }}
        >
        <section style={{ ...sectionStyle, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={infoPillStyle}>{postRecord.commentCount || 0} comments</span>
              {postRecord.archived ? (
                <span style={{ ...infoPillStyle, color: "#fde68a", border: "1px solid rgba(250, 204, 21, 0.22)", background: "rgba(48, 39, 12, 0.62)" }}>
                  Archived
                </span>
              ) : null}
              {postRecord.pendingDeletionReview ? (
                <span style={{ ...infoPillStyle, color: "#fdba74", border: "1px solid rgba(251, 146, 60, 0.22)", background: "rgba(67, 32, 12, 0.62)" }}>
                  In Bin Review
                </span>
              ) : null}
              {!postIsReadOnly && !postRecord.pendingDeletionReview ? (
                <QAVoteControls
                  score={postRecord.score || 0}
                  currentVote={postVote}
                  onVote={async (value) => {
                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before voting.");
                    }

                    const nextValue = postVote === value ? 0 : value;
                    const response = await fetch(`/api/q-and-a/posts/${postRecord.id}/vote`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                      },
                      body: JSON.stringify({ value: nextValue }),
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not update the vote.");
                    }

                    const currentVoteValue = postVote;
                    setPostVote(nextValue);
                    setPostRecord((current) =>
                      current
                        ? {
                            ...current,
                            score: (current.score || 0) - currentVoteValue + nextValue,
                          }
                        : current
                    );
                  }}
                  compact
                />
              ) : null}
            </div>
            {canEditPost || canDeletePost || canArchivePost ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canEditPost ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPostDraftTitle(postRecord.title || "");
                      setPostDraftBody(postRecord.body || "");
                      setPostActionError("");
                      setEditingPost((current) => !current);
                    }}
                    style={{
                      minHeight: 38,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(126, 142, 160, 0.22)",
                      background: "linear-gradient(180deg, rgba(39, 50, 68, 0.96) 0%, rgba(19, 28, 40, 0.98) 100%)",
                      color: "#e5edf7",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontSize: 11,
                    }}
                  >
                    {editingPost ? "Cancel Edit" : "Edit Post"}
                  </button>
                ) : null}
                {canArchivePost ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const idToken = await auth.currentUser?.getIdToken();

                      if (!idToken) {
                        setPostActionError("You need to sign in again before archiving.");
                        return;
                      }

                      const reason = window.prompt("Optional admin note for archiving this forum thread.", "") || "";

                      try {
                        setPostActionError("");
                        const response = await fetch(`/api/q-and-a/posts/${postRecord.id}/archive`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${idToken}`,
                          },
                          body: JSON.stringify({ reason }),
                        });

                        const payload = (await response.json().catch(() => ({}))) as { error?: string };

                        if (!response.ok) {
                          throw new Error(payload.error || "Could not archive the post.");
                        }

                        setPostRecord((current) =>
                          current
                            ? {
                                ...current,
                                archived: true,
                                archivedAt: new Date().toISOString(),
                                archiveReason: reason || null,
                                pendingDeletionReview: false,
                              }
                            : current
                        );
                      } catch (error) {
                        setPostActionError(error instanceof Error ? error.message : "Could not archive the post.");
                      }
                    }}
                    style={{
                      minHeight: 38,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(250, 204, 21, 0.22)",
                      background: "linear-gradient(180deg, rgba(97, 67, 18, 0.92) 0%, rgba(64, 42, 8, 0.98) 100%)",
                      color: "#fef3c7",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontSize: 11,
                    }}
                  >
                    Archive Thread
                  </button>
                ) : null}
                {canDeletePost ? (
                  <button
                    type="button"
                    disabled={deletingPost}
                    onClick={async () => {
                      const adminDeleting = showAdminIdentity && postRecord.authorId !== user.uid;
                      const adminMessage = adminDeleting
                        ? window.prompt("Optional admin reason for deleting this forum post. Leave blank to delete without a reason.")
                        : "";
                      const adminDeleteMessage = adminDeleting ? (adminMessage || "").trim() : "";

                      if (adminDeleting && adminMessage === null) {
                        return;
                      }

                      if (!adminDeleting) {
                        const confirmed = window.confirm("Delete this post? It will be removed from the feed and sent to the admin review bin.");

                        if (!confirmed) {
                          return;
                        }
                      }

                      const idToken = await auth.currentUser?.getIdToken();

                      if (!idToken) {
                        setPostActionError("You need to sign in again before deleting.");
                        return;
                      }

                      setDeletingPost(true);
                      setPostActionError("");

                      try {
                        const response = await fetch(`/api/q-and-a/posts/${postRecord.id}`, {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${idToken}`,
                          },
                          body: JSON.stringify({
                            message: adminDeleteMessage,
                          }),
                        });

                        const payload = (await response.json().catch(() => ({}))) as { error?: string };

                        if (!response.ok) {
                          throw new Error(payload.error || "Could not delete the post.");
                        }

                        router.replace("/q-and-a");
                      } catch (error) {
                        setPostActionError(error instanceof Error ? error.message : "Could not delete the post.");
                      } finally {
                        setDeletingPost(false);
                      }
                    }}
                    style={{
                      minHeight: 38,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(248, 113, 113, 0.28)",
                      background: "linear-gradient(180deg, rgba(127, 29, 29, 0.92) 0%, rgba(69, 10, 10, 0.98) 100%)",
                      color: "#fee2e2",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontSize: 11,
                      opacity: deletingPost ? 0.7 : 1,
                    }}
                  >
                    {deletingPost ? "Deleting..." : canEditPost ? "Delete Post" : "Admin Delete"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {editingPost && canEditPost ? (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                  Title
                </span>
                <input
                  value={postDraftTitle}
                  onChange={(event) => setPostDraftTitle(event.target.value)}
                  placeholder="Post title"
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                  Body
                </span>
                <textarea
                  value={postDraftBody}
                  onChange={(event) => setPostDraftBody(event.target.value)}
                  rows={8}
                  placeholder="Add more detail to your post."
                  style={{ resize: "vertical" }}
                />
              </label>
              {postActionError ? <p style={{ margin: 0, color: "#fca5a5" }}>{postActionError}</p> : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={savingPost}
                  onClick={async () => {
                    const title = postDraftTitle.trim();
                    const body = postDraftBody.trim();

                    if (!title) {
                      setPostActionError("Post title is required.");
                      return;
                    }

                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      setPostActionError("You need to sign in again before editing.");
                      return;
                    }

                    setSavingPost(true);
                    setPostActionError("");

                    try {
                      const response = await fetch(`/api/q-and-a/posts/${postRecord.id}`, {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${idToken}`,
                        },
                        body: JSON.stringify({
                          title,
                          body,
                        }),
                      });

                      const payload = (await response.json().catch(() => ({}))) as { error?: string };

                      if (!response.ok) {
                        throw new Error(payload.error || "Could not update the post.");
                      }

                      setEditingPost(false);
                      setPostRecord((current) =>
                        current
                          ? {
                              ...current,
                              title,
                              body,
                              updatedAt: new Date().toISOString(),
                            }
                          : current
                      );
                    } catch (error) {
                      setPostActionError(error instanceof Error ? error.message : "Could not update the post.");
                    } finally {
                      setSavingPost(false);
                    }
                  }}
                  style={{
                    minHeight: 40,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(126, 142, 160, 0.24)",
                    background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
                    color: "#ffffff",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: 11,
                    opacity: savingPost ? 0.7 : 1,
                  }}
                >
                  {savingPost ? "Saving..." : "Save Post"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPost(false);
                    setPostActionError("");
                    setPostDraftTitle(postRecord.title || "");
                    setPostDraftBody(postRecord.body || "");
                  }}
                  style={{
                    minHeight: 40,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(126, 142, 160, 0.22)",
                    background: "linear-gradient(180deg, rgba(39, 50, 68, 0.96) 0%, rgba(19, 28, 40, 0.98) 100%)",
                    color: "#e5edf7",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: 11,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                <h1 style={{ margin: 0 }}>{postRecord.deleted ? "[deleted]" : postRecord.title}</h1>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                    color: "#94a3b8",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {postRecord.anonymous ? (
                    <span>{visibleAuthorLabel}</span>
                  ) : (
                    <UserPreviewTrigger
                      userId={postRecord.authorId}
                      displayLabel={visibleAuthorLabel}
                      triggerStyle={{ color: "#dbe7f5" }}
                    >
                      <span style={{ color: "#dbe7f5" }}>{visibleAuthorLabel}</span>
                    </UserPreviewTrigger>
                  )}
                  <span>{"//"}</span>
                  <span>{formatRelativeTimestamp(postRecord.createdAt)}</span>
                </div>
                {postRecord.anonymous && showAdminIdentity ? (
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

              {postRecord.tags?.length ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {postRecord.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        ...infoPillStyle,
                        color: "#bae6fd",
                        border: "1px solid rgba(125, 211, 252, 0.18)",
                      }}
                    >
                      {formatQAPostTagLabel(tag)}
                    </span>
                  ))}
                </div>
              ) : null}

              {postRecord.archived ? (
                <p style={{ margin: 0, color: "#fde68a" }}>
                  This thread is archived for reference only. Voting and replies are disabled.
                </p>
              ) : null}

              {postRecord.pendingDeletionReview && showAdminIdentity ? (
                <p style={{ margin: 0, color: "#fdba74" }}>
                  This thread is currently in the admin review bin after a user delete request.
                </p>
              ) : null}

              <p style={{ margin: 0, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {postRecord.deleted ? "[deleted]" : postRecord.body?.trim() || "No body text was added to this post."}
              </p>
              {postActionError ? <p style={{ margin: 0, color: "#fca5a5" }}>{postActionError}</p> : null}
            </>
          )}
        </section>
        </ReportableTarget>

        <section style={{ ...sectionStyle, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <strong
              style={{
                fontSize: 15,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              Comments
            </strong>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                Sort
              </span>
              <select value={commentSortMode} onChange={(event) => setCommentSortMode(event.target.value as QACommentSortMode)}>
                <option value="top">Top</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {!postRecord.deleted && !postIsReadOnly && !postRecord.pendingDeletionReview ? (
            <QACommentComposer
              placeholder="Add a top-level comment..."
              submitLabel="Post Comment"
              anonymousSubmitLabel="Anon Comment"
              onSubmit={async (body, anonymous) => {
                const idToken = await auth.currentUser?.getIdToken();

                if (!idToken) {
                  throw new Error("You need to sign in again before commenting.");
                }

                const response = await fetch("/api/q-and-a/comments", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                  },
                  body: JSON.stringify({
                    postId: postRecord.id,
                    parentCommentId: null,
                    body,
                    anonymous: Boolean(anonymous),
                  }),
                });

                const payload = (await response.json().catch(() => ({}))) as { error?: string; commentId?: string };

                if (!response.ok) {
                  throw new Error(payload.error || "Could not create the comment.");
                }

                const nextComment = payload.commentId ? await fetchCommentRecord(payload.commentId) : null;
                setPostRecord((current) =>
                  current
                    ? {
                        ...current,
                        commentCount: (current.commentCount || 0) + 1,
                      }
                    : current
                );
                if (nextComment) {
                  allCommentsRef.current = dedupeQARecordsById([...allCommentsRef.current, nextComment]);
                  setTopLevelComments((current) => dedupeQARecordsById([...current, nextComment]));
                }
              }}
            />
          ) : null}

          {commentTree.length === 0 ? (
            <p style={{ margin: 0, color: "#cbd5e1" }}>
              {postIsReadOnly || postRecord.pendingDeletionReview
                ? "No comments are available on this preserved thread."
                : "No comments yet. Start the thread below this post."}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {commentTree.map((comment) => (
                <QACommentItem
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  currentUserId={user.uid}
                  currentVote={commentVotesById[comment.id] || 0}
                  voteByCommentId={commentVotesById}
                  showAdminIdentity={showAdminIdentity}
                  onReply={async (parentCommentId, body, anonymous) => {
                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before replying.");
                    }

                    const response = await fetch("/api/q-and-a/comments", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                      },
                      body: JSON.stringify({
                        postId: postRecord.id,
                        parentCommentId,
                        body,
                        anonymous: Boolean(anonymous),
                      }),
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string; commentId?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not create the reply.");
                    }

                    const nextReply = payload.commentId ? await fetchCommentRecord(payload.commentId) : null;
                    setPostRecord((current) =>
                      current
                        ? {
                            ...current,
                            commentCount: (current.commentCount || 0) + 1,
                          }
                        : current
                    );
                    updateCommentRecord(parentCommentId, (current) => ({
                      ...current,
                      replyCount: (current.replyCount || 0) + 1,
                    }));
                    if (nextReply) {
                      allCommentsRef.current = dedupeQARecordsById([...allCommentsRef.current, nextReply]);
                      setLoadedRepliesByParentId((current) => ({
                        ...current,
                        [parentCommentId]: dedupeQARecordsById([...(current[parentCommentId] || []), nextReply]),
                      }));
                    }
                  }}
                  onUpdate={async (commentId, body) => {
                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before editing.");
                    }

                    const response = await fetch(`/api/q-and-a/comments/${commentId}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                      },
                      body: JSON.stringify({ body }),
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not update the comment.");
                    }

                    updateCommentRecord(commentId, (current) => ({
                      ...current,
                      body,
                      updatedAt: new Date().toISOString(),
                    }));
                  }}
                  onDelete={async (commentId) => {
                    const confirmed = window.confirm("Delete this comment?");
                    if (!confirmed) {
                      return;
                    }

                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before deleting.");
                    }

                    const response = await fetch(`/api/q-and-a/comments/${commentId}`, {
                      method: "DELETE",
                      headers: {
                        Authorization: `Bearer ${idToken}`,
                      },
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not delete the comment.");
                    }

                    updateCommentRecord(commentId, (current) => ({
                      ...current,
                      body: "",
                      deleted: true,
                      updatedAt: new Date().toISOString(),
                    }));
                  }}
                  onVote={async (commentId, value) => {
                    const idToken = await auth.currentUser?.getIdToken();

                    if (!idToken) {
                      throw new Error("You need to sign in again before voting.");
                    }

                    const currentVote = commentVotesById[commentId] || 0;
                    const nextValue = currentVote === value ? 0 : value;
                    const response = await fetch(`/api/q-and-a/comments/${commentId}/vote`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                      },
                      body: JSON.stringify({ value: nextValue }),
                    });

                    const payload = (await response.json().catch(() => ({}))) as { error?: string };

                    if (!response.ok) {
                      throw new Error(payload.error || "Could not update the vote.");
                    }

                    setCommentVotesById((current) => ({
                      ...current,
                      [commentId]: nextValue,
                    }));
                    updateCommentRecord(commentId, (currentComment) => ({
                      ...currentComment,
                      score: (currentComment.score || 0) - currentVote + nextValue,
                    }));
                  }}
                  onLoadReplies={loadReplies}
                  loadingRepliesByCommentId={loadingRepliesByParentId}
                  moreRepliesByCommentId={hasMoreRepliesByParentId}
                  readOnly={postIsReadOnly || Boolean(postRecord.pendingDeletionReview)}
                />
              ))}
              {hasMoreTopLevelComments ? (
                <div>
                  <button
                    type="button"
                    onClick={() => void loadTopLevelComments(postRecord.id)}
                    disabled={loadingMoreComments}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 40,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(126, 142, 160, 0.24)",
                      background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
                      color: "#ffffff",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontSize: 11,
                    }}
                  >
                    {loadingMoreComments ? "Loading..." : "Load More Comments"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
