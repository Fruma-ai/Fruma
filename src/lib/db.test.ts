import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { setTenantPoolForTests } from "../../lib/fruma/persist/tenant-query";
import { executeTenantQuery, ledgerSql } from "./db";

type Call = { query: string; args: readonly unknown[] };

function recordingPool(rows: Record<string, unknown>[] = [{ id: "row-1" }]) {
  const calls: Call[] = [];
  let began = 0;
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
    calls.push({ query, args });
    const result = Promise.resolve(query.startsWith("SET LOCAL") ? [] : rows);
    return Object.assign(result, { strings, args });
  };
  const pool = {
    async begin<T>(
      modeOrCallback: string | ((transaction: typeof tx) => Promise<T>),
      callback?: (transaction: typeof tx) => Promise<T>,
    ): Promise<T> {
      began += 1;
      if (typeof modeOrCallback === "string") return callback!(tx);
      return modeOrCallback(tx);
    },
  };
  return { pool, calls, began: () => began };
}

afterEach(() => {
  setTenantPoolForTests(null);
});

describe("tenant pool wrapper", () => {
  it("refuses dotted tenant SQL before the pool is checked out", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await assert.rejects(
      () =>
        executeTenantQuery(
          "fruma_demo",
          ledgerSql`SELECT * FROM fruma_production.fruma_deposits`,
        ),
      /SECURITY_VIOLATION: Cross-schema database access explicitly denied\./,
    );
    await assert.rejects(
      () =>
        executeTenantQuery(
          "fruma_test",
          ledgerSql`SELECT * FROM FRUMA_DEMO . fruma_factory_profiles`,
        ),
      /SECURITY_VIOLATION: Cross-schema database access explicitly denied\./,
    );
    assert.equal(recorded.began(), 0);
    assert.equal(recorded.calls.length, 0);
  });

  it("still pins search_path for an unqualified read", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    const rows = await executeTenantQuery(
      "fruma_demo",
      ledgerSql<{ id: string }>`SELECT id FROM fruma_deposits WHERE id = ${"dep-1"}`,
      { readOnly: true },
    );
    assert.deepEqual(rows, [{ id: "row-1" }]);
    assert.equal(recorded.began(), 1);
    assert.equal(recorded.calls[0]?.query, 'SET LOCAL search_path TO "fruma_demo", public;');
    assert.match(recorded.calls[1]?.query ?? "", /SELECT id FROM fruma_deposits WHERE id = \?/);
  });
});
