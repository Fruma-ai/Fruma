import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { setTenantPoolForTests } from "./tenant-query";
import { ANONYMOUS_BRAND_ALIAS, loadSourcingInbox, maskSourcingInbox } from "./sourcing-inbox";

const ROUTE_PATH = new URL("../../../src/app/api/mill/sourcing/route.ts", import.meta.url);
const INBOX_PATH = new URL("./sourcing-inbox.ts", import.meta.url);

describe("mill sourcing inbox", () => {
  it("masks an undisclosed sender before the payload is serialized", () => {
    const messages = maskSourcingInbox([
      {
        message_id: "m-hidden",
        deposit_id: "dep-1",
        supplier_org_id: "org_vale_do_ave",
        sender_handle: "owen",
        is_identity_disclosed: false,
        encrypted_payload: "cipher",
        sent_at: "2026-10-08T13:39:20.766Z",
      },
      {
        message_id: "m-open",
        deposit_id: "dep-1",
        supplier_org_id: "org_vale_do_ave",
        sender_handle: "owen",
        is_identity_disclosed: true,
        encrypted_payload: "cipher",
        sent_at: "2026-10-08T13:39:20.813Z",
      },
    ]);
    assert.equal(messages[0]?.sender_handle, ANONYMOUS_BRAND_ALIAS);
    assert.equal(messages[0]?.is_identity_disclosed, false);
    assert.equal(JSON.stringify(messages[0]).includes("owen"), false);
    assert.equal(messages[1]?.sender_handle, "owen");
    assert.equal(messages[1]?.is_identity_disclosed, true);
  });

  it("reads the mill inbox in a read-only tenant transaction and returns the alias", async () => {
    const modes: string[] = [];
    const queries: string[] = [];
    const tx = (strings: TemplateStringsArray | string, ...args: readonly unknown[]) => {
      if (typeof strings === "string") return { identifier: strings };
      const query = strings.reduce((sql, part, index) => {
        const arg = args[index - 1];
        const rendered =
          arg && typeof arg === "object" && "identifier" in arg
            ? `"${String((arg as { identifier: string }).identifier)}"`
            : String(arg ?? "");
        return sql + rendered + part;
      });
      queries.push(query.trim());
      const rows = query.includes("fruma_sourcing_messages")
        ? [
            {
              message_id: "m-hidden",
              deposit_id: "dep-1",
              supplier_org_id: "org_vale_do_ave",
              sender_handle: "secret-founder",
              is_identity_disclosed: false,
              encrypted_payload: "cipher",
              sent_at: "2026-10-08T13:39:20.766Z",
            },
          ]
        : [];
      const result = Promise.resolve(rows);
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
    try {
      const messages = await loadSourcingInbox("fruma_demo", "org_vale_do_ave");
      assert.deepEqual(modes, ["READ ONLY"]);
      assert.match(queries.join("\n"), /SET LOCAL search_path TO "fruma_demo", public;/);
      assert.match(queries.join("\n"), /FROM fruma_sourcing_messages m/);
      assert.match(queries.join("\n"), /INNER JOIN fruma_deposits d ON d.id = m.deposit_id/);
      assert.match(queries.join("\n"), /WHERE d.supplier_org_id = org_vale_do_ave/);
      assert.equal(messages[0]?.sender_handle, "Brand Operator");
      assert.equal(JSON.stringify(messages).includes("secret-founder"), false);
    } finally {
      setTenantPoolForTests(null);
    }
  });

  it("refuses an unsigned operator and keeps the route free of mutations", () => {
    const route = readFileSync(ROUTE_PATH, "utf8");
    const inbox = readFileSync(INBOX_PATH, "utf8");
    assert.match(route, /sessionFounder\(/);
    assert.match(route, /unauthorized_operator/);
    assert.match(route, /status: 401/);
    assert.match(route, /loadSourcingInbox/);
    assert.match(route, /supplier_org_id/);
    assert.match(inbox, /executeTenantQuery/);
    assert.match(inbox, /readOnly:\s*true/);
    assert.match(inbox, /maskSourcingInbox/);
    assert.match(inbox, /ANONYMOUS_BRAND_ALIAS/);
    assert.doesNotMatch(route, /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i);
    assert.doesNotMatch(inbox, /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i);
    assert.equal(route.includes("fruma_source_cells"), false);
    assert.equal(inbox.includes("fruma_source_cells"), false);
  });
});
