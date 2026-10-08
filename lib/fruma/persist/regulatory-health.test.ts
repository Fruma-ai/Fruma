import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { sessionToken } from "../../gate";
import { regulatoryHealthScore } from "./regulatory-health";
import { tenantNamespaceFromSessionCookies, type SessionCookieStore } from "./tenant-session";

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

describe("regulatory health score", () => {
  it("scores an empty mill at 0.00", () => {
    const score = regulatoryHealthScore({ totalCells: 0, confirmEvents: 4, certifiedRows: 0 });
    assert.equal(score.score, "0.00");
    assert.equal(score.percent, 0);
    assert.equal(score.greenlit, false);
  });

  it("greenlights only when certified rows are above 90.00 percent", () => {
    const held = regulatoryHealthScore({ totalCells: 100, confirmEvents: 100, certifiedRows: 90 });
    assert.equal(held.score, "90.00");
    assert.equal(held.greenlit, false);

    const greenlit = regulatoryHealthScore({
      totalCells: 100,
      confirmEvents: 91,
      certifiedRows: 91,
    });
    assert.equal(greenlit.score, "91.00");
    assert.equal(greenlit.greenlit, true);
  });

  it("uses certified rows, so confirm events on other fields stay at 0.00", () => {
    const score = regulatoryHealthScore({ totalCells: 10, confirmEvents: 10, certifiedRows: 0 });
    assert.equal(score.score, "0.00");
    assert.equal(score.greenlit, false);
    assert.equal(score.confirmEvents, 10);
  });

  it("rounds to hundredths and caps the ratio at 100.00", () => {
    const third = regulatoryHealthScore({ totalCells: 3, confirmEvents: 1, certifiedRows: 1 });
    assert.equal(third.score, "33.33");
    assert.equal(third.greenlit, false);

    const full = regulatoryHealthScore({ totalCells: 4, confirmEvents: 9, certifiedRows: 8 });
    assert.equal(full.score, "100.00");
    assert.equal(full.greenlit, true);
  });
});

describe("regulatory health page", () => {
  const source = readFileSync(
    new URL("../../../app/(ledger)/profile/[id]/page.tsx", import.meta.url),
    "utf8",
  );

  it("reads the route id through executeTenantQuery and stays a select", () => {
    assert.match(source, /const \{ id \} = await params/);
    assert.match(source, /executeTenantQuery/);
    assert.match(source, /readOnly:\s*true/);
    assert.match(source, /ledgerSql/);
    assert.match(source, /FROM fruma_source_cells/);
    assert.match(source, /FROM fruma_cell_mutation_events/);
    assert.match(source, /supplier_org_id/);
    assert.match(source, /action_type = 'confirm'/);
    assert.match(source, /standard_field = 'cert'/);
    assert.match(source, /btrim\(COALESCE\(latest\.new_standard_value, ''\)\) <> ''/);
    assert.match(source, /SELECT/);
    assert.doesNotMatch(source, /["']use client["']/);
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i);
  });
});

describe("tenant session schema", () => {
  it("prefers a schema cookie value, then a founder session on that cookie name", async () => {
    assert.equal(
      await tenantNamespaceFromSessionCookies(
        store([
          { name: "fruma_demo", value: "owen.not-a-session" },
          { name: "theme", value: "fruma_test" },
        ]),
      ),
      "fruma_test",
    );

    const previous = process.env.FRUMA_DEMO_PASSWORD;
    process.env.FRUMA_DEMO_PASSWORD = "regulatory-health-test";
    try {
      const token = await sessionToken("owen");
      assert.equal(
        await tenantNamespaceFromSessionCookies(store([{ name: "fruma_production", value: token }])),
        "fruma_production",
      );
      assert.equal(
        await tenantNamespaceFromSessionCookies(store([{ name: "fruma_demo", value: "owen.stale" }])),
        null,
      );
    } finally {
      if (previous === undefined) delete process.env.FRUMA_DEMO_PASSWORD;
      else process.env.FRUMA_DEMO_PASSWORD = previous;
    }
  });
});
