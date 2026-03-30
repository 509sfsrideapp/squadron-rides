export const OFFICE_OPTIONS = [
  "COMMAND",
  "S1",
  "S2",
  "S3",
  "BRT",
  "K9",
  "ALPHA",
  "BRAVO",
  "CHARLIE",
  "DELTA",
  "FOXTROT",
  "S4",
  "CATM",
  "S5",
  "VC",
  "S7",
] as const;

export type OfficeOption = (typeof OFFICE_OPTIONS)[number];

const OFFICE_SET = new Set<string>(OFFICE_OPTIONS);

export function normalizeOfficeValue(value?: string | null) {
  const normalized = value?.trim().toUpperCase() || "";
  return OFFICE_SET.has(normalized) ? (normalized as OfficeOption) : "";
}

export function hasValidOfficeValue(value?: string | null) {
  return Boolean(normalizeOfficeValue(value));
}
