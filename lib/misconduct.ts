export type MisconductTargetType =
  | "qa_post"
  | "qa_comment"
  | "event"
  | "marketplace_listing"
  | "iso_request";

export type MisconductTargetSelection = {
  targetType: MisconductTargetType;
  targetId: string;
  targetLabel: string;
  targetPreview?: string | null;
  targetPath: string;
  targetOwnerUid?: string | null;
};

export type MisconductReportStatus = "open" | "allowed" | "deleted";

export type MisconductReportRecord = {
  id: string;
  targetType: MisconductTargetType;
  targetId: string;
  targetLabel: string;
  targetPreview?: string | null;
  targetPath: string;
  targetOwnerUid?: string | null;
  reporterUid: string;
  reporterLabel: string;
  reporterEmail?: string | null;
  description: string;
  status: MisconductReportStatus;
  resolutionAction?: "allow" | "delete" | null;
  resolutionMessage?: string | null;
  resolvedAt?: string | null;
  resolvedByUid?: string | null;
  resolvedByEmail?: string | null;
  createdAt?: string | null;
};

export function formatMisconductTargetTypeLabel(targetType: MisconductTargetType) {
  if (targetType === "qa_post") {
    return "Forum Post";
  }

  if (targetType === "qa_comment") {
    return "Forum Comment";
  }

  if (targetType === "event") {
    return "Event";
  }

  if (targetType === "marketplace_listing") {
    return "Marketplace Listing";
  }

  return "ISO Request";
}

export function buildMisconductPreviewText(value?: string | null, maxLength = 220) {
  const normalized = value?.replace(/\s+/g, " ").trim() || "";

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}
