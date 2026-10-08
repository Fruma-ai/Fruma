"use client";

import type { SupplierParsingAnomaly } from "@/lib/fruma/ingest/supplier-anomalies";

/** Actionable parsing anomalies: still unmapped, or mapped and still unconfirmed. */
export function SupplierExceptionGrid({ anomalies }: { anomalies: SupplierParsingAnomaly[] }) {
  if (anomalies.length === 0) return null;

  const unmapped = anomalies.filter((row) => row.reason === "unmapped").length;
  const unconfirmed = anomalies.length - unmapped;

  return (
    <section
      aria-label="Parsing anomalies"
      className="space-y-3 rounded-sm border p-4 font-mono text-[11px] border-dashed border-amber-500/80 bg-amber-500/5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Parsing anomalies</h3>
        <p className="text-[10px] text-[#6E7E91]">
          {unmapped} unmapped · {unconfirmed} unconfirmed
        </p>
      </div>
      <ul className="space-y-2">
        {anomalies.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-1 gap-1 rounded-sm border border-amber-500/20 px-3 py-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
          >
            <span className="uppercase tracking-wider text-amber-400">{row.reason}</span>
            <span className="min-w-0 text-[#F5F5F7]">
              <span className="text-[#6E7E91]">{row.header || "blank header"}</span>
              {" · "}
              <span className="break-all">{row.sourceValue || "—"}</span>
              {row.standardField ? (
                <span className="text-[#6E7E91]"> → {row.standardField}</span>
              ) : null}
            </span>
            <span className="text-[#6E7E91]">
              {row.sheet} · row {row.row} · {row.column}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
