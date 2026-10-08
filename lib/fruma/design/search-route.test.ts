import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { FileSpineStore, getSpineStore, setSpineStoreForTests } from "../persist";
import type { PersistedCellMutation, PersistedSourceCell } from "../persist";
import { cosineDistance } from "../persist/embeddings";
import { COMPLIANCE_READY_COEFFICIENT, rerankByComplianceReadiness, type SearchResult } from "./rerank";
import { handleDesignSearchRequest } from "./search-http";

const TEST_PASS = "spec8-test-password";
const FILE_BYTES = Uint8Array.from([9, 8, 7, 6]);
const DIMS = 1536;

async function signedCookie(): Promise<string> {
  process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
  return `${DEMO_COOKIE}=${await sessionToken("owen")}`;
}

function searchRequest(args: {
  cookie?: string;
  version?: string;
  body?: unknown;
  rawBody?: string;
}): Request {
  const headers = new Headers();
  if (args.cookie) headers.set("cookie", args.cookie);
  if (args.version) headers.set("x-fruma-version", args.version);
  if (args.body !== undefined || args.rawBody !== undefined) {
    headers.set("content-type", "application/json");
  }
  return new Request("http://localhost/api/design/search", {
    method: "POST",
    headers,
    body: args.rawBody ?? (args.body === undefined ? undefined : JSON.stringify(args.body)),
  });
}

function collectKeys(value: unknown, acc = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return acc;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, acc);
    return acc;
  }
  for (const [key, child] of Object.entries(value)) {
    acc.add(key);
    collectKeys(child, acc);
  }
  return acc;
}

function axis(index: number): number[] {
  const values = Array.from({ length: DIMS }, () => 0);
  values[index] = 1;
  return values;
}

function embeddingId(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function cell(partial: PersistedSourceCell): PersistedSourceCell {
  return partial;
}

function mutation(partial: PersistedCellMutation): PersistedCellMutation {
  return partial;
}

async function seedCatalog() {
  const store = getSpineStore("demo");
  await store.saveDepositPointer(
    {
      depositId: "dep-mill",
      supplierOrgId: "org_mill_synthetic",
      filename: "factory.csv",
      sha256: "e".repeat(64),
      byteLength: FILE_BYTES.byteLength,
      receivedAt: "2026-05-01T00:00:00.000Z",
      objectKey: "dep-mill.bin",
    },
    FILE_BYTES,
  );
  await store.saveSourceCells([
    cell({
      id: "cell-near",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 1,
      rawHeader: "Art. No",
      sourceValue: "HX-100",
      normalizedValue: null,
    }),
    cell({
      id: "cell-weave",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 2,
      rawHeader: "Weave",
      sourceValue: "Twill",
      normalizedValue: null,
    }),
    cell({
      id: "cell-far",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 3,
      colIndex: 1,
      rawHeader: "Art. No",
      sourceValue: "HX-900",
      normalizedValue: null,
    }),
    cell({
      id: "cell-decoy",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 4,
      colIndex: 1,
      rawHeader: "Internal note",
      sourceValue: "do not rank",
      normalizedValue: null,
    }),
  ]);
  await store.appendCellMutation(
    mutation({
      eventId: "evt-near",
      sourceCellId: "cell-near",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "STANDARD-HX",
      standardField: "article",
      occurredAt: "2026-05-02T00:00:00.000Z",
    }),
  );
  await store.appendCellMutation(
    mutation({
      eventId: "evt-far",
      sourceCellId: "cell-far",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "STANDARD-FAR",
      standardField: "article",
      occurredAt: "2026-05-02T00:00:00.000Z",
    }),
  );
  await store.saveMaterialEmbedding({
    id: embeddingId(1),
    sourceCellId: "cell-near",
    embedding: axis(0),
    updatedAt: "2026-05-03T00:00:00.000Z",
  });
  await store.saveMaterialEmbedding({
    id: embeddingId(2),
    sourceCellId: "cell-far",
    embedding: axis(1),
    updatedAt: "2026-05-03T00:00:00.000Z",
  });
  await store.saveMaterialEmbedding({
    id: embeddingId(3),
    sourceCellId: "cell-decoy",
    embedding: axis(0),
    updatedAt: "2026-05-03T00:00:00.000Z",
  });
}

describe("POST /api/design/search", { concurrency: 1 }, () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fruma-design-search-"));
    setSpineStoreForTests(new FileSpineStore(dir));
  });

  afterEach(() => {
    setSpineStoreForTests(null);
  });

  it("measures cosine distance the same way pgvector <=> does", () => {
    assert.equal(cosineDistance(axis(0), axis(0)), 0);
    assert.equal(cosineDistance(axis(0), axis(1)), 1);
    assert.equal(cosineDistance(axis(0), axis(0).map((value) => -value)), 2);
    assert.equal(cosineDistance(Array.from({ length: DIMS }, () => 0), axis(0)), 1);
  });

  it("joins embeddings to source cells and replays mutation events in the schema query", () => {
    const route = readFileSync(join(process.cwd(), "app/api/design/search/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/design/search-http.ts"), "utf8");
    const store = readFileSync(join(process.cwd(), "lib/fruma/persist/postgres-store.ts"), "utf8");
    assert.match(route, /export async function POST\(request: Request\)/);
    assert.match(handler, /surfaceFromRequest\(request\)/);
    assert.match(handler, /requireTestFounder\(request\)/);
    assert.match(handler, /getSpineStore\(surface\)/);
    assert.match(handler, /searchMaterialEmbeddings\(embedding\)/);
    assert.match(handler, /listActiveProductTruthEvidence\(\)/);
    assert.match(handler, /rerankByComplianceReadiness\(/);
    assert.match(handler, /complianceTarget/);
    assert.match(handler, /search_path/);
    const rerank = readFileSync(join(process.cwd(), "lib/fruma/design/rerank.ts"), "utf8");
    assert.match(rerank, /export function rerankByComplianceReadiness/);
    assert.equal(rerank.includes("getSpineStore"), false);
    assert.equal(handler.includes("getDepositBytes"), false);
    const start = store.indexOf("async searchMaterialEmbeddings");
    const end = store.indexOf("async reset()");
    const body = store.slice(start, end);
    assert.match(body, /<=>/);
    const searchEnd = store.indexOf("async listActiveProductTruthEvidence");
    const search = store.slice(start, searchEnd);
    assert.match(search, /WITH nearest AS MATERIALIZED \(/);
    assert.match(search, /\.replaceAll\("\$vector", "\$1"\)/);
    assert.match(
      search,
      /ORDER BY emb\.embedding OPERATOR\(public\.<=>\) \$vector::public\.vector ASC\s+LIMIT 50/,
    );
    assert.equal(/MIN\s*\(/.test(search), false);
    assert.equal(/GROUP BY/.test(search), false);
    const scan = search.slice(search.indexOf("WITH nearest AS MATERIALIZED"));
    const limitAt = scan.indexOf("LIMIT 50");
    assert.equal(limitAt < scan.indexOf("fruma_source_cells"), true);
    assert.equal(limitAt < scan.indexOf("fruma_deposits"), true);
    assert.match(body, /fruma_material_embeddings/);
    assert.match(body, /INNER JOIN/);
    assert.match(body, /fruma_source_cells/);
    assert.match(body, /LEFT JOIN/);
    assert.match(body, /fruma_cell_mutation_events/);
    assert.match(body, /public\.vector/);
    assert.match(body, /LIMIT 50/);
    assert.match(body, /fruma_product_truth_facts/);
    assert.match(body, /fruma_product_truth/);
    assert.match(body, /MAX\(version\)/);
    assert.match(body, /is_active = TRUE/);
    assert.equal(body.includes("bytes"), false);
  });

  it("returns 401 without a founder cookie and 400 for a bad embedding", async () => {
    const missing = await handleDesignSearchRequest(searchRequest({ body: { embedding: axis(0) } }));
    assert.equal(missing.status, 401);
    assert.equal(missing.surface, "demo");

    const cookie = await signedCookie();
    const junk = await handleDesignSearchRequest(searchRequest({ cookie, rawBody: "not-json" }));
    assert.equal(junk.status, 400);
    assert.equal(junk.surface, "demo");
    const short = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: [0.1, 0.2] } }),
    );
    assert.equal(short.status, 400);
    const infinite = axis(0);
    infinite[0] = Number.POSITIVE_INFINITY;
    const nonFinite = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: infinite } }),
    );
    assert.equal(nonFinite.status, 400);
    const badTarget = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0), complianceTarget: "US_FTC" } }),
    );
    assert.equal(badTarget.status, 400);
  });

  it("keeps an EU DPP match visible and warns when traceability evidence is missing or expired", async () => {
    await seedCatalog();
    const cookie = await signedCookie();
    const open = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0), complianceTarget: "EU_DPP" } }),
    );
    assert.equal(open.status, 200);
    if (open.status !== 200) return;
    assert.equal(open.body.length, 2);
    assert.equal(open.body[0]?.millArticleCode, "HX-100");
    assert.equal(open.body[0]?.compliance_warning?.status, "compliance_warning");
    assert.equal(open.body[0]?.compliance_warning?.complianceTarget, "EU_DPP");
    assert.equal(open.body[0]?.compliance_warning?.qualityId, "bq:org_mill_synthetic:HX-100");
    assert.equal(open.body[0]?.cells.find((cell) => cell.header === "Art. No")?.sourceValue, "HX-100");
    assert.equal(open.body[1]?.compliance_warning?.status, "compliance_warning");

    const store = getSpineStore("demo");
    await store.saveProductTruth({
      productId: "prod-dpp",
      version: 1,
      facts: [
        {
          id: "fact-trace-v1",
          productId: "prod-dpp",
          field: "traceability",
          value: "lot-1",
          sourceType: "evidence-document",
          sourceCellId: "cell-near",
          scope: "quality",
          status: "evidenced",
          evidenceId: "ev-trace",
          version: 1,
        },
      ],
      evidence: [
        {
          id: "ev-trace",
          claim: "traceability",
          scope: "quality",
          subjectId: "someone-else",
          documentId: "doc-trace-1",
          status: "current",
          validUntil: "2099-01-01T00:00:00.000Z",
        },
      ],
    });
    const covered = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0), complianceTarget: "EU_DPP" } }),
    );
    assert.equal(covered.status, 200);
    if (covered.status !== 200) return;
    const near = covered.body.find((row) => row.millArticleCode === "HX-100");
    const far = covered.body.find((row) => row.millArticleCode === "HX-900");
    assert.equal(near?.compliance_warning, undefined);
    assert.equal(far?.compliance_warning?.status, "compliance_warning");

    await store.saveProductTruth({
      productId: "prod-dpp",
      version: 1,
      facts: [],
      evidence: [
        {
          id: "ev-trace-old",
          claim: "circularity",
          scope: "quality",
          subjectId: "bq:org_mill_synthetic:HX-100",
          documentId: "doc-old",
          status: "current",
          validUntil: "2000-01-01T00:00:00.000Z",
        },
      ],
    });
    const expired = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0), complianceTarget: "EU_DPP" } }),
    );
    assert.equal(expired.status, 200);
    if (expired.status !== 200) return;
    assert.equal(
      expired.body.find((row) => row.millArticleCode === "HX-100")?.compliance_warning?.status,
      "compliance_warning",
    );

    const uk = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0), complianceTarget: "UK_STANDARDS" } }),
    );
    const absent = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0), complianceTarget: null } }),
    );
    assert.equal(uk.status, 200);
    assert.equal(absent.status, 200);
    if (uk.status !== 200 || absent.status !== 200) return;
    assert.equal(uk.body[0]?.compliance_warning, undefined);
    assert.equal(absent.body[0]?.compliance_warning, undefined);
    assert.equal(uk.body.length, 2);
  });

  it("reranks the ten closest matches when certificates are evidenced and human-confirmed", async () => {
    const confirmed = {
      status: "evidenced" as const,
      confirmedBy: "owen",
      confirmedAt: "2026-10-07T15:00:00.000Z",
      documentId: "doc-1",
      evidenceStatus: "current" as const,
      validUntil: "2099-01-01T00:00:00.000Z",
    };
    function row(id: string, cosineDistance: number, certificates: SearchResult["certificates"]): SearchResult {
      return { id, cosineDistance, rank: 0, certificates };
    }
    const ready = row("ready", 0.2, [
      { claim: "traceability", confirmedBy: confirmed.confirmedBy, confirmedAt: confirmed.confirmedAt, status: confirmed.status, documentId: "doc-trace", evidenceStatus: "current", validUntil: confirmed.validUntil },
      { claim: "circularity", confirmedBy: confirmed.confirmedBy, confirmedAt: confirmed.confirmedAt, status: confirmed.status, documentId: "doc-circ", evidenceStatus: "current", validUntil: confirmed.validUntil },
    ]);
    const closer = row("closer", 0.05, []);
    const partial = row("partial", 0.2, [ready.certificates![0]!]);
    const unconfirmed = row("unconfirmed", 0.2, [
      { ...ready.certificates![0]!, confirmedBy: null },
      ready.certificates![1]!,
    ]);
    const ranked = rerankByComplianceReadiness([closer, ready, partial, unconfirmed], "EU_DPP");
    assert.equal(ranked[0]?.id, "ready");
    assert.equal(ranked[0]?.rank, 1);
    assert.equal(ranked[1]?.id, "closer");
    assert.equal(ranked[0]?.score, (1 - 0.2) * COMPLIANCE_READY_COEFFICIENT);
    assert.equal(ranked[1]?.score, 1 - 0.05);
    assert.equal("certificates" in (ranked[0] ?? {}), false);

    const uk = rerankByComplianceReadiness(
      [
        row("plain", 0.1, []),
        row("certified", 0.2, [
          { claim: "cert", status: "evidenced", confirmedBy: "owen", confirmedAt: confirmed.confirmedAt, documentId: "doc-cert", evidenceStatus: "current", validUntil: null },
        ]),
      ],
      "UK_STANDARDS",
    );
    assert.equal(uk[0]?.id, "certified");

    const untouched = rerankByComplianceReadiness([closer, ready], "");
    assert.deepEqual(untouched.map((item) => item.id), ["closer", "ready"]);

    const overflow = Array.from({ length: 11 }, (_, index) =>
      row(`q${index}`, index / 100, index === 10 ? ready.certificates : []),
    );
    const ten = rerankByComplianceReadiness(overflow, "EU_DPP");
    assert.equal(ten.length, 10);
    assert.equal(ten.some((item) => item.id === "q10"), false);
  });

  it("bubbles a fully certified quality above a closer uncertified match inside the active schema", async () => {
    const store = getSpineStore("demo");
    const bytes = Uint8Array.from([1, 2, 3]);
    await store.saveDepositPointer(
      {
        depositId: "dep-rank",
        supplierOrgId: "org_mill_synthetic",
        filename: "rank.csv",
        sha256: "a".repeat(64),
        byteLength: bytes.byteLength,
        receivedAt: "2026-10-07T16:00:00.000Z",
        objectKey: "dep-rank.bin",
      },
      bytes,
    );
    await store.saveSourceCells([
      {
        id: "cell-near-rank",
        depositId: "dep-rank",
        sheetName: "Sheet1",
        rowIndex: 2,
        colIndex: 1,
        rawHeader: "Art. No",
        sourceValue: "Q-NEAR",
        normalizedValue: null,
      },
      {
        id: "cell-ready-rank",
        depositId: "dep-rank",
        sheetName: "Sheet1",
        rowIndex: 3,
        colIndex: 1,
        rawHeader: "Art. No",
        sourceValue: "Q-READY",
        normalizedValue: null,
      },
    ]);
    for (const [eventId, sourceCellId] of [
      ["evt-near-rank", "cell-near-rank"],
      ["evt-ready-rank", "cell-ready-rank"],
    ] as const) {
      await store.appendCellMutation({
        eventId,
        sourceCellId,
        operatorCookie: "secret-operator-cookie",
        actionType: "map",
        oldStandardValue: null,
        newStandardValue: "STD",
        standardField: "article",
        occurredAt: "2026-10-07T16:01:00.000Z",
      });
    }
    const readyVector = axis(0);
    readyVector[1] = 0.05;
    await store.saveMaterialEmbedding({
      id: embeddingId(40),
      sourceCellId: "cell-near-rank",
      embedding: axis(0),
      updatedAt: "2026-10-07T16:02:00.000Z",
    });
    await store.saveMaterialEmbedding({
      id: embeddingId(41),
      sourceCellId: "cell-ready-rank",
      embedding: readyVector,
      updatedAt: "2026-10-07T16:02:00.000Z",
    });
    const confirmedAt = "2026-10-07T16:03:00.000Z";
    await store.saveProductTruth({
      productId: "prod-ready",
      version: 1,
      facts: [
        {
          id: "fact-trace-ready",
          productId: "prod-ready",
          field: "traceability",
          value: "lot-ready",
          sourceType: "evidence-document",
          scope: "quality",
          status: "evidenced",
          evidenceId: "ev-trace-ready",
          confirmedBy: "owen",
          confirmedAt,
          version: 1,
        },
        {
          id: "fact-circ-ready",
          productId: "prod-ready",
          field: "circularity",
          value: "closed-loop",
          sourceType: "evidence-document",
          scope: "quality",
          status: "evidenced",
          evidenceId: "ev-circ-ready",
          confirmedBy: "owen",
          confirmedAt,
          version: 1,
        },
      ],
      evidence: [
        {
          id: "ev-trace-ready",
          claim: "traceability",
          scope: "quality",
          subjectId: "bq:org_mill_synthetic:Q-READY",
          documentId: "doc-trace-ready",
          status: "current",
          validUntil: "2099-01-01T00:00:00.000Z",
        },
        {
          id: "ev-circ-ready",
          claim: "circularity",
          scope: "quality",
          subjectId: "bq:org_mill_synthetic:Q-READY",
          documentId: "doc-circ-ready",
          status: "current",
          validUntil: "2099-01-01T00:00:00.000Z",
        },
      ],
    });

    const cookie = await signedCookie();
    const result = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0), complianceTarget: "EU_DPP" } }),
    );
    assert.equal(result.status, 200);
    if (result.status !== 200) return;
    assert.deepEqual(
      result.body.map((row) => row.millArticleCode),
      ["Q-READY", "Q-NEAR"],
    );
    assert.equal(result.body[0]?.rank, 1);
    assert.ok((result.body[0]?.score ?? 0) > (result.body[1]?.score ?? 0));
    assert.equal(result.body[0]?.compliance_warning, undefined);
    assert.equal(result.body[1]?.compliance_warning?.status, "compliance_warning");
    assert.equal(collectKeys(result.body).has("certificates"), false);
  });

  it("defaults a missing version header to demo and accepts test", async () => {
    const cookie = await signedCookie();
    const missing = await handleDesignSearchRequest(searchRequest({ cookie, body: { embedding: axis(0) } }));
    assert.equal(missing.status, 200);
    assert.equal(missing.surface, "demo");
    if (missing.status === 200) assert.deepEqual(missing.body, []);
    const testSurface = await handleDesignSearchRequest(
      searchRequest({ cookie, version: "test", body: { embedding: axis(0) } }),
    );
    assert.equal(testSurface.status, 200);
    assert.equal(testSurface.surface, "test");
  });

  it("ranks the closest replayed qualities and leaves file bytes out", async () => {
    await seedCatalog();
    const cookie = await signedCookie();
    const result = await handleDesignSearchRequest(
      searchRequest({ cookie, version: "test", body: { embedding: axis(0) } }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.surface, "test");
    if (result.status !== 200) return;
    assert.equal(result.body.length, 2);
    assert.equal(collectKeys(result.body).has("bytes"), false);

    const [near, far] = result.body;
    assert.equal(near?.rank, 1);
    assert.equal(near?.cosineDistance, 0);
    assert.equal(near?.millArticleCode, "HX-100");
    assert.equal(near?.id, "bq:org_mill_synthetic:HX-100");
    const nearArticle = near?.cells.find((row) => row.header === "Art. No");
    assert.equal(nearArticle?.sourceValue, "HX-100");
    assert.equal(nearArticle?.standardField, "article");
    assert.equal(nearArticle?.standardValue, "STANDARD-HX");
    const weave = near?.cells.find((row) => row.header === "Weave");
    assert.equal(weave?.sourceValue, "Twill");
    assert.equal(weave?.column, "B");
    assert.equal(weave?.standardField, null);
    assert.equal(weave?.standardValue, null);

    assert.equal(far?.rank, 2);
    assert.equal(far?.cosineDistance, 1);
    assert.equal(far?.millArticleCode, "HX-900");
    const farArticle = far?.cells.find((row) => row.header === "Art. No");
    assert.equal(farArticle?.sourceValue, "HX-900");
    assert.equal(farArticle?.standardValue, "STANDARD-FAR");
    assert.equal(
      result.body.some((row) => row.cells.some((cell) => cell.sourceValue === "do not rank")),
      false,
    );
  });

  it("returns at most the ten closest qualities", async () => {
    const store = getSpineStore("demo");
    await store.saveDepositPointer(
      {
        depositId: "dep-many",
        supplierOrgId: "org_mill_synthetic",
        filename: "many.csv",
        sha256: "f".repeat(64),
        byteLength: 1,
        receivedAt: "2026-05-04T00:00:00.000Z",
        objectKey: "dep-many.bin",
      },
      Uint8Array.from([1]),
    );
    const cells: PersistedSourceCell[] = [];
    for (let index = 0; index < 12; index += 1) {
      const code = `Q${index.toString().padStart(2, "0")}`;
      cells.push(
        cell({
          id: `cell-q-${code}`,
          depositId: "dep-many",
          sheetName: "Sheet1",
          rowIndex: index + 2,
          colIndex: 1,
          rawHeader: "Art. No",
          sourceValue: code,
          normalizedValue: null,
        }),
      );
    }
    await store.saveSourceCells(cells);
    for (let index = 0; index < cells.length; index += 1) {
      const row = cells[index]!;
      await store.appendCellMutation(
        mutation({
          eventId: `evt-q-${row.id}`,
          sourceCellId: row.id,
          operatorCookie: "secret-operator-cookie",
          actionType: "map",
          oldStandardValue: null,
          newStandardValue: `STD-${row.sourceValue}`,
          standardField: "article",
          occurredAt: "2026-05-04T01:00:00.000Z",
        }),
      );
      await store.saveMaterialEmbedding({
        id: embeddingId(20 + index),
        sourceCellId: row.id,
        embedding: axis(index),
        updatedAt: "2026-05-04T02:00:00.000Z",
      });
    }

    const cookie = await signedCookie();
    const result = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0) } }),
    );
    assert.equal(result.status, 200);
    if (result.status !== 200) return;
    assert.equal(result.body.length, 10);
    assert.deepEqual(
      result.body.map((row) => row.millArticleCode),
      ["Q00", "Q01", "Q02", "Q03", "Q04", "Q05", "Q06", "Q07", "Q08", "Q09"],
    );
    assert.deepEqual(
      result.body.map((row) => row.rank),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    assert.equal(result.body[0]?.cosineDistance, 0);
    assert.equal(result.body[1]?.cosineDistance, 1);
    assert.equal(result.body[0]?.cells[0]?.sourceValue, "Q00");
    assert.equal(result.body[0]?.cells[0]?.standardValue, "STD-Q00");
  });
});
