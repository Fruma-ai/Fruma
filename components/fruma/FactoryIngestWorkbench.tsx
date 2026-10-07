"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { CheckCircle2, FileSpreadsheet, RefreshCw, ShieldCheck, Upload } from "lucide-react";

export type LedgerSchemaName = "demo" | "test" | "production";

const WORKBOOK_MAX_BYTES = 32 * 1024 * 1024;

interface FactoryIngestWorkbenchProps {
  onFileProcess: (file: File) => void;
  isProcessing: boolean;
  activeSchema: LedgerSchemaName;
}

function workbookRejection(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) {
    return "Parse csv and xlsx only.";
  }
  if (file.size === 0) return "Empty file; ingest will not invent rows.";
  if (file.size > WORKBOOK_MAX_BYTES) return "Workbook is larger than 32MB.";
  return null;
}

export function FactoryIngestWorkbench({
  onFileProcess,
  isProcessing,
  activeSchema,
}: FactoryIngestWorkbenchProps) {
  const [dragActive, setDragActive] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  function stage(file: File) {
    const reason = workbookRejection(file);
    if (reason) {
      setStagedFile(null);
      setRejection(reason);
      return;
    }
    setRejection(null);
    setStagedFile(file);
  }

  function handleDrag(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") setDragActive(true);
    else if (event.type === "dragleave") setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) stage(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) stage(file);
    event.target.value = "";
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-sm border border-[#1F1F23] bg-[#121214] p-6 md:flex-row md:items-center">
        <div className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-[#3B82F6]">
            Factory Interface Portal
          </span>
          <h2 className="text-base font-medium text-[#F5F5F7]">Immutable Ledger Ingestion Console</h2>
          <p className="text-xs text-[#6E7E91]">
            Drop a mill workbook to parse its rows and append them to the active schema.
          </p>
        </div>

        <div className="flex h-fit w-fit shrink-0 items-center gap-2 rounded-sm border border-[#1F1F23] bg-[#0B0B0C] px-3 py-1.5 font-mono text-[11px]">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[#6E7E91]">Search Path:</span>
          <span className="font-medium text-[#3B82F6]">fruma_{activeSchema}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative flex min-h-[260px] w-full flex-col items-center justify-center rounded-sm border border-dashed bg-[#121214]/40 p-8 text-center transition-all ${
              dragActive ? "border-[#3B82F6] bg-[#3B82F6]/5" : "border-[#1F1F23] hover:border-[#6E7E91]"
            }`}
          >
            {stagedFile ? (
              <div className="max-w-xs space-y-4">
                <div className="mx-auto w-fit rounded-sm border border-[#1F1F23] bg-[#161619] p-3 text-emerald-400">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="truncate px-2 text-xs font-medium text-[#F5F5F7]">{stagedFile.name}</p>
                  <p className="font-mono text-[10px] text-[#6E7E91]">
                    {(stagedFile.size / 1024).toFixed(1)} KB // Ready for Ledger Append
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStagedFile(null);
                    setRejection(null);
                  }}
                  className="mx-auto block cursor-pointer font-mono text-[10px] uppercase tracking-wider text-amber-500 underline hover:text-amber-400"
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer space-y-4 opacity-80">
                <input
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isProcessing}
                />
                <div className="mx-auto w-fit rounded-sm border border-[#1F1F23] bg-[#121214] p-3 text-[#6E7E91]">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[#F5F5F7]">
                    Drag factory workbook here or click to browse
                  </p>
                  <p className="font-mono text-[10px] text-[#6E7E91]">
                    Supports CSV, XLSX up to 32MB // Ingestion runs disk-free
                  </p>
                </div>
              </label>
            )}
          </div>

          {rejection ? <p className="font-mono text-[11px] text-amber-400">{rejection}</p> : null}

          {stagedFile ? (
            <button
              type="button"
              onClick={() => onFileProcess(stagedFile)}
              disabled={isProcessing}
              className="flex w-full cursor-pointer select-none items-center justify-center gap-2 rounded-sm bg-[#3B82F6] px-4 py-3 font-mono text-xs uppercase tracking-wider text-white transition-colors hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#161619] disabled:text-[#6E7E91]"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing Relational Ledger Appends...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Commit File to Immutable Core</span>
                </>
              )}
            </button>
          ) : null}
        </div>

        <div className="space-y-4 rounded-sm border border-[#1F1F23] bg-[#121214] p-5 lg:col-span-7">
          <div className="flex items-center gap-2 border-b border-[#1F1F23] pb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F5F5F7]">
              Live Ingestion Pipeline Status
            </h3>
          </div>

          <div className="space-y-3 font-mono text-[11px]">
            <div className="flex items-start gap-3 rounded-sm border border-[#1F1F23] bg-[#0B0B0C] p-2.5">
              <div className="mt-0.5 text-xs text-emerald-400">01</div>
              <div className="space-y-0.5">
                <span className="block text-[#F5F5F7]">Cryptographic Guard Lock</span>
                <p className="text-[10px] text-[#6E7E91]">
                  Generates an immutable SHA-256 of the workbook before the append.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-sm border border-[#1F1F23] bg-[#0B0B0C] p-2.5">
              <div className="mt-0.5 text-xs text-emerald-400">02</div>
              <div className="space-y-0.5">
                <span className="block text-[#F5F5F7]">Copy-on-Write Event Ingestion</span>
                <p className="text-[10px] text-[#6E7E91]">
                  Appends workbook cells as raw coordinates into the active schema. Source cells are insert-only.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-sm border border-[#1F1F23] bg-[#0B0B0C] p-2.5">
              <div className="mt-0.5 text-xs text-amber-500">03</div>
              <div className="space-y-0.5">
                <span className="block text-[#F5F5F7]">Staged Mapping Feedback</span>
                <p className="text-[10px] text-[#6E7E91]">
                  Unmapped standard fields can be proposed on the material catalog and accepted in bulk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
