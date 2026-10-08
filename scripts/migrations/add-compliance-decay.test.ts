import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assertAppendOnlyQuery, setTenantPoolForTests } from "../../lib/fruma/persist/tenant-query";
import {
  COMPLIANCE_DECAY_SCHEMAS,
  FACTORY_PROFILE_EXPIRY_COLUMN_SQL,
  FACTORY_PROFILE_EXPIRY_INDEX_SQL,
  provisionComplianceDecay,
} from "./add-compliance-decay";

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

describe("compliance decay migration", () => {
  const source = readFileSync(new URL("./add-compliance-decay.ts", import.meta.url), "utf8");

  afterEach(() => {
    setTenantPoolForTests(null);
  });

  it("adds certificate expiry through the tenant query path", () => {
    assert.match(source, /executeTenantQuery/);
    for (const namespace of COMPLIANCE_DECAY_SCHEMAS) assert.match(source, new RegExp(namespace));
    assert.equal(
      FACTORY_PROFILE_EXPIRY_COLUMN_SQL,
      `ALTER TABLE fruma_factory_profiles 
  ADD COLUMN IF NOT EXISTS certificate_expiry_date TIMESTAMPTZ;`,
    );
    assert.equal(
      FACTORY_PROFILE_EXPIRY_INDEX_SQL,
      `CREATE INDEX IF NOT EXISTS factory_profile_expiry_idx 
  ON fruma_factory_profiles(mill_org_id, certificate_expiry_date DESC);`,
    );
    assert.equal(/\b(?:UPDATE|DELETE|DROP|TRUNCATE|GRANT|REVOKE)\b/i.test(source), false);
    assert.deepEqual(source.match(/\bALTER\b/gi), ["ALTER"]);
    assert.match(source, /ADD COLUMN IF NOT EXISTS certificate_expiry_date TIMESTAMPTZ/);
    assert.equal(assertAppendOnlyQuery(FACTORY_PROFILE_EXPIRY_COLUMN_SQL), FACTORY_PROFILE_EXPIRY_COLUMN_SQL);
    assert.equal(assertAppendOnlyQuery(FACTORY_PROFILE_EXPIRY_INDEX_SQL), FACTORY_PROFILE_EXPIRY_INDEX_SQL);
  });

  it("runs the column add and the expiry index in each schema", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await provisionComplianceDecay();
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
      assert.equal(recorded.calls[index]?.statement, FACTORY_PROFILE_EXPIRY_COLUMN_SQL);
      assert.equal(recorded.calls[index + 1]?.statement, FACTORY_PROFILE_EXPIRY_INDEX_SQL);
    }
  });
});
