"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StandardField } from "@/lib/fruma/ingest/types";
import { confirmStagedSuggestion } from "@/src/app/actions/ledger-mutations";

const ANOMALY_PROPOSAL = "border-dashed border-amber-500/80 bg-amber-500/5";

const TARGET_FIELDS = [
  "article",
  "construction",
  "composition",
  "weight",
  "width",
  "colour",
  "moq",
  "customer",
  "cert",
] as const satisfies readonly StandardField[];

/** A cell the parser left unmapped, or mapped and still unconfirmed. */
export type SupplierExceptionRow = {
  id: string;
  sheet: string;
  row: number;
  column: string;
  header: string;
  sourceValue: string;
  standardField: StandardField | null;
  standardValue: string | null;
  reason: "unmapped" | "unconfirmed";
};

export type ConfirmReplay = {
  source_cell_id: string;
  target_field: string;
  confirmed_value: string;
  confirmed: true;
};

/**
 * A successful confirm appends a ledger event. The replayed cell is mapped and
 * confirmed, so it leaves the anomaly list. The mill source text stays in place.
 */
export function applyConfirmReplay<T extends { id: string }>(
  rows: readonly T[],
  payload: { source_cell_id: string; target_field: string; confirmed_value: string },
): { anomalies: T[]; confirmed: ConfirmReplay | null } {
  let confirmed: ConfirmReplay | null = null;
  const anomalies = rows.filter((row) => {
    if (row.id !== payload.source_cell_id) return true;
    confirmed = {
      source_cell_id: payload.source_cell_id,
      target_field: payload.target_field,
      confirmed_value: payload.confirmed_value,
      confirmed: true,
    };
    return false;
  });
  return { anomalies, confirmed };
}

/** Actionable parsing anomalies: still unmapped, or mapped and still unconfirmed. */
export function SupplierExceptionGrid({
  anomalies,
  className = ANOMALY_PROPOSAL,
}: {
  anomalies: SupplierExceptionRow[];
  className?: string;
}) {
  const router = useRouter();
  const [hiddenIds, setHiddenIds] = useState<readonly string[]>([]);
  const [replay, setReplay] = useState<ConfirmReplay | null>(null);
  const rows = anomalies.filter((row) => !hiddenIds.includes(row.id));

  function onConfirmed(payload: {
    source_cell_id: string;
    target_field: string;
    confirmed_value: string;
  }) {
    const confirmed = applyConfirmReplay(rows, payload).confirmed;
    if (confirmed) {
      setHiddenIds((current) =>
        current.includes(confirmed.source_cell_id) ? current : [...current, confirmed.source_cell_id],
      );
      setReplay(confirmed);
    }
    router.refresh();
  }

  if (rows.length === 0 && !replay) return null;

  const unmapped = rows.filter((row) => row.reason === "unmapped").length;
  const unconfirmed = rows.length - unmapped;

  return (
    <section
      aria-label="Parsing anomalies"
      className={`space-y-3 rounded-sm border p-4 font-mono text-[11px] ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Parsing anomalies</h3>
        <p className="text-[10px] text-[#6E7E91]">
          {unmapped} unmapped · {unconfirmed} unconfirmed
        </p>
      </div>
      {replay ? (
        <p className="text-[10px] text-[#F5F5F7]" role="status">
          Ledger replay confirmed {replay.target_field} as {replay.confirmed_value}. Source cell{" "}
          {replay.source_cell_id} is unchanged.
        </p>
      ) : null}
      <ul className="space-y-2">
        {rows.map((row) => (
          <AnomalyConfirmForm
            key={`${row.id}:${row.standardField ?? ""}:${row.standardValue ?? ""}:${row.sourceValue}`}
            row={row}
            className={className}
            onConfirmed={onConfirmed}
          />
        ))}
      </ul>
    </section>
  );
}

function AnomalyConfirmForm({
  row,
  className,
  onConfirmed,
}: {
  row: SupplierExceptionRow;
  className: string;
  onConfirmed: (payload: {
    source_cell_id: string;
    target_field: string;
    confirmed_value: string;
  }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmedValue, setConfirmedValue] = useState(row.standardValue ?? row.sourceValue);
  const [targetField, setTargetField] = useState(row.standardField ?? "");

  return (
    <li>
      <form
        className={`grid grid-cols-1 gap-2 rounded-sm border px-3 py-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto] ${className}`}
        onSubmit={(event) => {
          event.preventDefault();
          const payload = {
            source_cell_id: row.id,
            target_field: targetField,
            confirmed_value: confirmedValue,
          };
          setError(null);
          startTransition(async () => {
            const result = await confirmStagedSuggestion(payload);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            onConfirmed(payload);
          });
        }}
      >
        <span className="uppercase tracking-wider text-amber-400">{row.reason}</span>
        <span className="min-w-0 text-[#F5F5F7]">
          <span className="text-[#6E7E91]">{row.header || "blank header"}</span>
          {" · "}
          <span className="break-all text-[#6E7E91]">{row.sourceValue || "—"}</span>
          <span className="mt-2 grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <label className="grid gap-1 text-[10px] uppercase tracking-wider text-[#6E7E91]">
              Target field
              <select
                name="target_field"
                value={targetField}
                onChange={(event) => setTargetField(event.target.value)}
                className="border border-amber-500/40 bg-transparent px-2 py-1 text-[11px] normal-case tracking-normal text-[#F5F5F7]"
              >
                <option value="">Select field</option>
                {TARGET_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[10px] uppercase tracking-wider text-[#6E7E91]">
              Confirmed value
              <input
                name="confirmed_value"
                value={confirmedValue}
                onChange={(event) => setConfirmedValue(event.target.value)}
                className="border border-amber-500/40 bg-transparent px-2 py-1 text-[11px] normal-case tracking-normal text-[#F5F5F7]"
              />
            </label>
          </span>
        </span>
        <span className="flex flex-col items-start gap-2 text-[#6E7E91]">
          <span>
            {row.sheet} · row {row.row} · {row.column}
          </span>
          <input type="hidden" name="source_cell_id" value={row.id} />
          <button
            type="submit"
            disabled={pending || targetField.length === 0 || confirmedValue.trim().length === 0}
            className="border border-amber-500/80 px-2 py-1 uppercase tracking-wider text-amber-400 disabled:opacity-40"
          >
            {pending ? "Confirming" : "Confirm"}
          </button>
          {error ? (
            <span role="alert" className="text-amber-400">
              {error}
            </span>
          ) : null}
        </span>
      </form>
    </li>
  );
}
