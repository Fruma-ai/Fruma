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
import {
  millCatalogueState,
  millFileState,
  millMapState,
  millProfileState,
  reviewRowLabel,
  rowProvenance,
  workshopReady,
} from "@/lib/fruma/honesty";
import { rankMillOptions } from "@/lib/fruma/mill-learn";
import type { CatalogField, CatalogFilter } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";
import { useFruma } from "./store";

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
    millClaimed,
  } = useFruma();

  const counts = catalogCounts(catalog);
  const visible = filterCatalog(catalog, catalogFilter, catalogQuery);
  const selectedCount = catalogSelected.length;
  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => catalogSelected.includes(r.id));
  const mapped = millMapConfirmed;
  const ready = workshopReady({
    claimed: millClaimed,
    file: millFile,
    mapped,
  });
  const onStandard = catalog.filter(
    (r) =>
      millClaimed &&
      millFile?.source === "upload" &&
      mapped &&
      r.status === "confirmed",
  ).length;
  const catalogueState = millCatalogueState(onStandard);
  const provenance = rowProvenance();
  const hit =
    millLearn.picks === 0
      ? null
      : Math.round((millLearn.firstHits / millLearn.picks) * 100);

  const filters: { id: CatalogFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "review", label: "Unconfirmed" },
    ...(ready ? [{ id: "ready" as const, label: "Ready" }] : []),
    { id: "confirmed", label: "Confirmed" },
    { id: "gap", label: "Unknown remains" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ui-label">Step 5 of 5 · working file</p>
          <h1 className="page-title mt-1">Catalogue</h1>
          <p className="page-lede mt-2">
            {counts.total} qualities · {provenance}. {catalogueState}. Live is
            not complete.
          </p>
        </div>
        <Button variant="outline" onClick={() => setMillRoom("upload")}>
          New file
        </Button>
      </div>

      <div className="banner mb-5">
        <span className="banner-bar" />
        <p>
          {millProfileState(millClaimed)} · {millFileState(millFile)} ·{" "}
          {millMapState(millFile, mapped)}. {catalogueState}. Seeded rows are
          not Vale do Ave as-sent.{" "}
          <button
            type="button"
            className="font-medium text-chalk underline decoration-line underline-offset-2"
            onClick={() =>
              setMillRoom(millFile ? (mapped ? "review" : "map") : "upload")
            }
          >
            {millFile ? "Back to the ingest" : "Drop a mill file"}
          </button>
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        <span>
          <b className="spec">{counts.review + counts.ready}</b>{" "}
          <span className="text-mute">unconfirmed</span>
        </span>
        <span>
          <b className="spec">{counts.confirmed}</b>{" "}
          <span className="text-mute">confirmed</span>
        </span>
        <span>
          <b className="spec">{onStandard}</b>{" "}
          <span className="text-mute">on the standard</span>
        </span>
        <span>
          <b className="spec">{counts.gap}</b>{" "}
          <span className="text-mute">unknown remains</span>
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
        {filters.map((f) => (
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
          <div key={fix.needle} className="banner">
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
              <th>{provenance}</th>
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
                provenance={provenance}
                catalogueState={catalogueState}
                mapped={mapped}
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
  provenance,
  catalogueState,
  mapped,
  selected,
  onToggle,
  onField,
}: {
  row: CatalogRow;
  provenance: string;
  catalogueState: string;
  mapped: boolean;
  selected: boolean;
  onToggle: () => void;
  onField: (id: string, field: CatalogField, value: string) => void;
}) {
  const { millLearn } = useFruma();
  const review = reviewRowLabel(row.status);
  const onStandard = catalogueState === "On the standard" && row.status === "confirmed";
  const weld = mapped && review === "Confirmed" && provenance !== "Seeded";
  const tone = onStandard
    ? "text-ok"
    : weld
      ? "text-weld"
      : "text-mute";

  return (
    <tr className={selected ? "bg-white/3" : undefined}>
      <td>
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={row.article} />
      </td>
      <td>
        <p className="spec text-[12px] text-chalk">{row.article}</p>
        <p className="mt-0.5 spec text-[11px] text-mute">{provenance}</p>
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
      <td className={cn("spec text-[12px]", tone)}>
        {onStandard ? "On the standard" : review}
      </td>
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
        value={value || ""}
        onChange={(e) => onPick(e.target.value)}
      >
        <option value="">Unknown</option>
        {ranked.map((opt, i) => (
          <option key={opt} value={opt}>
            {i === 0 && !value ? `Suggested — ${opt}` : opt}
          </option>
        ))}
      </select>
    </label>
  );
}
