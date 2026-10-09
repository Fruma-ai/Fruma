import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { sessionFounder, sessionToken } from "../../gate";
import {
  executeTenantQuery,
  setTenantPoolForTests,
} from "../persist/tenant-query";
import {
  tenantNamespaceFromSessionCookies,
  type SessionCookieStore,
} from "../persist/tenant-session";

const FOREIGN_MILL = "org_unrelated_mill";
const LEAK_ROW = { id: "cell-foreign", supplier_org_id: FOREIGN_MILL };

type Call = { query: string };

function cookieStore(cookies: { name: string; value: string }[]): SessionCookieStore {
  return {
    get(name: string) {
      const found = cookies.find((cookie) => cookie.name === name);
      return found ? { value: found.value } : undefined;
    },
    getAll() {
      return cookies;
    },
  };
}

function template(
  parts: readonly string[],
  args: readonly unknown[] = [],
): postgres.PendingQuery<{ id: string }[]> {
  const strings = Object.assign([...parts], { raw: [...parts] });
  const query = Promise.resolve([LEAK_ROW]);
  return Object.assign(query, {
    strings,
    args,
    executed: false,
    then() {
      throw new Error("query ran on the pool instead of the tenant transaction");
    },
  }) as unknown as postgres.PendingQuery<{ id: string }[]>;
}

function recordingPool(rows: Record<string, unknown>[] = [LEAK_ROW]) {
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
    calls.push({ query });
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

/**
 * A blocked exploit throws, refuses the pool, or yields no rows.
 * Rows from the recording pool mean the attack read another tenant.
 */
async function assertExploitBlocked(
  began: () => number,
  attempt: () => Promise<readonly object[]>,
  expected?: RegExp,
): Promise<void> {
  try {
    const rows = await attempt();
    assert.deepEqual(rows, []);
    return;
  } catch (error) {
    if (error instanceof assert.AssertionError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (expected) assert.match(message, expected);
    else assert.ok(error instanceof Error);
    assert.equal(began(), 0);
  }
}

test.afterEach(() => {
  setTenantPoolForTests(null);
});

test("brand_sunspel cannot scrape an unrelated mill organization", async () => {
  const previous = process.env.FRUMA_DEMO_PASSWORD;
  process.env.FRUMA_DEMO_PASSWORD = "boundary-leak-monitor";
  try {
    const token = await sessionToken("owen");
    assert.equal(await sessionFounder(token), "owen");
    const namespace = await tenantNamespaceFromSessionCookies(
      cookieStore([{ name: "brand_sunspel", value: token }]),
    );
    assert.equal(namespace, null);

    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await assertExploitBlocked(
      recorded.began,
      () =>
        executeTenantQuery(
          "brand_sunspel" as "fruma_demo",
          template([
            `SELECT id, supplier_org_id FROM fruma_deposits WHERE supplier_org_id = '${FOREIGN_MILL}'`,
          ]),
          { readOnly: true },
        ),
      /SECURITY_VIOLATION: Unrecognized tenant namespace context: "brand_sunspel"/,
    );
    assert.equal(recorded.calls.length, 0);
  } finally {
    if (previous === undefined) delete process.env.FRUMA_DEMO_PASSWORD;
    else process.env.FRUMA_DEMO_PASSWORD = previous;
  }
});

test("schema-prefixed SQL is refused before a connection opens", async () => {
  const recorded = recordingPool([{ id: "production-cell", supplier_org_id: FOREIGN_MILL }]);
  setTenantPoolForTests(recorded.pool as never);
  await assertExploitBlocked(
    recorded.began,
    () =>
      executeTenantQuery(
        "fruma_demo",
        template(["SELECT id FROM fruma_production.fruma_source_cells"]),
        { readOnly: true },
      ),
    /SECURITY_VIOLATION: Cross-schema database access explicitly denied\./,
  );
  await assertExploitBlocked(
    recorded.began,
    () =>
      executeTenantQuery(
        "fruma_demo",
        template(["SELECT id FROM FRUMA_PRODUCTION . fruma_source_cells"]),
        { readOnly: true },
      ),
    /SECURITY_VIOLATION: Cross-schema database access explicitly denied\./,
  );
  assert.equal(recorded.began(), 0);
  assert.equal(recorded.calls.length, 0);
});

test("a stale session payload never opens a transaction", async () => {
  const previous = process.env.FRUMA_DEMO_PASSWORD;
  process.env.FRUMA_DEMO_PASSWORD = "boundary-leak-monitor";
  try {
    const fresh = await sessionToken("owen");
    const stale = {
      brandOrgId: "brand_sunspel",
      namespace: "fruma_production",
      sessionCookie: "owen.stale",
      issuedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    };
    assert.equal(await sessionFounder(fresh), "owen");
    assert.equal(await sessionFounder(stale.sessionCookie), null);
    assert.equal(
      await tenantNamespaceFromSessionCookies(
        cookieStore([{ name: stale.namespace, value: fresh }]),
      ),
      "fruma_production",
    );
    assert.equal(
      await tenantNamespaceFromSessionCookies(
        cookieStore([{ name: stale.namespace, value: stale.sessionCookie }]),
      ),
      null,
    );

    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await assertExploitBlocked(
      recorded.began,
      () =>
        executeTenantQuery(
          stale.sessionCookie as "fruma_demo",
          template(["SELECT id FROM fruma_source_cells"]),
          { readOnly: true },
        ),
      /SECURITY_VIOLATION: Unrecognized tenant namespace context: "owen.stale"/,
    );
    assert.equal(recorded.calls.length, 0);
  } finally {
    if (previous === undefined) delete process.env.FRUMA_DEMO_PASSWORD;
    else process.env.FRUMA_DEMO_PASSWORD = previous;
  }
});
