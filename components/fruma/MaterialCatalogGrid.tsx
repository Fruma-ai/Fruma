"use client";

import { HelpCircle } from "lucide-react";
import type { UniformMaterialCard } from "@/lib/fruma/design/catalog-card";
import { TactileCompass } from "./TactileCompass";

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
        <span>No matching material specifications provisioned in this connection path.</span>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {materials.map((item) => (
        <TactileCompass key={item.id} item={item} onInspectMaterial={onInspectMaterial} />
      ))}
    </div>
  );
}
