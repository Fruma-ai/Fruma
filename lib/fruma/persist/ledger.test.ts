import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import { resolveActiveCell } from "../ingest/cell-mutations";
import { MissingConfigurationException } from "./configuration";
import { FileSpineStore } from "./file-store";
import { IdempotencyException, conflictingDeposit } from "./idempotency";
import { defaultSurfaceForPersist } from "./index";
import { PostgresSpineStore } from "./postgres-store";
import { bootstrapEnginesFromDatabase } from "./reload-engines";
import {
  dropSchemaStatement,
  legacyLedgerMessage,
  postgresLedgerSchema,
  searchPathStatement,
} from "./postgres-schema";

const storeSrc = readFileSync(join(import.meta.dirname, "postgres-store.ts"), "utf8");

function methodBody(name: string, next: string): string {
  const start = storeSrc.indexOf(`async ${name}`);
  const end = storeSrc.indexOf(`async ${next}`);
  assert.ok(start >= 0 && end > start, name);
  return storeSrc.slice(start, end);
}

describe("immutable postgres ledger schema", () => {
  it("defines relational deposits, source cells, and named grants", () => {
    const ddl = postgresLedgerSchema("fruma_test");
    assert.match(storeSrc, /postgresLedgerSchema/);
    for (const table of [
      "fruma_deposits",
      "fruma_source_cells",
      "fruma_named_grants",
      "fruma_cell_mutation_events",
    ]) {
      assert.match(ddl, new RegExp(`CREATE TABLE IF NOT EXISTS fruma_test\\.${table}`));
    }
    assert.match(ddl, /byte_hash TEXT NOT NULL/);
    assert.match(ddl, /CONSTRAINT fruma_deposits_byte_hash_key UNIQUE \(byte_hash\)/);
    assert.match(ddl, /sheet_name TEXT NOT NULL/);
    assert.match(ddl, /row_index INTEGER NOT NULL/);
    assert.match(ddl, /col_index INTEGER NOT NULL/);
    assert.match(ddl, /raw_header TEXT NOT NULL/);
    assert.match(ddl, /source_value TEXT NOT NULL/);
    assert.match(ddl, /normalized_value TEXT/);
    assert.equal(/normalized_value TEXT NOT NULL/.test(ddl), false);
    assert.match(ddl, /WHEN duplicate_object OR duplicate_table THEN NULL/);
    assert.match(ddl, /mill_org_id TEXT NOT NULL/);
    assert.match(ddl, /brand_org_id TEXT NOT NULL/);
    assert.match(ddl, /scope_class TEXT NOT NULL/);
    assert.match(ddl, /event_id TEXT PRIMARY KEY/);
    assert.match(ddl, /source_cell_id TEXT NOT NULL/);
    assert.match(ddl, /operator_cookie TEXT NOT NULL/);
    assert.match(ddl, /action_type TEXT NOT NULL CHECK \(action_type IN \('map', 'confirm'\)\)/);
    assert.match(ddl, /old_standard_value TEXT/);
    assert.match(ddl, /new_standard_value TEXT/);
    assert.match(ddl, /occurred_at TIMESTAMPTZ NOT NULL/);
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS fruma_test\.fruma_product_truth_facts/);
    assert.match(
      ddl,
      /FOREIGN KEY \(source_cell_id, deposit_id\)\s+REFERENCES fruma_test\.fruma_source_cells \(id, deposit_id\)/,
    );
    assert.match(
      ddl,
      /FOREIGN KEY \(deposit_id\) REFERENCES fruma_test\.fruma_deposits \(id\)/,
    );
    assert.match(ddl, /CREATE OR REPLACE VIEW fruma_test\.fruma_product_truth_provenance AS/);
    assert.match(ddl, /INNER JOIN fruma_test\.fruma_source_cells c/);
    assert.match(ddl, /INNER JOIN fruma_test\.fruma_deposits d/);
    assert.match(ddl, /FROM fruma_test\.fruma_product_truth_facts f/);
    assert.match(ddl, /c\.sheet_name/);
    assert.match(ddl, /c\.row_index/);
    assert.match(ddl, /c\.col_index/);
    assert.equal(ddl.includes("ON CONFLICT"), false);
    assert.equal(ddl.includes("pointer JSONB"), false);
    assert.equal(ddl.includes("surface_environment"), false);
    assert.equal(ddl.match(/id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/g)?.length, 9);
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS fruma_test\.fruma_factory_profiles/);
    assert.match(ddl, /mill_org_id TEXT NOT NULL/);
    assert.match(ddl, /facility_name TEXT NOT NULL/);
    assert.match(ddl, /country_location TEXT NOT NULL/);
    assert.match(ddl, /active_loom_count INTEGER NOT NULL/);
    assert.match(ddl, /version INTEGER NOT NULL DEFAULT 1 CHECK \(version >= 1\)/);
    assert.match(ddl, /is_active BOOLEAN NOT NULL DEFAULT TRUE/);
    assert.match(
      ddl,
      /CONSTRAINT fruma_factory_profiles_mill_version_key UNIQUE \(mill_org_id, version\)/,
    );
    assert.equal(/UNIQUE \(mill_org_id\)/.test(ddl), false);
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS fruma_test\.fruma_loom_capabilities/);
    assert.match(
      ddl,
      /factory_profile_id UUID NOT NULL REFERENCES fruma_test\.fruma_factory_profiles \(id\) ON DELETE CASCADE/,
    );
    assert.match(ddl, /construction_type TEXT NOT NULL/);
    assert.match(ddl, /min_gsm INTEGER NOT NULL/);
    assert.match(ddl, /max_gsm INTEGER NOT NULL/);
    assert.match(ddl, /max_usable_width_cm INTEGER NOT NULL/);
    assert.match(ddl, /yarn_feed_compatibility JSONB NOT NULL/);
    assert.match(
      ddl,
      /CREATE INDEX IF NOT EXISTS fruma_loom_capabilities_profile_idx\s+ON fruma_test\.fruma_loom_capabilities \(factory_profile_id\)/,
    );
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS fruma_test\.fruma_search_telemetry/);
    assert.match(ddl, /search_id TEXT NOT NULL/);
    assert.match(ddl, /requested_gsm INTEGER NOT NULL/);
    assert.match(ddl, /requested_width_cm INTEGER NOT NULL/);
    assert.match(ddl, /requested_fibers JSONB NOT NULL/);
    assert.match(ddl, /result_count INTEGER NOT NULL CHECK \(result_count >= 0\)/);
    assert.match(ddl, /jsonb_typeof\(requested_fibers\) = 'array'/);
    const telemetry = ddl.slice(ddl.indexOf("CREATE TABLE IF NOT EXISTS fruma_test.fruma_search_telemetry"));
    const telemetryBody = telemetry.slice(0, telemetry.indexOf(");"));
    assert.equal(/brand/i.test(telemetryBody), false);
    const staged = ddl.slice(ddl.indexOf("CREATE TABLE IF NOT EXISTS fruma_test.fruma_staged_suggestions"));
    const stagedBody = staged.slice(0, staged.indexOf(");"));
    assert.match(stagedBody, /id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    assert.match(
      stagedBody,
      /deposit_id TEXT NOT NULL REFERENCES fruma_test\.fruma_deposits \(id\) ON DELETE CASCADE/,
    );
    assert.match(
      stagedBody,
      /source_cell_id TEXT NOT NULL REFERENCES fruma_test\.fruma_source_cells \(id\) ON DELETE RESTRICT/,
    );
    assert.equal(/source_cell_id TEXT NOT NULL REFERENCES[^\n]*ON DELETE CASCADE/.test(stagedBody), false);
    assert.match(
      stagedBody,
      /target_field TEXT NOT NULL CHECK \(target_field IN \('article', 'construction', 'composition', 'weight', 'width', 'colour', 'moq', 'customer', 'cert'\)\)/,
    );
    assert.match(stagedBody, /suggested_value TEXT NOT NULL/);
    assert.match(stagedBody, /derivation_source TEXT NOT NULL/);
    assert.match(stagedBody, /confidence REAL NOT NULL/);
    assert.match(stagedBody, /created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/);
    assert.equal(stagedBody.includes("document_type"), false);
    const facts = ddl.slice(ddl.indexOf("CREATE TABLE IF NOT EXISTS fruma_test.fruma_product_truth_facts"));
    const factsBody = facts.slice(0, facts.indexOf(");"));
    assert.equal(factsBody.includes("fruma_staged_suggestions"), false);
    const provenance = ddl.slice(ddl.indexOf("CREATE OR REPLACE VIEW fruma_test.fruma_product_truth_provenance"));
    assert.equal(provenance.includes("fruma_staged_suggestions"), false);
    assert.match(ddl, /SET search_path TO public;\nCREATE EXTENSION IF NOT EXISTS vector;/);
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS fruma_test\.fruma_material_embeddings/);
    const embeddings = ddl.slice(ddl.indexOf("CREATE TABLE IF NOT EXISTS fruma_test.fruma_material_embeddings"));
    const embeddingsBody = embeddings.slice(0, embeddings.indexOf(");"));
    assert.match(
      embeddingsBody,
      /source_cell_id TEXT NOT NULL REFERENCES fruma_test\.fruma_source_cells \(id\) ON DELETE RESTRICT/,
    );
    assert.equal(embeddingsBody.includes("ON DELETE CASCADE"), false);
    assert.match(
      ddl,
      /ALTER TABLE fruma_test\.fruma_material_embeddings\s+DROP CONSTRAINT fruma_material_embeddings_source_cell_id_fkey,\s+ADD CONSTRAINT fruma_material_embeddings_source_cell_id_fkey\s+FOREIGN KEY \(source_cell_id\) REFERENCES fruma_test\.fruma_source_cells \(id\) ON DELETE RESTRICT/,
    );
    assert.match(
      ddl,
      /ALTER TABLE fruma_test\.fruma_staged_suggestions\s+DROP CONSTRAINT fruma_staged_suggestions_source_cell_id_fkey,\s+ADD CONSTRAINT fruma_staged_suggestions_source_cell_id_fkey\s+FOREIGN KEY \(source_cell_id\) REFERENCES fruma_test\.fruma_source_cells \(id\) ON DELETE RESTRICT/,
    );
    assert.match(ddl, /embedding public\.vector\(1536\) NOT NULL/);
    assert.match(ddl, /updated_at TIMESTAMPTZ NOT NULL/);
    assert.match(
      ddl,
      /CREATE INDEX IF NOT EXISTS material_embedding_hnsw_idx\s+ON fruma_test\.fruma_material_embeddings\s+USING hnsw \(embedding public\.vector_cosine_ops\)/,
    );
    assert.match(ddl, /CONSTRAINT fruma_header_maps_surface_version_key UNIQUE \(surface, version\)/);
    assert.match(ddl, /CONSTRAINT fruma_mill_requests_request_version_key UNIQUE \(request_id, version\)/);
    assert.match(ddl, /CONSTRAINT fruma_mill_confirmations_confirmation_version_key UNIQUE \(confirmation_id, version\)/);
    assert.match(ddl, /CONSTRAINT fruma_product_truth_product_version_key UNIQUE \(product_id, version\)/);
    assert.match(ddl, /document_type TEXT NOT NULL DEFAULT 'header_map'/);
    assert.match(ddl, /document_type TEXT NOT NULL DEFAULT 'mill_request'/);
    assert.match(ddl, /document_type TEXT NOT NULL DEFAULT 'mill_confirmation'/);
    assert.match(ddl, /document_type TEXT NOT NULL DEFAULT 'product_truth'/);
    assert.match(ddl, /request_id TEXT NOT NULL/);
    assert.match(ddl, /confirmation_id TEXT NOT NULL/);
    assert.equal(/PRIMARY KEY \(surface\)/.test(ddl), false);
    assert.equal(/UNIQUE \(surface\)/.test(ddl), false);
    assert.equal(/UNIQUE \(request_id\)/.test(ddl), false);
    assert.equal(/UNIQUE \(confirmation_id\)/.test(ddl), false);
    assert.equal(/UNIQUE \(product_id\)/.test(ddl), false);
    assert.equal(storeSrc.includes("ON CONFLICT"), false);
  });

  it("creates each environment schema and keeps the provenance view inside it", () => {
    for (const schema of ["fruma_demo", "fruma_test", "fruma_production"] as const) {
      const ddl = postgresLedgerSchema(schema);
      assert.match(ddl, new RegExp(`CREATE SCHEMA IF NOT EXISTS ${schema}`));
      assert.match(ddl, new RegExp(`SET search_path TO ${schema}`));
      const tables = ddl.split("CREATE TABLE IF NOT EXISTS ").slice(1);
      assert.equal(tables.length, 14);
      for (const table of tables) {
        assert.match(table, new RegExp(`^${schema}\\.fruma_`));
        assert.equal(table.includes("surface_environment"), false);
      }
      assert.match(ddl, new RegExp(`CREATE OR REPLACE VIEW ${schema}\\.fruma_product_truth_provenance AS`));
      for (const other of ["fruma_demo", "fruma_test", "fruma_production"]) {
        if (other !== schema) assert.equal(ddl.includes(other), false, schema);
      }
    }
    assert.throws(() => postgresLedgerSchema("public"), /targetSchema/);
  });

  it("sets search_path from the runtime version when the pool is acquired", () => {
    assert.equal(searchPathStatement("demo"), "SET search_path TO fruma_demo;");
    assert.equal(searchPathStatement("test"), "SET search_path TO fruma_test;");
    assert.equal(searchPathStatement("production"), "SET search_path TO fruma_production;");
    assert.throws(() => searchPathStatement("public"), /version/);
    assert.throws(() => searchPathStatement("demo;drop schema public"), /version/);

    for (const token of ["writeFileSync", "saveToDiskBackup", "spine.json", "privateDir", ".data/fruma-"]) {
      assert.equal(storeSrc.includes(token), false, token);
    }
    const indexSrc = readFileSync(join(import.meta.dirname, "index.ts"), "utf8");
    const open = indexSrc.indexOf("export function getSpineStore");
    const acquire = indexSrc.slice(open, indexSrc.indexOf("export function setSpineStoreForTests"));
    const refused = acquire.indexOf("MissingConfigurationException");
    const fileStore = acquire.indexOf("new FileSpineStore");
    assert.ok(refused >= 0 && fileStore > refused);
    assert.match(acquire, /surface === "production"/);
    for (const [name, next] of [
      ["saveHeaderMap", "saveRequest"],
      ["saveRequest", "saveConfirmation"],
      ["saveConfirmation", "saveProductTruth"],
      ["saveProductTruth", "saveDepositPointer"],
    ] as const) {
      const body = methodBody(name, next);
      assert.match(body, /searchPathStatement\(this\.surface\)/, name);
      assert.match(body, /INSERT INTO/, name);
      assert.equal(body.includes("writeFileSync"), false, name);
    }
    assert.match(storeSrc, /searchPathStatement\(this\.surface\)/);
    assert.match(storeSrc, /await reserved\.unsafe\(statement\)/);
    assert.match(storeSrc, /sql\.reserve\(\)/);
    assert.match(storeSrc, /-c search_path=\$\{this\.schemaName\}/);

    const previous = process.env.FRUMA_PERSIST_SURFACE;
    try {
      process.env.FRUMA_PERSIST_SURFACE = "production";
      assert.equal(defaultSurfaceForPersist(), "production");
      process.env.FRUMA_PERSIST_SURFACE = "nope";
      assert.equal(defaultSurfaceForPersist(), "test");
    } finally {
      if (previous === undefined) delete process.env.FRUMA_PERSIST_SURFACE;
      else process.env.FRUMA_PERSIST_SURFACE = previous;
    }
  });

  it("refuses a production ledger when DATABASE_URL is missing", async () => {
    if (process.env.DATABASE_URL?.trim()) return;

    const root = join(mkdtempSync(join(tmpdir(), "fruma-config-")), "fruma-production");
    assert.equal(existsSync(root), false);
    assert.throws(() => new FileSpineStore(root), MissingConfigurationException);
    assert.equal(existsSync(root), false);
    assert.equal(existsSync(join(process.cwd(), ".data", "fruma-production")), false);

    const ledger = new PostgresSpineStore("production");
    await assert.rejects(
      () =>
        ledger.saveHeaderMap({
          surface: "production",
          overlays: {},
          updatedAt: "2026-10-07T00:00:00.000Z",
        }),
      MissingConfigurationException,
    );
    await assert.rejects(
      () =>
        ledger.saveRequest({
          id: "req-prod",
          brandId: "org_brand_secret",
          productId: "prod-prod",
          millOrgId: "org_mill_production",
          qualityArticle: "HX-100",
          millVisible: { category: "cloth", deliveryRegion: "PT" },
          status: "open",
          createdAt: "2026-10-07T00:00:00.000Z",
        }),
      MissingConfigurationException,
    );
    await assert.rejects(
      () =>
        ledger.saveConfirmation({
          id: "conf-prod",
          requestId: "req-prod",
          millOrgId: "org_mill_production",
          qualityArticle: "HX-100",
          moqM: 1,
          leadWeeks: 2,
          available: true,
          confirmedAt: "2026-10-07T00:00:00.000Z",
        }),
      MissingConfigurationException,
    );
    await assert.rejects(
      () =>
        ledger.saveProductTruth({
          productId: "prod-prod",
          version: 1,
          facts: [],
          evidence: [],
        }),
      MissingConfigurationException,
    );

    const previousSurface = process.env.FRUMA_PERSIST_SURFACE;
    process.env.FRUMA_PERSIST_SURFACE = "production";
    try {
      await assert.rejects(() => bootstrapEnginesFromDatabase(), MissingConfigurationException);
    } finally {
      if (previousSurface === undefined) delete process.env.FRUMA_PERSIST_SURFACE;
      else process.env.FRUMA_PERSIST_SURFACE = previousSurface;
    }
    assert.equal(existsSync(join(process.cwd(), ".data", "fruma-production")), false);
  });

  it("resets by dropping the environment schema and recreating it", () => {
    assert.equal(dropSchemaStatement("demo"), "DROP SCHEMA IF EXISTS fruma_demo CASCADE;");
    assert.equal(dropSchemaStatement("test"), "DROP SCHEMA IF EXISTS fruma_test CASCADE;");
    assert.equal(dropSchemaStatement("production"), "DROP SCHEMA IF EXISTS fruma_production CASCADE;");
    assert.throws(() => dropSchemaStatement("public"), /version/);
    assert.throws(() => dropSchemaStatement("demo;drop schema public"), /version/);
    const start = storeSrc.indexOf("async reset()");
    const end = storeSrc.indexOf("private assertSameSurface");
    assert.ok(start >= 0 && end > start);
    const body = storeSrc.slice(start, end);
    const dropAt = body.indexOf("dropSchemaStatement(this.surface)");
    const initAt = body.indexOf("postgresLedgerSchema(this.schemaName)");
    assert.ok(dropAt >= 0 && initAt > dropAt);
    assert.match(body, /sql\.unsafe\(`\$\{dropSchemaStatement\(this\.surface\)\}/);
    assert.equal(body.includes("DELETE FROM"), false);
    assert.equal(body.includes("surface_environment"), false);
    assert.equal(body.includes("rmSync"), false);
    assert.equal(body.includes("deleteDirectory"), false);
    const fileReset = readFileSync(join(import.meta.dirname, "file-store.ts"), "utf8");
    const fileStart = fileReset.indexOf("async reset()");
    const fileBody = fileReset.slice(fileStart, fileStart + 180);
    assert.equal(fileBody.includes("rmSync"), false);
    assert.equal(fileBody.includes("deleteDirectory"), false);
  });

  it("inserts deposits, cells, grants, and versioned documents with no ON CONFLICT DO UPDATE", () => {
    for (const [name, next] of [
      ["saveHeaderMap", "saveRequest"],
      ["saveRequest", "saveConfirmation"],
      ["saveConfirmation", "saveProductTruth"],
      ["saveProductTruth", "saveDepositPointer"],
      ["saveDepositPointer", "saveSourceCells"],
      ["saveSourceCells", "saveNamedGrant"],
      ["saveNamedGrant", "appendCellMutation"],
      ["appendCellMutation", "getDepositBytes"],
    ] as const) {
      const body = methodBody(name, next);
      assert.equal(body.includes("ON CONFLICT"), false, name);
      assert.match(body, /INSERT INTO/);
      if (
        name === "saveHeaderMap" ||
        name === "saveRequest" ||
        name === "saveConfirmation" ||
        name === "saveProductTruth"
      ) {
        assert.match(body, /COALESCE\(MAX\(version\), 0\)/, name);
        assert.match(body, /searchPathStatement\(this\.surface\)/, name);
        assert.match(body, /const version = Number\(rows\[0\]\?\.version \?\? 0\) \+ 1/, name);
      }
    }
    for (const [name, next] of [
      ["saveProductTruth", "saveDepositPointer"],
      ["saveDepositPointer", "saveSourceCells"],
      ["saveSourceCells", "saveNamedGrant"],
      ["saveNamedGrant", "appendCellMutation"],
      ["appendCellMutation", "getDepositBytes"],
    ] as const) {
      const body = methodBody(name, next);
      assert.match(body, /IdempotencyException|depositIdempotencyException/, name);
    }
  });

  it("refuses to adopt a legacy mutable deposit table", () => {
    const legacy = new Map<string, Set<string>>([
      ["fruma_deposits", new Set(["deposit_id", "pointer", "bytes"])],
    ]);
    assert.match(legacyLedgerMessage(legacy) ?? "", /mutable JSONB/);

    const columnGated = new Map<string, Set<string>>([
      ["fruma_deposits", new Set(["id", "byte_hash", "filename", "received_at", "surface_environment", "bytes"])],
      ["fruma_header_maps", new Set(["surface_environment", "surface"])],
      ["fruma_source_cells", new Set(["surface_environment", "id"])],
    ]);
    assert.match(legacyLedgerMessage(columnGated) ?? "", /surface_environment/);

    const current = new Map<string, Set<string>>([
      ["fruma_deposits", new Set(["id", "byte_hash", "filename", "received_at", "bytes"])],
      ["fruma_header_maps", new Set(["id", "document_type", "surface", "version", "overlays"])],
      ["fruma_mill_requests", new Set(["id", "document_type", "request_id", "version", "payload"])],
      ["fruma_mill_confirmations", new Set(["id", "document_type", "confirmation_id", "version", "payload"])],
      ["fruma_product_truth", new Set(["id", "document_type", "product_id", "version", "payload"])],
      ["fruma_source_cells", new Set(["id", "source_value"])],
    ]);
    assert.equal(legacyLedgerMessage(current), null);

    const upserted = new Map<string, Set<string>>([
      ["fruma_header_maps", new Set(["surface", "overlays", "updated_at"])],
      ["fruma_mill_requests", new Set(["id", "payload"])],
    ]);
    assert.match(legacyLedgerMessage(upserted) ?? "", /upserted JSONB/);
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

  it("appends a new version of header maps, requests, and product truth", async () => {
    const dir = join(tmpdir(), `fruma-docs-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const store = new FileSpineStore(dir);
    await store.saveHeaderMap({
      surface: "test",
      overlays: { Art: "article" },
      updatedAt: "2026-10-07T00:00:00.000Z",
    });
    await store.saveHeaderMap({
      surface: "test",
      overlays: { Art: "article", Weight: "weight" },
      updatedAt: "2026-10-07T00:01:00.000Z",
    });
    await store.saveRequest({
      id: "req-1",
      brandId: "brand-1",
      productId: "prod-1",
      millOrgId: "org_mill",
      qualityArticle: "Q75",
      millVisible: { category: "polo", deliveryRegion: "EU" },
      status: "open",
      createdAt: "2026-10-07T00:00:00.000Z",
    });
    await store.saveRequest({
      id: "req-1",
      brandId: "brand-1",
      productId: "prod-1",
      millOrgId: "org_mill",
      qualityArticle: "Q75",
      millVisible: { category: "polo", deliveryRegion: "EU" },
      status: "answered",
      createdAt: "2026-10-07T00:00:00.000Z",
      answeredAt: "2026-10-07T00:02:00.000Z",
    });
    const truth = {
      productId: "prod-1",
      version: 1,
      facts: [],
      evidence: [],
    };
    await store.saveProductTruth(truth);
    await store.saveProductTruth({ ...truth, version: 1 });

    const snap = await store.load();
    assert.equal(snap.headerMaps.length, 1);
    assert.equal(snap.headerMaps[0]?.overlays.Weight, "weight");
    assert.equal(snap.requests.length, 1);
    assert.equal(snap.requests[0]?.status, "answered");
    assert.equal(snap.productTruth.length, 1);
    assert.equal(snap.productTruth[0]?.version, 2);

    const raw = JSON.parse(readFileSync(join(dir, "spine.json"), "utf8")) as {
      headerMaps: { version: number }[];
      requests: { version: number; status: string }[];
      productTruth: { version: number }[];
    };
    assert.deepEqual(raw.headerMaps.map((row) => row.version), [1, 2]);
    assert.deepEqual(
      raw.requests.map((row) => [row.version, row.status]),
      [
        [1, "open"],
        [2, "answered"],
      ],
    );
    assert.deepEqual(raw.productTruth.map((row) => row.version), [1, 2]);
  });
});
