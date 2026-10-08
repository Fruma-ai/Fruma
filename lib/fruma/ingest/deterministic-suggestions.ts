import { isStandardField, type StandardField } from "./types";
import type { Client } from "../persist/reload-engines";
import { searchPathStatement } from "../persist/postgres-schema";
import { isFrumaVersion } from "../versions";

/**
 * Shorthand the deterministic engine already knows.
 * Header keys name a standard field. Value keys name the text to stage.
 */
const GLOBAL_TEXTILE_ONTOLOGY_MAP: Record<string, string> = {
  "100% co": "cotton",
  "100% cotton": "cotton",
  "100% pes": "polyester",
  "100% poly": "polyester",
  "100% organic co": "organic_cotton",
  "wgt gsm": "weight",
  "width cm": "width",
  "min order": "moq",
  "art.": "article",
};

export const GLOBAL_STANDARD_ASTM = "GLOBAL_STANDARD_ASTM";
export const INTRA_MILL_HISTORICAL_ALIAS = "INTRA_MILL_HISTORICAL_ALIAS";

const GLOBAL_CONFIDENCE = 0.95;
const HISTORICAL_CONFIDENCE = 0.85;

export type DerivationSource = typeof GLOBAL_STANDARD_ASTM | typeof INTRA_MILL_HISTORICAL_ALIAS;

export type StagedSuggestion = {
  depositId: string;
  sourceCellId: string;
  targetField: StandardField;
  suggestedValue: string;
  derivationSource: DerivationSource;
  confidence: number;
};

type RawUnmappedCell = {
  id: string;
  rawHeader: string;
  sourceValue: string;
};

const UNMAPPED_CELLS_SQL = `
  SELECT c.id, c.raw_header, c.source_value
  FROM fruma_source_cells c
  WHERE c.deposit_id = $1
    AND c.normalized_value IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM fruma_cell_mutation_events ev
      WHERE ev.source_cell_id = c.id
        AND ev.action_type = 'confirm'
    )
`;

const HISTORICAL_ALIAS_SQL = `
  SELECT ev.standard_field, ev.new_standard_value
  FROM fruma_cell_mutation_events ev
  INNER JOIN fruma_source_cells c ON c.id = ev.source_cell_id
  INNER JOIN fruma_deposits confirmed_deposit ON confirmed_deposit.id = c.deposit_id
  WHERE c.raw_header = $1
    AND ev.action_type = 'confirm'
    AND confirmed_deposit.supplier_org_id = (
      SELECT supplier_org_id
      FROM fruma_deposits
      WHERE id = $2
    )
    AND ev.standard_field IS NOT NULL
    AND ev.new_standard_value IS NOT NULL
  ORDER BY ev.occurred_at DESC
  LIMIT 1
`;

const INSERT_GLOBAL_SQL = `
  INSERT INTO fruma_staged_suggestions (
    deposit_id, source_cell_id, target_field, suggested_value, derivation_source, confidence
  )
  VALUES ($1, $2, $3, $4, '${GLOBAL_STANDARD_ASTM}', ${GLOBAL_CONFIDENCE})
`;

const INSERT_HISTORICAL_SQL = `
  INSERT INTO fruma_staged_suggestions (
    deposit_id, source_cell_id, target_field, suggested_value, derivation_source, confidence
  )
  VALUES ($1, $2, $3, $4, '${INTRA_MILL_HISTORICAL_ALIAS}', ${HISTORICAL_CONFIDENCE})
`;

async function pinSearchPath(client: Client): Promise<void> {
  const schemaRows = await client.unsafe(`SELECT current_schema() AS schema_name`);
  const schemaName = String(schemaRows[0]?.schema_name ?? "");
  const version = schemaName.startsWith("fruma_") ? schemaName.slice("fruma_".length) : "";
  if (!isFrumaVersion(version)) {
    throw new Error(`search_path schema ${schemaName || "(none)"} is not a Fruma ledger schema`);
  }
  await client.unsafe(searchPathStatement(version));
}

function unmappedCell(row: Record<string, unknown>): RawUnmappedCell | null {
  const id = typeof row.id === "string" ? row.id : "";
  const rawHeader = typeof row.raw_header === "string" ? row.raw_header : "";
  const sourceValue = typeof row.source_value === "string" ? row.source_value : "";
  if (!id || !rawHeader) return null;
  return { id, rawHeader, sourceValue };
}

function stagedRow(
  depositId: string,
  sourceCellId: string,
  targetField: string,
  suggestedValue: string,
  derivationSource: DerivationSource,
  confidence: number,
): StagedSuggestion | null {
  const value = suggestedValue.trim();
  if (!isStandardField(targetField) || !value) return null;
  return {
    depositId,
    sourceCellId,
    targetField,
    suggestedValue: value,
    derivationSource,
    confidence,
  };
}

/**
 * Stage proposals for cells this deposit has not normalized and has not confirmed.
 * The client's current schema is pinned first. Every statement uses unqualified
 * tables, so the rows stay on that search path and out of product-truth facts.
 * A dictionary hit on the header writes GLOBAL_STANDARD_ASTM. Otherwise the
 * latest human confirm of that exact header, from this mill only, writes
 * INTRA_MILL_HISTORICAL_ALIAS.
 */
export async function generateDeterministicSuggestions(
  client: Client,
  depositId: string,
): Promise<StagedSuggestion[]> {
  const deposit = depositId.trim();
  if (!deposit) throw new Error("deposit_id_required");

  await pinSearchPath(client);

  const cellRows = await client.unsafe(UNMAPPED_CELLS_SQL, [deposit]);
  const staged: StagedSuggestion[] = [];

  for (const row of cellRows) {
    const cell = unmappedCell(row);
    if (!cell) continue;

    const cleanHeader = cell.rawHeader.toLowerCase().trim();
    const cleanValue = cell.sourceValue.toLowerCase().trim();
    const headerHit = GLOBAL_TEXTILE_ONTOLOGY_MAP[cleanHeader];
    const valueHit = GLOBAL_TEXTILE_ONTOLOGY_MAP[cleanValue];

    if (headerHit || valueHit) {
      const suggestion = headerHit
        ? stagedRow(
            deposit,
            cell.id,
            headerHit,
            valueHit || cell.sourceValue,
            GLOBAL_STANDARD_ASTM,
            GLOBAL_CONFIDENCE,
          )
        : null;
      if (suggestion) {
        await client.unsafe(INSERT_GLOBAL_SQL, [
          suggestion.depositId,
          suggestion.sourceCellId,
          suggestion.targetField,
          suggestion.suggestedValue,
        ]);
        staged.push(suggestion);
      }
      continue;
    }

    const historicalRows = await client.unsafe(HISTORICAL_ALIAS_SQL, [cell.rawHeader, deposit]);
    const match = historicalRows[0];
    const field = match?.standard_field;
    const value = match?.new_standard_value;
    if (typeof field !== "string" || typeof value !== "string") continue;
    const suggestion = stagedRow(
      deposit,
      cell.id,
      field,
      value,
      INTRA_MILL_HISTORICAL_ALIAS,
      HISTORICAL_CONFIDENCE,
    );
    if (!suggestion) continue;
    await client.unsafe(INSERT_HISTORICAL_SQL, [
      suggestion.depositId,
      suggestion.sourceCellId,
      suggestion.targetField,
      suggestion.suggestedValue,
    ]);
    staged.push(suggestion);
  }

  return staged;
}

const LIST_STAGED_SQL = `
  SELECT
    s.source_cell_id,
    s.target_field,
    s.suggested_value,
    s.confidence,
    s.created_at,
    c.source_value
  FROM fruma_staged_suggestions s
  INNER JOIN fruma_source_cells c
    ON c.id = s.source_cell_id
   AND c.deposit_id = s.deposit_id
  WHERE s.deposit_id = $1
  ORDER BY s.created_at DESC, s.source_cell_id ASC
`;

/** One staged proposal as the discovery studio reads it. */
export type StagedSuggestionView = {
  cellId: string;
  fieldName: string;
  rawMillText: string;
  aiSuggestedValue: string;
  confidence: number;
};

function viewFromRow(row: Record<string, unknown>): StagedSuggestionView | null {
  const cellId = typeof row.source_cell_id === "string" ? row.source_cell_id : "";
  const fieldName = typeof row.target_field === "string" ? row.target_field : "";
  const rawMillText = typeof row.source_value === "string" ? row.source_value : "";
  const aiSuggestedValue = typeof row.suggested_value === "string" ? row.suggested_value.trim() : "";
  const confidence = typeof row.confidence === "number" ? row.confidence : Number(row.confidence);
  if (!cellId || !isStandardField(fieldName) || !aiSuggestedValue || !Number.isFinite(confidence)) return null;
  return { cellId, fieldName, rawMillText, aiSuggestedValue, confidence };
}

/**
 * Latest staged proposal for each cell on this deposit.
 * The connection's current schema is pinned first.
 */
export async function listStagedSuggestions(
  client: Client,
  depositId: string,
): Promise<StagedSuggestionView[]> {
  const deposit = depositId.trim();
  if (!deposit) throw new Error("deposit_id_required");

  await pinSearchPath(client);
  const rows = await client.unsafe(LIST_STAGED_SQL, [deposit]);
  const seen = new Set<string>();
  const views: StagedSuggestionView[] = [];
  for (const row of rows) {
    const view = viewFromRow(row);
    if (!view || seen.has(view.cellId)) continue;
    seen.add(view.cellId);
    views.push(view);
  }
  return views;
}
