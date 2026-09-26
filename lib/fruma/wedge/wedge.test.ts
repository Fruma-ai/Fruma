import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getSpineStore, FileSpineStore, setSpineStoreForTests } from "../persist";
import { millViewOfRequest } from "../confirm";
import { isDestinationSafe } from "../product-truth";
import { hydrateHeaderOverlaysFromStore, resetWedgeForTests, runWedgeSlice } from "./index";
import { confirmedHeaderOverlays, resetHeaderOverlaysForTests } from "../intelligence/overlays";
import { resetPilotEngineForTests } from "../pilot";
import { DEMO_SURFACE, TEST_SURFACE } from "../surfaces";

describe("full Test wedge — confirm → lock → persist", () => {
  beforeEach(async () => {
    const dir = join(tmpdir(), `fruma-wedge-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await resetWedgeForTests(dir);
  });

  it("runs workbook → map → anonymous confirm → locked product truth on file spine", async () => {
    const result = await runWedgeSlice({ moqM: 350, leadWeeks: 5 });

    assert.equal(result.surface, "test");
    assert.equal(result.persistence.backend, "file");
    assert.ok(result.pilot.shortlist.matchingFabricCount >= 2);
    assert.equal(result.pilot.shortlist.commercials.freshness, "confirmed");
    assert.equal(result.commercials.before, "historical");
    assert.equal(result.commercials.after, "confirmed");
    assert.equal(result.confirmation.moqM, 350);
    assert.equal(result.confirmation.leadWeeks, 5);
    assert.ok(result.confirmation.confirmedAt);

    const millView = result.request.millVisible;
    assert.equal(millView.millVisible.category, "Polo");
    assert.equal("brandId" in millView, false);
    assert.equal("brandId" in millViewOfRequest(result.request.brandSide), false);
    assert.ok(result.request.brandSide.brandId);

    assert.ok(result.locked.lockedSourceId?.includes(result.confirmation.qualityArticle));
    assert.equal(result.locked.version, 1);
    const moq = result.locked.facts.find((f) => f.field === "moq_m");
    assert.ok(moq);
    assert.equal(moq.status, "confirmed");
    assert.equal(moq.sourceType, "mill-response");
    assert.equal(moq.value, 350);
    assert.ok(isDestinationSafe(moq));

    const snap = await getSpineStore().load();
    assert.equal(snap.confirmations.length, 1);
    assert.equal(snap.productTruth.length, 1);
    assert.equal(snap.deposits.length, 1);
    assert.ok(snap.headerMaps.some((m) => m.surface === TEST_SURFACE));

    const bytes = await getSpineStore().getDepositBytes(result.pilot.workbook.depositId);
    assert.ok(bytes);
    assert.ok(bytes.byteLength > 0);
  });

  it("header overlays survive a simulated process restart via the file store", async () => {
    const dir = join(tmpdir(), `fruma-overlay-${Date.now()}`);
    const store = new FileSpineStore(dir);
    setSpineStoreForTests(store);
    await runWedgeSlice();

    const before = confirmedHeaderOverlays(TEST_SURFACE);
    assert.ok(Object.keys(before).length > 0);

    // Simulate cold process: clear in-memory overlays, keep durable store.
    resetHeaderOverlaysForTests();
    resetPilotEngineForTests();
    setSpineStoreForTests(new FileSpineStore(dir));
    assert.equal(Object.keys(confirmedHeaderOverlays(TEST_SURFACE)).length, 0);

    const hydrated = await hydrateHeaderOverlaysFromStore();
    assert.ok(Object.keys(hydrated).length > 0);
    assert.equal(confirmedHeaderOverlays(TEST_SURFACE)["art."], "article");
  });

  it("does not invent GOTS on the locked record from organic fibre", async () => {
    const result = await runWedgeSlice();
    assert.ok(!result.locked.facts.some((f) => /GOTS/i.test(String(f.value ?? ""))));
    assert.ok(result.pilot.shortlist.evidence.some((e) => e.code === "organic-not-gots"));
  });

  it("runs the same wedge on the Demo surface without touching Test overlays", async () => {
    const demo = await runWedgeSlice({ surface: DEMO_SURFACE, moqM: 310, leadWeeks: 4 });
    assert.equal(demo.surface, DEMO_SURFACE);
    assert.equal(demo.pilot.surface, DEMO_SURFACE);
    assert.equal(demo.confirmation.moqM, 310);
    assert.ok(demo.locked.lockedSourceId);

    // Test overlays stay empty until a Test wedge runs.
    assert.equal(Object.keys(confirmedHeaderOverlays(TEST_SURFACE)).length, 0);
    assert.ok(Object.keys(confirmedHeaderOverlays(DEMO_SURFACE)).length > 0);
  });
});
