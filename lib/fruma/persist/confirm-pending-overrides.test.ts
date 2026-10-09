import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupplierParsingAnomaly } from "@/lib/fruma/ingest/supplier-anomalies";
import { confirmPendingOverrides, pendingOverridesFromAnomalies } from "./confirm-pending-overrides";

function anomaly(overrides: Partial<SupplierParsingAnomaly> = {}): SupplierParsingAnomaly {
  return {
    id: "row-1",
    reason: "unconfirmed",
    header: "Weight",
    sourceValue: "220 GSM",
    standardField: "weight",
    cellId: "cell-1",
    sheet: "Hanger",
    row: 5,
    column: "D",
    ...overrides,
  };
}

describe("confirm pending overrides", () => {
  it("keeps only amber rows that name a cell and a standard field", () => {
    const pending = pendingOverridesFromAnomalies([
      anomaly(),
      anomaly({ id: "row-2", cellId: undefined, standardField: "width", sourceValue: "150 cm" }),
      anomaly({ id: "row-3", cellId: "cell-3", standardField: "secret", sourceValue: "x" }),
    ]);
    assert.deepEqual(pending, [{ cellId: "cell-1", field: "weight", newValue: "220 GSM" }]);
  });

  it("posts the session tenant and refreshes only after a successful append", async () => {
    const calls: { url: string; body: unknown }[] = [];
    let refreshed = 0;
    const ok = await confirmPendingOverrides(
      [{ cellId: "cell-1", field: "weight", newValue: "220 GSM" }],
      "demo",
      () => {
        refreshed += 1;
      },
      (async (url, init) => {
        calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
        return new Response(JSON.stringify({ status: "success", count: 1 }), { status: 200 });
      }) as typeof fetch,
    );
    assert.equal(ok, true);
    assert.equal(refreshed, 1);
    assert.equal(calls[0]?.url, "/api/deposits/mutate");
    assert.deepEqual(calls[0]?.body, {
      exceptions: [{ cellId: "cell-1", field: "weight", newValue: "220 GSM" }],
      tenantVersion: "demo",
    });

    refreshed = 0;
    const failed = await confirmPendingOverrides(
      [{ cellId: "cell-1", field: "weight", newValue: "220 GSM" }],
      "test",
      () => {
        refreshed += 1;
      },
      (async () => new Response(JSON.stringify({ error: "The append did not complete." }), { status: 500 })) as typeof fetch,
    );
    assert.equal(failed, false);
    assert.equal(refreshed, 0);
  });
});