import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const page = readFileSync(new URL("../../../app/(ledger)/deposits/page.tsx", import.meta.url), "utf8");
const workbench = readFileSync(new URL("../../../components/fruma/FactoryIngestWorkbench.tsx", import.meta.url), "utf8");
const grid = readFileSync(new URL("../../../components/fruma/SupplierExceptionGrid.tsx", import.meta.url), "utf8");

describe("obsidian deposits workbench", () => {
  it("keeps the deposits canvas on obsidian without a write", () => {
    assert.match(page, /bg-\[#0B0C0E\]/);
    assert.match(page, /text-zinc-100/);
    assert.doesNotMatch(page, /\b(?:UPDATE|INSERT|DELETE|DROP|fetch|executeTenantQuery)\b/);
    assert.doesNotMatch(page, /\bp-(?:6|8|10|12)\b/);
  });

  it("uses the 11px zinc header rule", () => {
    const header = "border-b border-zinc-800/60 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400";
    assert.match(workbench, new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(grid, new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  it("paints anomaly containers with the dashed amber contrast", () => {
    assert.match(grid, /border-dashed border-amber-500\/80 bg-amber-500\/5/);
    assert.match(page, /ANOMALY_PROPOSAL/);
  });

  it("keeps confirmation controls compact", () => {
    assert.match(workbench, /px-3 py-1 text-\[11px\]/);
    assert.doesNotMatch(workbench, /py-3|p-8|animate-/);
    assert.doesNotMatch(workbench, /\bfetch\b/);
  });
});
