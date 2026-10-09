import type { LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import { executeTenantQuery, ledgerSql } from "@/src/lib/db";

const MAX_TARGET = 256;

export type BrandHistoryMatch = {
  cell_id: string;
  original_gsm: string;
  gsm: string;
  width: string;
  supplier_org_id: string;
  article_id: string | null;
  article_code: string | null;
  composition: string | null;
  material_hash: string | null;
  last_ordered_at: Date | string | null;
};

export type ParsedBrandHistoryQuery =
  | { ok: true; targetGsm: string; targetWidth: string }
  | { ok: false; error: string };

function target(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TARGET) return null;
  return trimmed;
}

/** `targetGsm` and `targetWidth` stay parameters. They never enter the SQL text. */
export function parseBrandHistoryQuery(body: unknown): ParsedBrandHistoryQuery {
  if (!body || typeof body !== "object") return { ok: false, error: "body is required" };
  const row = body as { targetGsm?: unknown; targetWidth?: unknown };
  const targetGsm = target(row.targetGsm);
  const targetWidth = target(row.targetWidth);
  if (!targetGsm) return { ok: false, error: "targetGsm is invalid" };
  if (!targetWidth) return { ok: false, error: "targetWidth is invalid" };
  return { ok: true, targetGsm, targetWidth };
}

/**
 * Current GSM is the latest weight event on that cell, otherwise the cell's
 * source value. Width is resolved the same way. Brand history attaches when
 * the composition hash and the mill match. The history table has no GSM column.
 */
export function brandHistoryMatchQuery(targetGsm: string, targetWidth: string) {
  return ledgerSql<BrandHistoryMatch>`
    WITH latest_field AS (
      SELECT DISTINCT ON (e.source_cell_id)
        e.source_cell_id,
        e.standard_field,
        e.new_standard_value
      FROM fruma_cell_mutation_events e
      WHERE e.standard_field IN ('weight', 'width', 'composition')
      ORDER BY e.source_cell_id, e.occurred_at DESC
    ),
    weight_cells AS (
      SELECT DISTINCT ON (c.deposit_id, c.sheet_name, c.row_index)
        c.deposit_id,
        c.sheet_name,
        c.row_index,
        c.id,
        c.source_value
      FROM fruma_source_cells c
      LEFT JOIN latest_field lf
        ON lf.source_cell_id = c.id
       AND lf.standard_field = 'weight'
      WHERE lf.source_cell_id IS NOT NULL
         OR lower(btrim(c.raw_header)) IN ('weight', 'gsm')
      ORDER BY c.deposit_id, c.sheet_name, c.row_index,
        CASE WHEN lf.source_cell_id IS NOT NULL THEN 0 ELSE 1 END,
        c.col_index
    ),
    width_cells AS (
      SELECT DISTINCT ON (c.deposit_id, c.sheet_name, c.row_index)
        c.deposit_id,
        c.sheet_name,
        c.row_index,
        c.id,
        c.source_value
      FROM fruma_source_cells c
      LEFT JOIN latest_field lf
        ON lf.source_cell_id = c.id
       AND lf.standard_field = 'width'
      WHERE lf.source_cell_id IS NOT NULL
         OR lower(btrim(c.raw_header)) = 'width'
      ORDER BY c.deposit_id, c.sheet_name, c.row_index,
        CASE WHEN lf.source_cell_id IS NOT NULL THEN 0 ELSE 1 END,
        c.col_index
    ),
    composition_cells AS (
      SELECT DISTINCT ON (c.deposit_id, c.sheet_name, c.row_index)
        c.deposit_id,
        c.sheet_name,
        c.row_index,
        c.normalized_value
      FROM fruma_source_cells c
      LEFT JOIN latest_field lf
        ON lf.source_cell_id = c.id
       AND lf.standard_field = 'composition'
      WHERE lf.source_cell_id IS NOT NULL
         OR lower(btrim(c.raw_header)) = 'composition'
      ORDER BY c.deposit_id, c.sheet_name, c.row_index,
        CASE WHEN lf.source_cell_id IS NOT NULL THEN 0 ELSE 1 END,
        c.col_index
    )
    SELECT
      weight_cells.id AS cell_id,
      weight_cells.source_value AS original_gsm,
      COALESCE(weight_latest.new_standard_value, weight_cells.source_value) AS gsm,
      COALESCE(width_latest.new_standard_value, width_cells.source_value) AS width,
      deposit.supplier_org_id,
      hist.article_id::text AS article_id,
      hist.article_code,
      hist.composition,
      hist.material_hash,
      hist.last_ordered_at
    FROM weight_cells
    INNER JOIN width_cells
      ON width_cells.deposit_id = weight_cells.deposit_id
     AND width_cells.sheet_name = weight_cells.sheet_name
     AND width_cells.row_index = weight_cells.row_index
    INNER JOIN fruma_deposits deposit ON deposit.id = weight_cells.deposit_id
    LEFT JOIN latest_field weight_latest
      ON weight_latest.source_cell_id = weight_cells.id
     AND weight_latest.standard_field = 'weight'
    LEFT JOIN latest_field width_latest
      ON width_latest.source_cell_id = width_cells.id
     AND width_latest.standard_field = 'width'
    LEFT JOIN composition_cells
      ON composition_cells.deposit_id = weight_cells.deposit_id
     AND composition_cells.sheet_name = weight_cells.sheet_name
     AND composition_cells.row_index = weight_cells.row_index
    LEFT JOIN fruma_brand_historical_articles hist
      ON hist.material_hash = composition_cells.normalized_value
     AND hist.supplier_org_id = deposit.supplier_org_id
    WHERE COALESCE(weight_latest.new_standard_value, weight_cells.source_value) = ${targetGsm}
      AND COALESCE(width_latest.new_standard_value, width_cells.source_value) = ${targetWidth}
    LIMIT 12
  `;
}

/** Read-only match inside the session schema. `search_path` is pinned for that transaction. */
export async function matchBrandHistory(
  namespace: LedgerSchemaName,
  targetGsm: string,
  targetWidth: string,
): Promise<BrandHistoryMatch[]> {
  return executeTenantQuery(namespace, brandHistoryMatchQuery(targetGsm, targetWidth), {
    readOnly: true,
  });
}
