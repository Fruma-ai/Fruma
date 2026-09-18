import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STEWARD_PROMPT,
  STEWARD_QUEUE,
  blockedOnOwen,
  nextStewardPull,
} from "./steward-queue";

describe("steward queue", () => {
  it("has unique ids and a single next pull", () => {
    const ids = STEWARD_QUEUE.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    const ready = STEWARD_QUEUE.filter((t) => t.status === "ready" && t.owner === "steward");
    assert.ok(ready.length >= 1);
    assert.equal(nextStewardPull()?.id, ready[0]!.id);
  });

  it("never offers Postgres or Demo promotion as an unattended pull", () => {
    const next = nextStewardPull();
    assert.ok(next);
    assert.notEqual(next.id, "postgres");
    assert.notEqual(next.id, "promote-demo");
    assert.equal(next.owner, "steward");
    const blocked = blockedOnOwen().map((t) => t.id);
    assert.ok(blocked.includes("postgres"));
    assert.ok(blocked.includes("promote-demo"));
  });

  it("keeps the standing prompt Test-only", () => {
    assert.match(STEWARD_PROMPT, /nextStewardPull/);
    assert.match(STEWARD_PROMPT, /Never change Demo/);
    assert.match(STEWARD_PROMPT, /Do not invent/);
  });
});
