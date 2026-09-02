import type { CatalogStatus, MillFile } from "./types";

/** Exact copy after a mill file drop. Catalogue must not change. */
export const FILE_RECEIVED_COPY =
  "File received. Not mapped. Not in the live catalogue.";

/** Origin mill-card back/filter. Was “All factories”. */
export const INDEX_FILTER_LABEL = "All on the index.";

/** Studio banner until named grants exist. Do not build grants in this SPEC. */
export const SEED_BANNER_COPY =
  "Seeded. Not mill identity. Named grants are not in this build.";

export const VDA_NOT_PARTNER = "Têxteis Vale do Ave is not a partner.";

export const SEEDED_FILE_COPY =
  "Seeded. Not mapped. Not in the live catalogue.";

/** Allowed provenance labels only. Never: demo data, sample catalogue, AI generated, verified. */
export const PROVENANCE = {
  asSent: "As sent",
  seeded: "Seeded",
  unknown: "Unknown",
} as const;

export type ProvenanceLabel = (typeof PROVENANCE)[keyof typeof PROVENANCE];

/** Row-level source. Upload receipt is not as-sent. Only a parsed mill row is. */
export type RowProvenance = "as-sent" | "seeded" | "unknown";

export type ProfileHonesty = "Not claimed" | "Claimed";
export type FileHonesty = "Not on file" | "File received" | "Seeded";
export type MapHonesty = "Not mapped" | "Mapped" | "Unknown";
export type ReviewHonesty = "Unconfirmed" | "Confirmed" | "Unknown remains";
export type CatalogueHonesty = "Not in the live catalogue" | "On the standard";

export function millProfileState(claimed: boolean): ProfileHonesty {
  return claimed ? "Claimed" : "Not claimed";
}

export function millFileState(file: MillFile | null): FileHonesty {
  if (!file) return "Not on file";
  if (file.source === "demo") return "Seeded";
  return "File received";
}

export function millMapState(file: MillFile | null, mapped: boolean): MapHonesty {
  if (!file) return "Unknown";
  return mapped ? "Mapped" : "Not mapped";
}

export function millReviewState(args: {
  mapped: boolean;
  confirmed: number;
  unconfirmed: number;
  unknownRemains: number;
}): ReviewHonesty {
  if (!args.mapped) return "Unknown remains";
  if (args.unknownRemains > 0 && args.unconfirmed === 0) return "Unknown remains";
  if (args.unconfirmed === 0 && args.confirmed > 0) return "Confirmed";
  return "Unconfirmed";
}

export function millCatalogueState(onStandardCount: number): CatalogueHonesty {
  return onStandardCount > 0 ? "On the standard" : "Not in the live catalogue";
}

/** Starting honesty for as-sent deposit qualities after File drop. */
export function asSentDropHonesty(): {
  mapped: MapHonesty;
  review: ReviewHonesty;
  catalogue: CatalogueHonesty;
} {
  return {
    mapped: "Not mapped",
    review: "Unconfirmed",
    catalogue: "Not in the live catalogue",
  };
}

/** Ready is not a Workshop label until claimed + on file + mapped. */
export function workshopReady(args: {
  claimed: boolean;
  file: MillFile | null;
  mapped: boolean;
}): boolean {
  return args.claimed && Boolean(args.file) && args.mapped;
}

/** Parsed mill row only. `source: upload` is receipt, not as-sent. */
export function rowIsAsSent(row: { provenance?: RowProvenance }): boolean {
  return row.provenance === "as-sent";
}

/**
 * Catalogue “On the standard” only after claimed + mapped + confirmed for an
 * as-sent (parsed) quality. File source is ignored — an unread drop is not as-sent.
 * Seeded VDA rows never qualify. Deposit DTO qualities are not poured into the
 * catalogue reducer, so On the standard stays empty on File drop.
 */
export function isOnTheStandard(args: {
  claimed: boolean;
  mapped: boolean;
  rowConfirmed: boolean;
  asSent: boolean;
}): boolean {
  return args.claimed && args.mapped && args.rowConfirmed && args.asSent;
}

export function countOnTheStandard(
  rows: { provenance?: RowProvenance; status: CatalogStatus }[],
  gate: { claimed: boolean; mapped: boolean },
): number {
  return rows.filter((r) =>
    isOnTheStandard({
      claimed: gate.claimed,
      mapped: gate.mapped,
      rowConfirmed: r.status === "confirmed",
      asSent: rowIsAsSent(r),
    }),
  ).length;
}

/**
 * Map's working file after File drop is the as-sent mill deposit. Seeded
 * catalogue stays a separate list — never inferred into buildCatalog().
 */
export function rowProvenance(row?: { provenance?: RowProvenance }): ProvenanceLabel {
  if (row?.provenance === "as-sent") return PROVENANCE.asSent;
  if (row?.provenance === "unknown") return PROVENANCE.unknown;
  return PROVENANCE.seeded;
}

export function reviewRowLabel(status: CatalogStatus): ReviewHonesty {
  if (status === "gap") return "Unknown remains";
  if (status === "confirmed") return "Confirmed";
  return "Unconfirmed";
}

/** Weld styling only on Mapped / Confirmed — never on Seeded. */
export function weldForStep(state: string): boolean {
  return state === "Mapped" || state === "Confirmed";
}

/**
 * 10mm origin-dot+weld tick. Mapped + confirmed as-sent rows only.
 * Never Seeded. Never a score.
 */
export function showWeldTick(args: {
  provenance: RowProvenance | ProvenanceLabel;
  mapped: boolean;
  confirmed: boolean;
}): boolean {
  const asSent =
    args.provenance === "as-sent" || args.provenance === PROVENANCE.asSent;
  return asSent && args.mapped && args.confirmed;
}

/** Mill-card weld is provenance only: on file / mapped. Never a score. */
export function millCardProvenance(args: {
  onFile: boolean;
  mapped: boolean;
}): "mapped" | "on-file" | "index" {
  if (args.mapped) return "mapped";
  if (args.onFile) return "on-file";
  return "index";
}

/** Search must not present seed as mill identity. */
export function searchClothKicker(
  source?: "index" | "mill-file",
): "On the standard" | typeof PROVENANCE.seeded {
  return source === "mill-file" ? "On the standard" : PROVENANCE.seeded;
}
