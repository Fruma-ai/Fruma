import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sourceCellId } from "../ingest/cell-mutations";
import { buildLockedProductTruth, type LockedMillCell } from "./lock";
import type { MillConfirmation } from "../persist";
import type { BrandBrief } from "../intelligence/retrieval";

const DEPOSIT = "dep-lock";

function cell(partial: Partial<LockedMillCell> & Pick<LockedMillCell, "column" | "sourceValue">): LockedMillCell {
  const sheet = partial.sheet ?? "Qualities";
  const row = partial.row ?? 2;
  const column = partial.column;
  return {
    sourceCellId:
      partial.sourceCellId ??
      sourceCellId(DEPOSIT, { sheet, row, column }),
    sheet,
    row,
    column,
    rawHeader: partial.rawHeader ?? column,
    sourceValue: partial.sourceValue,
  };
}

const brief = {
  productId: "prod-1",
  brandId: "brand-1",
  intent: "navy polo",
  requirements: [],
} as unknown as BrandBrief;

const confirmation: MillConfirmation = {
  id: "conf-1",
  requestId: "req-1",
  millOrgId: "mill-1",
  qualityArticle: "Q75-MESH",
  moqM: 320,
  leadWeeks: 6,
  available: true,
  confirmedAt: "2026-10-07T00:00:00.000Z",
};

function input(overrides?: { articleId?: string }) {
  return {
    brief,
    millOrgId: "mill-1",
    millName: "Vale",
    qualityArticle: "Q75-MESH",
    depositId: DEPOSIT,
    constructionAsWritten: "WARP MESH",
    compositionAsWritten: "100% SUPIMA COTTON",
    weightAsWritten: "160",
    colourAsWritten: "Navy",
    cells: {
      article: cell({
        column: "A",
        sourceValue: "Q75-MESH",
        sourceCellId: overrides?.articleId,
      }),
      construction: cell({ column: "B", sourceValue: "WARP MESH" }),
      composition: cell({ column: "C", sourceValue: "100% SUPIMA COTTON" }),
      weight: cell({ column: "D", sourceValue: "160" }),
      colour: cell({ column: "F", sourceValue: "Navy" }),
    },
    confirmation,
  };
}

describe("locked product truth cell foreign keys", () => {
  it("points each mill fact at a source cell of the deposit", () => {
    const record = buildLockedProductTruth(input());
    const mill = record.facts.filter((fact) => fact.sourceType === "mill-file" && fact.status === "evidenced");
    assert.equal(mill.length, 5);
    for (const fact of mill) {
      assert.equal(fact.depositId, DEPOSIT);
      assert.ok(fact.sourceCellId?.startsWith(`cell:${DEPOSIT}:`));
    }
    const article = mill.find((fact) => fact.field === "mill_article");
    assert.equal(article?.sourceCellId, sourceCellId(DEPOSIT, { sheet: "Qualities", row: 2, column: "A" }));
  });

  it("rejects a source cell id that does not belong to the deposit", () => {
    assert.throws(
      () => buildLockedProductTruth(input({ articleId: "cell-from-somewhere-else" })),
      /product_truth_cell_fk/,
    );
  });
});
