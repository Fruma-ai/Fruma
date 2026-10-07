"use client";

import { useState } from "react";
import { isStandardField } from "@/lib/fruma/ingest/types";
import { uniformValue } from "@/lib/fruma/ingest/units";

export type SuggestionItem = {
  cellId: string;
  fieldName: string;
  rawMillText: string;
  aiSuggestedValue: string;
  confidence: number;
};

export type DiscoverySearchPayload = {
  prompt: string;
  complianceTarget: "EU_DPP" | "UK_STANDARDS" | null;
};

export type DiscoverySearchHit = {
  id: string;
  depositId: string;
  millArticleCode: string;
  rank: number;
  cosineDistance: number;
  score?: number;
  compliance_warning?: { message?: string };
  colourways?: { id?: string; colourAsWritten?: string }[];
  cells?: {
    standardField?: string | null;
    sourceValue?: string;
    standardValue?: string | null;
    normalizedValue?: string | null;
  }[];
};

function shownValue(item: SuggestionItem): string {
  if (!isStandardField(item.fieldName)) return item.aiSuggestedValue;
  const uniform = uniformValue(item.fieldName, item.rawMillText, item.aiSuggestedValue);
  if (item.fieldName === "weight" && uniform !== item.aiSuggestedValue.trim()) return `${uniform} g/m²`;
  if (item.fieldName === "width" && uniform !== item.aiSuggestedValue.trim()) return `${uniform} cm`;
  return item.aiSuggestedValue;
}

export function DiscoveryCanvas({
  onSearchExecute,
  suggestions,
  onAcceptSuggestions,
  isSearching,
  isAccepting,
  status,
}: {
  onSearchExecute: (payload: DiscoverySearchPayload) => void;
  suggestions: SuggestionItem[];
  onAcceptSuggestions: (selectedIds: string[]) => void;
  isSearching: boolean;
  isAccepting: boolean;
  status: string | null;
}) {
  const [prompt, setPrompt] = useState("");
  const [complianceTarget, setComplianceTarget] = useState<DiscoverySearchPayload["complianceTarget"]>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const busy = isSearching || isAccepting;
  const visibleSelected = selected.filter((id) => suggestions.some((item) => item.cellId === id));

  function toggle(cellId: string) {
    setSelected((current) =>
      current.includes(cellId) ? current.filter((id) => id !== cellId) : [...current, cellId],
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-sm border border-[#1F1F23] bg-[#121214] p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const text = prompt.trim();
          if (!text || busy) return;
          onSearchExecute({ prompt: text, complianceTarget });
        }}
      >
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#6E7E91]">Design brief</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            required
            placeholder="220 gsm cotton mesh, 150 cm, EU traceability"
            className="w-full resize-y rounded-sm border border-[#1F1F23] bg-[#0B0B0C] px-3 py-2 text-sm text-[#F5F5F7] outline-none placeholder:text-[#6E7E91]"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#6E7E91]">Compliance</span>
            <select
              value={complianceTarget ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setComplianceTarget(value === "EU_DPP" || value === "UK_STANDARDS" ? value : null);
              }}
              className="rounded-sm border border-[#1F1F23] bg-[#0B0B0C] px-3 py-2 font-mono text-xs text-[#F5F5F7]"
            >
              <option value="">None</option>
              <option value="EU_DPP">EU DPP</option>
              <option value="UK_STANDARDS">UK standards</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy || !prompt.trim()}
            className="rounded-sm bg-[#3B82F6] px-4 py-2 font-mono text-xs text-white disabled:opacity-40"
          >
            {isSearching ? "Searching…" : "Search materials"}
          </button>
        </div>
      </form>

      {status ? (
        <p role="status" className="font-mono text-xs text-[#F5F5F7]">
          {status}
        </p>
      ) : null}

      <section className="space-y-3" aria-label="Staged suggestions">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#6E7E91]">
            Staged suggestions
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || visibleSelected.length === 0}
              onClick={() => onAcceptSuggestions(visibleSelected)}
              className="rounded-sm border border-[#1F1F23] px-3 py-2 font-mono text-xs text-[#F5F5F7] disabled:opacity-40"
            >
              Accept selected
            </button>
            <button
              type="button"
              disabled={busy || suggestions.length === 0}
              onClick={() => onAcceptSuggestions(suggestions.map((item) => item.cellId))}
              className="rounded-sm border border-[#1F1F23] px-3 py-2 font-mono text-xs text-[#F5F5F7] disabled:opacity-40"
            >
              Accept all
            </button>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <p className="font-mono text-xs text-[#6E7E91]">No staged proposals for this deposit.</p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((item) => (
              <li key={item.cellId}>
                <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-[#1F1F23] bg-[#121214] px-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={visibleSelected.includes(item.cellId)}
                    onChange={() => toggle(item.cellId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] uppercase tracking-widest text-[#6E7E91]">
                      {item.fieldName} · {Math.round(item.confidence * 100)}%
                    </span>
                    <span className="mt-1 block text-sm text-[#F5F5F7]">{shownValue(item)}</span>
                    <span className="mt-1 block font-mono text-[10px] text-[#6E7E91]">
                      Mill text: {item.rawMillText}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
