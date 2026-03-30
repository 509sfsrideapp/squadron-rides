import { deleteQAPost } from "./q-and-a";
import { createAdminRemovalInboxNotice } from "./admin-content-removal";
import { createUserInboxPostAndMaybeNotify } from "./user-notification-settings";
import {
  deleteFirestoreDocument,
  getFirestoreDocument,
  listFirestoreDocuments,
  listFirestoreDocumentsByField,
  patchFirestoreDocument,
} from "./firestore-admin";
import type { MisconductReportRecord, MisconductTargetType } from "../misconduct";
import { formatMisconductTargetTypeLabel } from "../misconduct";

type EventAttendanceRecord = {
  id: string;
  path: string;
};

type EventTargetRecord = {
  name?: string | null;
  createdByUid?: string | null;
};

type MarketplaceTargetRecord = {
  title?: string | null;
  createdByUid?: string | null;
};

type IsoTargetRecord = {
  title?: string | null;
  createdByUid?: string | null;
};

type QAPostTargetRecord = {
  authorId: string;
  title?: string | null;
  deleted?: boolean;
};

type QACommentTargetRecord = {
  postId: string;
  authorId: string;
  body?: string | null;
  deleted?: boolean;
};

type MisconductDecision = "allow" | "delete";
type DeletedTargetInfo = {
  ownerUserId: string | null;
  contentTypeLabel: string;
  contentTitle: string;
};

export async function listMisconductReports() {
  const reports = (await listFirestoreDocuments("misconductReports")) as MisconductReportRecord[];

  return reports.sort((left, right) => {
    const leftTime = typeof left.createdAt === "string" ? Date.parse(left.createdAt) : 0;
    const rightTime = typeof right.createdAt === "string" ? Date.parse(right.createdAt) : 0;

    if (left.status !== right.status) {
      return left.status === "open" ? -1 : 1;
    }

    return rightTime - leftTime;
  });
}

export async function createMisconductResolutionMessage(input: {
  report: MisconductReportRecord;
  action: MisconductDecision;
  message?: string | null;
  resolvedByUid: string;
  resolvedByEmail?: string | null;
}) {
  const actionLabel = input.action === "delete" ? "Content Deleted" : "Content Allowed";
  const typeLabel = formatMisconductTargetTypeLabel(input.report.targetType);
  const detailMessage = input.message?.trim();

  const bodyLines = [
    `Your misconduct report for ${typeLabel.toUpperCase()} // ${input.report.targetLabel} has been reviewed.`,
    `Decision: ${actionLabel}.`,
  ];

  if (detailMessage) {
    bodyLines.push("");
    bodyLines.push(detailMessage);
  }

  await createUserInboxPostAndMaybeNotify({
    userId: input.report.reporterUid,
    threadId: "admin",
    senderLabel: "Admin",
    senderType: "admin",
    title: `Report Review // ${actionLabel}`,
    body: bodyLines.join("\n"),
    createdByUid: input.resolvedByUid,
    createdByEmail: input.resolvedByEmail || null,
    link: "/inbox/admin",
  });
}

async function deleteMisconductTarget(
  targetType: MisconductTargetType,
  targetId: string
): Promise<DeletedTargetInfo | null> {
  if (targetType === "event") {
    const event = await getFirestoreDocument<EventTargetRecord>(`events/${targetId}`);
    if (!event) {
      return null;
    }
    const attendees = (await listFirestoreDocumentsByField("eventAttendees", "eventId", targetId)) as EventAttendanceRecord[];
    await Promise.all(attendees.map((attendee) => deleteFirestoreDocument(attendee.path)));
    await deleteFirestoreDocument(`events/${targetId}`);
    return {
      ownerUserId: event.createdByUid || null,
      contentTypeLabel: "event",
      contentTitle: event.name || "Untitled Event",
    };
  }

  if (targetType === "marketplace_listing") {
    const listing = await getFirestoreDocument<MarketplaceTargetRecord>(`marketplaceListings/${targetId}`);
    if (!listing) {
      return null;
    }
    await deleteFirestoreDocument(`marketplaceListings/${targetId}`);
    return {
      ownerUserId: listing.createdByUid || null,
      contentTypeLabel: "marketplace listing",
      contentTitle: listing.title || "Untitled Listing",
    };
  }

  if (targetType === "iso_request") {
    const request = await getFirestoreDocument<IsoTargetRecord>(`isoRequests/${targetId}`);
    if (!request) {
      return null;
    }
    await deleteFirestoreDocument(`isoRequests/${targetId}`);
    return {
      ownerUserId: request.createdByUid || null,
      contentTypeLabel: "ISO post",
      contentTitle: request.title || "Untitled ISO Post",
    };
  }

  if (targetType === "qa_post") {
    const post = await getFirestoreDocument<QAPostTargetRecord>(`qaPosts/${targetId}`);

    if (!post || post.deleted) {
      return null;
    }

    await deleteQAPost({
      postId: targetId,
      authorId: post.authorId,
      allowAdminDelete: true,
    });
    return {
      ownerUserId: post.authorId,
      contentTypeLabel: "forum post",
      contentTitle: post.title || "Untitled Forum Post",
    };
  }

  const comment = await getFirestoreDocument<QACommentTargetRecord>(`qaComments/${targetId}`);

  if (!comment || comment.deleted) {
    return null;
  }

  await patchFirestoreDocument(`qaComments/${targetId}`, {
    body: "",
    deleted: true,
    updatedAt: new Date(),
  });

  return {
    ownerUserId: comment.authorId,
    contentTypeLabel: "forum comment",
    contentTitle: (comment.body?.trim() || "Forum Comment").slice(0, 80),
  };
}

export async function resolveMisconductReport(input: {
  reportId: string;
  action: MisconductDecision;
  message?: string | null;
  resolvedByUid: string;
  resolvedByEmail?: string | null;
}) {
  const report = await getFirestoreDocument<MisconductReportRecord>(`misconductReports/${input.reportId}`);

  if (!report) {
    throw new Error("That misconduct report could not be found.");
  }

  if (report.status !== "open") {
    throw new Error("That misconduct report has already been resolved.");
  }

  let deletedTargetInfo: DeletedTargetInfo | null = null;

  if (input.action === "delete") {
    deletedTargetInfo = await deleteMisconductTarget(report.targetType, report.targetId);
  }

  const nextStatus = input.action === "delete" ? "deleted" : "allowed";

  await patchFirestoreDocument(`misconductReports/${input.reportId}`, {
    status: nextStatus,
    resolutionAction: input.action,
    resolutionMessage: input.message?.trim() || null,
    resolvedAt: new Date(),
    resolvedByUid: input.resolvedByUid,
    resolvedByEmail: input.resolvedByEmail || null,
  });

  await createMisconductResolutionMessage({
    report,
    action: input.action,
    message: input.message,
    resolvedByUid: input.resolvedByUid,
    resolvedByEmail: input.resolvedByEmail,
  });

  if (
    input.action === "delete" &&
    deletedTargetInfo?.ownerUserId &&
    deletedTargetInfo.ownerUserId !== input.resolvedByUid
  ) {
    await createAdminRemovalInboxNotice({
      userId: deletedTargetInfo.ownerUserId,
      contentTypeLabel: deletedTargetInfo.contentTypeLabel,
      contentTitle: deletedTargetInfo.contentTitle,
      reason: input.message || "",
      adminUid: input.resolvedByUid,
      adminEmail: input.resolvedByEmail || null,
    });
  }

  return {
    ...report,
    status: nextStatus,
  };
}
