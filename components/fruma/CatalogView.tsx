"use client";

import { Button } from "@/components/ui/button";
import {
  bulkIssue,
  CATALOG_FIELDS,
  catalogCounts,
  filterCatalog,
  rawFor,
  type CatalogRow,
} from "@/lib/fruma/catalog";
import { rankMillOptions } from "@/lib/fruma/mill-learn";
import type { CatalogField, CatalogFilter } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";
import { useFruma } from "./store";

const FILTERS: { id: CatalogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "review", label: "Needs a look" },
  { id: "ready", label: "Ready" },
  { id: "confirmed", label: "Live" },
  { id: "gap", label: "Gaps" },
];

const FIXES: { needle: string; label: (n: number) => string }[] = [
  { needle: "width in inches", label: (n) => `${n} still in inches — apply cm` },
  { needle: "weight in ounces", label: (n) => `${n} still in ounces — apply g/m²` },
  { needle: "composition slash", label: (n) => `${n} mill composition strings — normalise` },
  { needle: "MOQ in yards", label: (n) => `${n} MOQ in yards — apply metres` },
];

export function CatalogView() {
  const {
    catalog,
    catalogSelected,
    catalogFilter,
    catalogQuery,
    millLearn,
    setCatalogFilter,
    setCatalogQuery,
    toggleCatalogRow,
    selectCatalogFiltered,
    clearCatalogSelection,
    applyCatalogSuggested,
    confirmCatalog,
    setCatalogField,
    bulkFixCatalog,
    setMillRoom,
    millFile,
    millMapConfirmed,
    ingestPublished,
  } = useFruma();

  const counts = catalogCounts(catalog);
  const visible = filterCatalog(catalog, catalogFilter, catalogQuery);
  const selectedCount = catalogSelected.length;
  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => catalogSelected.includes(r.id));
  const hit =
    millLearn.picks === 0
      ? null
      : Math.round((millLearn.firstHits / millLearn.picks) * 100);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ui-label">Step 5 of 5 · working file</p>
          <h1 className="page-title mt-1">Catalogue</h1>
          <p className="page-lede mt-2">
            {counts.total} qualities in this drop. Confirmed rows are what
            designers search in the brand studio — mill file in, Fruma standard
            out. Gaps stay here.
          </p>
        </div>
        <Button variant="outline" onClick={() => setMillRoom("upload")}>
          New file
        </Button>
      </div>

      {!ingestPublished && (
        <div className="banner mb-5" data-tone="weld">
          <span className="banner-bar" />
          <p>
            {millFile && millMapConfirmed
              ? "Exceptions are still open. Confirm mappings on Review, or apply the Fruma standard here."
              : millFile
                ? "This drop is mapped but not reviewed. Finish Review so brands only see confirmed qualities."
                : "This is last season’s working file. Drop a new hanger list from Profile or File to refresh it."}{" "}
            <button
              type="button"
              className="font-medium text-chalk underline decoration-line underline-offset-2"
              onClick={() =>
                setMillRoom(millFile ? (millMapConfirmed ? "review" : "map") : "upload")
              }
            >
              {millFile ? "Back to the ingest" : "Drop a mill file"}
            </button>
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        <span>
          <b className="spec">{counts.review}</b>{" "}
          <span className="text-mute">need a look</span>
        </span>
        <span>
          <b className="spec">{counts.ready}</b>{" "}
          <span className="text-mute">ready to apply</span>
        </span>
        <span>
          <b className="spec">{counts.confirmed}</b>{" "}
          <span className="text-mute">live</span>
        </span>
        <span>
          <b className="spec">{counts.gap}</b>{" "}
          <span className="text-mute">gaps</span>
        </span>
        <span className="ml-auto text-[12.5px] text-mute">
          {hit === null
            ? "Suggestion accuracy unmeasured — confirm a row to start learning."
            : `First suggestion kept ${millLearn.firstHits} of ${millLearn.picks} · ${hit}%`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y border-line py-3">
        <input
          type="search"
          value={catalogQuery}
          onChange={(e) => setCatalogQuery(e.target.value)}
          placeholder="Article, construction, colour…"
          aria-label="Filter catalogue"
          className="h-8 min-w-[200px] flex-1 border border-line bg-transparent px-2.5 text-[13px] text-chalk placeholder:text-mute"
        />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCatalogFilter(f.id)}
            className={cn(
              "h-8 px-2.5 text-[12.5px]",
              catalogFilter === f.id
                ? "bg-chalk text-black"
                : "text-mute hover:text-chalk",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {FIXES.map((fix) => {
        const rows = bulkIssue(visible, fix.needle);
        if (rows.length === 0) return null;
        return (
          <div key={fix.needle} className="banner" data-tone="weld">
            <span className="banner-bar" />
            <p className="min-w-0 flex-1 text-[13px]">{fix.label(rows.length)}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkFixCatalog(fix.needle, rows.map((r) => r.id))}
            >
              Apply to {rows.length}
            </Button>
          </div>
        );
      })}

      {selectedCount > 0 && (
        <div className="sticky top-[44px] z-20 flex flex-wrap items-center gap-2 border-b border-line bg-background py-2">
          <span className="spec text-[12px]">{selectedCount} selected</span>
          <Button size="sm" onClick={() => applyCatalogSuggested(catalogSelected)}>
            Apply Fruma standard
          </Button>
          <Button size="sm" variant="outline" onClick={() => confirmCatalog(catalogSelected)}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={clearCatalogSelection}>
            Clear
          </Button>
        </div>
      )}

      <div className="mt-2 overflow-x-auto">
        <table className="data-table min-w-[1080px]">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() =>
                    allVisibleSelected ? clearCatalogSelection() : selectCatalogFiltered()
                  }
                  aria-label="Select visible rows"
                />
              </th>
              <th>Article</th>
              <th>As sent</th>
              <th>Structure</th>
              <th>Composition</th>
              <th>Weight</th>
              <th>Width</th>
              <th>MOQ</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <CatalogRowView
                key={row.id}
                row={row}
                selected={catalogSelected.includes(row.id)}
                onToggle={() => toggleCatalogRow(row.id)}
                onField={setCatalogField}
              />
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <p className="mt-6 text-[13px] text-mute">Nothing in this filter.</p>
      )}
    </div>
  );
}

function CatalogRowView({
  row,
  selected,
  onToggle,
  onField,
}: {
  row: CatalogRow;
  selected: boolean;
  onToggle: () => void;
  onField: (id: string, field: CatalogField, value: string) => void;
}) {
  const { millLearn } = useFruma();
  const tone =
    row.status === "confirmed"
      ? "text-ok"
      : row.status === "gap"
        ? "text-madder"
        : row.status === "review"
          ? "text-weld"
          : "text-mute";
  const statusLabel =
    row.status === "confirmed"
      ? "Live"
      : row.status === "gap"
        ? "Gap"
        : row.status === "review"
          ? "Look"
          : "Ready";

  return (
    <tr className={selected ? "bg-white/3" : undefined}>
      <td>
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={row.article} />
      </td>
      <td>
        <p className="spec text-[12px] text-chalk">{row.article}</p>
        <p className="mt-0.5 spec text-[11px] text-mute">{row.confidence}%</p>
      </td>
      <td>
        <p className="spec text-[12px] text-raw">{row.raw.construction}</p>
        <p className="mt-0.5 spec text-[11px] text-mute">{row.raw.composition}</p>
      </td>
      {CATALOG_FIELDS.map((f) => (
        <td key={f.key}>
          <FieldSelect
            row={row}
            field={f.key}
            ranked={rankMillOptions(f.key, row.raw[rawFor(f.key)], row.options[f.key], millLearn)}
            onPick={(value) => onField(row.id, f.key, value)}
          />
        </td>
      ))}
      <td className={cn("spec text-[12px]", tone)}>{statusLabel}</td>
    </tr>
  );
}

function FieldSelect({
  row,
  field,
  ranked,
  onPick,
}: {
  row: CatalogRow;
  field: CatalogField;
  ranked: string[];
  onPick: (value: string) => void;
}) {
  const value = row.values[field];
  return (
    <label className="block">
      <span className="sr-only">
        {field} for {row.article}
      </span>
      <select
        className="suggest-select w-full max-w-[160px] border-line bg-transparent text-chalk"
        value={value || ranked[0] || ""}
        onChange={(e) => onPick(e.target.value)}
      >
        {ranked.map((opt, i) => (
          <option key={opt} value={opt}>
            {i === 0 && !value ? `Suggested — ${opt}` : opt}
          </option>
        ))}
      </select>
    </label>
  );
}
