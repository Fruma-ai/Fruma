import type { CellMutationEvent } from "../ingest/cell-mutations";
import type { StandardField } from "../ingest/types";
import type { EvidenceRecord, ProductTruthRecord } from "../product-truth";

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

/** One immutable mill cell. Mapping never rewrites sourceValue. */
export type PersistedSourceCell = {
  id: string;
  depositId: string;
  sheetName: string;
  rowIndex: number;
  colIndex: number;
  rawHeader: string;
  sourceValue: string;
  /** Converted gsm or centimetres. Null leaves sourceValue as the only stored reading. */
  normalizedValue: string | null;
};

/** Named mill → brand grant. Insert-only. */
export type PersistedNamedGrant = {
  id: string;
  millOrgId: string;
  brandOrgId: string;
  scopeClass: string;
  createdAt: string;
};

export type PersistedCellMutation = CellMutationEvent;

export type SpineSnapshot = {
  headerMaps: PersistedHeaderMap[];
  requests: AnonymousMillRequest[];
  confirmations: MillConfirmation[];
  productTruth: ProductTruthRecord[];
  deposits: PersistedDepositPointer[];
  sourceCells: PersistedSourceCell[];
  namedGrants: PersistedNamedGrant[];
  cellMutations: PersistedCellMutation[];
};

/** Deposit audit row. Tracking columns only — the stored file payload is not part of this shape. */
export type DepositAuditRow = {
  id: string;
  filename: string;
  byte_hash: string;
  supplier_org_id: string;
  received_at: string;
};

/** One immutable source cell plus its append-only mutations, in occurred_at order. */
export type JoinedSourceCell = {
  cell: PersistedSourceCell;
  supplierOrgId: string;
  mutations: PersistedCellMutation[];
};

/** One stored sketch or brief vector. The id is a UUID; the cell id stays TEXT. */
export type PersistedMaterialEmbedding = {
  id: string;
  sourceCellId: string;
  embedding: number[];
  updatedAt: string;
};

/** A source cell on a sheet row hit by a nearest embedding, with that row's cosine distance. */
export type MaterialSearchHit = JoinedSourceCell & {
  cosineDistance: number;
};

/** A fact on the latest active product truth, including the evidence id stored on the document. */
export type LinkedProductTruthFact = {
  id: string;
  field: string;
  sourceType: string;
  sourceCellId: string | null;
  depositId: string | null;
  evidenceId: string | null;
  /** Truth status from the product-truth document. Relational fact rows leave this null. */
  status: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
};

/**
 * Latest active product-truth document for one product.
 * Facts come from `fruma_product_truth_facts`. Evidence records come from the document payload.
 */
export type ActiveProductTruthEvidence = {
  productId: string;
  version: number;
  facts: LinkedProductTruthFact[];
  evidence: EvidenceRecord[];
};

export type SpineStore = {
  kind: "file" | "postgres";
  load(): Promise<SpineSnapshot>;
  saveHeaderMap(map: PersistedHeaderMap): Promise<void>;
  saveRequest(request: AnonymousMillRequest): Promise<void>;
  saveConfirmation(confirmation: MillConfirmation): Promise<void>;
  saveProductTruth(record: ProductTruthRecord): Promise<void>;
  saveDepositPointer(pointer: PersistedDepositPointer, bytes: Uint8Array): Promise<void>;
  saveSourceCells(cells: PersistedSourceCell[]): Promise<void>;
  saveNamedGrant(grant: PersistedNamedGrant): Promise<void>;
  appendCellMutation(event: PersistedCellMutation): Promise<void>;
  getDepositBytes(depositId: string): Promise<Uint8Array | null>;
  /**
   * Source cells for a deposit, or every cell in the active schema.
   * Mutations are LEFT JOINed and ordered by occurred_at ASC. Deposit bytes are not read.
   */
  listSourceCellsWithMutations(filter?: { depositId?: string }): Promise<JoinedSourceCell[]>;
  /**
   * Greatest header-map version for this surface with is_active true.
   * The caller’s surface must be the store’s environment.
   */
  latestActiveHeaderMap(surface: string): Promise<PersistedHeaderMap | null>;
  /** Source cells for one deposit. Deposit bytes are not read. */
  listDepositSourceCells(depositId: string): Promise<PersistedSourceCell[]>;
  /** Every deposit in the active schema, tracking columns only. */
  listDepositAudit(): Promise<DepositAuditRow[]>;
  /** Insert one embedding. The source cell must already exist. */
  saveMaterialEmbedding(row: PersistedMaterialEmbedding): Promise<void>;
  /**
   * Nearest embeddings by cosine distance, expanded to every cell on the hit sheet row.
   * Mutations are LEFT JOINed and ordered by occurred_at ASC.
   */
  searchMaterialEmbeddings(embedding: readonly number[]): Promise<MaterialSearchHit[]>;
  /**
   * Latest active product-truth version per product, with its facts and Evidence records.
   * Deposit file payloads are not read.
   */
  listActiveProductTruthEvidence(): Promise<ActiveProductTruthEvidence[]>;
  reset(): Promise<void>;
};
