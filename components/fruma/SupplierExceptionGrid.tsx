"use client";

import type { SupplierParsingAnomaly } from "@/lib/fruma/ingest/supplier-anomalies";

/** Dashed amber proposal blocks for parsing anomalies. */
export const ANOMALY_PROPOSAL = "border border-dashed border-amber-500/80 bg-amber-500/5";

const HEADER =
  "border-b border-zinc-800/60 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400";

/** Actionable parsing anomalies. Nothing in this grid is written back. */
export function SupplierExceptionGrid({
  anomalies,
  className = ANOMALY_PROPOSAL,
}: {
  anomalies: SupplierParsingAnomaly[];
  className?: string;
}) {
  const unmapped = anomalies.filter((row) => row.reason === "unmapped").length;
  const unconfirmed = anomalies.length - unmapped;

  return (
    <section aria-label="Parsing anomalies" className="bg-[#0B0C0E] text-zinc-100">
      <div className={HEADER}>
        <h2>Parsing anomalies</h2>
        <p className="mt-1">
          {unmapped} unmapped · {unconfirmed} unconfirmed
        </p>
      </div>
      {anomalies.length === 0 ? (
        <p className={`mt-3 px-2 py-1 text-[11px] text-amber-200 ${className}`}>
          No parsing anomalies in this file.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {anomalies.map((row) => (
            <li
              key={row.id}
              className={`grid grid-cols-1 gap-1 px-2 py-1 sm:grid-cols-[7rem_minmax(0,1fr)_auto] ${className}`}
            >
              <span className="text-[11px] uppercase tracking-[0.14em] text-amber-200">{row.reason}</span>
              <span className="min-w-0 text-[11px] text-zinc-100">
                <span className="text-zinc-400">{row.header || "blank header"}</span>
                {" · "}
                <span className="break-all">{row.sourceValue || "—"}</span>
                {row.standardField ? <span className="text-zinc-400"> → {row.standardField}</span> : null}
              </span>
              <span className="text-[11px] text-zinc-400">
                {row.sheet} · row {row.row} · {row.column}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
