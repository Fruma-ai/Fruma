import type { StandardField } from "../ingest/types";
import type { ProductTruthRecord } from "../product-truth";

/** Durable shapes for the Test spine. Same tables whether file-backed or Postgres. */

export type PersistedHeaderMap = {
  surface: string;
  overlays: Record<string, StandardField>;
  updatedAt: string;
};

export type AnonymousMillRequest = {
  id: string;
  /** Brand identity never leaves the brand side of this record. */
  brandId: string;
  productId: string;
  millOrgId: string;
  qualityArticle: string;
  /** What the mill is allowed to see — no brand name. */
  millVisible: {
    category: string;
    colour?: string;
    requestedMoqHint?: string;
    deliveryRegion: string;
  };
  status: "open" | "answered" | "withdrawn";
  createdAt: string;
  answeredAt?: string;
};

export type MillConfirmation = {
  id: string;
  requestId: string;
  millOrgId: string;
  qualityArticle: string;
  moqM: number;
  leadWeeks: number;
  available: boolean;
  /** ISO timestamp — commercials are current only with this. */
  confirmedAt: string;
  note?: string;
};

export type PersistedDepositPointer = {
  depositId: string;
  supplierOrgId: string;
  filename: string;
  sha256: string;
  byteLength: number;
  receivedAt: string;
  /** Relative object key under the object store root. */
  objectKey: string;
};

export type SpineSnapshot = {
  headerMaps: PersistedHeaderMap[];
  requests: AnonymousMillRequest[];
  confirmations: MillConfirmation[];
  productTruth: ProductTruthRecord[];
  deposits: PersistedDepositPointer[];
};

export type SpineStore = {
  kind: "file" | "postgres";
  load(): Promise<SpineSnapshot>;
  saveHeaderMap(map: PersistedHeaderMap): Promise<void>;
  saveRequest(request: AnonymousMillRequest): Promise<void>;
  saveConfirmation(confirmation: MillConfirmation): Promise<void>;
  saveProductTruth(record: ProductTruthRecord): Promise<void>;
  saveDepositPointer(pointer: PersistedDepositPointer, bytes: Uint8Array): Promise<void>;
  getDepositBytes(depositId: string): Promise<Uint8Array | null>;
  reset(): Promise<void>;
};
