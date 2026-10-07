"use client";

import { ArrowUpRight, FileSpreadsheet, ShieldCheck } from "lucide-react";

interface DepositRowCardProps {
  filename: string;
  byteHash: string;
  supplierOrgId: string;
  receivedAt: string;
  onInspect: () => void;
}

function abbreviatedHash(byteHash: string) {
  if (byteHash.length <= 16) return byteHash;
  return `${byteHash.slice(0, 8)}...${byteHash.slice(-8)}`;
}

export function DepositRowCard({
  filename,
  byteHash,
  supplierOrgId,
  receivedAt,
  onInspect,
}: DepositRowCardProps) {
  const received = new Date(receivedAt);
  const receivedLabel = Number.isNaN(received.getTime())
    ? receivedAt
    : received.toLocaleDateString("en-GB", { timeZone: "UTC" });

  return (
    <div className="flex w-full flex-col justify-between gap-4 rounded-sm border border-[#1F1F23] bg-[#121214] p-4 transition-colors hover:border-[#3B82F6]/30 md:flex-row md:items-center">
      <div className="flex min-w-0 items-start gap-4">
        <div className="shrink-0 rounded-sm border border-[#2B2B30] bg-[#161619] p-2 text-[#6E7E91]">
          <FileSpreadsheet className="h-4 w-4" />
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="max-w-sm truncate text-xs font-medium text-[#F5F5F7] md:max-w-xl">
              {filename}
            </span>
            <span className="inline-flex select-none items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> Immutable
            </span>
          </div>

          <div className="cell-text-mono flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Mill Registry:{" "}
              <strong className="font-normal text-[#F5F5F7]">{supplierOrgId}</strong>
            </span>
            <span>
              SHA-256:{" "}
              <span className="font-normal text-[#F5F5F7]">{abbreviatedHash(byteHash)}</span>
            </span>
            <span>Timestamp: {receivedLabel}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onInspect}
        className="group flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-[#1F1F23] bg-[#161619] px-3 py-1.5 font-mono text-xs tracking-wide text-[#F5F5F7] transition-colors hover:border-[#F5F5F7] md:w-auto"
      >
        <span>Provenance Map</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-[#6E7E91] transition-colors group-hover:text-[#F5F5F7]" />
      </button>
    </div>
  );
}
