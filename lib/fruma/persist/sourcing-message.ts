import { isFounder, type Founder } from "../../founders";
import { executeTenantQuery, ledgerSql } from "../../../src/lib/db";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "./postgres-schema";

/** Founder session cookie names. The matching name is the tenant schema. */
export const SOURCING_SESSION_COOKIES = [
  LEDGER_SCHEMAS.demo,
  LEDGER_SCHEMAS.test,
  LEDGER_SCHEMAS.production,
] as const satisfies readonly LedgerSchemaName[];

export const DEPOSIT_ID_MAX = 512;
export const ENCRYPTED_PAYLOAD_MAX = 64000;

const FORBIDDEN_SQL = /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i;

export type SourcingMessagePayload = {
  deposit_id: string;
  encrypted_payload: string;
  is_identity_disclosed: boolean;
};

export type SourcingActor = {
  founder: Founder;
  namespace: LedgerSchemaName;
};

export type SourcingMessageBindings = {
  depositId: string;
  senderHandle: Founder;
  isIdentityDisclosed: boolean;
  encryptedPayload: string;
};

export type SourcingParseResult =
  | { ok: true; value: SourcingMessagePayload }
  | { ok: false; error: string };

export type SourcingParameters = readonly [string, Founder, boolean, string];

export type SourcingQuery = (
  namespace: LedgerSchemaName,
  statement: string,
  parameters: SourcingParameters,
) => Promise<ReadonlyArray<Record<string, unknown>>>;

export async function resolveSourcingActor(
  readSession: (cookie: string | undefined) => Promise<Founder | null>,
  readCookie: (name: LedgerSchemaName) => string | undefined,
): Promise<SourcingActor | null> {
  for (const namespace of SOURCING_SESSION_COOKIES) {
    const founder = await readSession(readCookie(namespace));
    if (founder && isFounder(founder)) return { founder, namespace };
  }
  return null;
}

export function parseSourcingPayload(payload: unknown): SourcingParseResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "invalid_payload" };
  }
  const record = payload as Record<string, unknown>;
  const depositId = boundedText(record.deposit_id, DEPOSIT_ID_MAX);
  if (!depositId) return { ok: false, error: "invalid_deposit_id" };
  const encryptedPayload = boundedText(record.encrypted_payload, ENCRYPTED_PAYLOAD_MAX);
  if (!encryptedPayload) return { ok: false, error: "invalid_encrypted_payload" };
  if (typeof record.is_identity_disclosed !== "boolean") {
    return { ok: false, error: "invalid_is_identity_disclosed" };
  }
  return {
    ok: true,
    value: {
      deposit_id: depositId,
      encrypted_payload: encryptedPayload,
      is_identity_disclosed: record.is_identity_disclosed,
    },
  };
}

export function sourcingMessageParameters(bindings: SourcingMessageBindings): SourcingParameters {
  if (!isFounder(bindings.senderHandle)) throw new Error("sender_handle_required");
  return [
    bindings.depositId,
    bindings.senderHandle,
    bindings.isIdentityDisclosed,
    bindings.encryptedPayload,
  ];
}

/**
 * Accept one insert into the sourcing message log.
 * The scan sees the statement text, so a payload that contains SQL stays a bound parameter.
 */
export function assertAppendOnlySourcingSql(statement: string): void {
  const sql = statement.trim();
  if (!sql) throw new Error("empty_sourcing_sql");
  if (sql.includes(";")) throw new Error("multi_statement_sourcing_sql");
  if (FORBIDDEN_SQL.test(sql)) throw new Error("append_only_violation");
  if (/\bfruma_source_cells\b/i.test(sql)) throw new Error("source_cell_access_forbidden");
  if (!/^INSERT\s+INTO\s+fruma_sourcing_messages\b/i.test(sql)) {
    throw new Error("sourcing_insert_required");
  }
  if (!/\bdeposit_id\b/i.test(sql) || !/\$1\b/.test(sql)) throw new Error("deposit_id_binding_required");
  if (!/\bsender_handle\b/i.test(sql) || !/\$2\b/.test(sql)) throw new Error("sender_handle_binding_required");
  if (!/\bis_identity_disclosed\b/i.test(sql) || !/\$3\b/.test(sql)) {
    throw new Error("is_identity_disclosed_binding_required");
  }
  if (!/\bencrypted_payload\b/i.test(sql) || !/\$4\b/.test(sql)) {
    throw new Error("encrypted_payload_binding_required");
  }
  if (!/\bsent_at\b/i.test(sql) || !/\bNOW\s*\(\s*\)::timestamptz\b/i.test(sql)) {
    throw new Error("sent_at_required");
  }
  const placeholders = sql.match(/\$\d+\b/g) ?? [];
  if (placeholders.join(" ") !== "$1 $2 $3 $4") throw new Error("sourcing_parameter_shape");
}

export async function runSourcingInsert(
  namespace: LedgerSchemaName,
  statement: string,
  parameters: SourcingParameters,
) {
  assertAppendOnlySourcingSql(statement);
  const strings = [statement] as unknown as TemplateStringsArray;
  return executeTenantQuery<{ message_id: string; sent_at: string | Date }>(
    namespace,
    ledgerSql(strings, ...parameters),
  );
}

export async function executeAppendOnlySourcingMessage(
  query: SourcingQuery,
  namespace: LedgerSchemaName,
  statement: string,
  bindings: SourcingMessageBindings,
): Promise<{ messageId: string; sentAt: string }> {
  assertAppendOnlySourcingSql(statement);
  const rows = await query(namespace, statement, sourcingMessageParameters(bindings));
  const row = rows[0];
  const messageId = row && typeof row.message_id === "string" ? row.message_id : "";
  const sentAt = sentAtText(row?.sent_at);
  if (!messageId || !sentAt) throw new Error("sourcing_insert_empty");
  return { messageId, sentAt };
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > max || text.includes("\0")) return null;
  return text;
}

function sentAtText(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return "";
}
