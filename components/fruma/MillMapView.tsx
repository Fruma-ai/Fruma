"use client";

import { Button } from "@/components/ui/button";
import {
  APPLY_STEPS,
  FRUMA_MILL_FIELDS,
  IGNORE,
  MILL_COLUMNS,
} from "@/lib/fruma/mill-ingest";
import { cn } from "@/lib/utils";
import { SurfaceState } from "./SurfaceState";
import { useFruma } from "./store";

export function MillMapView() {
  const {
    millFile,
    millColumnMap,
    millTemplateName,
    millApplyStatus,
    millApplyStep,
    setMillMapField,
    setMillTemplateName,
    confirmMillMap,
    setMillRoom,
  } = useFruma();

  if (!millFile) {
    return (
      <SurfaceState
        tone="empty"
        kicker="Step 3 of 5 · map"
        title="Drop a mill file first."
        body="Column mapping needs a hanger list. Send the file as it is — Fruma will match mill columns to the standard catalogue."
        action={{ label: "Drop a mill file", onClick: () => setMillRoom("upload") }}
      />
    );
  }

  if (millApplyStatus === "running") {
    return <ApplyingCard step={millApplyStep} file={millFile.name} rows={millFile.rows} />;
  }

  const requiredMissing = FRUMA_MILL_FIELDS.some(
    (f) => f.required && (millColumnMap[f.key] === IGNORE || !millColumnMap[f.key]),
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[44rem]">
          <p className="ui-label">Step 3 of 5 · map to Fruma</p>
          <h1 className="page-title mt-2 md:text-[28px]">
            Match mill columns to the Fruma standard.
          </h1>
          <p className="page-lede mt-3">
            Required fields are suggested. Ignore anything you don&apos;t have —
            the next file in this layout will map itself.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setMillRoom("upload")}>
            Back
          </Button>
          <Button disabled={requiredMissing} onClick={confirmMillMap}>
            Apply mapping
          </Button>
        </div>
      </div>

      <section className="mill-card mb-6 p-5">
        <p className="ui-label">Your uploaded file</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-chalk">{millFile.name}</p>
            <p className="mt-1 spec text-[12px] text-mute">
              {millFile.size} · {millFile.rows} qualities
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMillRoom("upload")}>
            Replace file
          </Button>
        </div>
      </section>

      <section className="mill-card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <p className="text-[14px] font-semibold tracking-[-0.02em]">Create your mill template</p>
          <p className="mt-1 text-[13px] text-mute">
            Match your file&apos;s columns to each Fruma field, or choose Ignore.
          </p>
          <label className="mt-4 block max-w-[28rem]">
            <span className="ui-label">Template name</span>
            <input
              value={millTemplateName}
              onChange={(e) => setMillTemplateName(e.target.value)}
              className="mt-2 h-9 w-full border border-line bg-transparent px-3 text-[13px] text-chalk"
            />
            <span className="mt-1.5 block text-[12px] text-mute">
              Saved against this mill. Next season&apos;s hanger list in the same
              columns skips this step.
            </span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th className="w-[240px]">Fruma field</th>
                <th>Your column</th>
                <th>Preview from the file</th>
              </tr>
            </thead>
            <tbody>
              {FRUMA_MILL_FIELDS.map((field) => {
                const value = millColumnMap[field.key] ?? field.suggested;
                return (
                  <tr key={field.key}>
                    <td>
                      <p className="text-[13.5px] text-chalk">
                        {field.label}
                        {field.required ? (
                          <span className="ml-1 text-weld">required</span>
                        ) : (
                          <span className="ml-1 text-mute">optional</span>
                        )}
                      </p>
                      <p className="mt-0.5 spec text-[11px] text-mute">{field.path}</p>
                    </td>
                    <td>
                      <select
                        className="suggest-select mill-suggest w-full max-w-[240px]"
                        value={value}
                        onChange={(e) => setMillMapField(field.key, e.target.value)}
                        aria-label={`Column for ${field.label}`}
                      >
                        {MILL_COLUMNS.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.id === field.suggested ? `Suggested — ${col.id}` : col.id}
                          </option>
                        ))}
                        <option value={IGNORE}>Ignore</option>
                      </select>
                      <p
                        className={cn(
                          "mt-1 spec text-[11px]",
                          field.confidence === "high"
                            ? "text-ok"
                            : field.confidence === "med"
                              ? "text-weld"
                              : "text-madder",
                        )}
                      >
                        {field.confidence === "high"
                          ? "High confidence"
                          : field.confidence === "med"
                            ? "Check the unit"
                            : "Needs a look"}
                      </p>
                    </td>
                    <td>
                      <p className="spec text-[13px] text-chalk">{field.preview}</p>
                      <p className="mt-0.5 spec text-[11px] text-mute">
                        {MILL_COLUMNS.find((c) => c.id === value)?.samples ?? "—"}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ApplyingCard({ step, file, rows }: { step: number; file: string; rows: number }) {
  const pct = Math.round(((step + 1) / APPLY_STEPS.length) * 100);
  return (
    <div className="mx-auto max-w-[560px]">
      <p className="ui-label">Step 3 of 5 · applying the Fruma standard</p>
      <div className="mill-card mt-4 p-6 md:p-8" role="status">
        <h1 className="text-[22px] font-semibold tracking-[-0.03em]">
          Mapping {rows} qualities
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mute">
          Applying your template from {file} onto the Fruma catalogue. That
          groundwork is what brands search — exceptions wait for you on Review.
        </p>
        <div className="mill-bar mt-5">
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 spec text-[11px] text-mute">{pct}%</p>
        <ol className="mt-5">
          {APPLY_STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
              <span
                className={cn(
                  "spec text-[11px]",
                  i < step ? "text-ok" : i === step ? "text-weld" : "text-mute",
                )}
              >
                {i < step ? "✓" : i === step ? "…" : "○"}
              </span>
              <span className={cn("text-[13.5px]", i <= step ? "text-chalk" : "text-mute")}>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
