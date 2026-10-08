import type { StandardField } from "../ingest/types";

/** Founder session cookie names accepted by confirmStagedSuggestion. */
export const FOUNDER_SESSION_COOKIE_NAMES = [
  "fruma_demo",
  "fruma_test",
  "fruma_production",
] as const;

export const SOURCE_CELL_ID_MAX = 512;
export const CONFIRMED_VALUE_MAX = 4000;

const CONFIRMABLE_FIELD_SET: Record<StandardField, true> = {
  article: true,
  construction: true,
  composition: true,
  weight: true,
  width: true,
  colour: true,
  moq: true,
  customer: true,
  cert: true,
};

export const CONFIRMABLE_FIELDS = Object.keys(CONFIRMABLE_FIELD_SET) as StandardField[];

const EVENT_ID = /^confirm:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPERATOR_HANDLE = /^[a-z]{2,32}$/;

const FORBIDDEN_SQL =
  /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i;

export type ConfirmSuggestionPayload = {
  source_cell_id: string;
  target_field: string;
  confirmed_value: string;
};

export type ParsedConfirmPayload = {
  source_cell_id: string;
  target_field: StandardField;
  confirmed_value: string;
};

export type ConfirmParseResult =
  | { ok: true; value: ParsedConfirmPayload }
  | { ok: false; error: string };

export type ConfirmEventBindings = {
  eventId: string;
  sourceCellId: string;
  operatorCookie: string;
  confirmedValue: string;
  targetField: StandardField;
};

export type ConfirmQuery = (
  query: string,
  parameters: readonly string[],
) => PromiseLike<ReadonlyArray<Record<string, unknown>>>;

export async function resolveFounderSession<T extends string>(
  readSession: (cookie: string | undefined) => Promise<T | null>,
  readCookie: (name: (typeof FOUNDER_SESSION_COOKIE_NAMES)[number]) => string | undefined,
): Promise<T | null> {
  for (const name of FOUNDER_SESSION_COOKIE_NAMES) {
    const who = await readSession(readCookie(name));
    if (who) return who;
  }
  return null;
}

export function parseConfirmPayload(payload: unknown): ConfirmParseResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "invalid_payload" };
  }
  const record = payload as Record<string, unknown>;
  const sourceCellId = boundedText(record.source_cell_id, SOURCE_CELL_ID_MAX);
  if (!sourceCellId) return { ok: false, error: "invalid_source_cell_id" };
  const targetField = typeof record.target_field === "string" ? record.target_field.trim() : "";
  if (!isConfirmableField(targetField)) return { ok: false, error: "invalid_target_field" };
  const confirmedValue = boundedText(record.confirmed_value, CONFIRMED_VALUE_MAX);
  if (!confirmedValue) return { ok: false, error: "invalid_confirmed_value" };
  return {
    ok: true,
    value: {
      source_cell_id: sourceCellId,
      target_field: targetField,
      confirmed_value: confirmedValue,
    },
  };
}

export function confirmEventBindings(
  founder: string,
  parsed: ParsedConfirmPayload,
  eventId: string,
): ConfirmEventBindings {
  if (!OPERATOR_HANDLE.test(founder)) throw new Error("operator_handle_required");
  if (!EVENT_ID.test(eventId)) throw new Error("event_id_required");
  return {
    eventId,
    sourceCellId: parsed.source_cell_id,
    operatorCookie: founder,
    confirmedValue: parsed.confirmed_value,
    targetField: parsed.target_field,
  };
}

/**
 * Reject anything other than one append-only insert into the mutation log.
 * Scans the statement text only, so a mill value that contains SQL stays a bound parameter.
 */
export function assertAppendOnlyConfirmSql(statement: string): void {
  const sql = statement.trim();
  if (!sql) throw new Error("empty_confirm_sql");
  if (sql.includes(";")) throw new Error("multi_statement_confirm_sql");
  if (FORBIDDEN_SQL.test(sql)) throw new Error("append_only_violation");
  if (/\bfruma_source_cells\b/i.test(sql)) throw new Error("source_cell_write_forbidden");
  if (!/^INSERT\s+INTO\s+fruma_cell_mutation_events\b/i.test(sql)) {
    throw new Error("confirm_insert_required");
  }
  if (!/\baction_type\b/i.test(sql) || !/'confirm'/.test(sql)) {
    throw new Error("action_type_confirm_required");
  }
  if (!/\bnew_standard_value\b/i.test(sql) || !/\$4\b/.test(sql)) {
    throw new Error("confirmed_value_binding_required");
  }
  if (!/\boccurred_at\b/i.test(sql) || !/\bNOW\s*\(\s*\)/i.test(sql)) {
    throw new Error("occurred_at_required");
  }
  const placeholders = sql.match(/\$\d+\b/g) ?? [];
  if (placeholders.join(" ") !== "$1 $2 $3 $4 $5") {
    throw new Error("confirm_parameter_shape");
  }
}

export async function executeAppendOnlyConfirm(
  query: ConfirmQuery,
  statement: string,
  bindings: ConfirmEventBindings,
): Promise<{ eventId: string; occurredAt: string }> {
  assertAppendOnlyConfirmSql(statement);
  const parameters = [
    bindings.eventId,
    bindings.sourceCellId,
    bindings.operatorCookie,
    bindings.confirmedValue,
    bindings.targetField,
  ] as const;
  const rows = await query(statement, parameters);
  const row = rows[0];
  const eventId = row && typeof row.event_id === "string" ? row.event_id : "";
  const occurredAt = occurredAtText(row?.occurred_at);
  if (!eventId || !occurredAt) throw new Error("confirm_insert_empty");
  return { eventId, occurredAt };
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > max || text.includes("\0")) return null;
  return text;
}

function isConfirmableField(value: string): value is StandardField {
  return Object.prototype.hasOwnProperty.call(CONFIRMABLE_FIELD_SET, value);
}

function occurredAtText(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return "";
}
