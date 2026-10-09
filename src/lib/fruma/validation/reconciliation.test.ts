import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { setTenantPoolForTests } from "../../../../lib/fruma/persist/tenant-query";
import { reconcileLedgerSequence } from "./reconciliation";

type Call = { query: string };

function recordingPool(row: {
  confirm_count: number;
  suggestion_count: number;
  orphaned_confirms: number;
}) {
  const calls: Call[] = [];
  const modes: string[] = [];
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
    calls.push({ query });
    const result = Promise.resolve(query.startsWith("SET LOCAL") ? [] : [row]);
    return Object.assign(result, { strings, args });
  };
  const pool = {
    async begin<T>(
      modeOrCallback: string | ((transaction: typeof tx) => Promise<T>),
      callback?: (transaction: typeof tx) => Promise<T>,
    ): Promise<T> {
      began += 1;
      if (typeof modeOrCallback === "string") {
        modes.push(modeOrCallback);
        return callback!(tx);
      }
      return modeOrCallback(tx);
    },
  };
  return { pool, calls, modes, began: () => began };
}

afterEach(() => {
  setTenantPoolForTests(null);
});

describe("ledger reconciliation", () => {
  const source = readFileSync(new URL("./reconciliation.ts", import.meta.url), "utf8");

  it("stays a single read with no write statements", () => {
    assert.match(source, /export async function reconcileLedgerSequence/);
    assert.match(source, /readOnly:\s*true/);
    assert.match(source, /fruma_cell_mutation_events/);
    assert.match(source, /fruma_staged_suggestions/);
    assert.match(source, /action_type = 'confirm'/);
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE|INSERT|GRANT|REVOKE|ALTER)\b/);
  });

  it("returns consistent when every confirm resolves to a staged suggestion cell", async () => {
    const recorded = recordingPool({
      confirm_count: 2,
      suggestion_count: 2,
      orphaned_confirms: 0,
    });
    setTenantPoolForTests(recorded.pool as never);
    const result = await reconcileLedgerSequence({
      deposit_id: "dep-sunspel",
      namespace: "fruma_demo",
    });
    assert.deepEqual(result, { isConsistent: true });
    assert.equal(recorded.began(), 1);
    assert.deepEqual(recorded.modes, ["READ ONLY"]);
    assert.equal(recorded.calls[0]?.query, 'SET LOCAL search_path TO "fruma_demo", public;');
    assert.match(recorded.calls[1]?.query ?? "", /fruma_cell_mutation_events/);
    assert.match(recorded.calls[1]?.query ?? "", /fruma_staged_suggestions/);
    assert.match(recorded.calls[1]?.query ?? "", /orphaned_confirms/);
  });

  it("flags a confirm that has no staged suggestion cell", async () => {
    const recorded = recordingPool({
      confirm_count: 3,
      suggestion_count: 2,
      orphaned_confirms: 1,
    });
    setTenantPoolForTests(recorded.pool as never);
    const result = await reconcileLedgerSequence({
      deposit_id: "dep-orphan",
      namespace: "fruma_test",
    });
    assert.deepEqual(result, {
      isConsistent: false,
      error: "ORPHANED_MUTATION_SEQUENCE_DETECTED",
    });
    assert.equal(recorded.calls[0]?.query, 'SET LOCAL search_path TO "fruma_test", public;');
  });

  it("refuses a blank deposit before a connection opens", async () => {
    const recorded = recordingPool({
      confirm_count: 1,
      suggestion_count: 0,
      orphaned_confirms: 1,
    });
    setTenantPoolForTests(recorded.pool as never);
    await assert.rejects(
      () => reconcileLedgerSequence({ deposit_id: "  ", namespace: "fruma_production" }),
      /deposit_id is required/,
    );
    assert.equal(recorded.began(), 0);
  });
});
