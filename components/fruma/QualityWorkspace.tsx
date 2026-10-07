"use client";

import { useMemo, useState } from "react";
import { QualityDataTable } from "./QualityDataTable";
import type { QualityRow } from "@/lib/fruma/catalog/quality-rows";
import {
  STANDARD_FIELD_LABEL,
  type StandardGap,
} from "@/lib/fruma/catalog/standard-gaps";

export function QualityWorkspace({
  rows,
  gaps,
  unread,
}: {
  rows: QualityRow[];
  gaps: StandardGap[];
  unread: string[];
}) {
  const [table, setTable] = useState(rows);
  const [open, setOpen] = useState(gaps);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(gaps.map((gap) => [gap.id, gap.suggestion ?? ""])),
  );
  const [note, setNote] = useState<string | null>(null);

  const articles = useMemo(() => {
    const groups: { articleCode: string; rowKey: string; gaps: StandardGap[] }[] = [];
    for (const gap of open) {
      const existing = groups.find((group) => group.rowKey === gap.rowKey);
      if (existing) existing.gaps.push(gap);
      else groups.push({ articleCode: gap.articleCode, rowKey: gap.rowKey, gaps: [gap] });
    }
    return groups;
  }, [open]);

  function draftOf(id: string) {
    return (drafts[id] ?? "").trim();
  }

  function accept(ids: string[]) {
    const unique = [...new Set(ids)];
    const ready = unique.filter((id) => draftOf(id));
    const skipped = unique.length - ready.length;
    if (ready.length === 0) {
      setNote("Write a value before accepting.");
      return;
    }
    const chosen = new Map(ready.map((id) => [id, draftOf(id)]));
    setTable((current) => {
      let next = current.map((row) => ({ ...row }));
      for (const gap of open) {
        const value = chosen.get(gap.id);
        if (!value) continue;
        if (gap.field === "article") {
          next = next.map((row) =>
            row.rowKey === gap.rowKey ? { ...row, articleCode: value } : row,
          );
        }
        if (gap.cellId) {
          next = next.map((row) =>
            row.id === gap.cellId
              ? { ...row, fieldName: gap.field, standardValue: value, isConfirmed: true }
              : row,
          );
        }
      }
      return next;
    });
    setOpen((current) => current.filter((gap) => !chosen.has(gap.id)));
    setSelected((current) => current.filter((id) => !chosen.has(id)));
    setNote(
      skipped > 0
        ? `Accepted ${ready.length}. ${skipped} still need a value.`
        : `Accepted ${ready.length} standard ${ready.length === 1 ? "value" : "values"}.`,
    );
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const allIds = open.map((gap) => gap.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  return (
    <div className="space-y-6">
      {open.length > 0 ? (
        <section className="rounded-sm border border-[#1F1F23] bg-[#121214]">
          <div className="flex flex-col gap-3 border-b border-[#1F1F23] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#6E7E91]">
                Short of the standard
              </h2>
              <p className="mt-1 text-xs text-[#F5F5F7]">
                {open.length} matched {open.length === 1 ? "field needs" : "fields need"} a
                standard value. Accept Fruma&apos;s suggestion, edit it, or write your own.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => accept(selected)}
                disabled={selected.length === 0}
                className="rounded-sm border border-[#1F1F23] bg-[#161619] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#F5F5F7] disabled:opacity-40"
              >
                Accept selected
              </button>
              <button
                type="button"
                onClick={() => accept(allIds)}
                className="rounded-sm border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#F5F5F7]"
              >
                Accept all filled
              </button>
            </div>
          </div>
          {note ? (
            <p className="border-b border-[#1F1F23] px-4 py-2 font-mono text-[11px] text-emerald-400" role="status">
              {note}
            </p>
          ) : null}
          <div className="flex items-center gap-2 border-b border-[#1F1F23] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-[#6E7E91]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : allIds)}
              aria-label="Select every open field"
            />
            <span>{selected.length} selected</span>
          </div>
          <div className="divide-y divide-[#1F1F23]">
            {articles.map((article) => (
              <div key={article.rowKey} className="px-4 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs text-[#F5F5F7]">{article.articleCode}</p>
                  <button
                    type="button"
                    onClick={() => accept(article.gaps.map((gap) => gap.id))}
                    className="font-mono text-[10px] uppercase tracking-wider text-[#6E7E91] hover:text-[#F5F5F7]"
                  >
                    Accept this article
                  </button>
                </div>
                <ul className="space-y-2">
                  {article.gaps.map((gap) => (
                    <li key={gap.id} className="grid gap-2 md:grid-cols-[auto_140px_1fr_1fr_auto] md:items-center">
                      <input
                        type="checkbox"
                        checked={selected.includes(gap.id)}
                        onChange={() => toggle(gap.id)}
                        aria-label={`Select ${STANDARD_FIELD_LABEL[gap.field]} for ${article.articleCode}`}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E7E91]">
                        {STANDARD_FIELD_LABEL[gap.field]}
                      </span>
                      <span className="truncate font-mono text-[11px] italic text-[#6E7E91]">
                        {gap.sourceValue ? `"${gap.sourceValue}"` : "No mill text"}
                      </span>
                      <label className="min-w-0">
                        <span className="sr-only">
                          Standard value for {STANDARD_FIELD_LABEL[gap.field]} on {article.articleCode}
                        </span>
                        <input
                          value={drafts[gap.id] ?? ""}
                          placeholder="Write the standard value"
                          onChange={(event) =>
                            setDrafts((current) => ({ ...current, [gap.id]: event.target.value }))
                          }
                          className="w-full rounded-sm border border-[#1F1F23] bg-[#0B0B0C] px-2 py-1 font-mono text-[11px] text-[#F5F5F7] outline-none focus:border-[#3B82F6]"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => accept([gap.id])}
                        disabled={!draftOf(gap.id)}
                        className="rounded-sm border border-[#1F1F23] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#F5F5F7] disabled:opacity-40"
                      >
                        Accept
                      </button>
                      <p className="font-mono text-[10px] text-[#6E7E91] md:col-start-3 md:col-span-2">
                        {gap.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : rows.length > 0 ? (
        <p className="font-mono text-xs text-[#6E7E91]" role="status">
          {note ?? "Every required field on these matched fabrics has a standard value."}
        </p>
      ) : (
        <p className="font-mono text-xs text-[#6E7E91]">No material cells on fruma_demo.</p>
      )}

      {table.length > 0 ? <QualityDataTable qualities={table} /> : null}
      {unread.map((line) => (
        <p key={line} className="font-mono text-xs text-[#6E7E91]" role="status">
          {line}
        </p>
      ))}
    </div>
  );
}
