import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_SURFACE,
  TEST_SURFACE,
  parseFrumaSurface,
  surfaceFromRequest,
  surfaceMillOrgId,
  surfaceStorageKey,
} from "./surfaces";
import {
  millIngestEngineFor,
  resetMillIngestEnginesForTests,
} from "./ingest/deposits-http";

describe("surface isolation", () => {
  it("namespaces storage and mill orgs by surface", () => {
    assert.equal(surfaceStorageKey(DEMO_SURFACE, "mill-learn"), "fruma:demo:mill-learn");
    assert.equal(surfaceStorageKey(TEST_SURFACE, "mill-learn"), "fruma:test:mill-learn");
    assert.notEqual(surfaceMillOrgId(DEMO_SURFACE), surfaceMillOrgId(TEST_SURFACE));
    assert.equal(parseFrumaSurface("test"), "test");
    assert.equal(parseFrumaSurface("nope"), null);
  });

  it("defaults mill deposits to demo unless header/form says test", () => {
    const demoReq = new Request("http://localhost/api/mill/deposits", { method: "POST" });
    assert.equal(surfaceFromRequest(demoReq), DEMO_SURFACE);

    const testReq = new Request("http://localhost/api/mill/deposits", {
      method: "POST",
      headers: { "X-Fruma-Version": "test" },
    });
    assert.equal(surfaceFromRequest(testReq), TEST_SURFACE);
  });

  it("keeps separate ingest engines for demo and test", () => {
    resetMillIngestEnginesForTests();
    const demo = millIngestEngineFor(DEMO_SURFACE);
    const test = millIngestEngineFor(TEST_SURFACE);
    assert.notEqual(demo, test);
    assert.equal(millIngestEngineFor(DEMO_SURFACE), demo);
    assert.equal(millIngestEngineFor(TEST_SURFACE), test);
  });
});
