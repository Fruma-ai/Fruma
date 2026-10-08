import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { StudioCarousel } from "../../../components/fruma/StudioCarousel";
import type { MaterialSearchHit } from "../persist";
import { MATERIAL_EMBEDDING_DIMENSIONS } from "../persist/embeddings";
import { COMPLIANCE_READY_COEFFICIENT, DESIGN_SEARCH_RESULT_LIMIT } from "./rerank";
import { loadStudioVectorSearch, readFounderTenant } from "./studio-search";

const TEST_PASS = "studio-search-password";

function hit(distance: number): MaterialSearchHit {
  return {
    cosineDistance: distance,
    supplierOrgId: "org_mill_synthetic",
    mutations: [
      {
        eventId: "evt-article",
        sourceCellId: "cell-article",
        operatorCookie: "secret-operator-cookie",
        actionType: "map",
        oldStandardValue: null,
        newStandardValue: "HX-100",
        standardField: "article",
        occurredAt: "2026-10-08T00:00:00.000Z",
      },
    ],
    cell: {
      id: "cell-article",
      depositId: "dep-1",
      sheetName: "mill.csv",
      rowIndex: 2,
      colIndex: 1,
      rawHeader: "Article",
      sourceValue: "HX-100",
      normalizedValue: null,
    },
  };
}

describe("founder tenant for studio search", () => {
  it("rejects a schema cookie that is not a founder session", async () => {
    const gate = await readFounderTenant(
      {
        get: () => ({ value: "fruma_production" }),
        getAll: () => [{ name: "fruma_env", value: "fruma_production" }],
      },
      async () => null,
    );
    assert.equal(gate, null);
  });

  it("uses the founder session cookie name as the tenant schema", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const token = await sessionToken("owen");
    const gate = await readFounderTenant(
      {
        get: (name) => (name === DEMO_COOKIE ? { value: token } : undefined),
        getAll: () => [{ name: DEMO_COOKIE, value: token }],
      },
      async (cookie) => (cookie === token ? "owen" : null),
    );
    assert.deepEqual(gate, { founder: "owen", namespace: "fruma_demo" });
  });
});

describe("studio vector loader", () => {
  it("forwards a 1536-d brief and reranks the HNSW window", async () => {
    let seen: readonly number[] | null = null;
    const loaded = await loadStudioVectorSearch(
      { prompt: "220 gsm cotton mesh", complianceTarget: null },
      {
        searchMaterialEmbeddings: async (embedding) => {
          seen = embedding;
          return [hit(0.4), hit(0.2)];
        },
      },
    );
    assert.equal(seen?.length, MATERIAL_EMBEDDING_DIMENSIONS);
    assert.equal(loaded.hnswMatchCount, 2);
    assert.equal(loaded.hits[0]?.millArticleCode, "HX-100");
    assert.equal(loaded.hits[0]?.score, 1 - 0.2);
    assert.equal(JSON.stringify(loaded).includes("secret-operator-cookie"), false);
    assert.equal(COMPLIANCE_READY_COEFFICIENT, 1.25);
    assert.equal(DESIGN_SEARCH_RESULT_LIMIT, 50);
  });

  it("reports zero HNSW matches without inventing catalog rows", async () => {
    const loaded = await loadStudioVectorSearch(
      { prompt: "unmatched silk", complianceTarget: "EU_DPP" },
      {
        searchMaterialEmbeddings: async () => [],
        listActiveProductTruthEvidence: async () => {
          throw new Error("evidence must not be read when the HNSW scan is empty");
        },
      },
    );
    assert.deepEqual(loaded, { hnswMatchCount: 0, materials: [], hits: [] });
  });
});

describe("studio carousel empty state", () => {
  it("shows the empty catalog only when the HNSW scan returned zero rows", () => {
    const idle = renderToStaticMarkup(
      createElement(StudioCarousel, {
        activeSchema: "demo",
        materials: [],
        hnswMatchCount: null,
        onInspectMaterial: () => {},
      }),
    );
    const empty = renderToStaticMarkup(
      createElement(StudioCarousel, {
        activeSchema: "demo",
        materials: [],
        hnswMatchCount: 0,
        onInspectMaterial: () => {},
      }),
    );
    const suppressed = renderToStaticMarkup(
      createElement(StudioCarousel, {
        activeSchema: "demo",
        materials: [],
        hnswMatchCount: 3,
        onInspectMaterial: () => {},
      }),
    );
    assert.equal(idle, "");
    assert.match(empty, /No matching material specifications provisioned in this connection path/);
    assert.equal(suppressed, "");
  });
});

describe("qualities page source", () => {
  const page = readFileSync(join(process.cwd(), "app/(ledger)/qualities/page.tsx"), "utf8");
  const loader = readFileSync(join(process.cwd(), "lib/fruma/design/studio-search.ts"), "utf8");
  const rerank = readFileSync(join(process.cwd(), "lib/fruma/design/rerank.ts"), "utf8");

  it("loads search on the server and stays free of mutating statements", () => {
    assert.equal(page.includes('"use client"'), false);
    assert.match(page, /sessionFounder/);
    assert.match(page, /loadStudioVectorSearch/);
    assert.match(page, /searchMaterialEmbeddings/);
    assert.match(loader, /briefEmbedding/);
    assert.match(loader, /rerankByComplianceReadiness/);
    assert.match(loader, /MATERIAL_EMBEDDING_DIMENSIONS/);
    assert.match(rerank, /COMPLIANCE_READY_COEFFICIENT = 1\.25/);
    assert.match(rerank, /DESIGN_SEARCH_RESULT_LIMIT/);
    const sources = [page, loader, readFileSync(join(process.cwd(), "components/fruma/StudioCarousel.tsx"), "utf8")];
    for (const source of sources) {
      assert.equal(/\b(?:UPDATE|DELETE|DROP)\b/.test(source), false);
    }
  });
});
