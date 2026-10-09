import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assertAppendOnlyQuery, setTenantPoolForTests } from "./tenant-query";
import { postBrandHistoryRequest } from "./brand-history-http";
import {
  brandHistoryMatchQuery,
  matchBrandHistory,
  missingQueryDimensions,
  parseBrandHistoryQuery,
} from "./brand-history-match";

afterEach(() => {
  setTenantPoolForTests(null);
});

describe("brand history match", () => {
  it("keeps gsm and width in parameters and reads the live columns", () => {
    assert.equal(parseBrandHistoryQuery({ targetGsm: " 240 GSM ", targetWidth: "150 cm" }).ok, true);
    assert.equal(parseBrandHistoryQuery({ targetGsm: "", targetWidth: "150 cm" }).ok, false);
    assert.equal(parseBrandHistoryQuery({ targetGsm: "240 GSM" }).ok, false);

    const pending = brandHistoryMatchQuery("240 GSM", "150 cm") as unknown as {
      strings: string[];
      args: unknown[];
    };
    const sql = pending.strings.join("?");
    assert.match(sql, /SELECT DISTINCT ON \(e\.source_cell_id\)/);
    assert.match(sql, /e\.standard_field IN \('weight', 'width', 'composition'\)/);
    assert.match(sql, /ORDER BY e\.source_cell_id, e\.occurred_at DESC/);
    assert.match(sql, /LEFT JOIN fruma_brand_historical_articles hist/);
    assert.match(sql, /AS resolved_gsm/);
    assert.match(sql, /LIMIT 12/);
    assert.equal(missingQueryDimensions({ targetGsm: "240 GSM", targetWidth: "150 cm" }), true);
    assert.equal(
      missingQueryDimensions({ targetGsm: "240 GSM", targetWidth: "150 cm", tenantVersion: "demo" }),
      false,
    );
    assert.doesNotMatch(
      sql,
      /search_path|BrandHistoryIngest|corrected_value|mapped_attribute|created_at|swatch_name|warehouse_location|rack_id|hex_variants|fruma_\$\{/,
    );
    assert.doesNotMatch(sql, /240 GSM|150 cm/);
    assert.deepEqual(pending.args, ["240 GSM", "150 cm"]);
    assert.equal(assertAppendOnlyQuery(sql), sql);

    for (const file of [
      "../../../app/api/ledger/brand-history/route.ts",
      "./brand-history-http.ts",
    ]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      assert.doesNotMatch(source, /neonPool|search_path|fruma_\$\{|error\.message/);
    }
    const http = readFileSync(new URL("./brand-history-http.ts", import.meta.url), "utf8");
    assert.match(http, /Infrastructure Environment Offline/);
    assert.match(http, /Missing query dimensions/);
    assert.match(http, /Failed to scan historical warehouse matrix\./);
  });

  it("stays offline when DATABASE_URL is missing", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const response = await postBrandHistoryRequest(
        new Request("http://localhost/api/ledger/brand-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetGsm: "240 GSM", targetWidth: "150 cm", tenantVersion: "demo" }),
        }),
      );
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: "Infrastructure Environment Offline" });
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });

  it("runs the match in a read-only tenant transaction", async () => {
    const calls: { query: string; args: readonly unknown[] }[] = [];
    const modes: string[] = [];
    const tx = Object.assign(
      (strings: TemplateStringsArray | string, ...args: readonly unknown[]) => {
        if (typeof strings === "string") return { identifier: strings };
        const query = strings.reduce((sql, part, index) => {
          const arg = args[index - 1];
          const rendered =
            arg && typeof arg === "object" && "identifier" in arg
              ? `"${String((arg as { identifier: string }).identifier)}"`
              : "?";
          return sql + rendered + part;
        });
        calls.push({ query, args });
        const result = Promise.resolve(
          query.startsWith("SET LOCAL")
            ? []
            : [{ cell_id: "cell-1", gsm: "240 GSM", width: "150 cm" }],
        );
        return Object.assign(result, { strings, args });
      },
      {
        unsafe(query: string, args: readonly unknown[] = []) {
          calls.push({ query, args });
          return Promise.resolve([]);
        },
      },
    );
    setTenantPoolForTests({
      async begin(modeOrCallback: unknown, callback?: unknown) {
        if (typeof modeOrCallback === "string") {
          modes.push(modeOrCallback);
          return (callback as (transaction: typeof tx) => Promise<unknown>)(tx);
        }
        return (modeOrCallback as (transaction: typeof tx) => Promise<unknown>)(tx);
      },
    } as never);

    const matches = await matchBrandHistory("fruma_production", "240 GSM", "150 cm");
    assert.equal(matches.length, 1);
    assert.deepEqual(modes, ["READ ONLY"]);
    assert.match(calls[0]?.query ?? "", /SET LOCAL search_path TO "fruma_production"/);
    const select = calls.find((call) => call.query.includes("fruma_brand_historical_articles"));
    assert.ok(select);
    assert.deepEqual(select?.args, ["240 GSM", "150 cm"]);
  });
});
