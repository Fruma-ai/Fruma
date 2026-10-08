import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { setTenantPoolForTests } from "@/lib/fruma/persist/tenant-query";
import type { SessionCookieStore } from "@/lib/fruma/persist/tenant-session";
import { getBrandDeltaFeed } from "./delta-stream";

function store(cookies: { name: string; value: string }[]): SessionCookieStore {
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

type Call = { query: string; args: readonly unknown[] };

function recordingPool(rows: Record<string, unknown>[] = []) {
  const calls: Call[] = [];
  const modes: string[] = [];
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
  return {
    calls,
    modes,
    pool: {
      async begin(modeOrCallback: unknown, callback?: unknown) {
        if (typeof modeOrCallback === "string") {
          modes.push(modeOrCallback);
          return (callback as (transaction: typeof tx) => Promise<unknown>)(tx);
        }
        modes.push("READ WRITE");
        return (modeOrCallback as (transaction: typeof tx) => Promise<unknown>)(tx);
      },
    },
  };
}

describe("brand delta feed", () => {
  const source = readFileSync(new URL("./delta-stream.ts", import.meta.url), "utf8");

  afterEach(() => {
    setTenantPoolForTests(null);
  });

  it("reads confirm and certificate deltas in a read-only tenant query", () => {
    assert.match(source, /export async function getBrandDeltaFeed/);
    assert.match(source, /executeTenantQuery/);
    assert.match(source, /readOnly:\s*true/);
    assert.match(source, /tenantNamespaceFromSessionCookies/);
    assert.match(source, /WITH brand_articles AS MATERIALIZED/);
    assert.match(source, /fruma_brand_historical_articles/);
    assert.match(source, /fruma_cell_mutation_events/);
    assert.match(source, /fruma_factory_profiles/);
    assert.match(source, /brand_org_id/);
    assert.match(source, /action_type = 'confirm'/);
    assert.match(source, /e\.occurred_at > a\.last_ordered_at/);
    assert.match(source, /p\.certificate_expiry_date > a\.last_ordered_at/);
    assert.match(source, /ORDER BY alerts\.occurred_at DESC/);
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE|INSERT)\b/i);
  });

  it("pins the session schema and returns the feed in query order", async () => {
    const occurredAt = new Date("2026-03-02T00:00:00.000Z");
    const orderedAt = new Date("2026-01-15T00:00:00.000Z");
    const recorded = recordingPool([
      {
        alert_kind: "confirm",
        article_id: "article-1",
        article_code: "JK-2026",
        supplier_org_id: "org_vale_do_ave",
        mill_org_id: "org_vale_do_ave",
        occurred_at: occurredAt,
        event_id: "event-9",
        action_type: "confirm",
        certificate_expiry_date: null,
        last_ordered_at: orderedAt,
      },
    ]);
    setTenantPoolForTests(recorded.pool as never);
    const alerts = await getBrandDeltaFeed(
      { brand_org_id: "brand_sunspel" },
      store([{ name: "theme", value: "fruma_production" }]),
    );
    assert.deepEqual(recorded.modes, ["READ ONLY"]);
    assert.equal(recorded.calls[0]?.query, 'SET LOCAL search_path TO "fruma_production", public;');
    assert.match(recorded.calls[1]?.query ?? "", /ORDER BY alerts\.occurred_at DESC/);
    assert.deepEqual(recorded.calls[1]?.args, ["brand_sunspel"]);
    assert.deepEqual(alerts, [
      {
        alert_kind: "confirm",
        article_id: "article-1",
        article_code: "JK-2026",
        supplier_org_id: "org_vale_do_ave",
        mill_org_id: "org_vale_do_ave",
        occurred_at: "2026-03-02T00:00:00.000Z",
        event_id: "event-9",
        action_type: "confirm",
        certificate_expiry_date: null,
        last_ordered_at: "2026-01-15T00:00:00.000Z",
      },
    ]);
  });

  it("refuses a blank brand or a missing tenant session before a connection opens", async () => {
    const recorded = recordingPool();
    setTenantPoolForTests(recorded.pool as never);
    await assert.rejects(
      () => getBrandDeltaFeed({ brand_org_id: "  " }, store([{ name: "theme", value: "fruma_demo" }])),
      /brand_org_id is required/,
    );
    await assert.rejects(
      () => getBrandDeltaFeed({ brand_org_id: "brand_sunspel" }, store([])),
      /tenant session is required/,
    );
    assert.deepEqual(recorded.modes, []);
  });
});
