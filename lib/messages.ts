export type MessageThreadId = "notifications" | "admin" | "dev";
export type MessageThreadIconKey = "bell" | "shield" | "spark";

export type MessageThreadDefinition = {
  id: MessageThreadId;
  title: string;
  subtitle: string;
  description: string;
  previewText: string;
  channelLabel: string;
  iconKey: MessageThreadIconKey;
  iconBackground: string;
  iconColor: string;
};

type SystemThreadMessage = {
  id: string;
  senderLabel: string;
  timestampLabel: string;
  text: string;
};

const messageThreads: MessageThreadDefinition[] = [
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Ride notices and required follow-up",
    description: "Private ride notices, repush updates, and required follow-up prompts appear in this thread.",
    previewText: "Ride notices and required follow-up appear here.",
    channelLabel: "Notifications",
    iconKey: "bell",
    iconBackground: "rgba(14, 116, 144, 0.18)",
    iconColor: "#bae6fd",
  },
  {
    id: "admin",
    title: "Admin",
    subtitle: "Official updates and account notices",
    description: "Official updates, account notices, and administrative outreach appear in this thread.",
    previewText: "Administrative updates and account notices appear here.",
    channelLabel: "Admin Channel",
    iconKey: "shield",
    iconBackground: "rgba(67, 56, 202, 0.18)",
    iconColor: "#ddd6fe",
  },
  {
    id: "dev",
    title: "Dev",
    subtitle: "Bug report and feedback follow-up",
    description: "Developer follow-up messages, including responses tied to bug reports and suggestions, appear in this thread.",
    previewText: "Developer follow-up and support responses appear here.",
    channelLabel: "Developer Channel",
    iconKey: "spark",
    iconBackground: "rgba(217, 119, 6, 0.18)",
    iconColor: "#fde68a",
  },
];

const systemThreadMessages: Record<MessageThreadId, SystemThreadMessage[]> = {
  notifications: [
    {
      id: "notifications-seed",
      senderLabel: "Notifications",
      timestampLabel: "Channel ready",
      text: "Private ride notices and required follow-up prompts will appear here.",
    },
  ],
  admin: [
    {
      id: "admin-seed",
      senderLabel: "Admin",
      timestampLabel: "Channel ready",
      text: "Administrative announcements and account-related updates will appear here.",
    },
  ],
  dev: [
    {
      id: "dev-seed",
      senderLabel: "Dev",
      timestampLabel: "Channel ready",
      text: "Developer follow-up on bug reports and suggestions will appear here.",
    },
  ],
};

export function isMessageThreadId(value: string): value is MessageThreadId {
  return value === "notifications" || value === "admin" || value === "dev";
}

export function getAllMessageThreads() {
  return messageThreads;
}

export function getMessageThreadDefinition(threadId: string) {
  return messageThreads.find((thread) => thread.id === threadId) || null;
}

export function getSystemThreadMessages(threadId: MessageThreadId) {
  return systemThreadMessages[threadId] || [];
}
