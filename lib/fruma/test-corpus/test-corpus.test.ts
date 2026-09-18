import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IngestEngine, resetMillIngestEnginesForTests } from "../ingest";
import { resolveHeaderField } from "../ingest/header-map";
import {
  TEST_BRANDS,
  TEST_FACTORIES,
  TEST_LINKS,
  TEST_PRODUCTS,
  allHangerFiles,
  hangerCsvFor,
  hangerRowsFor,
  testCorpusSummary,
} from "./index";
import { runCorpusHarness } from "./harness";

describe("test corpus", () => {
  it("has exactly 3 brands and 50 factories", () => {
    const summary = testCorpusSummary();
    assert.equal(summary.brands, 3);
    assert.equal(summary.factories, 50);
    assert.equal(summary.products, 36);
    assert.equal(summary.links, 150);
    assert.ok(summary.hangerRows >= 50 * 16);
    assert.equal(TEST_BRANDS.length, 3);
    assert.equal(TEST_FACTORIES.length, 50);
    assert.equal(TEST_PRODUCTS.length, 36);
    assert.equal(TEST_LINKS.length, 150);
  });

  it("gives each factory a unique id, name and hanger file", () => {
    const ids = new Set(TEST_FACTORIES.map((f) => f.id));
    const names = new Set(TEST_FACTORIES.map((f) => f.name));
    const files = new Set(TEST_FACTORIES.map((f) => f.filename));
    assert.equal(ids.size, 50);
    assert.equal(names.size, 50);
    assert.equal(files.size, 50);
  });

  it("produces non-empty CSV hangers with a header row", () => {
    for (const factory of TEST_FACTORIES) {
      const csv = hangerCsvFor(factory);
      const lines = csv.trim().split("\n");
      assert.ok(lines.length >= factory.rowCount + 1, factory.id);
      assert.ok(lines[0].includes(",") || lines[0].length > 0, factory.id);
    }
  });

  it("maps every corpus dialect header to a standard field", () => {
    const headers = new Set<string>();
    for (const factory of TEST_FACTORIES) {
      const row = hangerRowsFor(factory)[0];
      if (!row) continue;
      for (const h of Object.keys(row)) headers.add(h);
    }
    const unmapped = [...headers].filter((h) => h && !resolveHeaderField(h));
    assert.deepEqual(unmapped, [], `unmapped corpus headers: ${unmapped.join(", ")}`);
  });

  it("ingests every factory hanger into searchable qualities", () => {
    const engine = new IngestEngine();
    let deposits = 0;
    let qualities = 0;
    for (const file of allHangerFiles()) {
      const result = engine.deposit({
        supplierOrgId: file.factory.id,
        filename: file.filename,
        bytes: file.bytes,
      });
      deposits += 1;
      qualities += result.qualities.length;
      assert.equal(result.parsed, true);
      assert.ok(result.cells.length > 0, file.factory.id);
      assert.ok(
        result.qualities.length > 0,
        `${file.factory.id} (${file.factory.dialect}) produced 0 qualities`,
      );
      const unmapped = [
        ...new Set(
          result.cells.filter((c) => !c.standardField && c.header.trim()).map((c) => c.header),
        ),
      ];
      assert.deepEqual(unmapped, [], `${file.factory.id} unmapped: ${unmapped.join(", ")}`);
    }
    assert.equal(deposits, 50);
    assert.ok(qualities > 100);
  });

  it("runs the Test-surface corpus harness for all 50 dialects", () => {
    resetMillIngestEnginesForTests();
    const harness = runCorpusHarness({ headerOverlays: {} });
    assert.equal(harness.surface, "test");
    assert.equal(harness.factoriesTotal, 50);
    assert.equal(harness.factoriesOk, 50);
    assert.equal(harness.factoriesFailed, 0);
    assert.equal(harness.unmappedHeaderCount, 0);
    assert.ok(harness.qualitiesTotal > 100);
    for (const row of harness.rows) {
      assert.ok(row.ok, `${row.factoryId} failed: ${row.error ?? "zero qualities"}`);
      assert.ok(row.depositId, row.factoryId);
      assert.ok(row.sha256, row.factoryId);
      assert.equal(row.unmappedHeaders.length, 0, row.factoryId);
    }
    for (const [dialect, stats] of Object.entries(harness.byDialect)) {
      assert.equal(stats.ok, stats.factories, dialect);
      assert.deepEqual(stats.unmapped, [], dialect);
    }
  });

  it("keeps brand relationship memory tenant-scoped", () => {
    const north = TEST_LINKS.filter((l) => l.brandId === "brand-northline");
    const harbour = TEST_LINKS.filter((l) => l.brandId === "brand-harbour");
    assert.equal(north.length, 50);
    assert.equal(harbour.length, 50);
    // Same factory can have different relationship per brand
    const sharedFactory = "factory-001";
    const a = north.find((l) => l.factoryId === sharedFactory)!;
    const b = harbour.find((l) => l.factoryId === sharedFactory)!;
    assert.ok(a);
    assert.ok(b);
    assert.equal(a.brandId, "brand-northline");
    assert.equal(b.brandId, "brand-harbour");
  });

  it("assigns every product to one of the three test brands", () => {
    const brandIds = new Set(TEST_BRANDS.map((b) => b.id));
    for (const product of TEST_PRODUCTS) {
      assert.ok(brandIds.has(product.brandId), product.id);
      assert.equal(product.shortlistFactoryIds.length, 3);
    }
  });
});
