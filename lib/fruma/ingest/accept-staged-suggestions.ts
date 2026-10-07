import { randomUUID } from "node:crypto";
import { isStandardField, type StandardField } from "./types";
import { normalizedValueFor } from "./units";
import type { Client } from "../persist/reload-engines";
import { searchPathStatement } from "../persist/postgres-schema";
import { isFrumaVersion } from "../versions";

export type AcceptedSuggestion = {
  sourceCellId: string;
  targetField: StandardField;
  normalizedValue: string;
  eventId: string;
};

const STAGED_CELL_SQL = `
  SELECT s.target_field, s.suggested_value, c.source_value
  FROM fruma_staged_suggestions s
  INNER JOIN fruma_source_cells c
    ON c.id = s.source_cell_id
   AND c.deposit_id = s.deposit_id
  WHERE s.source_cell_id = $1
    AND s.deposit_id = $2
  ORDER BY s.created_at DESC
  LIMIT 1
`;

const CONFIRM_EVENT_SQL = `
  INSERT INTO fruma_cell_mutation_events (
    event_id, source_cell_id, operator_cookie, action_type,
    old_standard_value, new_standard_value, standard_field, occurred_at
  )
  VALUES ($1, $2, $3, 'confirm', NULL, $4, $5, $6)
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

function textColumn(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

/**
 * Uniform text for one accepted proposal.
 * Ounces and inches go through the conversion engine. Every other source stays
 * as the staged suggestion. The mill's source text is not rewritten.
 */
export function uniformValue(field: StandardField, sourceValue: string, suggestedValue: string): string {
  return normalizedValueFor(field, sourceValue) ?? suggestedValue.trim();
}

/**
 * Accept the latest staged proposal for each selected cell.
 * The client's current schema is pinned first. Each accept appends one confirm.
 * The deposited source cell is left unchanged: it has no standard_field column,
 * and source_value stays the mill's text.
 */
export async function acceptStagedSuggestions(
  client: Client,
  depositId: string,
  selectedCellIds: readonly string[],
  operatorCookie: string,
): Promise<AcceptedSuggestion[]> {
  const deposit = depositId.trim();
  const operator = operatorCookie.trim();
  if (!deposit) throw new Error("deposit_id_required");
  if (!operator) throw new Error("operator_cookie_required");

  await pinSearchPath(client);

  const accepted: AcceptedSuggestion[] = [];
  const seen = new Set<string>();
  for (const cellId of selectedCellIds) {
    const sourceCellId = cellId.trim();
    if (!sourceCellId || seen.has(sourceCellId)) continue;
    seen.add(sourceCellId);

    const stagedRows = await client.unsafe(STAGED_CELL_SQL, [sourceCellId, deposit]);
    const staged = stagedRows[0];
    if (!staged) continue;

    const targetField = textColumn(staged, "target_field");
    const suggestedValue = textColumn(staged, "suggested_value");
    const sourceValue = textColumn(staged, "source_value");
    if (!isStandardField(targetField) || !suggestedValue.trim()) continue;

    const normalizedValue = uniformValue(targetField, sourceValue, suggestedValue);
    if (!normalizedValue) continue;

    const eventId = randomUUID();
    const occurredAt = new Date().toISOString();
    await client.unsafe(CONFIRM_EVENT_SQL, [
      eventId,
      sourceCellId,
      operator,
      normalizedValue,
      targetField,
      occurredAt,
    ]);
    accepted.push({ sourceCellId, targetField, normalizedValue, eventId });
  }

  return accepted;
}
