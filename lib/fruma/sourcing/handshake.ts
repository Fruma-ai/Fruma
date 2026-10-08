import { randomUUID } from "node:crypto";
import { columnLetter } from "../ingest/columns";
import type { Client } from "../persist/reload-engines";
import { searchPathStatement } from "../persist/postgres-schema";
import { isFrumaVersion } from "../versions";

const BRAND_IDENTITY_KEYS = new Set([
  "brand",
  "brandId",
  "brandName",
  "brandOrgId",
  "brand_id",
  "brand_name",
  "brand_org_id",
]);

export type SourcingHandshake = {
  request_id: string;
  implementedAt: string;
};

type QualityCell = {
  id: string;
  deposit_id: string;
  sheet_name: string;
  row_index: number;
  col_index: number;
  raw_header: string;
  source_value: string;
  supplier_org_id: string;
};

/**
 * Anonymous mill ask. Brand identity is checked at the door and never copied
 * into this object or the JSON written to fruma_mill_requests.
 */
export type AnonymousHandshakePayload = {
  qualityId: string;
  quality: {
    sourceCellId: string;
    depositId: string;
    sheet: string;
    row: number;
    column: string;
    header: string;
    sourceValue: string;
  };
  targetFields: string[];
  status: "PENDING";
  implementedAt: string;
};

function assertBrandPresent(brandOrgId: string): void {
  if (!brandOrgId.trim()) throw new Error("brand_org_required");
}

function targetFieldList(targetFields: readonly string[]): string[] {
  if (!Array.isArray(targetFields) || targetFields.length === 0) {
    throw new Error("target_fields_required");
  }
  const fields: string[] = [];
  for (const field of targetFields) {
    if (typeof field !== "string") throw new Error("target_field_invalid");
    const name = field.trim();
    if (!name || BRAND_IDENTITY_KEYS.has(name)) throw new Error("target_field_invalid");
    if (!fields.includes(name)) fields.push(name);
  }
  return fields;
}

function containsBrandIdentity(value: unknown, brandOrgId: string): boolean {
  if (typeof value === "string") return value === brandOrgId;
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsBrandIdentity(item, brandOrgId));
  for (const [key, child] of Object.entries(value)) {
    if (BRAND_IDENTITY_KEYS.has(key)) return true;
    if (containsBrandIdentity(child, brandOrgId)) return true;
  }
  return false;
}

async function pinSearchPath(client: Client): Promise<void> {
  const schemaRows = await client.unsafe(`SELECT current_schema() AS schema_name`);
  const schemaName = String(schemaRows[0]?.schema_name ?? "");
  const version = schemaName.startsWith("fruma_") ? schemaName.slice("fruma_".length) : "";
  if (!isFrumaVersion(version)) {
    throw new Error(`search_path schema ${schemaName || "(none)"} is not a Fruma ledger schema`);
  }
  await client.unsafe(searchPathStatement(version));
}

function cellFromRow(row: Record<string, unknown>): QualityCell {
  return {
    id: String(row.id),
    deposit_id: String(row.deposit_id),
    sheet_name: String(row.sheet_name),
    row_index: Number(row.row_index),
    col_index: Number(row.col_index),
    raw_header: String(row.raw_header),
    source_value: String(row.source_value),
    supplier_org_id: String(row.supplier_org_id),
  };
}

/**
 * Ask a mill to confirm fields on a quality. The connection's current schema
 * is pinned with SET search_path before any read or insert. The stored payload
 * names the quality and the requested fields, and leaves the brand out.
 */
export async function initiateSourcingHandshake(
  client: Client,
  brandOrgId: string,
  qualityId: string,
  targetFields: string[],
): Promise<SourcingHandshake> {
  assertBrandPresent(brandOrgId);
  const fields = targetFieldList(targetFields);
  if (!qualityId.trim()) throw new Error("quality_id_required");

  await pinSearchPath(client);

  const cells = await client.unsafe(
    `
      SELECT
        c.id,
        c.deposit_id,
        c.sheet_name,
        c.row_index,
        c.col_index,
        c.raw_header,
        c.source_value,
        d.supplier_org_id
      FROM fruma_source_cells c
      INNER JOIN fruma_deposits d ON d.id = c.deposit_id
      WHERE c.id = $1
    `,
    [qualityId],
  );
  const cellRow = cells[0];
  if (!cellRow) throw new Error(`unknown_quality: ${qualityId}`);
  const cell = cellFromRow(cellRow);
  if (!cell.supplier_org_id.trim()) throw new Error(`unknown_quality: ${qualityId}`);

  const request_id = randomUUID();
  const implementedAt = new Date().toISOString();
  const payload: AnonymousHandshakePayload = {
    qualityId: cell.id,
    quality: {
      sourceCellId: cell.id,
      depositId: cell.deposit_id,
      sheet: cell.sheet_name,
      row: cell.row_index,
      column: columnLetter(cell.col_index - 1),
      header: cell.raw_header,
      sourceValue: cell.source_value,
    },
    targetFields: fields,
    status: "PENDING",
    implementedAt,
  };
  if (containsBrandIdentity(payload, brandOrgId)) {
    throw new Error("brand_identity_leaked");
  }

  const versions = await client.unsafe(
    `
      SELECT COALESCE(MAX(version), 0) AS version
      FROM fruma_mill_requests
      WHERE request_id = $1
    `,
    [request_id],
  );
  const version = Number(versions[0]?.version ?? 0) + 1;

  await client.unsafe(
    `
      INSERT INTO fruma_mill_requests (
        document_type, request_id, mill_org_id, version, payload
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    ["mill_request", request_id, cell.supplier_org_id, version, JSON.stringify(payload)],
  );

  return { request_id, implementedAt };
}
