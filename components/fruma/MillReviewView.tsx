"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  bulkIssue,
  catalogCounts,
  CATALOG_FIELDS,
  type CatalogRow,
} from "@/lib/fruma/catalog";
import {
  countOnTheStandard,
  millCatalogueState,
  reviewRowLabel,
  rowProvenance,
} from "@/lib/fruma/honesty";
import { EXCEPTION_GROUPS, frumaPath } from "@/lib/fruma/mill-ingest";
import { rankMillOptions } from "@/lib/fruma/mill-learn";
import type { CatalogField } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";
import { AsSentList } from "./AsSentList";
import { SurfaceState } from "./SurfaceState";
import { useFruma } from "./store";

export function MillReviewView() {
  const {
    catalog,
    millReviewGroup,
    millRowApproved,
    millExceptionOpen,
    millFile,
    millLearn,
    millMapConfirmed,
    millClaimed,
    millDeposits,
    setMillReviewGroup,
    approveMillRow,
    approveAllMill,
    setMillException,
    setCatalogField,
    ingestPublish,
    setMillRoom,
  } = useFruma();
  const [query, setQuery] = useState("");

  const counts = catalogCounts(catalog);
  const provenance = rowProvenance();
  const pending = catalog.filter(
    (r) => r.status === "review" || r.status === "ready" || r.status === "gap",
  );
  const unapproved = pending.filter((r) => !millRowApproved[r.id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((row) => {
      if (millReviewGroup === "all") {
        if (row.status === "confirmed" && millRowApproved[row.id]) return false;
      } else if (millReviewGroup === "review") {
        if (row.status !== "review") return false;
      } else if (millReviewGroup === "gap") {
        if (row.status !== "gap") return false;
      } else {
        const g = EXCEPTION_GROUPS.find((x) => x.id === millReviewGroup);
        if (g?.needle && !row.issues.some((i) => i.includes(g.needle!))) return false;
      }
      if (!q) return true;
      return (
        row.article.toLowerCase().includes(q) ||
        row.raw.construction.toLowerCase().includes(q) ||
        row.raw.composition.toLowerCase().includes(q)
      );
    });
  }, [catalog, millReviewGroup, millRowApproved, query]);

  const groupCount = (id: string, needle?: string) => {
    if (id === "all") return unapproved.length;
    if (id === "review") return catalog.filter((r) => r.status === "review").length;
    if (id === "gap") return catalog.filter((r) => r.status === "gap").length;
    return needle ? bulkIssue(catalog, needle).length : 0;
  };

  if (!millFile || !millMapConfirmed) {
    return (
      <SurfaceState
        tone="empty"
        kicker="Step 4 of 5 · review"
        title="Nothing to review yet."
        body="Drop a mill file and apply the column mapping. Review is where you manage the exceptions — inches, ounces, mill composition strings, gaps."
        action={{
          label: millFile ? "Open mapping" : "Drop a mill file",
          onClick: () => setMillRoom(millFile ? "map" : "upload"),
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[46rem]">
          <p className="ui-label">Step 4 of 5 · manage by exception</p>
          <h1 className="page-title mt-2 md:text-[28px]">
            Approve the mappings that still need a look.
          </h1>
          <p className="page-lede mt-3">
            Review by exception. {provenance} working file
            {millFile ? ` · ${millFile.name}` : ""}. No inferred GOTS or origin.
            Confirming a seeded row is not On the standard. As-sent deposit
            exceptions stay on their own list — empty-article is not a catalogue
            row.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setMillRoom("map")}>
            Back
          </Button>
          <Button
            onClick={() =>
              unapproved.length > 0 ? setMillException(true) : ingestPublish()
            }
          >
            Continue to catalogue
          </Button>
        </div>
      </div>

      {millDeposits.length > 0 ? (
        <div className="mb-8 border-b border-line pb-8">
          <AsSentList deposits={millDeposits} kicker="As-sent exceptions" />
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        <span>
          <b className="spec">{counts.review + counts.ready}</b>{" "}
          <span className="text-mute">unconfirmed</span>
        </span>
        <span>
          <b className="spec">{counts.gap}</b>{" "}
          <span className="text-mute">unknown remains</span>
        </span>
        <span>
          <b className="spec">{counts.confirmed}</b>{" "}
          <span className="text-mute">confirmed</span>
        </span>
        <span>
          <b className="spec">{Object.keys(millRowApproved).length}</b>{" "}
          <span className="text-mute">approved this session</span>
        </span>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="ui-label">Exceptions</p>
            <Button size="sm" variant="ghost" onClick={() => setMillException(true)}>
              Approve all
            </Button>
          </div>
          <p className="mb-3 text-[12.5px] leading-relaxed text-mute">
            Approve the most specific Fruma mapping for qualities you want live
            to brands.
          </p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Exception groups">
            {EXCEPTION_GROUPS.map((g) => {
              const n = groupCount(g.id, g.needle);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setMillReviewGroup(g.id)}
                  className={cn(
                    "flex shrink-0 items-center justify-between gap-3 px-2 py-2 text-left text-[13px] lg:w-full",
                    millReviewGroup === g.id
                      ? "bg-chalk text-black"
                      : "text-mute hover:text-chalk",
                  )}
                >
                  <span className="truncate">{g.label}</span>
                  <span className="spec text-[11px] opacity-80">{n}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, construction, fibre…"
            aria-label="Search qualities"
            className="mb-4 h-9 w-full border border-line bg-transparent px-3 text-[13px] text-chalk placeholder:text-mute"
          />
          <div className="overflow-x-auto mill-card">
            <table className="data-table min-w-[920px]">
              <thead>
                <tr>
                  <th>Quality</th>
                  <th>{provenance}</th>
                  <th>Fruma mapping</th>
                  <th className="w-[96px]" />
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 24).map((row) => (
                  <ReviewRow
                    key={row.id}
                    row={row}
                    approved={Boolean(millRowApproved[row.id])}
                    ranked={rankMillOptions(
                      "structure",
                      row.raw.construction,
                      row.options.structure,
                      millLearn,
                    )}
                    onField={setCatalogField}
                    onApprove={() => approveMillRow(row.id)}
                    provenance={provenance}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && (
            <p className="mt-6 text-[13px] text-mute">Nothing in this exception group.</p>
          )}
          {visible.length > 24 && (
            <p className="mt-3 text-[12.5px] text-mute">
              Showing 24 of {visible.length}. Confirm remaining, or open
              Catalogue for the working file.
            </p>
          )}
        </div>
      </div>

      {millExceptionOpen && (
        <div className="mill-modal" role="dialog" aria-labelledby="ex-title">
          <div className="mill-modal-card">
            <p className="ui-label">Save mappings</p>
            <h2 id="ex-title" className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-chalk">
              {unapproved.length} qualities still unapproved.
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-mute">
              Approve Fruma&apos;s suggestions for the rest, or keep them{" "}
              {millCatalogueState(
                countOnTheStandard(catalog, {
                  claimed: millClaimed,
                  mapped: millMapConfirmed,
                }),
              ).toLowerCase()}
              . Seeded rows stay Seeded.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={approveAllMill}>
                Approve all remaining suggestions
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMillException(false);
                  ingestPublish();
                }}
              >
                Open catalogue with exceptions left
              </Button>
              <Button variant="ghost" onClick={() => setMillException(false)}>
                Keep reviewing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  row,
  approved,
  ranked,
  onField,
  onApprove,
  provenance,
}: {
  row: CatalogRow;
  approved: boolean;
  ranked: string[];
  onField: (id: string, field: CatalogField, value: string) => void;
  onApprove: () => void;
  provenance: string;
}) {
  const structure = row.values.structure || "";
  const review = reviewRowLabel(row.status);
  return (
    <tr>
      <td>
        <p className="spec text-[12px] text-chalk">{row.article}</p>
        <p className="mt-0.5 spec text-[11px] text-mute">
          {review} · {provenance}
        </p>
      </td>
      <td>
        <p className="text-[13px] text-raw">{row.raw.construction}</p>
        <p className="mt-0.5 spec text-[11px] text-mute">{row.raw.composition}</p>
      </td>
      <td>
        <select
          className="suggest-select mill-suggest w-full max-w-[240px]"
          value={structure}
          onChange={(e) => onField(row.id, "structure", e.target.value)}
          aria-label={`Fruma structure for ${row.article}`}
        >
          <option value="">Unknown</option>
          {ranked.map((opt, i) => (
            <option key={opt} value={opt}>
              {i === 0 && !structure ? `Suggested — ${opt}` : opt}
            </option>
          ))}
        </select>
        <p className="mt-1 spec text-[11px] text-mute">{frumaPath(structure)}</p>
        <p className="mt-0.5 spec text-[11px] text-mute">
          {CATALOG_FIELDS.filter((f) => f.key !== "structure")
            .map((f) => row.values[f.key])
            .filter(Boolean)
            .slice(0, 2)
            .join(" · ") || "Unknown"}
        </p>
      </td>
      <td>
        <Button size="sm" variant={approved ? "ok" : "outline"} onClick={onApprove}>
          {approved ? "Confirmed" : "Confirm"}
        </Button>
      </td>
    </tr>
  );
}
