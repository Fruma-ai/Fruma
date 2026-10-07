import { HelpCircle, History, ShieldCheck } from "lucide-react";
import type { QualityRow } from "@/lib/fruma/catalog/quality-rows";

interface QualityDataTableProps {
  qualities: QualityRow[];
}

export function QualityDataTable({ qualities }: QualityDataTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-sm border border-[#1F1F23] bg-[#121214]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#1F1F23] bg-[#0B0B0C] font-mono text-[10px] uppercase tracking-wider text-[#6E7E91]">
              <th className="p-3 font-medium">Article Identifier</th>
              <th className="p-3 font-medium">Coordinate Axis</th>
              <th className="p-3 font-medium">Target Standard</th>
              <th className="p-3 font-medium">Frozen Source Text (Mill)</th>
              <th className="p-3 font-medium">Normalized Runtime Value</th>
              <th className="p-3 font-medium">Ledger Audit State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F23] font-sans text-xs">
            {qualities.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-[#161619]/30">
                <td className="p-3 font-mono font-medium text-[#F5F5F7]">{row.articleCode}</td>
                <td className="p-3 font-mono text-[11px] text-[#6E7E91]">{row.coordinates}</td>
                <td className="p-3">
                  <span className="rounded-xs border border-[#1F1F23] bg-[#161619] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#6E7E91]">
                    {row.fieldName}
                  </span>
                </td>
                <td className="max-w-xs truncate p-3 pr-4 italic text-[#6E7E91]">
                  &quot;{row.sourceValue}&quot;
                </td>
                <td className="p-3 font-mono font-medium">
                  {row.standardValue ? (
                    <span className="text-emerald-400">{row.standardValue}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] italic text-amber-500/80">
                      <HelpCircle className="h-3 w-3" /> unmapped_field
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {row.isConfirmed ? (
                    <span className="inline-flex select-none items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-2 py-0.5 font-mono text-[10px] uppercase text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Confirmed
                    </span>
                  ) : (
                    <span className="inline-flex select-none items-center gap-1 rounded-sm border border-[#1F1F23] bg-[#161619] px-2 py-0.5 font-mono text-[10px] uppercase text-[#6E7E91]">
                      <History className="h-3 w-3" /> Historical
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
