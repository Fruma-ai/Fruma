import "server-only";

import { NextResponse } from "next/server";
import { handleMillDepositRequest } from "@/lib/fruma/ingest";
import {
  stageUnmappedHeaderSuggestions,
  uniqueRawHeaders,
  type SuggestionSql,
} from "@/lib/fruma/ingest/header-llm";

export const runtime = "nodejs";

type HeaderMapComplete = (system: string, user: string) => Promise<string>;

let suggestionSqlOverride: SuggestionSql | null = null;
let completeOverride: HeaderMapComplete | null = null;

/** Tests supply the postgres.js tag and the model. Pass null to use the environment again. */
export function setHeaderSuggestionRuntimeForTests(
  runtime: { sql: SuggestionSql; complete: HeaderMapComplete } | null,
): void {
  suggestionSqlOverride = runtime?.sql ?? null;
  completeOverride = runtime?.complete ?? null;
}

async function suggestionSql(): Promise<SuggestionSql | null> {
  if (suggestionSqlOverride) return suggestionSqlOverride;
  const url = process.env.DATABASE_URL?.trim();
  const key = process.env.FRUMA_LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!url || !key) return null;
  const postgres = (await import("postgres")).default;
  return postgres(url, { max: 1, prepare: false }) as unknown as SuggestionSql;
}

async function completeHeaderMap(system: string, user: string): Promise<string> {
  if (completeOverride) return completeOverride(system, user);
  const key = process.env.FRUMA_LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const url = process.env.FRUMA_LLM_URL?.trim() || "https://api.openai.com/v1/chat/completions";
  if (!key) throw new Error("LLM API key is not configured.");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.FRUMA_LLM_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Header map model returned ${response.status}.`);
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("Header map model returned an empty body.");
  return content;
}

export async function POST(request: Request) {
  const result = await handleMillDepositRequest(request);
  if (result.status === 200 && result.unmappedHeaders.length > 0) {
    const sql = await suggestionSql();
    if (sql) {
      try {
        await stageUnmappedHeaderSuggestions({
          rawHeaders: uniqueRawHeaders(result.unmappedHeaders.map((cell) => cell.rawHeader)),
          cells: result.unmappedHeaders,
          complete: completeHeaderMap,
          sql,
        });
      } catch (error) {
        console.error("[HEADER MAP] staged suggestion insert failed:", error);
      }
    }
  }
  return NextResponse.json(result.body, { status: result.status });
}
