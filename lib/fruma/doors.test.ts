import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FILE_RECEIVED_COPY,
  INDEX_FILTER_LABEL,
  SEED_BANNER_COPY,
  VDA_NOT_PARTNER,
  searchClothKicker,
  showWeldTick,
} from "./honesty";
import { DOOR_COPY, DOORS } from "./doors";

describe("founder UI SPEC — door copy", () => {
  it("implements /mills copy exactly", () => {
    assert.equal(
      DOOR_COPY.mills,
      "The catalogue you already have. Fruma maps the files you already keep. You do not replace your systems. You keep the file. You confirm the map. Unknown stays unknown. Qualities become findable once on the standard — not when a file is dropped.",
    );
    assert.equal(DOORS.mills.path, "/mills");
    assert.equal(DOORS.mills.kind, "mill");
  });

  it("implements /brands copy exactly", () => {
    assert.equal(
      DOOR_COPY.brands,
      "One way to read many mill catalogues. Comparable records, source still on the record. Search is for qualities on the standard, not seed, and not until claimed + mapped + confirmed as sent.",
    );
    assert.equal(DOORS.brands.path, "/brands");
    assert.equal(DOORS.brands.kind, "brand");
  });

  it("implements /retailers copy exactly", () => {
    assert.equal(
      DOOR_COPY.retailers,
      "Facts stay with the mill that sent them. Destination may reformat. It does not rewrite the file.",
    );
    assert.equal(DOORS.retailers.path, "/retailers");
    assert.equal(DOORS.retailers.kind, "retailer");
  });
});

describe("founder UI SPEC — labels and ticks", () => {
  it("keeps the File sentence exact", () => {
    assert.equal(
      FILE_RECEIVED_COPY,
      "File received. Not mapped. Not in the live catalogue.",
    );
  });

  it("renames the Origin filter to All on the index.", () => {
    assert.equal(INDEX_FILTER_LABEL, "All on the index.");
  });

  it("shows the 10mm weld tick only on mapped and confirmed as-sent rows", () => {
    assert.equal(
      showWeldTick({ provenance: "as-sent", mapped: true, confirmed: true }),
      true,
    );
    assert.equal(
      showWeldTick({ provenance: "As sent", mapped: true, confirmed: true }),
      true,
    );
    assert.equal(
      showWeldTick({ provenance: "as-sent", mapped: true, confirmed: false }),
      false,
    );
    assert.equal(
      showWeldTick({ provenance: "as-sent", mapped: false, confirmed: true }),
      false,
    );
    assert.equal(
      showWeldTick({ provenance: "seeded", mapped: true, confirmed: true }),
      false,
    );
    assert.equal(
      showWeldTick({ provenance: "Seeded", mapped: true, confirmed: true }),
      false,
    );
    assert.equal(
      showWeldTick({ provenance: "unknown", mapped: true, confirmed: true }),
      false,
    );
  });

  it("does not present seed search results as mill identity", () => {
    assert.equal(searchClothKicker(undefined), "Seeded");
    assert.equal(searchClothKicker("index"), "Seeded");
    assert.equal(searchClothKicker("mill-file"), "On the standard");
  });

  it("keeps the seed banner and Vale do Ave hedge", () => {
    assert.equal(
      SEED_BANNER_COPY,
      "Seeded. Not mill identity. Named grants are not in this build.",
    );
    assert.equal(VDA_NOT_PARTNER, "Têxteis Vale do Ave is not a partner.");
  });
});
