"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPendingOverrides,
  stageCellOverride,
  type PendingCellOverride,
  type TenantVersion,
} from "@/lib/fruma/persist/confirm-pending-overrides";

/** Dashed amber proposal blocks for parsing anomalies. */
export const ANOMALY_PROPOSAL = "border border-dashed border-amber-500/80 bg-amber-500/5";

export type IngestExceptionFrame = {
  id: string;
  currentVal: string;
  expectedField: string;
};

const HEADER =
  "border-b border-zinc-800/60 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400";

const CONFIRM_BUTTON =
  "border border-zinc-800/60 bg-zinc-900/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-100 disabled:opacity-40";

/** Dashed amber frames. Typed values stay local until confirm posts them. */
export function SupplierExceptionGrid({
  initialExceptions,
  tenantVersion,
  className = ANOMALY_PROPOSAL,
}: {
  initialExceptions: IngestExceptionFrame[];
  tenantVersion: TenantVersion;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<PendingCellOverride[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleStageOverride(cellId: string, field: string, value: string) {
    setErrorMessage(null);
    setOverrides((previous) => stageCellOverride(previous, cellId, field, value));
  }

  async function handleConfirmExceptions() {
    if (overrides.length === 0 || saving || isPending) return;
    setErrorMessage(null);
    setSaving(true);
    try {
      const ok = await confirmPendingOverrides(overrides, tenantVersion, () => {
        setOverrides([]);
        startTransition(() => {
          router.refresh();
        });
      });
      if (!ok) setErrorMessage("The append did not complete.");
    } catch {
      setErrorMessage("The append did not complete.");
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || isPending;

  return (
    <section aria-label="Parsing anomalies" className="bg-[#0B0C0E] text-zinc-100">
      <div className={`${HEADER} flex items-end justify-between gap-3`}>
        <div>
          <h2>Parsing anomalies</h2>
          <p className="mt-1">fruma_{tenantVersion}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleConfirmExceptions()}
          disabled={overrides.length === 0 || busy}
          className={CONFIRM_BUTTON}
        >
          {busy ? "Appending..." : "Confirm exceptions"}
        </button>
      </div>
      {errorMessage ? <p className="mt-2 text-[11px] text-amber-200">{errorMessage}</p> : null}
      {initialExceptions.length === 0 ? (
        <p className={`mt-3 px-2 py-1 text-[11px] text-amber-200 ${className}`}>
          No parsing anomalies in this file.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {initialExceptions.map((item) => {
            const matchingOverride = overrides.find(
              (row) => row.cellId === item.id && row.field === item.expectedField,
            );
            return (
              <div key={`${item.id}:${item.expectedField}`} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                    {item.id}
                  </span>
                  <span className="border border-zinc-800/60 px-1 py-0 text-[11px] font-medium uppercase leading-none tracking-[0.14em] text-amber-200">
                    {item.expectedField}
                  </span>
                </div>
                <div className={className}>
                  <input
                    type="text"
                    aria-label={`${item.expectedField} for ${item.id}`}
                    placeholder={`Resolve anomaly [Original: "${item.currentVal}"]...`}
                    value={matchingOverride?.newValue ?? ""}
                    onChange={(event) => handleStageOverride(item.id, item.expectedField, event.target.value)}
                    spellCheck={false}
                    className="w-full bg-transparent px-2 py-1 text-[11px] text-zinc-100 outline-none placeholder:text-zinc-400 focus-visible:outline-2! focus-visible:outline-solid! focus-visible:outline-zinc-400!"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
