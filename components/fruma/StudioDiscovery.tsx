"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import type { UniformMaterialCard } from "@/lib/fruma/design/catalog-card";
import {
  DiscoveryCanvas,
  type DiscoverySearchPayload,
} from "@/components/fruma/DiscoveryCanvas";
import { StudioCarousel } from "@/components/fruma/StudioCarousel";

type SchemaName = "demo" | "test" | "production";

/** Search form and carousel. The brief is sent as a navigation, not a database write. */
export function StudioDiscovery({
  activeSchema,
  initialPrompt,
  initialCompliance,
  materials,
  hnswMatchCount,
  notice,
}: {
  activeSchema: SchemaName;
  initialPrompt: string;
  initialCompliance: DiscoverySearchPayload["complianceTarget"];
  materials: UniformMaterialCard[];
  hnswMatchCount: number | null;
  notice: string | null;
}) {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<string | null>(notice);

  useEffect(() => {
    setIsSearching(false);
    setStatus(notice);
  }, [notice, initialPrompt, initialCompliance, hnswMatchCount]);

  function handleSearchExecute(payload: DiscoverySearchPayload) {
    const params = new URLSearchParams();
    params.set("prompt", payload.prompt);
    if (payload.complianceTarget) params.set("compliance", payload.complianceTarget);
    setIsSearching(true);
    router.replace(`/qualities?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <DiscoveryCanvas
          onSearchExecute={handleSearchExecute}
          suggestions={[]}
          onAcceptSuggestions={() => {}}
          isSearching={isSearching}
          isAccepting={false}
          status={status}
          initialPrompt={initialPrompt}
          initialCompliance={initialCompliance}
          showSuggestions={false}
        />
      </div>

      <div className="xl:col-span-7">
        <div className="space-y-4 rounded-sm border border-[#1F1F23] bg-[#121214] p-4">
          <div className="flex items-center gap-2 border-b border-[#1F1F23] pb-3">
            <Layers className="h-4 w-4 text-[#3B82F6]" />
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F5F5F7]">
              Audited Catalog Output
            </h3>
          </div>
          <StudioCarousel
            activeSchema={activeSchema}
            materials={materials}
            hnswMatchCount={hnswMatchCount}
            onInspectMaterial={(id) => {
              const card = materials.find((item) => item.id === id);
              setStatus(card ? `Selected ${card.articleCode}.` : null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
