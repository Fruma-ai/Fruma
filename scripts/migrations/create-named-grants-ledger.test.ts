import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assertAppendOnlyQuery, setTenantPoolForTests } from "../../lib/fruma/persist/tenant-query";
import {
  NAMED_GRANTS_COLUMN_INVENTORY_SQL,
  NAMED_GRANTS_INDEX_SQL,
  NAMED_GRANTS_RENAME_GRANTED_AT_SQL,
  NAMED_GRANTS_RENAME_GRANT_ID_SQL,
  NAMED_GRANTS_RENAME_SCOPE_SQL,
  NAMED_GRANTS_RENAME_SUPPLIER_SQL,
  NAMED_GRANTS_REVOKED_COLUMN_SQL,
  NAMED_GRANTS_SCHEMAS,
  NAMED_GRANTS_TABLE_SQL,
  pendingNamedGrantRenames,
  provisionNamedGrantsLedger,
} from "./create-named-grants-ledger";

type Call = { namespace: string; statement: string };

function recordingPool(inventory: { column_name: string }[] = []) {
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
    const rows = query.includes("information_schema.columns") ? inventory : [];
    const result = Promise.resolve(rows);
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
    for (const sql of [
      NAMED_GRANTS_RENAME_GRANT_ID_SQL,
      NAMED_GRANTS_RENAME_SUPPLIER_SQL,
      NAMED_GRANTS_RENAME_SCOPE_SQL,
      NAMED_GRANTS_RENAME_GRANTED_AT_SQL,
      NAMED_GRANTS_REVOKED_COLUMN_SQL,
      NAMED_GRANTS_COLUMN_INVENTORY_SQL,
    ]) {
      assert.equal(assertAppendOnlyQuery(sql), sql);
    }
    const tableAt = source.indexOf("CREATE TABLE IF NOT EXISTS fruma_named_grants");
    const renameAt = source.indexOf("RENAME COLUMN id TO grant_id");
    const indexAt = source.indexOf("CREATE INDEX IF NOT EXISTS named_grants_routing_idx");
    assert.ok(tableAt >= 0 && renameAt > tableAt && indexAt > renameAt);
  });

  it("skips a rename once the new column name is already present", () => {
    assert.deepEqual(pendingNamedGrantRenames(["grant_id", "brand_org_id", "supplier_org_id"]), []);
    assert.deepEqual(
      pendingNamedGrantRenames(["id", "mill_org_id", "brand_org_id", "scope_class", "created_at"]),
      [
        NAMED_GRANTS_RENAME_GRANT_ID_SQL,
        NAMED_GRANTS_RENAME_SUPPLIER_SQL,
        NAMED_GRANTS_RENAME_SCOPE_SQL,
        NAMED_GRANTS_RENAME_GRANTED_AT_SQL,
      ],
    );
    assert.deepEqual(pendingNamedGrantRenames(["id", "grant_id", "mill_org_id"]), [
      NAMED_GRANTS_RENAME_SUPPLIER_SQL,
    ]);
  });

  it("adapts a legacy catalog before creating the routing index", async () => {
    const recorded = recordingPool([
      { column_name: "id" },
      { column_name: "mill_org_id" },
      { column_name: "brand_org_id" },
      { column_name: "scope_class" },
      { column_name: "created_at" },
    ]);
    setTenantPoolForTests(recorded.pool as never);
    await provisionNamedGrantsLedger();
    const perSchema = [
      NAMED_GRANTS_TABLE_SQL,
      NAMED_GRANTS_COLUMN_INVENTORY_SQL,
      NAMED_GRANTS_RENAME_GRANT_ID_SQL,
      NAMED_GRANTS_RENAME_SUPPLIER_SQL,
      NAMED_GRANTS_RENAME_SCOPE_SQL,
      NAMED_GRANTS_RENAME_GRANTED_AT_SQL,
      NAMED_GRANTS_REVOKED_COLUMN_SQL,
      NAMED_GRANTS_INDEX_SQL,
    ];
    assert.deepEqual(
      recorded.calls.map((call) => call.statement),
      [...perSchema, ...perSchema, ...perSchema],
    );
    assert.deepEqual(
      recorded.calls.map((call) => call.namespace),
      NAMED_GRANTS_SCHEMAS.flatMap((namespace) => perSchema.map(() => namespace)),
    );
  });

  it("leaves an already-adapted catalog and still provisions the index", async () => {
    const recorded = recordingPool([
      { column_name: "grant_id" },
      { column_name: "brand_org_id" },
      { column_name: "supplier_org_id" },
      { column_name: "access_scope" },
      { column_name: "is_revoked" },
      { column_name: "granted_at" },
    ]);
    setTenantPoolForTests(recorded.pool as never);
    await provisionNamedGrantsLedger();
    const perSchema = [
      NAMED_GRANTS_TABLE_SQL,
      NAMED_GRANTS_COLUMN_INVENTORY_SQL,
      NAMED_GRANTS_REVOKED_COLUMN_SQL,
      NAMED_GRANTS_INDEX_SQL,
    ];
    assert.deepEqual(
      recorded.calls.map((call) => call.statement),
      [...perSchema, ...perSchema, ...perSchema],
    );
  });
});
