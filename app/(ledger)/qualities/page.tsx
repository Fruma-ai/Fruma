"use client";

import { useState } from "react";
import { AlertTriangle, Layers } from "lucide-react";
import {
  DiscoveryCanvas,
  type DiscoverySearchHit,
  type DiscoverySearchPayload,
  type SuggestionItem,
} from "@/components/fruma/DiscoveryCanvas";
import { StudioCarousel, type StudioSearchRequest } from "@/components/fruma/StudioCarousel";
import { WorkspaceShell } from "@/components/fruma/WorkspaceShell";

type SchemaName = "demo" | "test" | "production";

function isSuggestion(value: unknown): value is SuggestionItem {
  if (!value || typeof value !== "object") return false;
  const row = value as SuggestionItem;
  return (
    typeof row.cellId === "string" &&
    typeof row.fieldName === "string" &&
    typeof row.rawMillText === "string" &&
    typeof row.aiSuggestedValue === "string" &&
    typeof row.confidence === "number"
  );
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    /* The status line is enough when the body is not JSON. */
  }
  return fallback;
}

export default function MaterialDiscoveryStudioPage() {
  const [activeSchema, setActiveSchema] = useState<SchemaName>("demo");
  const [isSearching, setIsSearching] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [searchRequest, setSearchRequest] = useState<StudioSearchRequest | null>(null);
  const [searchHits, setSearchHits] = useState<DiscoverySearchHit[]>([]);
  const [stagedSuggestions, setStagedSuggestions] = useState<SuggestionItem[]>([]);
  const [currentDepositId, setCurrentDepositId] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function selectSchema(next: SchemaName) {
    setActiveSchema(next);
    setSearchRequest(null);
    setIsSearching(false);
    setSearchHits([]);
    setStagedSuggestions([]);
    setCurrentDepositId(null);
    setErrorStatus(null);
    setStatus(null);
  }

  async function triggerSuggestionPass(depositId: string) {
    const response = await fetch("/api/analytics/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-fruma-version": activeSchema },
      body: JSON.stringify({ action: "GENERATE", depositId }),
    });
    if (!response.ok) {
      setErrorStatus(await errorMessage(response, "Suggestion pass failed."));
      setStagedSuggestions([]);
      return;
    }
    const data = (await response.json()) as { suggestions?: unknown };
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions.filter(isSuggestion) : [];
    setStagedSuggestions(suggestions);
    setStatus(
      suggestions.length === 0
        ? "No unmapped cells left to propose."
        : `${suggestions.length} staged proposal${suggestions.length === 1 ? "" : "s"} ready to accept.`,
    );
  }

  function handleSearchExecute(payload: DiscoverySearchPayload) {
    setIsSearching(true);
    setErrorStatus(null);
    setStatus(null);
    setSearchRequest({ ...payload, submittedAt: Date.now() });
  }

  function handleSearchResolved(hits: DiscoverySearchHit[], error: string | null) {
    setIsSearching(false);
    setSearchHits(hits);
    if (error) {
      setCurrentDepositId(null);
      setStagedSuggestions([]);
      setStatus(null);
      setErrorStatus(error);
      return;
    }
    setErrorStatus(null);
    const depositId = hits[0]?.depositId ?? null;
    setCurrentDepositId(depositId);
    if (!depositId) {
      setStagedSuggestions([]);
      setStatus("No materials matched that search.");
      return;
    }
    void triggerSuggestionPass(depositId);
  }

  async function handleAcceptSuggestions(selectedIds: string[]) {
    if (!currentDepositId || selectedIds.length === 0) return;
    setIsAccepting(true);
    setErrorStatus(null);
    try {
      const response = await fetch("/api/analytics/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fruma-version": activeSchema,
        },
        body: JSON.stringify({
          action: "BULK_ACCEPT",
          depositId: currentDepositId,
          selectedCellIds: selectedIds,
        }),
      });
      if (!response.ok) {
        setErrorStatus(await errorMessage(response, "Bulk acceptance commit failure."));
        return;
      }
      setStagedSuggestions((prev) => prev.filter((item) => !selectedIds.includes(item.cellId)));
      setStatus(
        `${selectedIds.length} cell mutation${selectedIds.length === 1 ? "" : "s"} appended to the ledger.`,
      );
    } catch (err) {
      console.error("Bulk ledger confirmation failure:", err);
      setErrorStatus("Bulk acceptance commit failure.");
    } finally {
      setIsAccepting(false);
    }
  }

  function handleInspectMaterial(id: string) {
    const hit = searchHits.find((row) => row.id === id);
    if (!hit) return;
    setCurrentDepositId(hit.depositId);
    setStatus(`Loading proposals for ${hit.millArticleCode}.`);
    void triggerSuggestionPass(hit.depositId);
  }

  return (
    <WorkspaceShell activeVersion={activeSchema} activeOntology="Retail/Apparel">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-[#F5F5F7]">
              Material Discovery Studio
            </h2>
            <p className="mt-0.5 text-xs text-[#6E7E91]">
              Query the active schema and align raw mill text to the uniform Fruma standard.
            </p>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-sm border border-[#1F1F23] bg-[#121214] p-1 font-mono text-[10px]"
            role="group"
            aria-label="Active schema"
          >
            <span className="px-1 text-[#6E7E91]">Active Schema:</span>
            {(["demo", "test", "production"] as const).map((schema) => (
              <button
                key={schema}
                type="button"
                aria-pressed={activeSchema === schema}
                onClick={() => selectSchema(schema)}
                className={`cursor-pointer rounded-sm px-2 py-0.5 uppercase tracking-wider transition-colors ${
                  activeSchema === schema
                    ? "border border-[#3B82F6]/20 bg-[#3B82F6]/10 text-[#3B82F6]"
                    : "text-[#6E7E91] hover:text-[#F5F5F7]"
                }`}
              >
                {schema}
              </button>
            ))}
          </div>
        </div>

        {errorStatus ? (
          <div className="flex w-full items-center gap-2 rounded-sm border border-amber-500/20 bg-amber-500/5 p-3 font-mono text-xs text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <DiscoveryCanvas
              onSearchExecute={handleSearchExecute}
              suggestions={stagedSuggestions}
              onAcceptSuggestions={(ids) => {
                void handleAcceptSuggestions(ids);
              }}
              isSearching={isSearching}
              isAccepting={isAccepting}
              status={status}
            />
          </div>

          <div className="xl:col-span-7">
            <div className="space-y-4 rounded-sm border border-[#1F1F23] bg-[#121214] p-4">
              <div className="flex items-center gap-2 border-b border-[#1F1F23] pb-3">
                <Layers className="h-4 w-4 text-[#3B82F6]" />
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F5F5F7]">
                  Audited Catalog Output
                </h3>
              </div>

              <StudioCarousel
                activeSchema={activeSchema}
                searchRequest={searchRequest}
                onInspectMaterial={handleInspectMaterial}
                onResolved={handleSearchResolved}
              />
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
