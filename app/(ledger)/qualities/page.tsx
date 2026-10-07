"use client";

import { useState } from "react";
import { DiscoveryCanvas, type DiscoverySearchHit, type DiscoverySearchPayload, type SuggestionItem } from "@/components/fruma/DiscoveryCanvas";
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

function isSearchHit(value: unknown): value is DiscoverySearchHit {
  if (!value || typeof value !== "object") return false;
  const row = value as DiscoverySearchHit;
  return (
    typeof row.id === "string" &&
    typeof row.depositId === "string" &&
    typeof row.millArticleCode === "string" &&
    typeof row.rank === "number" &&
    typeof row.cosineDistance === "number"
  );
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    /* The status line is enough when the body is not JSON. */
  }
  return fallback;
}

export default function QualitiesWorkspacePage() {
  const [activeSchema, setActiveSchema] = useState<SchemaName>("demo");
  const [isSearching, setIsSearching] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [stagedSuggestions, setStagedSuggestions] = useState<SuggestionItem[]>([]);
  const [searchResults, setSearchResults] = useState<DiscoverySearchHit[]>([]);
  const [currentDepositId, setCurrentDepositId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function selectSchema(next: SchemaName) {
    setActiveSchema(next);
    setCurrentDepositId(null);
    setStagedSuggestions([]);
    setSearchResults([]);
    setStatus(null);
  }

  async function triggerSuggestionGeneration(depositId: string) {
    const res = await fetch("/api/analytics/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-fruma-version": activeSchema },
      body: JSON.stringify({ action: "GENERATE", depositId }),
    });
    if (!res.ok) {
      setStatus(await errorMessage(res, "Suggestion pass failed."));
      setStagedSuggestions([]);
      return;
    }
    const data = (await res.json()) as { suggestions?: unknown };
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions.filter(isSuggestion) : [];
    setStagedSuggestions(suggestions);
    setStatus(
      suggestions.length === 0
        ? "No unmapped cells left to propose."
        : `${suggestions.length} staged proposal${suggestions.length === 1 ? "" : "s"} ready to accept.`,
    );
  }

  async function handleSearchExecute(payload: DiscoverySearchPayload) {
    setIsSearching(true);
    setStatus(null);
    try {
      const response = await fetch("/api/design/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fruma-version": activeSchema,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setSearchResults([]);
        setCurrentDepositId(null);
        setStagedSuggestions([]);
        setStatus(await errorMessage(response, "Search failed."));
        return;
      }
      const data: unknown = await response.json();
      const hits = Array.isArray(data) ? data.filter(isSearchHit) : [];
      setSearchResults(hits);
      const depositId = hits[0]?.depositId ?? null;
      setCurrentDepositId(depositId);
      if (!depositId) {
        setStagedSuggestions([]);
        setStatus("No materials matched that search.");
        return;
      }
      await triggerSuggestionGeneration(depositId);
    } catch (err) {
      console.error("Vector search deployment error:", err);
      setStatus("Search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAcceptSuggestions(selectedIds: string[]) {
    if (!currentDepositId || selectedIds.length === 0) return;
    setIsAccepting(true);
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
        setStatus(await errorMessage(response, "Bulk acceptance commit failure."));
        return;
      }
      setStagedSuggestions((prev) => prev.filter((item) => !selectedIds.includes(item.cellId)));
      setStatus(`Success: ${selectedIds.length} cell mutations transactionally appended to the ledger.`);
    } catch (err) {
      console.error("Bulk acceptance commit failure:", err);
      setStatus("Bulk acceptance commit failure.");
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <WorkspaceShell activeVersion={activeSchema} activeOntology="Retail/Apparel">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-medium text-[#F5F5F7]">Material Discovery Studio</h2>
            <p className="mt-0.5 text-xs text-[#6E7E91]">
              Query loom capacities and align raw mill text to the uniform Fruma standard.
            </p>
          </div>
          <div className="flex gap-1" role="group" aria-label="Active schema">
            {(["demo", "test", "production"] as const).map((schema) => (
              <button
                key={schema}
                type="button"
                aria-pressed={activeSchema === schema}
                onClick={() => selectSchema(schema)}
                className={
                  activeSchema === schema
                    ? "rounded-sm border border-[#3B82F6] px-3 py-1.5 font-mono text-[10px] uppercase text-[#F5F5F7]"
                    : "rounded-sm border border-[#1F1F23] px-3 py-1.5 font-mono text-[10px] uppercase text-[#6E7E91]"
                }
              >
                {schema}
              </button>
            ))}
          </div>
        </div>

        <DiscoveryCanvas
          onSearchExecute={handleSearchExecute}
          suggestions={stagedSuggestions}
          onAcceptSuggestions={handleAcceptSuggestions}
          isSearching={isSearching}
          isAccepting={isAccepting}
          status={status}
          results={searchResults}
        />
      </div>
    </WorkspaceShell>
  );
}
