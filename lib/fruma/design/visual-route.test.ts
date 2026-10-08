import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { MATERIAL_EMBEDDING_DIMENSIONS, vectorLiteral } from "../persist/embeddings";
import type { Client } from "../persist/reload-engines";
import { setPostgresPoolForTests, type PostgresPool } from "../persist/postgres-store";
import { simulatedVisualEmbedding } from "./visual-embedding";
import { VISUAL_PAYLOAD_MAX_BYTES, handleVisualSearchRequest } from "./visual-http";

const TEST_PASS = "visual-route-password";
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9, 1, 2, 3, 4]);

type Call = { query: string; parameters?: readonly unknown[] };

function ledgerPool(rows: Record<string, unknown>[] = [], failSearch = false): PostgresPool & {
  calls: Call[];
  connects: number;
  releases: number;
} {
  const calls: Call[] = [];
  const state = { connects: 0, releases: 0 };
  return {
    calls,
    get connects() {
      return state.connects;
    },
    get releases() {
      return state.releases;
    },
    async connect() {
      state.connects += 1;
      const client: Client & { release(): void } = {
        async unsafe(query: string, parameters?: readonly unknown[]) {
          calls.push({ query, parameters });
          if (query.trim().startsWith("SET search_path")) return [];
          if (query.includes("fruma_material_embeddings")) {
            if (failSearch) throw new Error("ledger down");
            return rows;
          }
          throw new Error(`Unexpected visual query: ${query}`);
        },
        release() {
          state.releases += 1;
        },
      };
      return client;
    },
  };
}

function mediaFile(bytes: Uint8Array, type: string, name = "swatch.bin"): File {
  return new File([bytes], name, { type });
}

function visualRequest(args: {
  cookie?: string;
  version?: string | null;
  file?: File | "text" | null;
  complianceTarget?: string;
  malformed?: boolean;
}): Request {
  const headers = new Headers();
  if (args.cookie) headers.set("cookie", `${DEMO_COOKIE}=${args.cookie}`);
  if (args.version) headers.set("x-fruma-version", args.version);
  if (args.malformed) {
    headers.set("content-type", "application/json");
    return new Request("http://localhost/api/design/visual", {
      method: "POST",
      headers,
      body: "{",
    });
  }
  const form = new FormData();
  if (args.file === "text") form.set("mediaFile", "not-a-file");
  else if (args.file) form.set("mediaFile", args.file);
  if (args.complianceTarget !== undefined) form.set("complianceTarget", args.complianceTarget);
  return new Request("http://localhost/api/design/visual", {
    method: "POST",
    headers,
    body: form,
  });
}

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

describe("POST /api/design/visual", { concurrency: 1 }, () => {
  afterEach(() => {
    for (const version of ["demo", "test", "production"] as const) {
      setPostgresPoolForTests(version, null);
    }
  });

  it("keeps the route thin and the search on the public cosine operator", () => {
    const route = readFileSync(join(process.cwd(), "app/api/design/visual/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/design/visual-http.ts"), "utf8");
    assert.match(route, /import "server-only"/);
    assert.match(route, /export const runtime = "nodejs"/);
    assert.match(route, /export const dynamic = "force-dynamic"/);
    assert.match(route, /export async function POST\(request: Request\)/);
    assert.match(route, /handleVisualSearchRequest/);
    assert.equal(route.includes("getPostgresPool"), false);
    assert.match(handler, /requireTestFounder\(request\)/);
    assert.match(handler, /getPostgresPool\(version\)/);
    assert.match(handler, /searchPathStatement\(version\)/);
    assert.match(handler, /OPERATOR\(public\.<=>\)/);
    assert.match(handler, /\$1::public\.vector/);
    assert.match(handler, /LIMIT 10/);
    assert.match(handler, /vectorLiteral\(vector\)/);
    assert.equal(handler.includes("article_code"), false);
    assert.equal(handler.includes("client.query"), false);
    assert.equal(handler.includes("Math.random"), false);
    assert.match(handler, /client\?\.release\(\)/);
  });

  it("expands file bytes into a stable 1536-d vector", () => {
    const first = simulatedVisualEmbedding(JPEG);
    const second = simulatedVisualEmbedding(JPEG);
    const other = simulatedVisualEmbedding(Uint8Array.from([1]));
    assert.equal(first.length, MATERIAL_EMBEDDING_DIMENSIONS);
    assert.deepEqual(first, second);
    assert.notDeepEqual(first, other);
    assert.equal(
      first.every((value) => Number.isFinite(value) && value >= -1 && value <= 1),
      true,
    );
  });

  it("returns 401 when the founder session cookie is missing or invalid", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const pool = ledgerPool();
    setPostgresPoolForTests("test", pool);

    const missing = await handleVisualSearchRequest(
      visualRequest({ version: "test", file: mediaFile(JPEG, "image/jpeg") }),
    );
    assert.equal(missing.status, 401);
    assert.equal(missing.surface, "test");
    assert.deepEqual(missing.body, { error: "unauthorized_operator" });

    const invalid = await handleVisualSearchRequest(
      visualRequest({
        version: "demo",
        cookie: "owen.not-a-session",
        file: mediaFile(JPEG, "image/png"),
      }),
    );
    assert.equal(invalid.status, 401);
    assert.deepEqual(invalid.body, { error: "unauthorized_operator" });
    assert.equal(pool.connects, 0);
  });

  it("rejects an unknown environment, a bad upload, and a bad compliance target before opening a pool", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const pool = ledgerPool();
    setPostgresPoolForTests("test", pool);

    const surface = await handleVisualSearchRequest(
      visualRequest({ version: "staging", cookie, file: mediaFile(JPEG, "image/jpeg") }),
    );
    assert.equal(surface.status, 400);
    assert.equal(surface.surface, null);
    assert.deepEqual(surface.body, { error: "invalid_environment_surface" });

    const malformed = await handleVisualSearchRequest(visualRequest({ cookie, malformed: true }));
    assert.equal(malformed.status, 400);
    assert.deepEqual(malformed.body, { error: "invalid_visual_payload" });

    const missing = await handleVisualSearchRequest(visualRequest({ version: "test", cookie }));
    assert.equal(missing.status, 400);
    assert.deepEqual(missing.body, { error: "missing_mandatory_visual_payload" });

    const text = await handleVisualSearchRequest(visualRequest({ version: "test", cookie, file: "text" }));
    assert.equal(text.status, 400);
    assert.deepEqual(text.body, { error: "missing_mandatory_visual_payload" });

    const empty = await handleVisualSearchRequest(
      visualRequest({ version: "test", cookie, file: mediaFile(Uint8Array.from([]), "image/png", "empty.png") }),
    );
    assert.equal(empty.status, 400);
    assert.deepEqual(empty.body, { error: "missing_mandatory_visual_payload" });

    const oversized = await handleVisualSearchRequest(
      visualRequest({
        version: "test",
        cookie,
        file: mediaFile(new Uint8Array(VISUAL_PAYLOAD_MAX_BYTES + 1), "image/jpeg", "huge.jpg"),
      }),
    );
    assert.equal(oversized.status, 400);
    assert.deepEqual(oversized.body, { error: "visual_payload_too_large" });

    const mime = await handleVisualSearchRequest(
      visualRequest({ version: "test", cookie, file: mediaFile(JPEG, "image/gif", "swatch.gif") }),
    );
    assert.equal(mime.status, 400);
    assert.deepEqual(mime.body, { error: "unsupported_media_format" });

    const compliance = await handleVisualSearchRequest(
      visualRequest({
        version: "test",
        cookie,
        file: mediaFile(JPEG, "video/mp4", "clip.mp4"),
        complianceTarget: "US_FTC",
      }),
    );
    assert.equal(compliance.status, 400);
    assert.deepEqual(compliance.body, { error: "invalid_compliance_target" });
    assert.equal(pool.connects, 0);
  });

  it("ranks the header schema with a stable vector and omits catalog bytes", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const rows = [
      {
        source_cell_id: "cell-art",
        raw_header: "Art. No",
        source_value: "HX-100",
        normalized_value: "hx-100",
        cosine_distance: "0.25",
      },
      {
        source_cell_id: "cell-weave",
        raw_header: "Weave",
        source_value: "Twill",
        normalized_value: null,
        cosine_distance: 0.5,
      },
    ];
    const testPool = ledgerPool(rows);
    const demoPool = ledgerPool([]);
    setPostgresPoolForTests("test", testPool);
    setPostgresPoolForTests("demo", demoPool);

    const file = mediaFile(JPEG, "image/jpeg", "swatch.jpg");
    const found = await handleVisualSearchRequest(
      visualRequest({ version: "test", cookie, file, complianceTarget: "EU_DPP" }),
    );
    assert.equal(found.status, 200);
    assert.equal(found.surface, "test");
    if (found.status !== 200) return;
    assert.deepEqual(found.body, {
      success: true,
      mediaType: "image/jpeg",
      complianceTarget: "EU_DPP",
      results: [
        {
          rank: 1,
          cellId: "cell-art",
          articleCode: "HX-100",
          sourceText: "HX-100",
          normalizedValue: "hx-100",
          cosineDistance: 0.25,
        },
        {
          rank: 2,
          cellId: "cell-weave",
          articleCode: "UNMAPPED_ARTICLE",
          sourceText: "Twill",
          normalizedValue: null,
          cosineDistance: 0.5,
        },
      ],
    });
    assert.equal(collectKeys(found.body).has("bytes"), false);
    assert.equal(JSON.stringify(found.body).includes("article_code"), false);

    assert.equal(testPool.connects, 1);
    assert.equal(testPool.releases, 1);
    assert.equal(demoPool.connects, 0);
    assert.equal(testPool.calls[0]?.query, "SET search_path TO fruma_test;");
    const search = testPool.calls[1];
    assert.match(search?.query ?? "", /OPERATOR\(public\.<=>\)/);
    assert.match(search?.query ?? "", /\$1::public\.vector/);
    assert.match(search?.query ?? "", /LIMIT 10/);
    assert.equal((search?.query ?? "").includes("bytes"), false);
    assert.equal((search?.query ?? "").includes("article_code"), false);
    const expected = vectorLiteral(simulatedVisualEmbedding(JPEG));
    assert.deepEqual(search?.parameters, [expected]);
    assert.equal(expected.startsWith("["), true);
    assert.equal(expected.split(",").length, MATERIAL_EMBEDDING_DIMENSIONS);

    const again = await handleVisualSearchRequest(
      visualRequest({
        version: "test",
        cookie,
        file: mediaFile(JPEG, "video/quicktime", "clip.mov"),
        complianceTarget: "",
      }),
    );
    assert.equal(again.status, 200);
    if (again.status !== 200) return;
    assert.equal(again.body.complianceTarget, null);
    assert.equal(again.body.mediaType, "video/quicktime");
    assert.deepEqual(testPool.calls[3]?.parameters, [expected]);

    const cleared = await handleVisualSearchRequest(
      visualRequest({
        cookie,
        file: mediaFile(JPEG, "image/png", "swatch.png"),
        complianceTarget: "null",
      }),
    );
    assert.equal(cleared.status, 200);
    assert.equal(cleared.surface, "demo");
    if (cleared.status !== 200) return;
    assert.equal(cleared.body.complianceTarget, null);
    assert.deepEqual(cleared.body.results, []);
    assert.equal(demoPool.connects, 1);
    assert.equal(demoPool.releases, 1);
    assert.equal(demoPool.calls[0]?.query, "SET search_path TO fruma_demo;");
  });

  it("returns a ledger failure and still releases the connection", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const pool = ledgerPool([], true);
    setPostgresPoolForTests("production", pool);

    const failed = await handleVisualSearchRequest(
      visualRequest({
        version: "production",
        cookie,
        file: mediaFile(JPEG, "image/png", "swatch.png"),
        complianceTarget: "UK_STANDARDS",
      }),
    );
    assert.equal(failed.status, 500);
    assert.equal(failed.surface, "production");
    assert.deepEqual(failed.body, { error: "internal_ledger_execution_failure" });
    assert.equal(JSON.stringify(failed.body).includes("ledger down"), false);
    assert.equal(pool.connects, 1);
    assert.equal(pool.releases, 1);
    assert.equal(pool.calls[0]?.query, "SET search_path TO fruma_production;");
  });
});
