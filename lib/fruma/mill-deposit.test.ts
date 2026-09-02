import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalog, liveCatalogFabrics } from "./catalog";
import { FILE_RECEIVED_COPY } from "./honesty";
import {
  asSentQualities,
  depositExceptions,
  formatMillDepositException,
  isMillDepositResponse,
  millDepositFailureFromBody,
  MILL_DEPOSITS_PATH,
  postMillDeposit,
  toMillDepositResponse,
} from "./mill-deposit";

const SAMPLE = toMillDepositResponse({
  depositId: "dep_test",
  filename: "synthetic-hanger.csv",
  receivedAt: "2026-09-02T11:00:00.000Z",
  sha256: "abc",
  qualities: [
    {
      baseQualityId: "bq:org_mill_synthetic:SYN-QA-100",
      millArticleCode: "SYN-QA-100",
      colourwayIds: ["cw:navy"],
    },
  ],
  exceptions: [
    {
      code: "empty_article",
      message: "Empty article is an exception; ingest will not generate an id.",
      sheet: "synthetic-hanger.csv",
      row: 4,
      column: "A",
    },
  ],
});

describe("SPEC 8 mill-deposit Workshop client helpers", () => {
  it("flattens as-sent qualities from DTOs without touching seeded catalog", () => {
    const catalog = buildCatalog();
    const asSent = asSentQualities([SAMPLE]);
    assert.equal(asSent.length, 1);
    assert.equal(asSent[0]?.millArticleCode, "SYN-QA-100");
    assert.equal(asSent[0]?.visibility, "Private");
    assert.ok(catalog.every((row) => row.provenance === "seeded"));
    assert.ok(!catalog.some((row) => row.article === "SYN-QA-100"));
    assert.equal(
      liveCatalogFabrics(catalog, { claimed: true, mapped: true }).length,
      0,
    );
  });

  it("formats per-row exceptions with pointer, not fake catalogue copy", () => {
    const [exception] = depositExceptions([SAMPLE]);
    assert.ok(exception);
    const text = formatMillDepositException(exception);
    assert.ok(text.includes("empty_article"));
    assert.ok(text.includes("row 4"));
    assert.ok(text.includes("column A"));
    assert.equal(text.includes(FILE_RECEIVED_COPY), false);
  });

  it("reads 4xx ingest JSON as code/message", () => {
    const failure = millDepositFailureFromBody(400, {
      code: "unparsed_bytes",
      message: "Could not parse those bytes as a mill spreadsheet.",
    });
    assert.equal(failure.code, "unparsed_bytes");
    assert.ok(failure.message);
    assert.equal(isMillDepositResponse({ code: "unparsed_bytes" }), false);
  });

  it("POSTs multipart file with credentials include", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify(SAMPLE), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const file = new File(["Article\nSYN-QA-100"], "synthetic-hanger.csv", {
        type: "text/csv",
      });
      const result = await postMillDeposit(file);
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.deposit.fileStepSentence, FILE_RECEIVED_COPY);
        assert.equal(result.deposit.qualities[0]?.visibility, "Private");
      }
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.url, MILL_DEPOSITS_PATH);
      assert.equal(calls[0]?.init.method, "POST");
      assert.equal(calls[0]?.init.credentials, "include");
      assert.ok(calls[0]?.init.body instanceof FormData);
      const sent = (calls[0]?.init.body as FormData).get("file");
      assert.ok(sent instanceof File);
      assert.equal(sent.name, "synthetic-hanger.csv");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("unparsed 4xx is a failure, not a millReadStatus ready payload", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          code: "unparsed_bytes",
          message: "Could not parse those bytes as a mill spreadsheet.",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      )) as typeof fetch;

    try {
      const file = new File(["%PDF-1.4"], "card.pdf", { type: "application/pdf" });
      const result = await postMillDeposit(file);
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.failure.code, "unparsed_bytes");
        assert.ok(result.failure.message);
      }
    } finally {
      globalThis.fetch = original;
    }
  });
});
