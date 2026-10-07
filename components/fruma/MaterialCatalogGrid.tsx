"use client";

import { Eye, HelpCircle, Scale } from "lucide-react";
import type { UniformMaterialCard } from "@/lib/fruma/design/catalog-card";

export type { UniformMaterialCard } from "@/lib/fruma/design/catalog-card";

export function MaterialCatalogGrid({
  materials,
  onInspectMaterial,
}: {
  materials: UniformMaterialCard[];
  onInspectMaterial: (id: string) => void;
}) {
  if (materials.length === 0) {
    return (
      <div className="w-full select-none rounded-sm border border-[#1F1F23] bg-[#121214] p-12 text-center font-mono text-xs text-[#6E7E91]">
        <HelpCircle className="mx-auto mb-2 h-5 w-5 text-[#6E7E91]" />
        <span>No materials found in this workspace surface connection path.</span>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {materials.map((item) => (
        <div
          key={item.id}
          className="flex flex-col justify-between overflow-hidden rounded-sm border border-[#1F1F23] bg-[#121214] transition-colors hover:border-[#3B82F6]/30"
        >
          <div className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <span className="block font-mono text-[10px] uppercase tracking-widest text-[#6E7E91]">
                  Uniform Material
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

            <div className="grid grid-cols-2 gap-2 border-y border-[#1F1F23] py-2.5 font-mono text-[11px]">
              <div>
                <span className="block text-[10px] uppercase text-[#6E7E91]">Weight Matrix</span>
                <span className="font-medium text-emerald-400">{item.normalizedGsm} GSM</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-[#6E7E91]">Usable Width</span>
                <span className="font-medium text-emerald-400">{item.normalizedWidth} CM</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-[#6E7E91]">Composition</span>
              <p className="truncate font-sans text-xs text-[#F5F5F7]">{item.composition}</p>
            </div>

            {item.colorways.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-[#6E7E91]">
                  Active Swatches ({item.colorways.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.colorways.map((color) => (
                    <div
                      key={color.dyeLot}
                      title={`Color: ${color.name} | Dye Lot: ${color.dyeLot}`}
                      className="h-3.5 w-3.5 shrink-0 cursor-help rounded-full border border-[#1F1F23]"
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#1F1F23] bg-[#161619]/40 p-3">
            <button
              type="button"
              onClick={() => onInspectMaterial(item.id)}
              className="flex w-full cursor-pointer select-none items-center justify-center gap-1.5 rounded-sm border border-[#1F1F23] bg-[#161619] px-3 py-1.5 font-mono text-xs tracking-wide text-[#F5F5F7] transition-colors hover:border-[#F5F5F7]"
            >
              <Eye className="h-3.5 w-3.5 text-[#6E7E91]" />
              <span>Load Design Prototyping Twin</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
