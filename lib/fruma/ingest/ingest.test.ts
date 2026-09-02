import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { IngestEngine } from "./engine";
import { IngestException } from "./exceptions";
import { baseQualityId } from "./identity";
import { sha256Hex } from "./hash";
import { buildXlsx } from "./parse-xlsx";
import { VISIBILITY_PRIVATE } from "./types";

const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url));
const CSV_NAME = "synthetic-hanger.csv";
const CSV_PATH = join(FIXTURE_DIR, "fixtures", CSV_NAME);

const MILL = "org_mill_synthetic";
const BRAND = "org_brand_synthetic";

const HANGER_ROWS: string[][] = [
  ["Article", "Construction", "Composition", "Weight", "Width", "Colour", "MOQ", "Customer", "Cert"],
  ["SYN-QA-100", "S/J 30/1", "100% CO", "185gr", "160cm", "Navy", "150M", "", ""],
  ["SYN-QA-100", "S/J 30/1", "100% CO", "185gr", "180cm", "Ecru", "150M", "Brand-X", ""],
  ["", "PIQUE 20/1", "CO 95 / EA 5", "220", "68\"", "NVY", "", "", ""],
  ["SYN-QA-200", "INTERLOCK", "100% CO organic", "8.2 OZ", "180cm", "White", "300M", "", "OEKO-TEX"],
];

function csvBytes(): Uint8Array {
  return new Uint8Array(readFileSync(CSV_PATH));
}

function engine() {
  return new IngestEngine();
}

function depositCsv(ing = engine()) {
  return {
    ing,
    result: ing.deposit({
      supplierOrgId: MILL,
      filename: CSV_NAME,
      bytes: csvBytes(),
      receivedAt: "2026-09-02T11:00:00.000Z",
    }),
  };
}

describe("SPEC 6 ingest — parse csv and xlsx bytes", () => {
  it("parses synthetic csv cells with sheet/row/column as sent", () => {
    const { result } = depositCsv();
    const article = result.cells.find(
      (c) => c.pointer.row === 2 && c.pointer.column === "A",
    );
    assert.ok(article);
    assert.equal(article.pointer.sheet, CSV_NAME);
    assert.equal(article.pointer.row, 2);
    assert.equal(article.pointer.column, "A");
    assert.equal(article.sourceValue, "SYN-QA-100");
    assert.equal(article.header, "Article");
  });

  it("parses synthetic xlsx bytes and keeps the sheet name as written", () => {
    const ing = engine();
    const bytes = buildXlsx([{ name: "HangerList", rows: HANGER_ROWS }]);
    const result = ing.deposit({
      supplierOrgId: MILL,
      filename: "synthetic-hanger.xlsx",
      bytes,
    });
    const width = result.cells.find(
      (c) => c.pointer.sheet === "HangerList" && c.pointer.row === 3 && c.pointer.column === "E",
    );
    assert.ok(width);
    assert.equal(width.sourceValue, "180cm");
    assert.equal(width.header, "Width");
    assert.equal(width.standardField, "width");
  });
});

describe("SPEC 6 ingest — private store", () => {
  it("sha256 of stored private bytes matches the deposited bytes", () => {
    const dir = mkdtempSync(join(tmpdir(), "fruma-ingest-"));
    const ing = new IngestEngine({ privateDir: dir });
    const bytes = csvBytes();
    const result = ing.deposit({
      supplierOrgId: MILL,
      filename: CSV_NAME,
      bytes,
    });
    assert.equal(result.deposit.sha256, sha256Hex(bytes));
    assert.equal(ing.storedSha256(result.deposit.depositId), sha256Hex(bytes));
    const stored = ing.millPrivateBytes(result.deposit.depositId);
    assert.equal(sha256Hex(stored.bytes), result.deposit.sha256);
    assert.deepEqual(Buffer.from(stored.bytes), Buffer.from(bytes));
  });

  it("defaults new deposits to Private — drop is not publish", () => {
    const { result } = depositCsv();
    assert.equal(result.deposit.visibility, VISIBILITY_PRIVATE);
    assert.ok(result.qualities.length > 0);
    assert.ok(result.qualities.every((q) => q.visibility === VISIBILITY_PRIVATE));
  });
});

describe("SPEC 6 ingest — cell pointers and immutable source", () => {
  it("mapped and confirmed cells keep sheet/row/column as sent", () => {
    const { ing, result } = depositCsv();
    const pointer = { sheet: CSV_NAME, row: 2, column: "D" };
    const mapped = ing.mapCell(result.deposit.depositId, pointer, "weight", "185 g/m²");
    const confirmed = ing.confirmCell(result.deposit.depositId, pointer);
    assert.deepEqual(mapped.pointer, pointer);
    assert.deepEqual(confirmed.pointer, pointer);
    assert.equal(mapped.sourceValue, "185gr");
    assert.equal(confirmed.sourceValue, "185gr");
    assert.equal(confirmed.standardValue, "185 g/m²");
    assert.equal(confirmed.confirmed, true);
    assert.notEqual(confirmed.standardValue, confirmed.sourceValue);
  });
});

describe("SPEC 6 ingest — identity D1", () => {
  it("empty article is an exception, not a generated id", () => {
    assert.throws(
      () => baseQualityId(MILL, ""),
      (err: unknown) => err instanceof IngestException && err.code === "empty_article",
    );
    assert.throws(
      () => baseQualityId(MILL, "   "),
      (err: unknown) => err instanceof IngestException && err.code === "empty_article",
    );
    const { result } = depositCsv();
    const empty = result.exceptions.filter((e) => e.code === "empty_article");
    assert.equal(empty.length, 1);
    assert.equal(empty[0]?.pointer?.row, 4);
    assert.equal(empty[0]?.pointer?.column, "A");
    assert.ok(!result.qualities.some((q) => /VDA-24/i.test(q.millArticleCode)));
    assert.ok(!result.qualities.some((q) => q.id.startsWith("vda-")));
    assert.ok(!result.qualities.some((q) => q.millArticleCode === ""));
  });

  it("colourway is a child and width is an attribute — not BaseQuality", () => {
    const { result } = depositCsv();
    const qa100 = result.qualities.find((q) => q.millArticleCode === "SYN-QA-100");
    assert.ok(qa100);
    assert.equal(qa100.id, baseQualityId(MILL, "SYN-QA-100"));
    assert.equal(
      result.qualities.filter((q) => q.millArticleCode === "SYN-QA-100").length,
      1,
    );
    assert.deepEqual(
      qa100.colourways.map((c) => c.colourAsWritten).sort(),
      ["Ecru", "Navy"],
    );
    assert.deepEqual(
      qa100.widths.map((w) => w.valueAsWritten).sort(),
      ["160cm", "180cm"],
    );
    const customerCells = qa100.cells.filter((c) => c.standardField === "customer");
    assert.ok(customerCells.some((c) => c.sourceValue === "Brand-X"));
    assert.equal(result.qualities.length, 2);
  });
});

describe("SPEC 6 ingest — visibility and grants", () => {
  it("brand sees 0 mill-file rows without a named grant", () => {
    const { ing } = depositCsv();
    assert.deepEqual(ing.brandVisibleRows(BRAND), []);
  });

  it("named grant does not leak private bytes", () => {
    const { ing, result } = depositCsv();
    const qa100 = result.qualities.find((q) => q.millArticleCode === "SYN-QA-100");
    assert.ok(qa100);
    ing.grant({
      millOrgId: MILL,
      brandOrgId: BRAND,
      objectIds: [qa100.id],
      fieldClass: "technical",
      actor: { kind: "named_grant", millOrgId: MILL },
    });
    const rows = ing.brandVisibleRows(BRAND);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.baseQualityId, qa100.id);
    assert.equal(rows[0]?.source.exists, true);
    assert.ok(!JSON.stringify(rows).includes(result.deposit.sha256));
    const dumped = JSON.stringify(rows);
    assert.ok(!dumped.includes("private"));
    assert.throws(
      () => ing.brandSourceBytes(BRAND, result.deposit.depositId),
      (err: unknown) => err instanceof IngestException && err.code === "source_bytes_denied",
    );
    assert.deepEqual(ing.brandSourcePointer(BRAND, qa100.id), { exists: true });
    const millBytes = ing.millPrivateBytes(result.deposit.depositId);
    assert.ok(millBytes.bytes.byteLength > 0);
  });

  it("commercial and customer-specific stay denied unless that class is named", () => {
    const { ing, result } = depositCsv();
    const qa100 = result.qualities.find((q) => q.millArticleCode === "SYN-QA-100")!;
    ing.grant({
      millOrgId: MILL,
      brandOrgId: BRAND,
      objectIds: [qa100.id],
      fieldClass: "technical",
      actor: { kind: "named_grant", millOrgId: MILL },
    });
    const fields = ing.brandVisibleRows(BRAND)[0]!.fields;
    assert.ok(fields.some((f) => f.field === "width"));
    assert.ok(!fields.some((f) => f.field === "moq"));
    assert.ok(!fields.some((f) => f.field === "customer"));
    assert.deepEqual(ing.defaultDeniedClasses(), ["commercial", "customer_specific"]);
  });

  it("operator cookie, confidence ≥ 86, and approve-all cannot create Granted", () => {
    const { ing, result } = depositCsv();
    const qa100 = result.qualities.find((q) => q.millArticleCode === "SYN-QA-100")!;
    const denied: Parameters<IngestEngine["grant"]>[0]["actor"][] = [
      { kind: "operator_cookie" },
      { kind: "confidence", value: 91 },
      { kind: "approve_all" },
    ];
    for (const actor of denied) {
      assert.throws(
        () =>
          ing.grant({
            millOrgId: MILL,
            brandOrgId: BRAND,
            objectIds: [qa100.id],
            fieldClass: "technical",
            actor,
          }),
        (err: unknown) => err instanceof IngestException && err.code === "grant_denied",
      );
    }
    assert.throws(
      () => ing.tryElevateVisibility({ kind: "operator_cookie" }, "operator_cookie"),
      (err: unknown) => err instanceof IngestException && err.code === "grant_denied",
    );
    assert.deepEqual(ing.brandVisibleRows(BRAND), []);
    assert.ok(ing.millQualities(MILL).every((q) => q.visibility === VISIBILITY_PRIVATE));
  });

  it("certs are mill-confirmed only — never inferred from organic / GOTS wording", () => {
    const { ing, result } = depositCsv();
    const qa200 = result.qualities.find((q) => q.millArticleCode === "SYN-QA-200");
    assert.ok(qa200);
    assert.equal(qa200.certs.length, 0);
    assert.ok(qa200.cells.some((c) => /organic/i.test(c.sourceValue)));
    ing.grant({
      millOrgId: MILL,
      brandOrgId: BRAND,
      objectIds: [qa200.id],
      fieldClass: "certification",
      actor: { kind: "named_grant", millOrgId: MILL },
    });
    assert.equal(ing.brandVisibleRows(BRAND)[0]?.fields.length, 0);
    ing.confirmCert(qa200.id, "OEKO-TEX");
    const after = ing.brandVisibleRows(BRAND)[0]!.fields;
    assert.ok(after.some((f) => f.field === "cert" && f.sourceValue === "OEKO-TEX"));
    assert.ok(!after.some((f) => /GOTS/i.test(f.sourceValue) || /GOTS/i.test(f.standardValue)));
  });
});

describe("SPEC 6 ingest — no template fake-success", () => {
  it("unparsed or uncertain bytes raise an exception and create no qualities", () => {
    const ing = engine();
    const pdf = new TextEncoder().encode("%PDF-1.4 fake");
    assert.throws(
      () => ing.deposit({ supplierOrgId: MILL, filename: "card.pdf", bytes: pdf }),
      (err: unknown) => err instanceof IngestException && err.code === "unparsed_bytes",
    );
    const ole = Uint8Array.of(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    assert.throws(
      () => ing.deposit({ supplierOrgId: MILL, filename: "list.xls", bytes: ole }),
      (err: unknown) => err instanceof IngestException && err.code === "unparsed_bytes",
    );
    assert.throws(
      () =>
        ing.deposit({
          supplierOrgId: MILL,
          filename: "photo.png",
          bytes: Uint8Array.of(0x89, 0x50, 0x4e, 0x47),
        }),
      (err: unknown) => err instanceof IngestException && err.code === "unparsed_bytes",
    );
    assert.throws(
      () =>
        ing.deposit({
          supplierOrgId: MILL,
          filename: "empty.csv",
          bytes: new Uint8Array(),
        }),
      (err: unknown) => err instanceof IngestException && err.code === "unparsed_bytes",
    );
    assert.throws(
      () =>
        ing.deposit({
          supplierOrgId: MILL,
          filename: "lying.xlsx",
          bytes: new TextEncoder().encode("not-a-zip"),
        }),
      (err: unknown) => err instanceof IngestException && err.code === "uncertain_bytes",
    );
    assert.deepEqual(ing.millQualities(MILL), []);
    assert.deepEqual(ing.brandVisibleRows(BRAND), []);
  });
});
