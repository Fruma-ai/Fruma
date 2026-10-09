import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { compassScanBody, dimensionsFromPrompt, swatchHex } from "./compass-scan";

describe("studio compass scan", () => {
  it("reads gsm and centimetre width from a brief", () => {
    assert.deepEqual(dimensionsFromPrompt("240 gsm cotton 150 cm"), { gsm: 240, width: 150 });
    assert.equal(dimensionsFromPrompt("220 gsm cotton mesh"), null);
    assert.equal(dimensionsFromPrompt("150 cm only"), null);
  });

  it("sends ledger text for the session tenant", () => {
    assert.deepEqual(compassScanBody(240, 150, "demo"), {
      targetGsm: "240 GSM",
      targetWidth: "150 cm",
      tenantVersion: "demo",
    });
    assert.equal(swatchHex("#0B0C0E"), "#0B0C0E");
    assert.equal(swatchHex("red"), null);
    const compass = readFileSync(new URL("../../../components/fruma/StudioCompass.tsx", import.meta.url), "utf8");
    assert.match(compass, /\/api\/qualities\/compass/);
    assert.match(compass, /executeCompassScan/);
    assert.doesNotMatch(compass, /animate-|indigo-|📍|🗄️|📏/);
    const route = readFileSync(new URL("../../../app/api/qualities/compass/route.ts", import.meta.url), "utf8");
    assert.match(route, /postBrandHistoryRequest/);
    assert.doesNotMatch(route, /neonPool|search_path|fruma_\$\{/);
  });
});
