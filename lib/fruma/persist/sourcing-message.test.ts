import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { sessionToken } from "../../gate";
import { setTenantPoolForTests } from "./tenant-query";
import {
  executeAppendOnlySourcingMessage,
  parseSourcingPayload,
  resolveSourcingActor,
  runSourcingInsert,
} from "./sourcing-message";

const ACTION_PATH = new URL("../../../src/app/actions/sourcing-communication.ts", import.meta.url);

const INSERT = readFileSync(ACTION_PATH, "utf8").match(
  /INSERT INTO fruma_sourcing_messages[\s\S]*?RETURNING message_id, sent_at/,
)?.[0];

describe("sendSourcingMessage", () => {
  it("authenticates with sessionFounder and inserts only the message log", () => {
    const source = readFileSync(ACTION_PATH, "utf8");
    assert.match(source, /"use server"/);
    assert.match(source, /await cookies\(\)/);
    assert.match(source, /sessionFounder\(/);
    assert.match(source, /runSourcingInsert/);
    assert.match(source, /\$1/);
    assert.match(source, /\$3/);
    assert.match(source, /\$4/);
    assert.match(source, /NOW\(\)::timestamptz/);
    assert.equal(source.includes("fruma_source_cells"), false);
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i);
    const sessionAt = source.indexOf("sessionFounder(");
    const insertAt = source.indexOf("executeAppendOnlySourcingMessage(");
    assert.ok(sessionAt > 0 && insertAt > sessionAt);
  });

  it("requires a boolean disclosure flag and bounded text", () => {
    assert.equal(parseSourcingPayload(null).ok, false);
    assert.equal(
      parseSourcingPayload({
        deposit_id: "dep-1",
        encrypted_payload: "cipher",
        is_identity_disclosed: "true",
      }).ok,
      false,
    );
    const parsed = parseSourcingPayload({
      deposit_id: " dep-1 ",
      encrypted_payload: " cipher ",
      is_identity_disclosed: false,
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.deposit_id, "dep-1");
      assert.equal(parsed.value.encrypted_payload, "cipher");
      assert.equal(parsed.value.is_identity_disclosed, false);
    }
  });

  it("selects the tenant schema from the founder cookie name", async () => {
    const previous = process.env.FRUMA_DEMO_PASSWORD;
    process.env.FRUMA_DEMO_PASSWORD = "sourcing-message-test";
    try {
      const token = await sessionToken("owen");
      const actor = await resolveSourcingActor(
        async (cookie) => (cookie === token ? "owen" : null),
        (name) => (name === "fruma_test" ? token : undefined),
      );
      assert.deepEqual(actor, { founder: "owen", namespace: "fruma_test" });
      assert.equal(
        await resolveSourcingActor(
          async () => null,
          () => "fruma_demo",
        ),
        null,
      );
    } finally {
      if (previous === undefined) delete process.env.FRUMA_DEMO_PASSWORD;
      else process.env.FRUMA_DEMO_PASSWORD = previous;
    }
  });

  it("binds the payload and keeps a destructive payload out of the statement", async () => {
    assert.ok(INSERT);
    const calls: { namespace: string; statement: string; parameters: readonly unknown[] }[] = [];
    const written = await executeAppendOnlySourcingMessage(
      async (namespace, statement, parameters) => {
        calls.push({ namespace, statement, parameters });
        return [{ message_id: "6b0d0b6e-2a0e-4c1a-9c1e-0d5a5a5a5a5a", sent_at: "2026-10-08T13:00:00.000Z" }];
      },
      "fruma_production",
      INSERT!,
      {
        depositId: "dep-9",
        senderHandle: "owen",
        isIdentityDisclosed: false,
        encryptedPayload: "please DROP TABLE fruma_source_cells",
      },
    );
    assert.equal(written.messageId, "6b0d0b6e-2a0e-4c1a-9c1e-0d5a5a5a5a5a");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.namespace, "fruma_production");
    assert.match(calls[0]?.statement ?? "", /^INSERT INTO fruma_sourcing_messages/);
    assert.equal(calls[0]?.statement.includes("fruma_source_cells"), false);
    assert.deepEqual(calls[0]?.parameters, [
      "dep-9",
      "owen",
      false,
      "please DROP TABLE fruma_source_cells",
    ]);
    await assert.rejects(
      () =>
        executeAppendOnlySourcingMessage(
          async () => [],
          "fruma_demo",
          "UPDATE fruma_sourcing_messages SET encrypted_payload = $1",
          {
            depositId: "dep-9",
            senderHandle: "owen",
            isIdentityDisclosed: true,
            encryptedPayload: "cipher",
          },
        ),
      /append_only_violation/,
    );
  });

  it("sends the insert through the tenant transaction", async () => {
    assert.ok(INSERT);
    const seen: { query: string; parameters: readonly unknown[]; searchPath: string }[] = [];
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
        const result = Promise.resolve([]);
        return Object.assign(result, { query, strings, args });
      },
      {
        unsafe(query: string, parameters: readonly unknown[]) {
          seen.push({ query, parameters, searchPath: "" });
          return Promise.resolve([
            { message_id: "11111111-1111-1111-1111-111111111111", sent_at: new Date("2026-10-08T13:01:00.000Z") },
          ]);
        },
      },
    );
    setTenantPoolForTests({
      async begin(callback) {
        const local: string[] = [];
        const recording = Object.assign(
          (strings: TemplateStringsArray | string, ...args: readonly unknown[]) => {
            const pending = tx(strings, ...args) as { query?: string };
            if (pending.query) local.push(pending.query);
            return pending;
          },
          {
            unsafe(query: string, parameters: readonly unknown[]) {
              const searchPath = local.find((line) => line.startsWith("SET LOCAL")) ?? "";
              seen.push({ query, parameters, searchPath });
              return Promise.resolve([
                {
                  message_id: "11111111-1111-1111-1111-111111111111",
                  sent_at: new Date("2026-10-08T13:01:00.000Z"),
                },
              ]);
            },
          },
        );
        return callback(recording as never);
      },
    } as never);
    try {
      const written = await runSourcingInsert("fruma_demo", INSERT!, ["dep-1", "owen", true, "cipher"]);
      assert.equal(written[0]?.message_id, "11111111-1111-1111-1111-111111111111");
      assert.equal(seen[0]?.searchPath, 'SET LOCAL search_path TO "fruma_demo", public;');
      assert.match(seen[0]?.query ?? "", /^INSERT INTO fruma_sourcing_messages/);
      assert.deepEqual(seen[0]?.parameters, ["dep-1", "owen", true, "cipher"]);
    } finally {
      setTenantPoolForTests(null);
    }
  });
});
