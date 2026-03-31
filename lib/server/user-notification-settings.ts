import { sendPushMessage } from "./fcm";
import {
  createFirestoreDocument,
  getFirestoreDocument,
  listFirestoreDocuments,
} from "./firestore-admin";
import {
  normalizeUserNotificationPreferences,
  type UserNotificationPreferences,
} from "../notification-preferences";

type UserNotificationProfile = {
  notificationTokens?: string[] | null;
  notificationTokenMap?: Record<string, string> | null;
  notificationPreferences?: Partial<UserNotificationPreferences> | null;
  notificationsEnabled?: boolean | null;
};

function extractNotificationTokens(profile: UserNotificationProfile | null) {
  const mappedTokens = Object.values(profile?.notificationTokenMap || {}).filter(Boolean);
  const arrayTokens = (profile?.notificationTokens || []).filter(Boolean);
  return Array.from(new Set([...mappedTokens, ...arrayTokens]));
}

export async function getUserNotificationProfile(userId: string) {
  const profile = await getFirestoreDocument<UserNotificationProfile>(`users/${userId}`);

  if (!profile) {
    return null;
  }

  return {
    userId,
    tokens: extractNotificationTokens(profile),
    notificationsEnabled: profile.notificationsEnabled !== false,
    preferences: normalizeUserNotificationPreferences(profile.notificationPreferences),
  };
}

export async function sendUserPushNotification(input: {
  userId: string;
  preference: keyof UserNotificationPreferences;
  title: string;
  body: string;
  link: string;
  origin?: string;
}) {
  const profile = await getUserNotificationProfile(input.userId);

  if (
    !profile ||
    !profile.notificationsEnabled ||
    !profile.preferences[input.preference] ||
    profile.tokens.length === 0
  ) {
    return false;
  }

  await sendPushMessage({
    tokens: profile.tokens,
    title: input.title,
    body: input.body,
    link: input.link,
    origin: input.origin,
  });

  return true;
}

export async function createUserInboxPostAndMaybeNotify(input: {
  userId: string;
  threadId: "notifications" | "admin" | "dev";
  senderLabel: string;
  senderType?: string | null;
  title: string;
  body: string;
  imageUrl?: string | null;
  requiresResponse?: boolean;
  responsePrompt?: string | null;
  responseText?: string | null;
  responseSubmittedAt?: Date | null;
  readAt?: Date | null;
  readByUserId?: string | null;
  createdByUid?: string | null;
  createdByEmail?: string | null;
  link?: string;
  origin?: string;
  suppressPush?: boolean;
  extraFields?: Record<string, unknown>;
}) {
  const createdDocument = await createFirestoreDocument("userInboxPosts", {
    userId: input.userId,
    threadId: input.threadId,
    senderLabel: input.senderLabel,
    senderType: input.senderType || null,
    title: input.title,
    body: input.body,
    imageUrl: input.imageUrl || null,
    requiresResponse: input.requiresResponse === true,
    responsePrompt: input.responsePrompt || null,
    responseText: input.responseText || null,
    responseSubmittedAt: input.responseSubmittedAt || null,
    readAt: input.readAt || null,
    readByUserId: input.readByUserId || null,
    createdAt: new Date(),
    createdByUid: input.createdByUid || null,
    createdByEmail: input.createdByEmail || null,
    ...(input.extraFields || {}),
  });

  if (input.suppressPush) {
    return createdDocument;
  }

  await sendUserPushNotification({
    userId: input.userId,
    preference: "inboxMessages",
    title: input.title,
    body: input.body,
    link: input.link || `/inbox/${input.threadId}`,
    origin: input.origin,
  }).catch((error) => {
    console.error("Inbox push notification failed", error);
  });

  return createdDocument;
}

export async function listUserIdsForNotificationPreference(
  preference: keyof UserNotificationPreferences
) {
  const users = (await listFirestoreDocuments("users")) as Array<
    UserNotificationProfile & { id: string }
  >;

  return users
    .map((user) => ({
      id: user.id,
      tokens: extractNotificationTokens(user),
      notificationsEnabled: user.notificationsEnabled !== false,
      preferences: normalizeUserNotificationPreferences(user.notificationPreferences),
    }))
    .filter(
      (user) =>
        user.notificationsEnabled &&
        user.preferences[preference] &&
        user.tokens.length > 0
    );
}
