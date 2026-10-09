import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assertAppendOnlyQuery, setTenantPoolForTests } from "../../lib/fruma/persist/tenant-query";
import {
  NAMED_GRANTS_INDEX_SQL,
  NAMED_GRANTS_SCHEMAS,
  NAMED_GRANTS_TABLE_SQL,
  provisionNamedGrantsLedger,
} from "./create-named-grants-ledger";

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

describe("named grants ledger migration", () => {
  const source = readFileSync(new URL("./create-named-grants-ledger.ts", import.meta.url), "utf8");

  afterEach(() => {
    setTenantPoolForTests(null);
  });

  it("creates the grants table through the tenant query path", () => {
    assert.match(source, /executeTenantQuery/);
    for (const namespace of NAMED_GRANTS_SCHEMAS) assert.match(source, new RegExp(namespace));
    assert.match(NAMED_GRANTS_TABLE_SQL, /CREATE TABLE IF NOT EXISTS fruma_named_grants/);
    assert.match(NAMED_GRANTS_TABLE_SQL, /grant_id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    assert.match(NAMED_GRANTS_TABLE_SQL, /brand_org_id TEXT NOT NULL/);
    assert.match(NAMED_GRANTS_TABLE_SQL, /supplier_org_id TEXT NOT NULL/);
    assert.match(
      NAMED_GRANTS_TABLE_SQL,
      /access_scope TEXT NOT NULL CHECK \(access_scope IN \('ARTICLE_READ', 'LEDGER_SYNC'\)\)/,
    );
    assert.match(NAMED_GRANTS_TABLE_SQL, /is_revoked BOOLEAN NOT NULL DEFAULT FALSE/);
    assert.match(NAMED_GRANTS_TABLE_SQL, /granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)::timestamptz/);
    assert.equal(
      NAMED_GRANTS_INDEX_SQL,
      `CREATE INDEX IF NOT EXISTS named_grants_routing_idx 
  ON fruma_named_grants(brand_org_id, supplier_org_id, is_revoked);`,
    );
    assert.equal(/\b(?:UPDATE|DELETE|DROP|TRUNCATE|GRANT|REVOKE)\b/i.test(source), false);
    assert.equal(assertAppendOnlyQuery(NAMED_GRANTS_TABLE_SQL), NAMED_GRANTS_TABLE_SQL);
    assert.equal(assertAppendOnlyQuery(NAMED_GRANTS_INDEX_SQL), NAMED_GRANTS_INDEX_SQL);
  });

  it("runs the table and the routing index in each schema", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await provisionNamedGrantsLedger();
    assert.deepEqual(
      recorded.calls.map((call) => call.namespace),
      [
        "fruma_demo",
        "fruma_demo",
        "fruma_test",
        "fruma_test",
        "fruma_production",
        "fruma_production",
      ],
    );
    for (let index = 0; index < recorded.calls.length; index += 2) {
      assert.equal(recorded.calls[index]?.statement, NAMED_GRANTS_TABLE_SQL);
      assert.equal(recorded.calls[index + 1]?.statement, NAMED_GRANTS_INDEX_SQL);
    }
  });
});
