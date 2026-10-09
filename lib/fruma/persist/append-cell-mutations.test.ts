import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assertAppendOnlyQuery, setTenantPoolForTests } from "./tenant-query";
import {
  appendCellMutations,
  cellMutationInsertSql,
  parseExceptionBatch,
  schemaForTenantVersion,
} from "./append-cell-mutations";

afterEach(() => {
  setTenantPoolForTests(null);
});

describe("append cell mutations", () => {
  it("accepts only a closed tenant version and never splices it into SQL", () => {
    assert.equal(schemaForTenantVersion("production"), "fruma_production");
    assert.equal(schemaForTenantVersion("fruma_demo"), "fruma_demo");
    assert.equal(schemaForTenantVersion(undefined), null);
    assert.equal(schemaForTenantVersion("fruma_production; DROP SCHEMA fruma_demo"), "invalid");
    const route = readFileSync(new URL("../../../app/api/ledger/cell-mutations/route.ts", import.meta.url), "utf8");
    assert.doesNotMatch(route, /neonPool|search_path|fruma_\$\{/);
  });

  it("builds one parameterized confirm insert and leaves deposits untouched", () => {
    const parsed = parseExceptionBatch(
      {
        exceptions: [
          { cellId: "cell-1", operatorId: "owen", field: "composition", newValue: "100% Cotton" },
        ],
      },
      "owen",
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const { sql, args } = cellMutationInsertSql(parsed.exceptions, "owen");
    assert.match(sql, /INSERT INTO fruma_cell_mutation_events/);
    assert.match(sql, /NOW\(\)::timestamptz/);
    assert.doesNotMatch(sql, /fruma_deposits|UPDATE|DELETE|DROP|search_path/);
    assert.equal(assertAppendOnlyQuery(sql), sql);
    assert.equal(args[1], "cell-1");
    assert.equal(args[2], "owen");
    assert.equal(args[3], "100% Cotton");
    assert.equal(args[4], "composition");
    assert.doesNotMatch(sql, /100% Cotton|cell-1/);
  });

  it("rejects a spoofed operator, an unknown field, and an empty batch", () => {
    assert.equal(
      parseExceptionBatch(
        { exceptions: [{ cellId: "cell-1", operatorId: "sam", field: "composition", newValue: "100% Cotton" }] },
        "owen",
      ).ok,
      false,
    );
    assert.equal(
      parseExceptionBatch(
        { exceptions: [{ cellId: "cell-1", field: "secret", newValue: "x" }] },
        "owen",
      ).ok,
      false,
    );
    assert.equal(parseExceptionBatch({ exceptions: [] }, "owen").ok, false);
  });

  it("appends through the tenant transaction", async () => {
    const calls: { query: string; args: readonly unknown[] }[] = [];
    setTenantPoolForTests({
      async begin(callback) {
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
            return Object.assign(Promise.resolve([]), { query, strings, args });
          },
          {
            unsafe(query: string, args: readonly unknown[] = []) {
              calls.push({ query, args });
              return Promise.resolve([]);
            },
          },
        );
        return callback(tx as never);
      },
    } as never);

    const count = await appendCellMutations(
      "fruma_test",
      [{ cellId: "cell-9", field: "weight", newValue: "220 GSM" }],
      "owen",
    );
    assert.equal(count, 1);
    assert.match(calls[0]?.query ?? "", /SET LOCAL search_path TO "fruma_test"/);
    const insert = calls.find((call) => call.query.includes("INSERT INTO fruma_cell_mutation_events"));
    assert.ok(insert);
    assert.equal(insert?.args[1], "cell-9");
    assert.equal(insert?.args[2], "owen");
    assert.equal(insert?.args[3], "220 GSM");
    assert.equal(insert?.args[4], "weight");
  });
});
