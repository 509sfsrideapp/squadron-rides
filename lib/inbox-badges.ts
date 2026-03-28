import { isMessageThreadId, type MessageThreadId } from "./messages";
import { toTimestampMs } from "./ride-dispatch";

export const INBOX_READ_STORAGE_KEY = "defender-one-inbox-read-state";
export const INBOX_READ_EVENT = "defender-one-inbox-read-changed";

export type InboxReadState = Partial<Record<MessageThreadId, number>>;

export type InboxTimestampLike =
  | Date
  | string
  | number
  | {
      seconds?: number;
      nanoseconds?: number;
    }
  | null
  | undefined;

export type InboxUnreadPost = {
  threadId: MessageThreadId;
  createdAt?: InboxTimestampLike;
  requiresResponse?: boolean;
  responseSubmittedAt?: InboxTimestampLike;
};

export function loadInboxReadState(): InboxReadState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(INBOX_READ_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([threadId, value]) => isMessageThreadId(threadId) && typeof value === "number")
    ) as InboxReadState;
  } catch (error) {
    console.error("Could not load inbox read state", error);
    return {};
  }
}

function emitInboxReadStateChange(nextState: InboxReadState) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(INBOX_READ_EVENT, {
      detail: nextState,
    })
  );
}

export function saveInboxReadState(nextState: InboxReadState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(INBOX_READ_STORAGE_KEY, JSON.stringify(nextState));
    emitInboxReadStateChange(nextState);
  } catch (error) {
    console.error("Could not save inbox read state", error);
  }
}

export function markInboxThreadsRead(threadTimestamps: Partial<Record<MessageThreadId, number>>) {
  const currentState = loadInboxReadState();
  const nextState: InboxReadState = { ...currentState };

  (Object.keys(threadTimestamps) as MessageThreadId[]).forEach((threadId) => {
    const nextTimestamp = threadTimestamps[threadId];

    if (!nextTimestamp) {
      return;
    }

    nextState[threadId] = Math.max(nextTimestamp, nextState[threadId] || 0);
  });

  saveInboxReadState(nextState);
}

export function markInboxThreadRead(threadId: MessageThreadId, timestampMs: number | null) {
  if (!timestampMs) {
    return;
  }

  markInboxThreadsRead({ [threadId]: timestampMs });
}

export function getInboxUnreadCount(posts: InboxUnreadPost[], readState = loadInboxReadState()) {
  return posts.reduce((count, post) => {
    const createdAtMs = toTimestampMs(post.createdAt);
    const responseSubmittedAtMs = toTimestampMs(post.responseSubmittedAt);

    if (post.requiresResponse && !responseSubmittedAtMs) {
      return count + 1;
    }

    if (!createdAtMs) {
      return count;
    }

    const lastReadAt = readState[post.threadId] || 0;
    return createdAtMs > lastReadAt ? count + 1 : count;
  }, 0);
}

export function getInboxUnreadCountsByThread(posts: InboxUnreadPost[], readState = loadInboxReadState()) {
  return posts.reduce((counts, post) => {
    const createdAtMs = toTimestampMs(post.createdAt);
    const responseSubmittedAtMs = toTimestampMs(post.responseSubmittedAt);

    if (post.requiresResponse && !responseSubmittedAtMs) {
      counts[post.threadId] = (counts[post.threadId] || 0) + 1;
      return counts;
    }

    if (!createdAtMs) {
      return counts;
    }

    const lastReadAt = readState[post.threadId] || 0;

    if (createdAtMs > lastReadAt) {
      counts[post.threadId] = (counts[post.threadId] || 0) + 1;
    }

    return counts;
  }, {} as Partial<Record<MessageThreadId, number>>);
}
