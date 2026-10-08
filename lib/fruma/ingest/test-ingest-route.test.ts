import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { POST } from "../../../app/api/test/ingest/route";
import { FileSpineStore, getSpineStore, setSpineStoreForTests } from "../persist";
import { TEST_SURFACE } from "../surfaces";
import { convertOunceToGsm, formatConverted } from "./units";

const TEST_PASS = "spec8-test-password";

describe("test ingest route persists parsed cells", { concurrency: 1 }, () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fruma-test-ingest-"));
    setSpineStoreForTests(new FileSpineStore(dir));
  });

  afterEach(() => {
    setSpineStoreForTests(null);
  });

  it("entry points call saveDepositPointer", () => {
    const mill = readFileSync(join(process.cwd(), "app/api/mill/deposits/route.ts"), "utf8");
    const testIngest = readFileSync(join(process.cwd(), "app/api/test/ingest/route.ts"), "utf8");
    assert.match(mill, /saveDepositPointer/);
    assert.match(testIngest, /saveDepositPointer/);
    assert.match(mill, /saveSourceCells/);
    assert.match(testIngest, /saveSourceCells/);
  });

  it("stores the corpus deposit and keeps ounce source text", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = `${DEMO_COOKIE}=${await sessionToken("owen")}`;
    const response = await POST(
      new Request("http://localhost/api/test/ingest", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ factoryId: "factory-006" }),
      }),
    );
    assert.equal(response.status, 200);
    const snap = await getSpineStore(TEST_SURFACE).load();
    assert.equal(snap.deposits.length, 1);
    const ounces = snap.sourceCells.find((cell) => /oz/i.test(cell.sourceValue));
    assert.ok(ounces);
    assert.match(ounces.sourceValue, /OZ/);
    const amount = Number(ounces.sourceValue.replace(/[^\d.]/g, ""));
    assert.equal(ounces.normalizedValue, formatConverted(convertOunceToGsm(amount)));
    assert.notEqual(ounces.sourceValue, ounces.normalizedValue);

    const again = await POST(
      new Request("http://localhost/api/test/ingest", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ factoryId: "factory-006" }),
      }),
    );
    assert.equal(again.status, 409);
    const after = await getSpineStore(TEST_SURFACE).load();
    assert.equal(after.deposits.length, 1);
    assert.equal(
      after.sourceCells.find((cell) => cell.id === ounces.id)?.sourceValue,
      ounces.sourceValue,
    );
  });
});
