import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IngestEngine } from "../ingest/engine";
import {
  TEST_BRANDS,
  TEST_FACTORIES,
  TEST_LINKS,
  TEST_PRODUCTS,
  allHangerFiles,
  hangerCsvFor,
  testCorpusSummary,
} from "./index";

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

  it("ingests every factory hanger without throwing", () => {
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
    }
    assert.equal(deposits, 50);
    assert.ok(qualities > 100);
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
