import { createUserInboxPostAndMaybeNotify } from "./user-notification-settings";

type AdminRemovalNoticeInput = {
  userId: string;
  contentTypeLabel: string;
  contentTitle?: string | null;
  reason?: string | null;
  adminUid: string;
  adminEmail?: string | null;
};

function formatContentLabel(input: Pick<AdminRemovalNoticeInput, "contentTypeLabel" | "contentTitle">) {
  const title = input.contentTitle?.trim();

  if (!title) {
    return input.contentTypeLabel;
  }

  return `${input.contentTypeLabel}: ${title}`;
}

export async function createAdminRemovalInboxNotice(input: AdminRemovalNoticeInput) {
  const detailLines = [
    `An admin removed your ${formatContentLabel(input)} from the app.`,
  ];

  if (input.reason?.trim()) {
    detailLines.push("");
    detailLines.push(`Reason: ${input.reason.trim()}`);
  }

  await createUserInboxPostAndMaybeNotify({
    userId: input.userId,
    threadId: "notifications",
    senderLabel: "Notifications",
    senderType: "admin",
    title: "Admin Content Removal Notice",
    body: detailLines.join("\n"),
    createdByUid: input.adminUid,
    createdByEmail: input.adminEmail || null,
    link: "/inbox/notifications",
    suppressPush: true,
  });
}
