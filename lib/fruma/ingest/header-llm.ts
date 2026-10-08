import type postgres from "postgres";
import type { SourceCell, StandardField } from "./types";

/** Fruma's nine standard fields. The model may not invent another name. */
export const FRUMA_STANDARD_FIELDS = [
  "article",
  "construction",
  "composition",
  "weight",
  "width",
  "colour",
  "moq",
  "customer",
  "cert",
] as const satisfies readonly StandardField[];

export const LLM_HEADER_MAP_SOURCE = "LLM_HEADER_MAP";

const FIELD_LIST = FRUMA_STANDARD_FIELDS.join(", ");

/**
 * Rigid instruction for header mapping.
 * The model returns JSON proposals only. It does not receive a database connection.
 */
export const HEADER_MAP_SYSTEM_PROMPT = [
  "You map unmapped mill workbook column headers onto Fruma's nine standard fields.",
  `The only allowed target_field values are: ${FIELD_LIST}.`,
  "Return one JSON object and no other text.",
  'Shape: {"mappings":[{"raw_header":"exact header","target_field":"one of the nine fields","confidence":0.0}]}',
  "Copy raw_header exactly from the user list. Do not add headers that were not supplied.",
  "Choose a target_field only when the header clearly names that standard field.",
  "confidence is a number from 0 to 1.",
  "Omit a header when you cannot map it to one of the nine fields.",
  "Do not invent a tenth field, a unit, or a rewritten mill value.",
  "Do not emit SQL. Do not propose changes to stored source cells.",
].join("\n");

export type UnmappedHeaderCell = {
  rawHeader: string;
  sourceCellId: string;
  depositId: string;
  sourceValue: string;
};

export type HeaderFieldMapping = {
  rawHeader: string;
  targetField: StandardField;
  confidence: number;
};

export type StagedSuggestionRow = {
  depositId: string;
  sourceCellId: string;
  targetField: StandardField;
  suggestedValue: string;
  derivationSource: typeof LLM_HEADER_MAP_SOURCE;
  confidence: number;
};

const INSERT_SQL = `
INSERT INTO fruma_staged_suggestions (
  deposit_id, source_cell_id, target_field, suggested_value, derivation_source, confidence
) VALUES (
  ?, ?, ?, ?, '${LLM_HEADER_MAP_SOURCE}', ?
)
`;

const DESTRUCTIVE = /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i;

export function isFrumaStandardField(value: string): value is StandardField {
  return (FRUMA_STANDARD_FIELDS as readonly string[]).includes(value);
}

export function sourceCellKey(depositId: string, cell: SourceCell): string {
  return `cell:${depositId}:${cell.pointer.row}:${cell.pointer.column}:${encodeURIComponent(cell.pointer.sheet)}`;
}

/** Headers that the parser left without a standard field. Mapped columns stay out of the prompt. */
export function unmappedHeaderCells(
  depositId: string,
  cells: readonly SourceCell[],
): UnmappedHeaderCell[] {
  const rows: UnmappedHeaderCell[] = [];
  for (const cell of cells) {
    const rawHeader = cell.header.trim();
    if (!rawHeader || cell.standardField) continue;
    const sourceValue = cell.sourceValue.trim();
    if (!sourceValue) continue;
    rows.push({
      rawHeader,
      sourceCellId: sourceCellKey(depositId, cell),
      depositId,
      sourceValue,
    });
  }
  return rows;
}

export function uniqueRawHeaders(headers: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const header of headers) {
    const rawHeader = header.trim();
    if (!rawHeader || seen.has(rawHeader)) continue;
    seen.add(rawHeader);
    unique.push(rawHeader);
  }
  return unique;
}

export function headerMapUserPrompt(rawHeaders: readonly string[]): string {
  const headers = uniqueRawHeaders(rawHeaders);
  return `Unmapped raw_header values:\n${JSON.stringify(headers)}`;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() || trimmed;
}

/** Keep only mappings whose header was supplied and whose field is one of the nine. */
export function headerMappingsFromLlmJson(
  payload: unknown,
  rawHeaders: readonly string[],
): HeaderFieldMapping[] {
  const allowed = new Set(uniqueRawHeaders(rawHeaders));
  const parsed = typeof payload === "string" ? safeJson(stripJsonFence(payload)) : payload;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const mappings = (parsed as { mappings?: unknown }).mappings;
  if (!Array.isArray(mappings)) return [];
  const accepted: HeaderFieldMapping[] = [];
  const seen = new Set<string>();
  for (const item of mappings) {
    if (!item || typeof item !== "object") continue;
    const row = item as { raw_header?: unknown; target_field?: unknown; confidence?: unknown };
    if (typeof row.raw_header !== "string" || typeof row.target_field !== "string") continue;
    const rawHeader = row.raw_header.trim();
    if (!allowed.has(rawHeader) || seen.has(rawHeader) || !isFrumaStandardField(row.target_field)) continue;
    if (typeof row.confidence !== "number" || !Number.isFinite(row.confidence)) continue;
    if (row.confidence < 0 || row.confidence > 1) continue;
    seen.add(rawHeader);
    accepted.push({ rawHeader, targetField: row.target_field, confidence: row.confidence });
  }
  return accepted;
}

export function stagedRowsForMappings(
  cells: readonly UnmappedHeaderCell[],
  mappings: readonly HeaderFieldMapping[],
): StagedSuggestionRow[] {
  const byHeader = new Map(mappings.map((mapping) => [mapping.rawHeader, mapping]));
  const rows: StagedSuggestionRow[] = [];
  for (const cell of cells) {
    const mapping = byHeader.get(cell.rawHeader);
    if (!mapping) continue;
    rows.push({
      depositId: cell.depositId,
      sourceCellId: cell.sourceCellId,
      targetField: mapping.targetField,
      suggestedValue: cell.sourceValue,
      derivationSource: LLM_HEADER_MAP_SOURCE,
      confidence: mapping.confidence,
    });
  }
  return rows;
}

/** Refuse any statement that is not an insert into the proposal table. */
export function assertAppendOnlySuggestionSql(sql: string): string {
  const text = sql.trim();
  if (!text) throw new Error("suggestion SQL is required");
  if (DESTRUCTIVE.test(text)) {
    throw new Error("CRITICAL_VIOLATION: suggestion writer refused a destructive statement.");
  }
  if (/\bfruma_source_cells\b/i.test(text)) {
    throw new Error("CRITICAL_VIOLATION: suggestion writer must not address fruma_source_cells.");
  }
  if (!/\bINSERT\s+INTO\s+fruma_staged_suggestions\b/i.test(text)) {
    throw new Error("CRITICAL_VIOLATION: suggestion writer only inserts into fruma_staged_suggestions.");
  }
  return text;
}

type SuggestionQuery = <T extends object[] = postgres.Row[]>(
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
) => Promise<T> | postgres.PendingQuery<T>;

export type SuggestionSql = SuggestionQuery & {
  begin<T>(callback: (tx: SuggestionQuery) => Promise<T>): Promise<T>;
};

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Insert proposal rows. suggested_value is the mill cell text, not a model rewrite.
 * The SQL text is the fixed insert template. Model output is bound as parameters.
 */
export async function insertStagedSuggestions(
  sql: SuggestionSql,
  rows: readonly StagedSuggestionRow[],
): Promise<StagedSuggestionRow[]> {
  assertAppendOnlySuggestionSql(INSERT_SQL);
  if (rows.length === 0) return [];
  await sql.begin(async (tx) => {
    for (const row of rows) {
      await tx`
        INSERT INTO fruma_staged_suggestions (
          deposit_id, source_cell_id, target_field, suggested_value, derivation_source, confidence
        ) VALUES (
          ${row.depositId},
          ${row.sourceCellId},
          ${row.targetField},
          ${row.suggestedValue},
          ${LLM_HEADER_MAP_SOURCE},
          ${row.confidence}
        )
      `;
    }
  });
  return [...rows];
}

export async function stageUnmappedHeaderSuggestions(input: {
  rawHeaders: readonly string[];
  cells: readonly UnmappedHeaderCell[];
  complete: (system: string, user: string) => Promise<string>;
  sql: SuggestionSql;
}): Promise<StagedSuggestionRow[]> {
  const rawHeaders = uniqueRawHeaders(input.rawHeaders);
  if (rawHeaders.length === 0) return [];
  const completion = await input.complete(HEADER_MAP_SYSTEM_PROMPT, headerMapUserPrompt(rawHeaders));
  const mappings = headerMappingsFromLlmJson(completion, rawHeaders);
  const rows = stagedRowsForMappings(input.cells, mappings);
  return insertStagedSuggestions(input.sql, rows);
}
