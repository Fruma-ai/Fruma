import type postgres from "postgres";
import type { Founder } from "@/lib/gate";
import { isStandardField, type StandardField } from "@/lib/fruma/ingest/types";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import { executeTenantQuery, ledgerSql } from "@/src/lib/db";

const MAX_EXCEPTIONS = 40;
const MAX_CELL_ID = 512;
const MAX_VALUE = 8000;

const VERSION_TO_SCHEMA: Record<string, LedgerSchemaName> = {
  demo: LEDGER_SCHEMAS.demo,
  test: LEDGER_SCHEMAS.test,
  production: LEDGER_SCHEMAS.production,
  fruma_demo: LEDGER_SCHEMAS.demo,
  fruma_test: LEDGER_SCHEMAS.test,
  fruma_production: LEDGER_SCHEMAS.production,
};

export type CellExceptionInput = {
  cellId: string;
  field: StandardField;
  newValue: string;
};

export type ParsedExceptionBatch =
  | { ok: true; exceptions: CellExceptionInput[] }
  | { ok: false; error: string };

/**
 * `tenantVersion` may only name a closed schema. It is never interpolated
 * into SQL. `null` means the caller omitted it and the session schema stands.
 */
export function schemaForTenantVersion(value: unknown): LedgerSchemaName | null | "invalid" {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  return VERSION_TO_SCHEMA[value.trim().toLowerCase()] ?? "invalid";
}

export function parseExceptionBatch(body: unknown, founder: Founder): ParsedExceptionBatch {
  if (!body || typeof body !== "object") return { ok: false, error: "body is required" };
  const exceptions = (body as { exceptions?: unknown }).exceptions;
  if (!Array.isArray(exceptions) || exceptions.length === 0) {
    return { ok: false, error: "exceptions are required" };
  }
  if (exceptions.length > MAX_EXCEPTIONS) {
    return { ok: false, error: "too many exceptions" };
  }
  const parsed: CellExceptionInput[] = [];
  for (const item of exceptions) {
    if (!item || typeof item !== "object") return { ok: false, error: "exception is invalid" };
    const row = item as {
      cellId?: unknown;
      operatorId?: unknown;
      field?: unknown;
      newValue?: unknown;
    };
    if (row.operatorId != null && row.operatorId !== founder) {
      return { ok: false, error: "operator does not match the session" };
    }
    const cellId = typeof row.cellId === "string" ? row.cellId.trim() : "";
    const field = typeof row.field === "string" ? row.field.trim() : "";
    const newValue = typeof row.newValue === "string" ? row.newValue : "";
    if (!cellId || cellId.length > MAX_CELL_ID) return { ok: false, error: "cellId is invalid" };
    if (!isStandardField(field)) return { ok: false, error: "field is invalid" };
    if (newValue.length > MAX_VALUE) return { ok: false, error: "newValue is invalid" };
    parsed.push({ cellId, field, newValue });
  }
  return { ok: true, exceptions: parsed };
}

/** One append-only insert. Values stay in parameters. Deposits are not written. */
export function cellMutationInsertSql(
  exceptions: readonly CellExceptionInput[],
  operator: Founder,
): { sql: string; args: unknown[] } {
  const args: unknown[] = [];
  const tuples = exceptions.map((row) => {
    const eventId = `confirm:${crypto.randomUUID()}`;
    const offset = args.length;
    args.push(eventId, row.cellId, operator, row.newValue, row.field);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, 'confirm', NULL, $${offset + 4}, $${offset + 5}, NOW()::timestamptz)`;
  });
  const sql = `
INSERT INTO fruma_cell_mutation_events (
  event_id, source_cell_id, operator_cookie, action_type,
  old_standard_value, new_standard_value, standard_field, occurred_at
) VALUES
${tuples.join(",\n")}
`.trim();
  return { sql, args };
}

function pendingInsert(sql: string, args: readonly unknown[]) {
  const strings = [sql] as unknown as TemplateStringsArray;
  return ledgerSql<{ event_id: string }>(strings, ...args);
}

/**
 * Append confirm events inside the tenant transaction.
 * `executeTenantQuery` pins `search_path` for that transaction only.
 */
export async function appendCellMutations(
  namespace: LedgerSchemaName,
  exceptions: readonly CellExceptionInput[],
  operator: Founder,
): Promise<number> {
  const { sql, args } = cellMutationInsertSql(exceptions, operator);
  await executeTenantQuery(namespace, pendingInsert(sql, args) as postgres.PendingQuery<{ event_id: string }[]>);
  return exceptions.length;
}
