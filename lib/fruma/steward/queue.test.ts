import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

type QueueItem = {
  id: string;
  status: string;
  title: string;
  acceptance: string[];
  blockedBy?: string[];
};

describe("steward queue", () => {
  it("exposes exactly one ready item with acceptance checks", () => {
    const queue = JSON.parse(
      readFileSync(new URL("../../../docs/agents/QUEUE.json", import.meta.url), "utf8"),
    ) as { items: QueueItem[] };
    const ready = queue.items.filter((item) => item.status === "open" && (item.blockedBy ?? []).length === 0);
    assert.equal(ready.length, 1);
    assert.ok(ready[0].id);
    assert.ok(ready[0].acceptance.length >= 2);
    const ids = new Set(queue.items.map((item) => item.id));
    for (const item of queue.items) {
      for (const blocker of item.blockedBy ?? []) {
        assert.equal(ids.has(blocker), true);
      }
    }
  });
});
