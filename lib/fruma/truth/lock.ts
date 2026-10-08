import { randomUUID } from "node:crypto";
import { sourceCellId } from "../ingest/cell-mutations";
import { columnNumber } from "../ingest/columns";
import type { MillConfirmation, PersistedSourceCell } from "../persist";
import type { BrandBrief } from "../intelligence/retrieval";
import {
  type ProductTruthFact,
  type ProductTruthRecord,
  type EvidenceRecord,
} from "../product-truth";
import { getSpineStore } from "../persist";
import type { FrumaVersion } from "../versions";
import { TEST_SURFACE } from "../surfaces";

/** A deposited mill cell. `sourceCellId` must be the id of this deposit's sheet/row/column. */
export type LockedMillCell = {
  sourceCellId: string;
  sheet: string;
  row: number;
  column: string;
  rawHeader: string;
  sourceValue: string;
  normalizedValue?: string | null;
};

export type LockSourceInput = {
  brief: BrandBrief;
  millOrgId: string;
  millName: string;
  qualityArticle: string;
  depositId: string;
  constructionAsWritten: string;
  compositionAsWritten: string;
  weightAsWritten: string;
  colourAsWritten: string;
  /** Mill-file facts join here. Strings alone are not provenance. */
  cells: {
    article: LockedMillCell;
    construction: LockedMillCell;
    composition: LockedMillCell;
    weight: LockedMillCell;
    colour: LockedMillCell | null;
  };
  confirmation: MillConfirmation;
  /** Prior version if re-locking; defaults to 1. */
  priorVersion?: number;
  surface?: FrumaVersion;
};

function fact(partial: Omit<ProductTruthFact, "id" | "version"> & { version: number }): ProductTruthFact {
  return { id: `fact_${randomUUID()}`, ...partial };
}

/** Reject a cell id that is not the immutable id of this deposit's coordinates. */
export function assertSourceCellFk(depositId: string, cell: LockedMillCell): void {
  if (!depositId.trim()) throw new Error("product_truth_deposit_required");
  if (!cell.sourceCellId.trim()) throw new Error("product_truth_source_cell_required");
  const expected = sourceCellId(depositId, {
    sheet: cell.sheet,
    row: cell.row,
    column: cell.column,
  });
  if (cell.sourceCellId !== expected) {
    throw new Error(
      `product_truth_cell_fk: ${cell.sourceCellId} is not a cell of deposit ${depositId}`,
    );
  }
}

function millFact(
  partial: Omit<ProductTruthFact, "id" | "version" | "sourceType" | "sourceCellId" | "depositId"> & {
    version: number;
  },
  depositId: string,
  cell: LockedMillCell,
): ProductTruthFact {
  assertSourceCellFk(depositId, cell);
  if (cell.sourceValue !== String(partial.sourceValue ?? "")) {
    throw new Error(
      `product_truth_cell_value: ${partial.field} does not match source cell ${cell.sourceCellId}`,
    );
  }
  return fact({
    ...partial,
    sourceType: "mill-file",
    sourceCellId: cell.sourceCellId,
    depositId,
    sourceRecordId: depositId,
  });
}

export function persistedCellForLock(depositId: string, cell: LockedMillCell): PersistedSourceCell {
  assertSourceCellFk(depositId, cell);
  return {
    id: cell.sourceCellId,
    depositId,
    sheetName: cell.sheet,
    rowIndex: cell.row,
    colIndex: columnNumber(cell.column),
    rawHeader: cell.rawHeader,
    sourceValue: cell.sourceValue,
    normalizedValue: cell.normalizedValue ?? null,
  };
}

/**
 * Lock a brand product onto a mill quality after a timestamped mill confirmation.
 * Brand-private. Never invents certs. Commercials come only from the confirmation.
 */
export function buildLockedProductTruth(input: LockSourceInput): ProductTruthRecord {
  const version = (input.priorVersion ?? 0) + 1;
  const productId = input.brief.productId;
  const lockedSourceId = `${input.millOrgId}:${input.qualityArticle}`;

  const facts: ProductTruthFact[] = [
    fact({
      productId,
      field: "intent",
      value: input.brief.intent,
      sourceType: "brief",
      sourceRecordId: input.brief.productId,
      scope: "product",
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      version,
    }),
    millFact(
      {
        productId,
        field: "mill_article",
        value: input.qualityArticle,
        sourceField: "article",
        sourceValue: input.qualityArticle,
        scope: "quality",
        status: "evidenced",
        version,
      },
      input.depositId,
      input.cells.article,
    ),
    millFact(
      {
        productId,
        field: "construction",
        value: input.constructionAsWritten,
        sourceField: "construction",
        sourceValue: input.constructionAsWritten,
        scope: "quality",
        status: "evidenced",
        version,
      },
      input.depositId,
      input.cells.construction,
    ),
    millFact(
      {
        productId,
        field: "composition",
        value: input.compositionAsWritten,
        sourceField: "composition",
        sourceValue: input.compositionAsWritten,
        scope: "quality",
        status: "evidenced",
        version,
      },
      input.depositId,
      input.cells.composition,
    ),
    millFact(
      {
        productId,
        field: "weight",
        value: input.weightAsWritten,
        sourceField: "weight",
        sourceValue: input.weightAsWritten,
        scope: "quality",
        status: "evidenced",
        version,
      },
      input.depositId,
      input.cells.weight,
    ),
    input.colourAsWritten
      ? millFact(
          {
            productId,
            field: "colour",
            value: input.colourAsWritten,
            sourceField: "colour",
            sourceValue: input.colourAsWritten,
            scope: "quality",
            status: "evidenced",
            version,
          },
          input.depositId,
          requireColourCell(input),
        )
      : fact({
          productId,
          field: "colour",
          value: input.colourAsWritten,
          sourceType: "mill-file",
          scope: "quality",
          status: "missing",
          version,
        }),
    fact({
      productId,
      field: "moq_m",
      value: input.confirmation.moqM,
      sourceType: "mill-response",
      sourceRecordId: input.confirmation.id,
      scope: "quality",
      status: "confirmed",
      confirmedBy: input.millOrgId,
      confirmedAt: input.confirmation.confirmedAt,
      version,
    }),
    fact({
      productId,
      field: "lead_weeks",
      value: input.confirmation.leadWeeks,
      sourceType: "mill-response",
      sourceRecordId: input.confirmation.id,
      scope: "quality",
      status: "confirmed",
      confirmedBy: input.millOrgId,
      confirmedAt: input.confirmation.confirmedAt,
      version,
    }),
    fact({
      productId,
      field: "source_mill",
      value: input.millName,
      sourceType: "mill-response",
      sourceRecordId: input.confirmation.requestId,
      scope: "organisation",
      status: "confirmed",
      confirmedAt: input.confirmation.confirmedAt,
      version,
    }),
  ];

  const evidence: EvidenceRecord[] = [
    {
      id: `ev_${randomUUID()}`,
      claim: "mill_commercial_terms",
      scope: "quality",
      subjectId: lockedSourceId,
      status: "current",
      validFrom: input.confirmation.confirmedAt,
    },
  ];

  return {
    productId,
    version,
    facts,
    evidence,
    lockedSourceId,
  };
}

function requireColourCell(input: LockSourceInput): LockedMillCell {
  if (!input.cells.colour) throw new Error("product_truth_source_cell_required");
  return input.cells.colour;
}

export async function lockProductSource(input: LockSourceInput): Promise<ProductTruthRecord> {
  if (!input.confirmation.available) {
    throw new Error("cannot_lock_unavailable_quality");
  }
  const surface = input.surface ?? TEST_SURFACE;
  const store = getSpineStore(surface);
  const snap = await store.load();
  const prior = snap.productTruth
    .filter((r) => r.productId === input.brief.productId)
    .sort((a, b) => b.version - a.version)[0];
  const record = buildLockedProductTruth({
    ...input,
    priorVersion: prior?.version ?? input.priorVersion ?? 0,
  });
  const wanted = [input.cells.article, input.cells.construction, input.cells.composition, input.cells.weight];
  if (input.colourAsWritten && input.cells.colour) wanted.push(input.cells.colour);
  const have = new Set(snap.sourceCells.map((cell) => cell.id));
  const missing = wanted.filter((cell) => !have.has(cell.sourceCellId));
  if (missing.length) {
    await store.saveSourceCells(missing.map((cell) => persistedCellForLock(input.depositId, cell)));
  }
  await store.saveProductTruth(record);
  return record;
}
