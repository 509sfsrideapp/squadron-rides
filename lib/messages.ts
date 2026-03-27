export type MessageThreadId = "admin" | "dev";
export type MessageThreadIconKey = "shield" | "spark";

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
    id: "admin",
    title: "Admin",
    subtitle: "Admin account messages and notices",
    description: "Messages from the admin account will show up here once account messaging tools are added.",
    previewText: "Admin announcements and direct outreach will appear here later.",
    channelLabel: "Admin Channel",
    iconKey: "shield",
    iconBackground: "rgba(67, 56, 202, 0.18)",
    iconColor: "#ddd6fe",
  },
  {
    id: "dev",
    title: "Dev",
    subtitle: "Bug and suggestion follow-ups",
    description: "Developer follow-up messages, including responses tied to bug reports and suggestions, will live here.",
    previewText: "Bug-report replies and development follow-ups will appear here later.",
    channelLabel: "Developer Channel",
    iconKey: "spark",
    iconBackground: "rgba(217, 119, 6, 0.18)",
    iconColor: "#fde68a",
  },
];

const systemThreadMessages: Record<MessageThreadId, SystemThreadMessage[]> = {
  admin: [
    {
      id: "admin-seed",
      senderLabel: "Admin",
      timestampLabel: "Framework ready",
      text: "Admin-to-user messaging will be added here next.",
    },
  ],
  dev: [
    {
      id: "dev-seed",
      senderLabel: "Dev",
      timestampLabel: "Framework ready",
      text: "Bug report and suggestion follow-ups will be routed into this thread later.",
    },
  ],
};

export function isMessageThreadId(value: string): value is MessageThreadId {
  return value === "admin" || value === "dev";
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
