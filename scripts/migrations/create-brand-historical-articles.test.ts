import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assertAppendOnlyQuery, setTenantPoolForTests } from "../../lib/fruma/persist/tenant-query";
import {
  BRAND_HISTORICAL_ARTICLES_TABLE_SQL,
  BRAND_HISTORICAL_RECALL_INDEX_SQL,
  HISTORICAL_SCHEMAS,
  provisionBrandHistoricalArticles,
} from "./create-brand-historical-articles";

type Call = { namespace: string; statement: string };

function recordingPool() {
  const calls: Call[] = [];
  const tx = (strings: TemplateStringsArray | string, ...args: readonly unknown[]) => {
    if (typeof strings === "string") return { identifier: strings };
    const query = strings.reduce((sql, part, index) => {
      const arg = args[index - 1];
      const rendered =
        arg && typeof arg === "object" && "identifier" in arg
          ? `"${String((arg as { identifier: string }).identifier)}"`
          : "?";
      return sql + rendered + part;
    });
    const result = Promise.resolve([]);
    return Object.assign(result, { query, strings, args });
  };
  return {
    calls,
    pool: {
      async begin<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
        const local: string[] = [];
        const recording = (strings: TemplateStringsArray | string, ...args: readonly unknown[]) => {
          const pending = tx(strings, ...args) as { query?: string };
          if (pending.query) local.push(pending.query.trim());
          return pending;
        };
        const result = await callback(recording);
        const namespace = local
          .find((query) => query.startsWith("SET LOCAL"))
          ?.match(/"([^"]+)"/)?.[1];
        const statement = local.find((query) => !query.startsWith("SET LOCAL"));
        if (namespace && statement) calls.push({ namespace, statement });
        return result;
      },
    },
  };
}

describe("brand historical article migration", () => {
  const source = readFileSync(
    new URL("./create-brand-historical-articles.ts", import.meta.url),
    "utf8",
  );

  afterEach(() => {
    setTenantPoolForTests(null);
  });

  it("keeps PLM recall free of warehouse locations and mutations", () => {
    assert.match(source, /executeTenantQuery/);
    for (const namespace of HISTORICAL_SCHEMAS) assert.match(source, new RegExp(namespace));
    assert.equal(
      BRAND_HISTORICAL_ARTICLES_TABLE_SQL,
      `CREATE TABLE IF NOT EXISTS fruma_brand_historical_articles (
  article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_org_id TEXT NOT NULL,        -- Links back to the physical textile mill
  article_code TEXT NOT NULL,           -- The brand's internal style identifier (e.g., JK-2026)
  composition TEXT NOT NULL,            -- The verified fabric breakdown text string
  material_hash TEXT NOT NULL,          -- Generated from the standardized source cell text
  last_ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()::timestamptz
);`,
    );
    assert.equal(
      BRAND_HISTORICAL_RECALL_INDEX_SQL,
      `CREATE INDEX IF NOT EXISTS brand_historical_recall_idx 
  ON fruma_brand_historical_articles(material_hash, supplier_org_id);`,
    );
    assert.equal(
      assertAppendOnlyQuery(BRAND_HISTORICAL_ARTICLES_TABLE_SQL),
      BRAND_HISTORICAL_ARTICLES_TABLE_SQL,
    );
    assert.equal(
      assertAppendOnlyQuery(BRAND_HISTORICAL_RECALL_INDEX_SQL),
      BRAND_HISTORICAL_RECALL_INDEX_SQL,
    );
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i);
    assert.doesNotMatch(
      `${BRAND_HISTORICAL_ARTICLES_TABLE_SQL}\n${BRAND_HISTORICAL_RECALL_INDEX_SQL}`,
      /warehouse|bin_location|aisle|pallet|shelf/i,
    );
    assert.doesNotMatch(BRAND_HISTORICAL_ARTICLES_TABLE_SQL, /location/i);
  });

  it("opens one tenant transaction per statement in each schema", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await provisionBrandHistoricalArticles();

    assert.equal(recorded.calls.length, HISTORICAL_SCHEMAS.length * 3);
    for (const namespace of HISTORICAL_SCHEMAS) {
      const statements = recorded.calls
        .filter((call) => call.namespace === namespace)
        .map((call) => call.statement);
      assert.deepEqual(statements, [
        `CREATE SCHEMA IF NOT EXISTS ${namespace}`,
        BRAND_HISTORICAL_ARTICLES_TABLE_SQL,
        BRAND_HISTORICAL_RECALL_INDEX_SQL,
      ]);
    }
  });
});
