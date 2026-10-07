import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { bootsLedgerOnThisProcess } from "../../instrumentation";
import { DEMO_COOKIE, sessionToken } from "../gate";
import { config, proxy } from "../../proxy";

const TEST_PASS = "workspace-proxy-password";

function request(path: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("workspace proxy gate", () => {
  it("covers the workspace pages and the ledger API prefixes", () => {
    assert.deepEqual(config.matcher, [
      "/app/:path*",
      "/brand/:path*",
      "/map/:path*",
      "/deposits/:path*",
      "/qualities/:path*",
      "/grants/:path*",
      "/api/design/:path*",
      "/api/analytics/:path*",
      "/api/sourcing/:path*",
    ]);
  });

  it("redirects an unsigned workspace page to the sign-in splash", async () => {
    const response = await proxy(request("/qualities"));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.pathname, "/enter");
    assert.equal(location.searchParams.get("next"), "/qualities");
    assert.equal(location.searchParams.get("reason"), "unauthorized_operator_intercept");
  });

  it("returns 401 for ledger APIs when only the version header is present", async () => {
    for (const path of ["/api/design/search", "/api/analytics/suggest", "/api/sourcing/handshake"]) {
      const response = await proxy(request(path, { "x-fruma-version": "production" }));
      assert.equal(response.status, 401, path);
      assert.deepEqual(await response.json(), { error: "unauthorized_operator" });
    }
  });

  it("lets a founder session through and rejects a bad cookie", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const token = await sessionToken("owen");
    const allowed = await proxy(
      request("/grants", { cookie: `${DEMO_COOKIE}=${token}`, "x-fruma-version": "test" }),
    );
    assert.equal(allowed.headers.get("location"), null);
    assert.equal(allowed.status, 200);

    const rejected = await proxy(request("/deposits", { cookie: `${DEMO_COOKIE}=owen.not-a-session` }));
    assert.equal(rejected.status, 307);
    assert.equal(new URL(rejected.headers.get("location") ?? "").pathname, "/enter");
  });

  it("skips the ledger boot inside the request proxy bundle", () => {
    const proxyStack = [
      "Error",
      "    at register (/var/task/.next/server/instrumentation.js:4:20)",
      "    at internalHandler (/var/task/.next/server/middleware.js:137:11)",
    ].join("\n");
    const serverStack = [
      "Error",
      "    at register (/var/task/.next/server/instrumentation.js:4:20)",
      "    at NextNodeServer.prepareImpl (/var/task/node_modules/next/dist/server/next-server.js:575:5)",
    ].join("\n");
    assert.equal(bootsLedgerOnThisProcess(proxyStack), false);
    assert.equal(bootsLedgerOnThisProcess(serverStack), true);
  });
});