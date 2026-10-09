"use client";

import { useState, type ChangeEvent } from "react";

export type LedgerSchemaName = "demo" | "test" | "production";

const HEADER =
  "border-b border-zinc-800/60 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400";

const CONFIRM_BUTTON =
  "border border-zinc-800/60 bg-zinc-900/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-100 disabled:opacity-40";

/** File presentation for the deposits workbench. Selecting a file does not write. */
export function FactoryIngestWorkbench({ activeSchema }: { activeSchema: LedgerSchemaName }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function stage(event: ChangeEvent<HTMLInputElement>) {
    setConfirmed(false);
    setFileName(event.target.files?.[0]?.name ?? null);
  }

  return (
    <div className="space-y-4 bg-[#0B0C0E] text-zinc-100">
      <div className={HEADER}>
        <h2>Factory file</h2>
        <p className="mt-1">fruma_{activeSchema}</p>
      </div>
      <label className="block text-[11px] uppercase tracking-[0.14em] text-zinc-400">
        Workbook
        <input
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={stage}
          className="mt-1 block w-full text-xs text-zinc-100 file:mr-3 file:border file:border-zinc-800/60 file:bg-zinc-900/40 file:px-3 file:py-1 file:text-[11px] file:font-medium file:uppercase file:tracking-[0.14em] file:text-zinc-100"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!fileName}
          onClick={() => setConfirmed(true)}
          className={CONFIRM_BUTTON}
        >
          Confirm file
        </button>
        <button
          type="button"
          onClick={() => {
            setFileName(null);
            setConfirmed(false);
          }}
          className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400"
        >
          Clear
        </button>
      </div>
      {confirmed && fileName ? (
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">{fileName}</p>
      ) : null}
    </div>
  );
}
