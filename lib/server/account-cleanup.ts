import { deleteFirestoreDocument, listFirestoreDocumentsByField } from "./firestore-admin";

type AccountCleanupTarget = {
  collection: string;
  ownerField: string;
  label: string;
};

export type AccountCleanupResult = {
  totalDeleted: number;
  deletedByCollection: Record<string, number>;
};

const ACCOUNT_CLEANUP_TARGETS: AccountCleanupTarget[] = [
  { collection: "events", ownerField: "createdByUid", label: "events" },
  { collection: "bugReports", ownerField: "reporterUid", label: "bug reports" },
  { collection: "suggestions", ownerField: "reporterUid", label: "suggestions" },
  { collection: "userInboxPosts", ownerField: "userId", label: "user inbox posts" },
  { collection: "globalMessages", ownerField: "senderUid", label: "global chat messages" },
  { collection: "inboxPosts", ownerField: "createdByUid", label: "admin or dev inbox posts" },
  { collection: "eventAttendees", ownerField: "attendeeUid", label: "event attendance records" },
  { collection: "qaPostVotes", ownerField: "userId", label: "Q&A post votes" },
  { collection: "qaCommentVotes", ownerField: "userId", label: "Q&A comment votes" },
];

export async function deleteUserOwnedDocuments(userId: string) {
  const deletedByCollection: Record<string, number> = {};
  let totalDeleted = 0;

  for (const target of ACCOUNT_CLEANUP_TARGETS) {
    const documents = await listFirestoreDocumentsByField(target.collection, target.ownerField, userId);

    if (documents.length === 0) {
      continue;
    }

    await Promise.all(documents.map((document) => deleteFirestoreDocument(document.path)));
    deletedByCollection[target.collection] = documents.length;
    totalDeleted += documents.length;
  }

  return {
    totalDeleted,
    deletedByCollection,
  } satisfies AccountCleanupResult;
}
