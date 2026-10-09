"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierParsingAnomaly } from "@/lib/fruma/ingest/supplier-anomalies";
import {
  confirmPendingOverrides,
  pendingOverridesFromAnomalies,
  type TenantVersion,
} from "@/lib/fruma/persist/confirm-pending-overrides";

/** Dashed amber proposal blocks for parsing anomalies. */
export const ANOMALY_PROPOSAL = "border border-dashed border-amber-500/80 bg-amber-500/5";

const HEADER =
  "border-b border-zinc-800/60 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400";

const CONFIRM_BUTTON =
  "border border-zinc-800/60 bg-zinc-900/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-100 disabled:opacity-40";

/** Dashed amber blocks. Confirm posts those overrides for the session tenant. */
export function SupplierExceptionGrid({
  anomalies,
  tenantVersion,
  className = ANOMALY_PROPOSAL,
}: {
  anomalies: SupplierParsingAnomaly[];
  tenantVersion: TenantVersion;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingOverrides = pendingOverridesFromAnomalies(anomalies);
  const unmapped = anomalies.filter((row) => row.reason === "unmapped").length;
  const unconfirmed = anomalies.length - unmapped;

  async function handleBulkConfirm() {
    if (busy || pendingOverrides.length === 0) return;
    setBusy(true);
    setNotice(null);
    const ok = await confirmPendingOverrides(pendingOverrides, tenantVersion, () => router.refresh());
    if (!ok) setNotice("The append did not complete.");
    setBusy(false);
  }

  return (
    <section aria-label="Parsing anomalies" className="bg-[#0B0C0E] text-zinc-100">
      <div className={`${HEADER} flex items-end justify-between gap-3`}>
        <div>
          <h2>Parsing anomalies</h2>
          <p className="mt-1">
            {unmapped} unmapped · {unconfirmed} unconfirmed
          </p>
        </div>
        <button
          type="button"
          disabled={busy || pendingOverrides.length === 0}
          onClick={() => void handleBulkConfirm()}
          className={CONFIRM_BUTTON}
        >
          Confirm exceptions
        </button>
      </div>
      {notice ? <p className="mt-2 text-[11px] text-amber-200">{notice}</p> : null}
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
