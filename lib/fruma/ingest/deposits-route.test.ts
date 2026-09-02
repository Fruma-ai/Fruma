import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { FILE_RECEIVED_COPY } from "../honesty";
import { toMillDepositResponse } from "../mill-deposit";
import {
  handleMillDepositRequest,
  SYNTHETIC_MILL_ORG_ID,
} from "./deposits-http";
import { sha256Hex } from "./hash";

const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url));
const CSV_NAME = "synthetic-hanger.csv";
const CSV_BYTES = new Uint8Array(readFileSync(join(FIXTURE_DIR, "fixtures", CSV_NAME)));

const TEST_PASS = "spec8-test-password";

function collectKeys(value: unknown, acc = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return acc;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, acc);
    return acc;
  }
  for (const [key, child] of Object.entries(value)) {
    acc.add(key);
    collectKeys(child, acc);
  }
  return acc;
}

async function signedCookie(): Promise<string> {
  process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
  return `${DEMO_COOKIE}=${await sessionToken("owen")}`;
}

function depositRequest(args: {
  cookie?: string;
  file?: File;
  extraFields?: Record<string, string>;
}): Request {
  const form = new FormData();
  if (args.file) form.set("file", args.file);
  for (const [name, value] of Object.entries(args.extraFields ?? {})) {
    form.set(name, value);
  }
  const headers = new Headers();
  if (args.cookie) headers.set("cookie", args.cookie);
  return new Request("http://localhost/api/mill/deposits", {
    method: "POST",
    headers,
    body: form,
  });
}

describe("SPEC 8 mill deposits Route Handler", () => {
  it("returns 401 without a mill/Workshop session cookie", async () => {
    const file = new File([CSV_BYTES], CSV_NAME, { type: "text/csv" });
    const result = await handleMillDepositRequest(depositRequest({ file }));
    assert.equal(result.status, 401);
    assert.ok("error" in result.body);
  });

  it("returns 401 when the founder cookie is invalid", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const file = new File([CSV_BYTES], CSV_NAME, { type: "text/csv" });
    const result = await handleMillDepositRequest(
      depositRequest({
        cookie: `${DEMO_COOKIE}=owen.not-a-session`,
        file,
      }),
    );
    assert.equal(result.status, 401);
  });

  it("deposits csv as Private stubs with FILE_RECEIVED_COPY, sha256, and no bytes", async () => {
    const cookie = await signedCookie();
    const file = new File([CSV_BYTES], CSV_NAME, { type: "text/csv" });
    const result = await handleMillDepositRequest(
      depositRequest({
        cookie,
        file,
        extraFields: {
          supplierOrgId: "org_vda_override",
          millOrg: "Vale do Ave",
        },
      }),
    );
    assert.equal(result.status, 200);
    const body = result.body;
    assert.ok(!("error" in body) && !("code" in body && !("depositId" in body)));
    if (!("depositId" in body)) throw new Error("expected mill-deposit DTO");

    assert.equal(body.filename, CSV_NAME);
    assert.equal(body.sha256, sha256Hex(CSV_BYTES));
    assert.equal(body.fileStepSentence, FILE_RECEIVED_COPY);
    assert.ok(body.depositId.length > 0);
    assert.ok(body.receivedAt.length > 0);

    assert.ok(body.qualities.length >= 1);
    assert.ok(body.qualities.every((q) => q.visibility === "Private"));
    assert.ok(
      body.qualities.every((q) => q.baseQualityId.startsWith(`bq:${SYNTHETIC_MILL_ORG_ID}:`)),
    );
    assert.ok(!body.qualities.some((q) => q.baseQualityId.includes("org_vda_override")));
    assert.ok(!body.qualities.some((q) => /VDA-24/i.test(q.millArticleCode)));
    assert.ok(!JSON.stringify(body).includes("Vale do Ave"));

    const keys = collectKeys(body);
    assert.equal(keys.has("bytes"), false);
    assert.equal(Object.hasOwn(body, "bytes"), false);
    assert.equal(keys.has("sourceValue"), false);
    assert.equal(keys.has("cells"), false);
    assert.equal(keys.has("millReadStatus"), false);
    assert.equal(keys.has("grants"), false);

    const dumped = JSON.stringify(body);
    assert.ok(!dumped.includes("SYN-QA-100,S/J 30/1"));
    assert.ok(!dumped.includes("%PDF"));
  });

  it("empty article is an exception pointer, not an invented quality", async () => {
    const cookie = await signedCookie();
    const file = new File([CSV_BYTES], CSV_NAME, { type: "text/csv" });
    const result = await handleMillDepositRequest(depositRequest({ cookie, file }));
    assert.equal(result.status, 200);
    if (!("depositId" in result.body)) throw new Error("expected mill-deposit DTO");
    const body = result.body;

    const empty = body.exceptions.filter((e) => e.code === "empty_article");
    assert.equal(empty.length, 1);
    assert.equal(empty[0]?.sheet, CSV_NAME);
    assert.equal(empty[0]?.row, 4);
    assert.equal(empty[0]?.column, "A");
    assert.ok(empty[0]?.message);

    assert.equal(body.qualities.length, 2);
    assert.deepEqual(
      body.qualities.map((q) => q.millArticleCode).sort(),
      ["SYN-QA-100", "SYN-QA-200"],
    );
    assert.ok(!body.qualities.some((q) => q.millArticleCode === ""));
    assert.ok(!body.qualities.some((q) => q.baseQualityId.endsWith(":")));
    const qa100 = body.qualities.find((q) => q.millArticleCode === "SYN-QA-100");
    assert.ok(qa100);
    assert.ok(qa100.colourwayIds.length >= 1);
  });

  it("pdf / non-xlsx bytes return 4xx unparsed_bytes and no catalogue stubs", async () => {
    const cookie = await signedCookie();
    const pdf = new File([new TextEncoder().encode("%PDF-1.4 fake")], "card.pdf", {
      type: "application/pdf",
    });
    const pdfResult = await handleMillDepositRequest(depositRequest({ cookie, file: pdf }));
    assert.equal(pdfResult.status, 400);
    assert.ok("code" in pdfResult.body);
    assert.equal(pdfResult.body.code, "unparsed_bytes");
    assert.ok(pdfResult.body.message);
    assert.ok(!("depositId" in pdfResult.body));
    assert.ok(!("qualities" in pdfResult.body));
    assert.equal(collectKeys(pdfResult.body).has("bytes"), false);

    const jsonFile = new File([new TextEncoder().encode('{"article":"SYN"}')], "rows.json", {
      type: "application/json",
    });
    const jsonResult = await handleMillDepositRequest(depositRequest({ cookie, file: jsonFile }));
    assert.equal(jsonResult.status, 400);
    assert.ok("code" in jsonResult.body);
    assert.equal(jsonResult.body.code, "unparsed_bytes");
  });

  it("mapper never copies bytes or brand payloads onto the DTO", () => {
    const dto = toMillDepositResponse({
      depositId: "dep_test",
      filename: CSV_NAME,
      receivedAt: "2026-09-02T11:00:00.000Z",
      sha256: "abc",
      qualities: [
        {
          baseQualityId: `bq:${SYNTHETIC_MILL_ORG_ID}:SYN-QA-100`,
          millArticleCode: "SYN-QA-100",
          colourwayIds: ["cw:navy"],
        },
      ],
      exceptions: [
        {
          code: "empty_article",
          message: "Empty article is an exception; ingest will not generate an id.",
          sheet: CSV_NAME,
          row: 4,
          column: "A",
        },
      ],
    });
    assert.equal(dto.fileStepSentence, FILE_RECEIVED_COPY);
    assert.equal(dto.qualities[0]?.visibility, "Private");
    const keys = collectKeys(dto);
    assert.equal(keys.has("bytes"), false);
    assert.equal(keys.has("sourceValue"), false);
    assert.equal(keys.has("Fabric"), false);
  });
});
