import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { groupSearchRows } from "./postgres-store";

const CELL = {
  id: "cell-1",
  deposit_id: "dep-1",
  sheet_name: "mill.csv",
  row_index: 2,
  col_index: 1,
  raw_header: "Composition",
  source_value: "100% Cotton Mesh",
  normalized_value: "100% cotton mesh",
  supplier_org_id: "org_vale_do_ave",
  distance: 0.02,
  event_id: "evt-1",
  operator_cookie: "owen",
  action_type: "confirm",
  old_standard_value: null,
  new_standard_value: "100% Cotton Mesh",
  standard_field: "composition",
  occurred_at: "2026-10-01T00:00:00.000Z",
  source_cell_id: "cell-1",
};

describe("historical PLM recall on the vector search", () => {
  it("leaves the materialized HNSW scan intact and left-joins brand history", () => {
    const store = readFileSync(join(process.cwd(), "lib/fruma/persist/postgres-store.ts"), "utf8");
    const start = store.indexOf("async searchMaterialEmbeddings");
    const end = store.indexOf("async listActiveProductTruthEvidence");
    const search = store.slice(start, end);
    const cte = `WITH nearest AS MATERIALIZED (
        SELECT
          emb.source_cell_id,
          (emb.embedding OPERATOR(public.<=>) $vector::public.vector) AS cosine_distance
        FROM \${schema}."fruma_material_embeddings" emb
        ORDER BY emb.embedding OPERATOR(public.<=>) $vector::public.vector ASC
        LIMIT 50
      )`;
    assert.equal(search.includes(cte), true);
    const limitAt = search.indexOf("LIMIT 50");
    assert.equal(limitAt < search.indexOf("fruma_brand_historical_articles"), true);
    assert.match(
      search,
      /LEFT JOIN \$\{schema\}\."fruma_brand_historical_articles" hist\s+ON hist\.material_hash = c\.normalized_value\s+AND hist\.supplier_org_id = d\.supplier_org_id/,
    );
    assert.match(search, /hist\.article_code/);
    assert.match(search, /hist\.last_ordered_at/);
    assert.equal(/\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i.test(search), false);
    assert.equal(/MIN\s*\(/.test(search), false);
    assert.equal(/GROUP BY/.test(search), false);
  });

  it("returns article_code and last_ordered_at without repeating mutation rows", () => {
    const rows = groupSearchRows([
      {
        ...CELL,
        article_code: "JK-2024",
        last_ordered_at: "2024-03-01T00:00:00.000Z",
      },
      {
        ...CELL,
        article_code: "JK-2026",
        last_ordered_at: "2026-01-15T00:00:00.000Z",
      },
      {
        ...CELL,
        article_code: null,
        last_ordered_at: null,
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.mutations.length, 1);
    assert.deepEqual(rows[0]?.historicalArticles, [
      { articleCode: "JK-2026", lastOrderedAt: "2026-01-15T00:00:00.000Z" },
      { articleCode: "JK-2024", lastOrderedAt: "2024-03-01T00:00:00.000Z" },
    ]);
  });
});
