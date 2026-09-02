import type { CatalogStatus, MillFile } from "./types";

/** Exact copy after a mill file drop. Catalogue must not change. */
export const FILE_RECEIVED_COPY =
  "File received. Not mapped. Not in the live catalogue.";

export const SEEDED_FILE_COPY =
  "Seeded. Not mapped. Not in the live catalogue.";

/** Allowed provenance labels only. Never: demo data, sample catalogue, AI generated, verified. */
export const PROVENANCE = {
  asSent: "As sent",
  seeded: "Seeded",
  unknown: "Unknown",
} as const;

export type ProvenanceLabel = (typeof PROVENANCE)[keyof typeof PROVENANCE];

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

/** Ready is not a Workshop label until claimed + on file + mapped. */
export function workshopReady(args: {
  claimed: boolean;
  file: MillFile | null;
  mapped: boolean;
}): boolean {
  return args.claimed && Boolean(args.file) && args.mapped;
}

/**
 * Catalogue “On the standard” only after claimed + received + mapped + confirmed
 * for that quality. Seeded rows never qualify. Live ≠ complete.
 */
export function isOnTheStandard(args: {
  claimed: boolean;
  file: MillFile | null;
  mapped: boolean;
  rowConfirmed: boolean;
}): boolean {
  return (
    args.claimed &&
    args.file?.source === "upload" &&
    args.mapped &&
    args.rowConfirmed
  );
}

/**
 * Working-file rows in this demo are the seed catalogue. An upload is received
 * but not parsed (parser out of scope), so rows stay Seeded — never Vale do Ave as-sent.
 */
export function rowProvenance(): ProvenanceLabel {
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
