import { scoreCorpusCoverage } from "@/lib/fruma/intelligence/coverage";
import { requireTestFounder, testJson } from "@/lib/fruma/intelligence/http-auth";
import {
  confirmHeaders,
  confirmLexiconForHeaders,
  confirmedHeaderOverlays,
} from "@/lib/fruma/intelligence/overlays";
import { playbookHeaders } from "@/lib/fruma/intelligence/playbooks";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";
import type { HangerDialect } from "@/lib/fruma/test-corpus/types";

export const runtime = "nodejs";

const DIALECTS: HangerDialect[] = [
  "pt-standard",
  "it-shirting",
  "tr-knit",
  "uk-imperial",
  "pl-fleece",
  "messy-mixed",
];

function isDialect(value: string): value is HangerDialect {
  return (DIALECTS as string[]).includes(value);
}

export async function GET(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to view mapping overlays." }, 401);
  const overlays = confirmedHeaderOverlays(TEST_SURFACE);
  return testJson({
    surface: TEST_SURFACE,
    overlays,
    coverage: scoreCorpusCoverage(overlays),
  });
}

/**
 * Confirm mill-header → Fruma-field overlays. Proposals never auto-apply.
 * Body: { headers: { "Art.": "article" } } or { dialect: "pl-fleece" } for a playbook.
 */
export async function POST(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to confirm mappings." }, 401);

  let body: { headers?: Record<string, string>; dialect?: string };
  try {
    body = (await request.json()) as { headers?: Record<string, string>; dialect?: string };
  } catch {
    return testJson({ error: "Expected JSON body." }, 400);
  }

  try {
    if (body.dialect) {
      if (!isDialect(body.dialect)) return testJson({ error: "unknown_dialect" }, 400);
      const coverage = scoreCorpusCoverage(confirmedHeaderOverlays(TEST_SURFACE));
      const headers = playbookHeaders(coverage, body.dialect);
      confirmLexiconForHeaders(headers, TEST_SURFACE);
    } else if (body.headers && Object.keys(body.headers).length) {
      confirmHeaders(body.headers, TEST_SURFACE);
    } else {
      return testJson({ error: "Provide headers or dialect." }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "confirm_failed";
    return testJson({ error: message }, 400);
  }

  const overlays = confirmedHeaderOverlays(TEST_SURFACE);
  return testJson({
    surface: TEST_SURFACE,
    overlays,
    coverage: scoreCorpusCoverage(overlays),
  });
}
