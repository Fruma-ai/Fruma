"use client";

import { Box, Compass, Eye, Scale } from "lucide-react";
import type { UniformMaterialCard } from "@/lib/fruma/design/catalog-card";

/** One audited quality from the vector search, including any in-house swatch match. */
export function TactileCompass({
  item,
  onInspectMaterial,
}: {
  item: UniformMaterialCard;
  onInspectMaterial: (id: string) => void;
}) {
  const match = item.historicalProductMatch;
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-sm border border-[#1F1F23] bg-[#121214] transition-colors hover:border-[#3B82F6]/30">
      <div className="space-y-3.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <span className="block font-mono text-[9px] uppercase tracking-widest text-[#6E7E91]">
              Audited Quality Match
            </span>
            <h4 className="truncate font-mono text-xs font-semibold text-[#F5F5F7]">{item.articleCode}</h4>
          </div>

          {item.hasDppProof ? (
            <span className="inline-flex shrink-0 select-none items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-2 py-0.5 font-mono text-[9px] uppercase text-emerald-400">
              <Scale className="h-2.5 w-2.5" /> EU_DPP Pass
            </span>
          ) : (
            <span className="inline-flex shrink-0 select-none items-center gap-1 rounded-full border border-[#1F1F23] bg-[#161619] px-2 py-0.5 font-mono text-[9px] uppercase text-[#6E7E91]">
              No Intercept
            </span>
          )}
        </div>
        {item.complianceWarning ? (
          <p className="font-mono text-[10px] text-amber-400">{item.complianceWarning}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-y border-[#1F1F23] py-2 font-mono text-[11px]">
          <div>
            <span className="block text-[9px] uppercase text-[#6E7E91]">Weight Matrix</span>
            <span className="font-medium text-emerald-400">{item.normalizedGsm} GSM</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-[#6E7E91]">Usable Width</span>
            <span className="font-medium text-emerald-400">{item.normalizedWidth} CM</span>
          </div>
        </div>

        <div className="space-y-0.5 font-mono text-[11px]">
          <span className="block text-[9px] uppercase tracking-wider text-[#6E7E91]">Composition</span>
          <p className="truncate text-[#F5F5F7]">{item.composition}</p>
        </div>

        {item.colorways.length > 0 ? (
          <div className="space-y-1.5 pt-0.5">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-[#6E7E91]">
              Mill Colorways ({item.colorways.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {item.colorways.map((color) => (
                <div
                  key={`${color.dyeLot}-${color.name}`}
                  title={`Colorway: ${color.name} | Lot: ${color.dyeLot}`}
                  className="h-3 w-3 shrink-0 cursor-help rounded-full border border-[#1F1F23]"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {match ? (
          <div className="space-y-1.5 rounded-sm border border-blue-500/20 bg-blue-500/[0.02] p-2.5 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
              <Compass className="h-3.5 w-3.5" />
              <span>Tactile Compass</span>
            </div>
            <p className="font-sans text-[10px] leading-relaxed text-[#6E7E91]">
              This fabric matches the core weave profile of your historical product:{" "}
              <span className="font-mono text-[#F5F5F7]">
                {match.productName} ({match.seasonCode})
              </span>
              .
            </p>
            <div className="flex w-fit items-center gap-1 rounded-sm border border-emerald-500/10 bg-emerald-500/5 px-1.5 py-0.5 text-[10px] text-emerald-400">
              <Box className="h-3 w-3" /> Archive Location: {match.warehouseLocation}
            </div>
          </div>
        ) : (
          <div className="select-none rounded-sm border border-[#1F1F23] bg-[#0B0B0C]/40 p-2 text-center font-mono text-[9px] uppercase tracking-wide text-[#6E7E91]">
            No In-House Tactical Swatch Detected
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#1F1F23] bg-[#161619]/40 p-3">
        <button
          type="button"
          onClick={() => onInspectMaterial(item.id)}
          className="flex w-full cursor-pointer select-none items-center justify-center gap-1.5 rounded-sm border border-[#1F1F23] bg-[#161619] px-3 py-1.5 font-mono text-xs tracking-wide text-[#F5F5F7] transition-colors hover:border-[#F5F5F7]"
        >
          <Eye className="h-3.5 w-3.5 text-[#6E7E91]" />
          <span>Load Prototyping Twin</span>
        </button>
      </div>
    </div>
  );
}
