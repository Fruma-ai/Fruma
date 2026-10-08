import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import postgres from "postgres";
import { MissingConfigurationException } from "./configuration";
import {
  assertAppendOnlyQuery,
  executeTenantQuery,
  setTenantPoolForTests,
} from "./tenant-query";

type Call = { query: string; args: readonly unknown[] };

function template(
  parts: readonly string[],
  args: readonly unknown[] = [],
): postgres.PendingQuery<{ id: string }[]> {
  const strings = Object.assign([...parts], { raw: [...parts] });
  const query = Promise.resolve([{ id: "pool-row" }]);
  return Object.assign(query, {
    strings,
    args,
    executed: false,
    then() {
      throw new Error("query ran on the pool instead of the tenant transaction");
    },
  }) as unknown as postgres.PendingQuery<{ id: string }[]>;
}

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
    async begin<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
      began += 1;
      return callback(tx);
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
    setTenantPoolForTests(recorded.pool as never);
    const rows = await executeTenantQuery(
      "fruma_demo",
      template(["SELECT id, updated_at FROM fruma_deposits WHERE id = ", ""], ["dep-1"]),
    );
    assert.deepEqual(rows, [{ id: "row-1" }]);
    assert.equal(recorded.began(), 1);
    assert.equal(recorded.calls[0]?.query, 'SET LOCAL search_path TO "fruma_demo", public;');
    assert.equal(
      recorded.calls[1]?.query,
      "SELECT id, updated_at FROM fruma_deposits WHERE id = ?",
    );
    assert.deepEqual(recorded.calls[1]?.args, ["dep-1"]);
  });

  it("allows insert and blocks mutations before a connection opens", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    assert.equal(
      assertAppendOnlyQuery("INSERT INTO fruma_deposits (id) VALUES ($1)"),
      "INSERT INTO fruma_deposits (id) VALUES ($1)",
    );
    for (const query of [
      "UPDATE fruma_deposits SET filename = $1",
      "DELETE FROM fruma_deposits",
      "DROP TABLE fruma_deposits",
      "TRUNCATE fruma_deposits",
      "ALTER TABLE fruma_deposits ADD COLUMN extra TEXT",
      "ALTER TABLE fruma_deposits ADD COLUMN IF NOT EXISTS extra TEXT",
      "ALTER TABLE fruma_factory_profiles ADD COLUMN IF NOT EXISTS other_col TIMESTAMPTZ",
      "ALTER TABLE fruma_factory_profiles ADD COLUMN IF NOT EXISTS certificate_expiry_date TEXT",
      "ALTER TABLE fruma_factory_profiles ADD COLUMN IF NOT EXISTS certificate_expiry_date TIMESTAMPTZ; SELECT 1",
      "GRANT SELECT ON fruma_deposits TO public",
      "REVOKE SELECT ON fruma_deposits FROM public",
      "CREATE OR REPLACE VIEW fruma_open AS SELECT 1",
      "SELECT 1; DROP SCHEMA fruma_demo",
      "WITH doomed AS (SELECT 1) UPDATE fruma_deposits SET filename = 'x'",
    ]) {
      await assert.rejects(
        () => executeTenantQuery("fruma_test", template([query])),
        /CRITICAL_VIOLATION/,
      );
    }
    assert.equal(recorded.began(), 0);
  });

  it("does not treat quoted text, comments, updated_at, or replace() as a mutation", () => {
    assert.doesNotThrow(() => assertAppendOnlyQuery("SELECT 'please do not UPDATE this' AS note"));
    assert.doesNotThrow(() => assertAppendOnlyQuery("SELECT updated_at FROM fruma_header_maps"));
    assert.doesNotThrow(() => assertAppendOnlyQuery("SELECT 1 /* DROP TABLE fruma_deposits */"));
    assert.doesNotThrow(() => assertAppendOnlyQuery("SELECT replace(source_value, 'a', 'b')"));
    assert.doesNotThrow(() =>
      assertAppendOnlyQuery(
        "ALTER TABLE fruma_factory_profiles ADD COLUMN IF NOT EXISTS certificate_expiry_date TIMESTAMPTZ",
      ),
    );
  });

  it("blocks a destructive fragment nested inside a read", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    const nested = template(["DELETE FROM fruma_deposits"]);
    await assert.rejects(
      () => executeTenantQuery("fruma_demo", template(["SELECT ", ""], [nested])),
      /CRITICAL_VIOLATION/,
    );
    assert.equal(recorded.began(), 0);
  });

  it("rejects a namespace outside the three ledger schemas", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await assert.rejects(
      () => executeTenantQuery("public" as "fruma_demo", template(["SELECT 1"])),
      /SECURITY_VIOLATION: Unrecognized tenant namespace context: "public"/,
    );
    assert.equal(recorded.began(), 0);
  });

  it("opens a read-only transaction and still pins the tenant schema", async () => {
    const modes: string[] = [];
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
      calls.push({ query, args });
      const result = Promise.resolve(query.startsWith("SET LOCAL") ? [] : [{ id: "row-1" }]);
      return Object.assign(result, { strings, args });
    };
    setTenantPoolForTests({
      async begin(modeOrCallback: unknown, callback?: unknown) {
        if (typeof modeOrCallback === "string") {
          modes.push(modeOrCallback);
          return (callback as (transaction: typeof tx) => Promise<unknown>)(tx);
        }
        return (modeOrCallback as (transaction: typeof tx) => Promise<unknown>)(tx);
      },
    } as never);

    const rows = await executeTenantQuery("fruma_production", template(["SELECT 1"]), {
      readOnly: true,
    });
    assert.deepEqual(rows, [{ id: "row-1" }]);
    assert.deepEqual(modes, ["READ ONLY"]);
    assert.equal(calls[0]?.query, 'SET LOCAL search_path TO "fruma_production", public;');
    assert.equal(calls[1]?.query, "SELECT 1");
  });

  it("refuses to open a pool when DATABASE_URL is missing", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await assert.rejects(
        () => executeTenantQuery("fruma_production", template(["SELECT 1"])),
        (err: unknown) =>
          err instanceof MissingConfigurationException &&
          err.message === "CRITICAL_CONFIG_ERROR: DATABASE_URL is missing. Connection pool refused.",
      );
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});
