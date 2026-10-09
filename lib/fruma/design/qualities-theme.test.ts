import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const page = readFileSync(new URL("../../../app/(ledger)/qualities/page.tsx", import.meta.url), "utf8");
const canvas = readFileSync(new URL("../../../components/fruma/DiscoveryCanvas.tsx", import.meta.url), "utf8");
const discovery = readFileSync(new URL("../../../components/fruma/StudioDiscovery.tsx", import.meta.url), "utf8");
const badge = readFileSync(new URL("../../../components/fruma/PriorDevelopmentBadge.tsx", import.meta.url), "utf8");
const compass = readFileSync(new URL("../../../components/fruma/TactileCompass.tsx", import.meta.url), "utf8");

describe("obsidian qualities discovery", () => {
  it("paints the studio on the obsidian canvas", () => {
    assert.match(page, /bg-\[#0B0C0E\]/);
    assert.match(page, /text-zinc-100/);
    assert.match(page, /text-zinc-400/);
    assert.doesNotMatch(page, /animate-|lucide-react/);
  });

  it("keeps the brief field on a muted zinc field with a solid focus outline", () => {
    assert.match(canvas, /border-zinc-800\/60/);
    assert.match(canvas, /bg-zinc-900\/40/);
    assert.match(canvas, /focus-visible:outline-solid/);
    assert.match(canvas, /focus-visible:outline-zinc-400/);
    assert.doesNotMatch(canvas, /animate-/);
  });

  it("sets mapping-grid headers to 11px uppercase tracks", () => {
    assert.match(discovery, /p-0 text-left text-\[11px\] font-medium uppercase tracking-\[0\.14em\] text-zinc-400/);
    assert.match(discovery, /Prior Development/);
    assert.match(discovery, /PriorDevelopmentBadge/);
    assert.match(compass, /tracking-\[0\.14em\]/);
    assert.match(compass, /text-\[11px\]/);
    assert.match(compass, /uppercase/);
  });

  it("keeps the prior-development badge sharp", () => {
    assert.match(badge, /tracking-\[0\.14em\]/);
    assert.match(badge, /text-\[11px\]/);
    assert.match(badge, /uppercase/);
    assert.match(badge, /py-0/);
    assert.doesNotMatch(badge, /px-2|py-1|animate-/);
  });
});
