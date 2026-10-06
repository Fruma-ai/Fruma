import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { millViewOfRequest } from "../confirm";
import { getSpineStore } from "../persist";
import { DEMO_SURFACE } from "../surfaces";
import {
  answerDemoCase,
  askMill,
  getDemoCase,
  lockDemoCase,
  resetDemoCasesForTests,
  resetWedgeForTests,
  sourceCloth,
} from "./index";

describe("demo case — people decide, the pipeline does not", () => {
  beforeEach(async () => {
    const dir = join(tmpdir(), `fruma-case-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    resetDemoCasesForTests();
    await resetWedgeForTests(dir);
  });

  it("search cites cloth and does not ask, confirm, or lock", async () => {
    const view = await sourceCloth({ surface: DEMO_SURFACE, colour: "Navy", productName: "Navy mesh polo" });
    assert.equal(view.phase, "cloth");
    assert.equal(view.pilot?.shortlist.commercials.freshness, "historical");
    assert.equal(view.brand, null);
    assert.equal(view.mill, null);
    assert.equal(view.confirmation, null);
    assert.equal(view.locked, null);
    assert.equal(view.pilot?.brief.productName, "Navy mesh polo");
    assert.ok(view.pilot && view.pilot.shortlist.matchingFabricCount >= 2);
    assert.ok(view.pilot.shortlist.hits.every((hit) => /navy/i.test(hit.colourAsWritten)));

    const snap = await getSpineStore(DEMO_SURFACE).load();
    assert.equal(snap.requests.length, 0);
    assert.equal(snap.confirmations.length, 0);
    assert.equal(snap.productTruth.length, 0);
    assert.equal(snap.deposits.length, 1);
  });

  it("leaves colour open instead of inventing navy", async () => {
    const view = await sourceCloth({ surface: DEMO_SURFACE, colour: null });
    assert.equal(view.colourSearched, null);
    const articles = view.pilot?.shortlist.hits.map((hit) => hit.articleCode) ?? [];
    assert.ok(articles.includes("Q40-SJ"));
    assert.ok(articles.includes("Q75-MESH"));
    assert.equal(articles.includes("Q12-FLE"), false);
  });

  it("ask hides the brand, answer does not lock, lock uses the mill's terms", async () => {
    await sourceCloth({ surface: DEMO_SURFACE, colour: "Navy", intent: "Structured navy polo." });
    const asked = await askMill({ surface: DEMO_SURFACE, articleCode: "Q75-MESH" });
    assert.equal(asked.phase, "asked");
    assert.equal(asked.brand?.brandId, "brand-northline");
    assert.equal(asked.mill?.qualityArticle, "Q75-MESH");
    assert.equal("brandId" in (asked.mill ?? {}), false);
    assert.equal(JSON.stringify(asked.mill).includes("brand-northline"), false);
    assert.equal(JSON.stringify(asked.mill).includes("Northline"), false);

    await assert.rejects(() => lockDemoCase({ surface: DEMO_SURFACE }), /not answered/);

    const answered = await answerDemoCase({ surface: DEMO_SURFACE, moqM: 350, leadWeeks: 5 });
    assert.equal(answered.phase, "answered");
    assert.equal(answered.locked, null);
    assert.equal(answered.confirmation?.moqM, 350);
    assert.equal(answered.pilot?.shortlist.commercials.freshness, "confirmed");
    assert.equal(millViewOfRequest(
      (await getSpineStore(DEMO_SURFACE).load()).requests[0],
    ).status, "answered");

    const locked = await lockDemoCase({ surface: DEMO_SURFACE });
    assert.equal(locked.phase, "locked");
    const moq = locked.locked?.facts.find((fact) => fact.field === "moq_m");
    assert.equal(moq?.value, "350");
    assert.equal(moq?.sourceType, "mill-response");
    assert.equal(moq?.status, "confirmed");
    const intent = locked.locked?.facts.find((fact) => fact.field === "intent");
    assert.equal(intent?.value, "Structured navy polo.");
    assert.ok(!locked.locked?.facts.some((fact) => /GOTS/i.test(fact.value)));
  });

  it("refuses cloth that cannot become the product, and a second search after an ask", async () => {
    await sourceCloth({ surface: DEMO_SURFACE, colour: "Navy" });
    await assert.rejects(() => askMill({ surface: DEMO_SURFACE, articleCode: "Q12-FLE" }), /shortlist/);
    await askMill({ surface: DEMO_SURFACE, articleCode: "Q75-PIQ" });
    await assert.rejects(() => sourceCloth({ surface: DEMO_SURFACE, colour: "Ecru" }), /already has a mill request/);
    assert.equal(getDemoCase(DEMO_SURFACE).phase, "asked");
  });

  it("does not lock a quality the mill marked unavailable", async () => {
    await sourceCloth({ surface: DEMO_SURFACE, colour: "Navy" });
    await askMill({ surface: DEMO_SURFACE, articleCode: "Q75-MESH" });
    await answerDemoCase({ surface: DEMO_SURFACE, moqM: 300, leadWeeks: 8, available: false });
    await assert.rejects(() => lockDemoCase({ surface: DEMO_SURFACE }), /not available/);
    assert.equal(getDemoCase(DEMO_SURFACE).phase, "answered");
    assert.equal(getDemoCase(DEMO_SURFACE).locked, null);
  });
});
