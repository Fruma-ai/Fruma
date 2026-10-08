import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { MissingConfigurationException } from "./configuration";
import {
  assertAppendOnlyQuery,
  executeTenantQuery,
  setTenantPoolForTests,
} from "./tenant-query";

type Call = { query: string; params?: readonly unknown[] };

function recordingPool(rows: Record<string, unknown>[] = [{ id: "row-1" }]) {
  const calls: Call[] = [];
  let began = 0;
  const pool = {
    async begin<T>(callback: (tx: {
      unsafe: (query: string, parameters?: readonly unknown[]) => Promise<readonly Record<string, unknown>[]>;
    }) => Promise<T>): Promise<T> {
      began += 1;
      return callback({
        async unsafe(query, params) {
          calls.push({ query, params });
          if (query.startsWith("SET LOCAL")) return [];
          return rows;
        },
      });
    },
  };
  return { pool, calls, began: () => began };
}

afterEach(() => {
  setTenantPoolForTests(null);
});

describe("append-only tenant queries", () => {
  it("allows a read of updated_at and pins the tenant schema for that transaction", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool);
    const rows = await executeTenantQuery<{ id: string }>(
      "fruma_demo",
      "SELECT id, updated_at FROM fruma_deposits WHERE id = $1",
      ["dep-1"],
    );
    assert.deepEqual(rows, [{ id: "row-1" }]);
    assert.equal(recorded.began(), 1);
    assert.equal(recorded.calls[0]?.query, "SET LOCAL search_path TO fruma_demo, public;");
    assert.equal(recorded.calls[1]?.query, "SELECT id, updated_at FROM fruma_deposits WHERE id = $1");
    assert.deepEqual(recorded.calls[1]?.params, ["dep-1"]);
  });

  it("allows insert and blocks update, delete, and drop before a connection opens", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool);
    assert.equal(
      assertAppendOnlyQuery("INSERT INTO fruma_deposits (id) VALUES ($1)"),
      "INSERT INTO fruma_deposits (id) VALUES ($1)",
    );
    for (const query of [
      "UPDATE fruma_deposits SET filename = $1",
      "DELETE FROM fruma_deposits",
      "DROP TABLE fruma_deposits",
      "SELECT 1; DROP SCHEMA fruma_demo",
      "WITH doomed AS (SELECT 1) UPDATE fruma_deposits SET filename = 'x'",
    ]) {
      await assert.rejects(() => executeTenantQuery("fruma_test", query), /CRITICAL_VIOLATION/);
    }
    assert.equal(recorded.began(), 0);
  });

  it("does not treat quoted text or updated_at as a mutation", () => {
    assert.doesNotThrow(() => assertAppendOnlyQuery("SELECT 'please do not UPDATE this' AS note"));
    assert.doesNotThrow(() => assertAppendOnlyQuery("SELECT updated_at FROM fruma_header_maps"));
  });

  it("rejects a namespace outside the three ledger schemas", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool);
    await assert.rejects(
      () => executeTenantQuery("public" as "fruma_demo", "SELECT 1"),
      /fruma_demo, fruma_test, or fruma_production/,
    );
    assert.equal(recorded.began(), 0);
  });

  it("refuses to open a pool when DATABASE_URL is missing", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await assert.rejects(
        () => executeTenantQuery("fruma_production", "SELECT 1"),
        MissingConfigurationException,
      );
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});
