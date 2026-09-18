import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { IngestEngine } from "../ingest/engine";
import { TEST_FACTORIES } from "../test-corpus/factories";
import { hangerBytesFor } from "../test-corpus/hanger";
import { TEST_PRODUCTS } from "../test-corpus/products";
import { scoreCorpusCoverage } from "./coverage";
import { confirmLexiconForHeaders, resetHeaderOverlaysForTests } from "./overlays";
import { sourceShortlist, tenantIsolationProof } from "./retrieval";
import { fabricBookFor } from "./fabrics";
import { playbookHeaders } from "./playbooks";

describe("test intelligence — coverage and mapping", () => {
  beforeEach(() => {
    resetHeaderOverlaysForTests();
  });

  it("marks Polish fleece mills dark because Art. is not an article alias", () => {
    const coverage = scoreCorpusCoverage();
    assert.equal(coverage.factoriesTotal, 50);
    assert.ok(coverage.dark >= 8);
    const pl = coverage.byDialect.find((d) => d.dialect === "pl-fleece");
    assert.ok(pl);
    assert.equal(pl.dark, pl.factories);
    assert.equal(pl.qualities, 0);
    assert.ok(pl.unmappedHeaders.includes("Art."));
    assert.ok(coverage.mappingQueue.some((p) => p.header === "Art." && p.proposedField === "article"));
  });

  it("keeps Portuguese mills searchable with builtin aliases", () => {
    const coverage = scoreCorpusCoverage();
    const pt = coverage.byDialect.find((d) => d.dialect === "pt-standard");
    assert.ok(pt);
    assert.equal(pt.dark, 0);
    assert.equal(pt.searchable, pt.factories);
    assert.deepEqual(pt.unmappedHeaders, []);
  });

  it("does not treat unmapped Italian columns as an empty-article exception", () => {
    const coverage = scoreCorpusCoverage();
    const it = coverage.byDialect.find((d) => d.dialect === "it-shirting");
    assert.ok(it);
    assert.ok(it.qualities > 0);
    assert.ok(it.partial === it.factories);
    assert.ok(it.unmappedHeaders.includes("Weave"));
  });

  it("recovers Polish mills after the dialect playbook is confirmed", () => {
    const before = scoreCorpusCoverage();
    const headers = playbookHeaders(before, "pl-fleece");
    const overlays = confirmLexiconForHeaders(headers);
    const after = scoreCorpusCoverage(overlays);
    const pl = after.byDialect.find((d) => d.dialect === "pl-fleece");
    assert.ok(pl);
    assert.equal(pl.dark, 0);
    assert.ok(pl.qualities > 0);
    assert.ok(after.dark < before.dark);
  });

  it("applies confirmed overlays inside the ingest engine", () => {
    const factory = TEST_FACTORIES.find((f) => f.dialect === "pl-fleece")!;
    const ing = new IngestEngine();
    const raw = ing.deposit({
      supplierOrgId: factory.id,
      filename: factory.filename,
      bytes: hangerBytesFor(factory),
    });
    assert.equal(raw.qualities.length, 0);

    const overlays = confirmLexiconForHeaders(["Art.", "Structure", "GSM", "Colourway", "Customer ref", "Certificate"]);
    const mapped = ing.deposit({
      supplierOrgId: factory.id,
      filename: factory.filename,
      bytes: hangerBytesFor(factory),
      headerOverlays: overlays,
    });
    assert.ok(mapped.qualities.length > 0);
  });
});

describe("test intelligence — source shortlist", () => {
  beforeEach(() => {
    resetHeaderOverlaysForTests();
  });

  it("hides excluded mills and never leaks another brand's relationship", () => {
    const north = TEST_PRODUCTS.find((p) => p.brandId === "brand-northline")!;
    const result = sourceShortlist({ brandId: north.brandId, productId: north.id });
    assert.ok(result.excludedHidden >= 1);
    assert.equal(result.candidates.length, 12);
    assert.ok(result.candidates.every((c) => c.relationship !== "excluded"));
    assert.ok(result.candidates.every((c) => c.excluded === false));

    const isolation = tenantIsolationProof("factory-001");
    const relationships = new Set(isolation.map((row) => row.relationship));
    assert.ok(relationships.size >= 2);
    assert.equal(isolation.length, 3);
  });

  it("treats a named colourway as MUST and does not invent navy when unnamed", () => {
    const navy = TEST_PRODUCTS.find((p) => p.brandId === "brand-northline" && /navy/i.test(p.name))!;
    const named = sourceShortlist({ brandId: navy.brandId, productId: navy.id });
    const colour = named.brief.requirements.find((r) => r.field === "colour")!;
    assert.equal(colour.kind, "MUST");
    assert.equal(colour.value, "navy");
    assert.ok(named.candidates.every((c) => c.colourMatch !== "mismatch"));

    const unnamed = TEST_PRODUCTS.find(
      (p) => p.brandId === "brand-harbour" && !/navy|stone|forest|black|cream|clay/i.test(p.name),
    );
    if (unnamed) {
      const open = sourceShortlist({ brandId: unnamed.brandId, productId: unnamed.id });
      const req = open.brief.requirements.find((r) => r.field === "colour")!;
      assert.equal(req.kind, "OPEN");
    }
  });

  it("matches mill fabrics that can become the end product — mills do not file product SKUs", () => {
    const polo = TEST_PRODUCTS.find((p) => p.brandId === "brand-northline" && p.category === "Polo")!;
    const result = sourceShortlist({ brandId: polo.brandId, productId: polo.id });
    assert.ok(result.candidates.length > 0);
    assert.ok(result.matchingFabricTotal > 0);
    assert.ok(result.candidates.every((c) => c.matchingFabricCount > 0));
    assert.ok(result.candidates.every((c) => c.matchedFabrics.length > 0));
    assert.ok(
      result.candidates.every((c) =>
        c.matchedFabrics.every((f) => f.possibleEndProducts.includes("Polo")),
      ),
    );
    assert.ok(result.candidates.every((c) => c.dialect !== "pl-fleece"));
  });

  it("reads end products from mill cloth, so a shirting mill is not a fleece mill", () => {
    const shirting = TEST_FACTORIES.find((f) => f.dialect === "it-shirting")!;
    const fleece = TEST_FACTORIES.find((f) => f.dialect === "pl-fleece")!;
    const jersey = TEST_FACTORIES.find((f) => f.dialect === "pt-standard")!;
    const shirtBook = fabricBookFor(shirting);
    const fleeceBook = fabricBookFor(fleece);
    const jerseyBook = fabricBookFor(jersey);
    assert.ok(shirtBook.endProductSupport.some((s) => s.family === "Shirt"));
    assert.ok(!shirtBook.endProductSupport.some((s) => s.family === "Polo"));
    assert.ok(fleeceBook.endProductSupport.some((s) => s.family === "Sweat"));
    assert.ok(!fleeceBook.endProductSupport.some((s) => s.family === "Shirt"));
    assert.ok(jerseyBook.endProductSupport.some((s) => s.family === "Polo"));
    assert.ok(!jerseyBook.endProductSupport.some((s) => s.family === "Shirt"));
  });

  it("shortlists shirting mill books for a shirt, not fleece books", () => {
    const shirt = TEST_PRODUCTS.find((p) => p.category === "Shirt")!;
    const result = sourceShortlist({ brandId: shirt.brandId, productId: shirt.id });
    assert.ok(result.candidates.length > 0);
    assert.ok(result.candidates.some((c) => c.dialect === "it-shirting"));
    assert.ok(result.candidates.every((c) => c.dialect !== "pl-fleece"));
    assert.ok(
      result.candidates.every((c) =>
        c.matchedFabrics.every((f) => f.possibleEndProducts.includes("Shirt")),
      ),
    );
  });

  it("does not treat a fleece mill book as a polo product catalogue", () => {
    const factory = TEST_FACTORIES.find((f) => f.dialect === "pl-fleece")!;
    const book = fabricBookFor(factory);
    assert.equal(book.millSubmits, "fabrics-and-materials");
    assert.ok(book.qualities.length > 0);
    assert.ok(book.endProductSupport.some((s) => s.family === "Sweat"));
    assert.ok(!book.endProductSupport.some((s) => s.family === "Polo"));
  });

  it("marks fabric-book MOQ as historical and never auto-promotes mill GOTS", () => {
    const product = TEST_PRODUCTS.find((p) => p.brandId === "brand-harbour")!;
    const result = sourceShortlist({ brandId: product.brandId, productId: product.id });
    assert.ok(result.candidates.length > 0);
    for (const mill of result.candidates) {
      assert.equal(mill.commercials.freshness, "historical");
      const gotsAuto = mill.evidence.find(
        (e) => e.code === "mill-programme-not-quality" && e.severity === "block",
      );
      assert.equal(gotsAuto, undefined);
      const moq = mill.answerability.find((a) => a.requirementId === "req-moq");
      assert.ok(moq);
      assert.notEqual(moq.result, "on-file");
    }
  });
});
