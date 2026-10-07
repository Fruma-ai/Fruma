import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Client } from "../persist/reload-engines";
import { initiateSourcingHandshake } from "./handshake";

const BRAND = "org_brand_secret";
const QUALITY_ID = "cell:dep-mill:2:A:Sheet1";

type Call = { query: string; parameters?: readonly unknown[] };

function ledgerClient(options: { schema?: string; cell?: Record<string, unknown> | null }): Client & {
  calls: Call[];
} {
  const calls: Call[] = [];
  return {
    calls,
    async unsafe(query: string, parameters?: readonly unknown[]) {
      calls.push({ query, parameters });
      if (query.includes("current_schema")) {
        return [{ schema_name: options.schema ?? "fruma_test" }];
      }
      if (query.trim().startsWith("SET search_path")) return [];
      if (query.includes("FROM fruma_source_cells")) {
        return options.cell ? [options.cell] : [];
      }
      if (query.includes("MAX(version)")) return [{ version: 0 }];
      if (query.includes("INSERT INTO fruma_mill_requests")) return [];
      throw new Error(`Unexpected handshake query: ${query}`);
    },
  };
}

const CELL = {
  id: QUALITY_ID,
  deposit_id: "dep-mill",
  sheet_name: "Sheet1",
  row_index: 2,
  col_index: 1,
  raw_header: "Art. No",
  source_value: "HX-100",
  supplier_org_id: "org_mill_test",
};

describe("initiateSourcingHandshake", () => {
  it("pins the connection schema, inserts a pending anonymous request, and returns its id", async () => {
    const client = ledgerClient({ cell: CELL });
    const result = await initiateSourcingHandshake(client, BRAND, QUALITY_ID, ["price", "moq", "lead_time"]);

    assert.match(result.request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(Number.isNaN(Date.parse(result.implementedAt)), false);

    const text = client.calls.map((call) => call.query.trim());
    assert.match(text[0] ?? "", /current_schema/);
    assert.equal(text[1], "SET search_path TO fruma_test;");
    assert.match(text[2] ?? "", /FROM fruma_source_cells/);
    assert.deepEqual(client.calls[2]?.parameters, [QUALITY_ID]);
    assert.match(text[3] ?? "", /MAX\(version\)/);
    assert.match(text[3] ?? "", /fruma_mill_requests/);
    assert.match(text[4] ?? "", /INSERT INTO fruma_mill_requests/);
    assert.equal(text.some((query) => query.includes("ON CONFLICT")), false);

    const insert = client.calls[4];
    assert.deepEqual(insert?.parameters?.slice(0, 4), ["mill_request", result.request_id, "org_mill_test", 1]);
    const payload = JSON.parse(String(insert?.parameters?.[4])) as {
      qualityId: string;
      quality: { sheet: string; row: number; column: string; sourceValue: string };
      targetFields: string[];
      status: string;
      implementedAt: string;
    };
    assert.equal(payload.status, "PENDING");
    assert.equal(payload.implementedAt, result.implementedAt);
    assert.equal(payload.qualityId, QUALITY_ID);
    assert.deepEqual(payload.targetFields, ["price", "moq", "lead_time"]);
    assert.equal(payload.quality.sheet, "Sheet1");
    assert.equal(payload.quality.row, 2);
    assert.equal(payload.quality.column, "A");
    assert.equal(payload.quality.sourceValue, "HX-100");
    const stored = JSON.stringify(payload);
    assert.equal(stored.includes(BRAND), false);
    assert.equal(stored.includes("brandOrgId"), false);
    assert.equal(stored.includes("brandId"), false);
  });

  it("refuses a quality that is not in the active schema and does not insert", async () => {
    const client = ledgerClient({ cell: null });
    await assert.rejects(
      () => initiateSourcingHandshake(client, BRAND, "missing-cell", ["moq"]),
      /unknown_quality/,
    );
    assert.equal(client.calls.some((call) => call.query.includes("INSERT INTO")), false);
  });

  it("refuses a connection whose search path is outside the ledger schemas", async () => {
    const client = ledgerClient({ schema: "public", cell: CELL });
    await assert.rejects(
      () => initiateSourcingHandshake(client, BRAND, QUALITY_ID, ["lead_time"]),
      /search_path schema/,
    );
    assert.equal(client.calls.some((call) => call.query.includes("fruma_source_cells")), false);
    assert.equal(client.calls.some((call) => call.query.includes("INSERT INTO")), false);
  });

  it("rejects a target field that would name the brand", async () => {
    const client = ledgerClient({ cell: CELL });
    await assert.rejects(
      () => initiateSourcingHandshake(client, BRAND, QUALITY_ID, ["price", "brandOrgId"]),
      /target_field_invalid/,
    );
    assert.equal(client.calls.length, 0);
  });
});
