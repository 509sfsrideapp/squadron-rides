export type TimestampLike =
  | { seconds?: number; nanoseconds?: number }
  | Date
  | string
  | null
  | undefined;

export type QAPostSortMode = "newest" | "oldest" | "top";
export type QACommentSortMode = "newest" | "oldest" | "top";

export type QAAuthorProfile = {
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
  name?: string | null;
  riderPhotoUrl?: string | null;
  driverPhotoUrl?: string | null;
};

export type QAPostDocument = {
  authorId: string;
  authorLabel: string;
  authorPhotoUrl?: string | null;
  title: string;
  body?: string | null;
  snippet?: string | null;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  commentCount?: number;
  score?: number;
  deleted?: boolean;
  tags?: string[];
};

export type QAPostRecord = QAPostDocument & {
  id: string;
};

export type QACommentDocument = {
  postId: string;
  parentCommentId?: string | null;
  authorId: string;
  authorLabel: string;
  authorPhotoUrl?: string | null;
  body: string;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  score?: number;
  replyCount?: number;
  deleted?: boolean;
};

export type QACommentRecord = QACommentDocument & {
  id: string;
};

export type QACommentNode = QACommentRecord & {
  children: QACommentNode[];
};

export function buildQAAuthorLabel(profile?: QAAuthorProfile | null, fallbackEmail?: string | null) {
  const rank = profile?.rank?.trim() || "";
  const lastName = profile?.lastName?.trim() || "";
  const firstInitial = profile?.firstName?.trim()?.charAt(0).toUpperCase() || "";

  if (rank && lastName && firstInitial) {
    return `${rank} ${lastName}, ${firstInitial}`;
  }

  if (rank && lastName) {
    return `${rank} ${lastName}`;
  }

  if (profile?.name?.trim()) {
    return profile.name.trim();
  }

  if (fallbackEmail?.trim()) {
    return fallbackEmail.trim().split("@")[0];
  }

  return "Unknown User";
}

export function buildQAPostSnippet(body?: string | null, maxLength = 180) {
  const normalized = body?.replace(/\s+/g, " ").trim() || "";

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function toTimestampMillis(value: TimestampLike) {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return (value.seconds || 0) * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
}

export function formatRelativeTimestamp(value: TimestampLike) {
  const timestampMs = toTimestampMillis(value);

  if (!timestampMs) {
    return "Just now";
  }

  const diffMs = timestampMs - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSeconds < 60) {
    return relativeFormatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return relativeFormatter.format(diffDays, "day");
  }

  return new Date(timestampMs).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sortPostsForFeed(posts: QAPostRecord[], sortMode: QAPostSortMode) {
  return [...posts].sort((left, right) => {
    if (sortMode === "oldest") {
      return toTimestampMillis(left.createdAt) - toTimestampMillis(right.createdAt);
    }

    if (sortMode === "top") {
      const scoreDifference = (right.score || 0) - (left.score || 0);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const commentDifference = (right.commentCount || 0) - (left.commentCount || 0);
      if (commentDifference !== 0) {
        return commentDifference;
      }
    }

    return toTimestampMillis(right.createdAt) - toTimestampMillis(left.createdAt);
  });
}

export function sortQAPosts(posts: QAPostRecord[], sortMode: QAPostSortMode) {
  return sortPostsForFeed(
    posts.filter((post) => !post.deleted),
    sortMode
  );
}

function sortCommentBranch(comments: QACommentNode[], sortMode: QACommentSortMode, isTopLevel: boolean) {
  const nextComments = [...comments];

  nextComments.sort((left, right) => {
    if (!isTopLevel || sortMode === "oldest") {
      return toTimestampMillis(left.createdAt) - toTimestampMillis(right.createdAt);
    }

    if (sortMode === "top") {
      const scoreDifference = (right.score || 0) - (left.score || 0);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const replyDifference = (right.replyCount || 0) - (left.replyCount || 0);
      if (replyDifference !== 0) {
        return replyDifference;
      }
    }

    return toTimestampMillis(right.createdAt) - toTimestampMillis(left.createdAt);
  });

  nextComments.forEach((comment) => {
    comment.children = sortCommentBranch(comment.children, sortMode, false);
  });

  return nextComments;
}

export function buildQACommentTree(comments: QACommentRecord[], sortMode: QACommentSortMode) {
  const commentsById = new Map<string, QACommentNode>();
  const roots: QACommentNode[] = [];

  comments.forEach((comment) => {
    commentsById.set(comment.id, {
      ...comment,
      children: [],
    });
  });

  commentsById.forEach((comment) => {
    if (!comment.parentCommentId) {
      roots.push(comment);
      return;
    }

    const parent = commentsById.get(comment.parentCommentId);

    if (!parent) {
      roots.push(comment);
      return;
    }

    parent.children.push(comment);
  });

  return sortCommentBranch(roots, sortMode, true);
}

export function countQACommentDescendants(comment: QACommentNode): number {
  return comment.children.reduce((total, child) => total + 1 + countQACommentDescendants(child), 0);
}
