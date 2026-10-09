import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isolationSchema, payloadHasExceptions, postCellMutationRequest } from "./cell-mutation-http";

describe("cell mutation request", () => {
  it("accepts only demo, test, and production as the isolation scope", () => {
    assert.equal(isolationSchema("demo"), "fruma_demo");
    assert.equal(isolationSchema("test"), "fruma_test");
    assert.equal(isolationSchema("production"), "fruma_production");
    assert.equal(isolationSchema("fruma_production"), "invalid");
    assert.equal(isolationSchema("fruma_production; DROP SCHEMA fruma_demo"), "invalid");
    assert.equal(isolationSchema(undefined), "invalid");
    assert.equal(payloadHasExceptions({ exceptions: [] }), false);
    assert.equal(payloadHasExceptions({ exceptions: [{ cellId: "cell-1" }] }), true);

    const source = readFileSync(new URL("./cell-mutation-http.ts", import.meta.url), "utf8");
    assert.match(source, /Infrastructure Environment Offline/);
    assert.match(source, /Empty payloads rejected/);
    assert.match(source, /Invalid isolation scope/);
    assert.match(source, /status: "success", applied/);
    assert.match(source, /The append did not complete\./);
    assert.doesNotMatch(source, /neonPool|search_path|fruma_\$\{|mapped_attribute|corrected_value|RESET/);
  });

  it("stays offline when DATABASE_URL is missing", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const response = await postCellMutationRequest(
        new Request("http://localhost/api/deposits/mutate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exceptions: [{ cellId: "cell-1", field: "weight", newValue: "220 GSM" }],
            tenantVersion: "demo",
          }),
        }),
      );
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: "Infrastructure Environment Offline" });
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});
