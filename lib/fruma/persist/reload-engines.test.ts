import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { confirmedHeaderOverlays, resetHeaderOverlaysForTests } from "../intelligence/overlays";
import { postgresLedgerSchema } from "./postgres-schema";
import {
  activeEngineCache,
  reloadEnginesFromDatabase,
  resetEngineCacheForTests,
  type Client,
} from "./reload-engines";

const storeSrc = readFileSync(join(import.meta.dirname, "postgres-store.ts"), "utf8");

describe("reload engines from the active schema", () => {
  it("hydrates the latest active header map and product truth into the cache", async () => {
    resetHeaderOverlaysForTests();
    resetEngineCacheForTests();
    const queries: string[] = [];
    const client: Client = {
      async unsafe(query: string) {
        queries.push(query);
        if (query.includes("current_schema")) return [{ schema_name: "fruma_test" }];
        if (query.includes("fruma_header_maps")) {
          return [
            {
              surface: "test",
              overlays: { Art: "article", Weight: "weight", Noise: "not-a-field" },
              updated_at: "2026-10-07T00:00:00.000Z",
              version: 4,
            },
          ];
        }
        if (query.includes("fruma_product_truth")) {
          return [
            {
              product_id: "prod-1",
              version: 2,
              payload: {
                productId: "prod-1",
                version: 1,
                facts: [],
                evidence: [],
                lockedSourceId: "org_mill:Q75",
              },
            },
          ];
        }
        return [];
      },
    };

    const loaded = await reloadEnginesFromDatabase(client);
    assert.match(queries[1] ?? "", /MAX\(version\)/);
    assert.match(queries[1] ?? "", /is_active = TRUE/);
    assert.match(queries[2] ?? "", /MAX\(version\)/);
    assert.match(queries[2] ?? "", /fruma_product_truth/);
    assert.equal(loaded.headerMaps.length, 1);
    assert.equal(loaded.headerMaps[0]?.overlays.art, "article");
    assert.equal(loaded.headerMaps[0]?.overlays.weight, "weight");
    assert.equal(loaded.headerMaps[0]?.overlays.noise, undefined);
    assert.equal(loaded.productTruth.length, 1);
    assert.equal(loaded.productTruth[0]?.version, 2);
    assert.equal(loaded.productTruth[0]?.productId, "prod-1");

    const cache = activeEngineCache("test");
    assert.equal(cache.headerMaps.length, 1);
    assert.equal(cache.productTruth[0]?.lockedSourceId, "org_mill:Q75");
    assert.equal(confirmedHeaderOverlays("test").weight, "weight");
    assert.match(storeSrc, /reloadEnginesFromDatabase\(sql\)/);

    const ddl = postgresLedgerSchema("fruma_test");
    assert.match(ddl, /fruma_test\.fruma_header_maps[\s\S]*is_active BOOLEAN NOT NULL DEFAULT TRUE/);
    assert.match(ddl, /fruma_test\.fruma_product_truth[\s\S]*is_active BOOLEAN NOT NULL DEFAULT TRUE/);
  });
});
