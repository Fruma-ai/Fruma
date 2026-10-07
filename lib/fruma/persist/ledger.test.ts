import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import { resolveActiveCell } from "../ingest/cell-mutations";
import { FileSpineStore } from "./file-store";
import { IdempotencyException, conflictingDeposit } from "./idempotency";
import { legacyLedgerMessage, POSTGRES_LEDGER_SCHEMA } from "./postgres-schema";

const storeSrc = readFileSync(join(import.meta.dirname, "postgres-store.ts"), "utf8");

function methodBody(name: string, next: string): string {
  const start = storeSrc.indexOf(`async ${name}`);
  const end = storeSrc.indexOf(`async ${next}`);
  assert.ok(start >= 0 && end > start, name);
  return storeSrc.slice(start, end);
}

describe("immutable postgres ledger schema", () => {
  it("defines relational deposits, source cells, and named grants", () => {
    assert.match(storeSrc, /POSTGRES_LEDGER_SCHEMA/);
    for (const table of [
      "fruma_deposits",
      "fruma_source_cells",
      "fruma_named_grants",
      "fruma_cell_mutation_events",
    ]) {
      assert.match(POSTGRES_LEDGER_SCHEMA, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    }
    assert.match(POSTGRES_LEDGER_SCHEMA, /byte_hash TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /CONSTRAINT fruma_deposits_byte_hash_key UNIQUE \(byte_hash\)/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /sheet_name TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /row_index INTEGER NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /col_index INTEGER NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /raw_header TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /source_value TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /normalized_value TEXT/);
    assert.equal(/normalized_value TEXT NOT NULL/.test(POSTGRES_LEDGER_SCHEMA), false);
    assert.match(POSTGRES_LEDGER_SCHEMA, /mill_org_id TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /brand_org_id TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /scope_class TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /event_id TEXT PRIMARY KEY/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /source_cell_id TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /operator_cookie TEXT NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /action_type TEXT NOT NULL CHECK \(action_type IN \('map', 'confirm'\)\)/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /old_standard_value TEXT/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /new_standard_value TEXT/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /occurred_at TIMESTAMPTZ NOT NULL/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /CREATE TABLE IF NOT EXISTS fruma_product_truth_facts/);
    assert.match(
      POSTGRES_LEDGER_SCHEMA,
      /FOREIGN KEY \(source_cell_id, deposit_id\)\s+REFERENCES fruma_source_cells \(id, deposit_id\)/,
    );
    assert.match(
      POSTGRES_LEDGER_SCHEMA,
      /FOREIGN KEY \(deposit_id\) REFERENCES fruma_deposits \(id\)/,
    );
    assert.match(POSTGRES_LEDGER_SCHEMA, /CREATE OR REPLACE VIEW fruma_product_truth_provenance AS/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /INNER JOIN fruma_source_cells c/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /c\.sheet_name/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /c\.row_index/);
    assert.match(POSTGRES_LEDGER_SCHEMA, /c\.col_index/);
    assert.equal(POSTGRES_LEDGER_SCHEMA.includes("ON CONFLICT"), false);
    assert.equal(POSTGRES_LEDGER_SCHEMA.includes("pointer JSONB"), false);
  });

  it("requires surface_environment on every table", () => {
    const tables = POSTGRES_LEDGER_SCHEMA.split("CREATE TABLE IF NOT EXISTS ").slice(1);
    assert.equal(tables.length, 9);
    for (const table of tables) {
      assert.match(table, /surface_environment TEXT NOT NULL CHECK \(surface_environment IN \('demo', 'test', 'production'\)\)/);
    }
  });

  it("inserts deposits, cells, and grants with no ON CONFLICT DO UPDATE", () => {
    for (const [name, next] of [
      ["saveDepositPointer", "saveSourceCells"],
      ["saveSourceCells", "saveNamedGrant"],
      ["saveNamedGrant", "appendCellMutation"],
      ["appendCellMutation", "getDepositBytes"],
    ] as const) {
      const body = methodBody(name, next);
      assert.equal(body.includes("ON CONFLICT"), false, name);
      assert.match(body, /INSERT INTO/);
      assert.match(body, /IdempotencyException|depositIdempotencyException/);
    }
  });

  it("refuses to adopt a legacy mutable deposit table", () => {
    const legacy = new Map<string, Set<string>>([
      ["fruma_deposits", new Set(["deposit_id", "pointer", "bytes"])],
    ]);
    assert.match(legacyLedgerMessage(legacy) ?? "", /mutable JSONB/);

    const current = new Map<string, Set<string>>([
      ["fruma_deposits", new Set(["id", "byte_hash", "filename", "received_at", "surface_environment", "bytes"])],
      ["fruma_header_maps", new Set(["surface_environment", "surface"])],
      ["fruma_source_cells", new Set(["surface_environment", "id"])],
    ]);
    assert.equal(legacyLedgerMessage(current), null);
  });

  it("classifies deposit_id ahead of byte_hash when both match", () => {
    assert.equal(
      conflictingDeposit([{ id: "dep-1", byteHash: "abc" }], { id: "dep-1", byteHash: "abc" }),
      "deposit_id",
    );
    assert.equal(
      conflictingDeposit([{ id: "dep-1", byteHash: "abc" }], { id: "dep-2", byteHash: "abc" }),
      "byte_hash",
    );
    assert.equal(conflictingDeposit([], { id: "dep-2", byteHash: "def" }), null);
  });
});

describe("file spine deposit immutability", () => {
  it("throws IdempotencyException instead of overwriting bytes or pointers", async () => {
    const dir = join(tmpdir(), `fruma-ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const store = new FileSpineStore(dir);
    const pointer = {
      depositId: "dep-1",
      supplierOrgId: "org_mill",
      filename: "book.csv",
      sha256: "hash-a",
      byteLength: 4,
      receivedAt: "2026-10-07T00:00:00.000Z",
      objectKey: "dep-1.bin",
    };
    await store.saveDepositPointer(pointer, new Uint8Array([1, 2, 3, 4]));

    await assert.rejects(
      () => store.saveDepositPointer({ ...pointer, filename: "replaced.csv" }, new Uint8Array([9])),
      (err: unknown) => err instanceof IdempotencyException && err.conflict === "deposit_id",
    );
    await assert.rejects(
      () =>
        store.saveDepositPointer(
          { ...pointer, depositId: "dep-2", objectKey: "dep-2.bin" },
          new Uint8Array([1, 2, 3, 4]),
        ),
      (err: unknown) => err instanceof IdempotencyException && err.conflict === "byte_hash",
    );

    const bytes = await store.getDepositBytes("dep-1");
    assert.deepEqual(bytes, new Uint8Array([1, 2, 3, 4]));
    const snap = await store.load();
    assert.equal(snap.deposits.length, 1);
    assert.equal(snap.deposits[0]?.filename, "book.csv");

    await store.saveSourceCells([
      {
        id: "cell-1",
        depositId: "dep-1",
        sheetName: "book.csv",
        rowIndex: 2,
        colIndex: 1,
        rawHeader: "Fabric No",
        sourceValue: "Q75",
        normalizedValue: null,
      },
    ]);
    await assert.rejects(
      () =>
        store.saveSourceCells([
          {
            id: "cell-1",
            depositId: "dep-1",
            sheetName: "book.csv",
            rowIndex: 2,
            colIndex: 1,
            rawHeader: "Fabric No",
            sourceValue: "CHANGED",
            normalizedValue: "999",
          },
        ]),
      (err: unknown) => err instanceof IdempotencyException && err.conflict === "source_cell",
    );
    const kept = (await store.load()).sourceCells[0];
    assert.equal(kept?.sourceValue, "Q75");
    assert.equal(kept?.normalizedValue, null);

    await store.saveNamedGrant({
      id: "grant-1",
      millOrgId: "org_mill",
      brandOrgId: "org_brand",
      scopeClass: "technical",
      createdAt: "2026-10-07T00:00:00.000Z",
    });
    await assert.rejects(
      () =>
        store.saveNamedGrant({
          id: "grant-1",
          millOrgId: "org_other",
          brandOrgId: "org_brand",
          scopeClass: "commercial",
          createdAt: "2026-10-07T00:00:00.000Z",
        }),
      (err: unknown) => err instanceof IdempotencyException && err.conflict === "named_grant",
    );

    await store.appendCellMutation({
      eventId: "evt-map",
      sourceCellId: "cell-1",
      operatorCookie: "founder=owen",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "mesh",
      standardField: "construction",
      occurredAt: "2026-10-07T00:01:00.000Z",
    });
    await store.appendCellMutation({
      eventId: "evt-confirm",
      sourceCellId: "cell-1",
      operatorCookie: "founder=owen",
      actionType: "confirm",
      oldStandardValue: "mesh",
      newStandardValue: "mesh",
      standardField: null,
      occurredAt: "2026-10-07T00:02:00.000Z",
    });
    await assert.rejects(
      () =>
        store.appendCellMutation({
          eventId: "evt-map",
          sourceCellId: "cell-1",
          operatorCookie: "founder=owen",
          actionType: "map",
          oldStandardValue: "mesh",
          newStandardValue: "pique",
          standardField: "construction",
          occurredAt: "2026-10-07T00:03:00.000Z",
        }),
      (err: unknown) => err instanceof IdempotencyException && err.conflict === "cell_mutation",
    );

    const after = await store.load();
    assert.equal(after.sourceCells[0]?.sourceValue, "Q75");
    assert.equal(after.cellMutations.length, 2);
    const active = resolveActiveCell(
      {
        pointer: { sheet: "book.csv", row: 2, column: "A" },
        sourceValue: after.sourceCells[0]!.sourceValue,
        header: "Fabric No",
      },
      after.cellMutations,
    );
    assert.equal(active.sourceValue, "Q75");
    assert.equal(active.standardField, "construction");
    assert.equal(active.standardValue, "mesh");
    assert.equal(active.confirmed, true);
  });
});
