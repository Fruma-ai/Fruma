import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assertAppendOnlyQuery, setTenantPoolForTests } from "../../lib/fruma/persist/tenant-query";
import {
  SOURCING_DISCLOSURE_COLUMN_SQL,
  SOURCING_MESSAGES_INDEX_SQL,
  SOURCING_MESSAGES_TABLE_SQL,
  SOURCING_SCHEMAS,
  provisionSourcingLedger,
} from "./create-sourcing-ledger";

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

describe("sourcing ledger migration", () => {
  const source = readFileSync(new URL("./create-sourcing-ledger.ts", import.meta.url), "utf8");

  afterEach(() => {
    setTenantPoolForTests(null);
  });

  it("keeps the message log append-only", () => {
    assert.match(source, /executeTenantQuery/);
    for (const namespace of SOURCING_SCHEMAS) assert.match(source, new RegExp(namespace));
    assert.match(source, /CREATE TABLE IF NOT EXISTS fruma_sourcing_messages/);
    assert.match(source, /message_id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    assert.match(source, /deposit_id TEXT NOT NULL REFERENCES fruma_deposits\(id\)/);
    assert.match(source, /sender_handle TEXT NOT NULL/);
    assert.match(source, /is_identity_disclosed BOOLEAN NOT NULL DEFAULT FALSE/);
    assert.match(source, /encrypted_payload TEXT NOT NULL/);
    assert.match(source, /sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)::timestamptz/);
    assert.match(source, /CREATE INDEX IF NOT EXISTS sourcing_messages_deposit_idx/);
    assert.match(source, /fruma_sourcing_messages\(deposit_id, sent_at DESC\)/);
    assert.equal(assertAppendOnlyQuery(SOURCING_MESSAGES_TABLE_SQL), SOURCING_MESSAGES_TABLE_SQL);
    assert.equal(assertAppendOnlyQuery(SOURCING_MESSAGES_INDEX_SQL), SOURCING_MESSAGES_INDEX_SQL);
    assert.equal(
      assertAppendOnlyQuery("CREATE SCHEMA IF NOT EXISTS fruma_demo"),
      "CREATE SCHEMA IF NOT EXISTS fruma_demo",
    );
    assert.equal(
      SOURCING_DISCLOSURE_COLUMN_SQL,
      "ALTER TABLE fruma_sourcing_messages ADD COLUMN IF NOT EXISTS is_identity_disclosed BOOLEAN NOT NULL DEFAULT FALSE",
    );
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE|GRANT|REVOKE)\b/i);
    const alterLines = source.split("\n").filter((line) => /\bALTER\b/i.test(line));
    assert.ok(alterLines.length > 0);
    for (const line of alterLines) {
      assert.match(
        line,
        /ADD COLUMN IF NOT EXISTS is_identity_disclosed BOOLEAN NOT NULL DEFAULT FALSE/,
      );
    }
  });

  it("opens one tenant transaction per statement in each schema", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await provisionSourcingLedger();

    assert.equal(recorded.calls.length, SOURCING_SCHEMAS.length * 3);
    for (const namespace of SOURCING_SCHEMAS) {
      const statements = recorded.calls
        .filter((call) => call.namespace === namespace)
        .map((call) => call.statement);
      assert.deepEqual(statements, [
        `CREATE SCHEMA IF NOT EXISTS ${namespace}`,
        SOURCING_MESSAGES_TABLE_SQL,
        SOURCING_MESSAGES_INDEX_SQL,
      ]);
    }
  });
});
