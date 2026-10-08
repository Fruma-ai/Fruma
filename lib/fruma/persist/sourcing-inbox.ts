import { executeTenantQuery, ledgerSql } from "../../../src/lib/db";
import type { LedgerSchemaName } from "./postgres-schema";

/** Shown in place of a founder handle when the brand has not disclosed identity. */
export const ANONYMOUS_BRAND_ALIAS = "Brand Operator";

export const SUPPLIER_ORG_ID_MAX = 512;

export type SourcingInboxRow = {
  message_id: string;
  deposit_id: string;
  supplier_org_id: string;
  sender_handle: string;
  is_identity_disclosed: boolean;
  encrypted_payload: string;
  sent_at: string | Date;
};

export type SourcingInboxMessage = {
  message_id: string;
  deposit_id: string;
  supplier_org_id: string;
  sender_handle: string;
  is_identity_disclosed: boolean;
  encrypted_payload: string;
  sent_at: string;
};

export function parseSupplierOrgId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > SUPPLIER_ORG_ID_MAX || trimmed.includes("\0")) return null;
  return trimmed;
}

/**
 * Replace an undisclosed founder handle before the payload can leave the server.
 * A disclosed row keeps the handle that was stored. Every other row gets the alias.
 */
export function maskSourcingInbox(rows: readonly SourcingInboxRow[]): SourcingInboxMessage[] {
  return rows.map((row) => {
    const disclosed = row.is_identity_disclosed === true;
    return {
      message_id: String(row.message_id),
      deposit_id: String(row.deposit_id),
      supplier_org_id: String(row.supplier_org_id),
      sender_handle: disclosed ? String(row.sender_handle) : ANONYMOUS_BRAND_ALIAS,
      is_identity_disclosed: disclosed,
      encrypted_payload: String(row.encrypted_payload),
      sent_at: sentAtText(row.sent_at),
    };
  });
}

/**
 * Read one mill's inbound messages inside a read-only tenant transaction.
 * The returned objects are already masked.
 */
export async function loadSourcingInbox(
  namespace: LedgerSchemaName,
  supplierOrgId: string,
): Promise<SourcingInboxMessage[]> {
  const orgId = parseSupplierOrgId(supplierOrgId);
  if (!orgId) throw new Error("supplier_org_id_required");
  const rows = await executeTenantQuery<SourcingInboxRow>(
    namespace,
    ledgerSql<SourcingInboxRow>`
      SELECT
        m.message_id,
        m.deposit_id,
        d.supplier_org_id,
        m.sender_handle,
        m.is_identity_disclosed,
        m.encrypted_payload,
        m.sent_at
      FROM fruma_sourcing_messages m
      INNER JOIN fruma_deposits d ON d.id = m.deposit_id
      WHERE d.supplier_org_id = ${orgId}
      ORDER BY m.sent_at DESC
    `,
    { readOnly: true },
  );
  return maskSourcingInbox(rows);
}

function sentAtText(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return "";
}
