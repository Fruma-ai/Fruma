"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UniformMaterialCard } from "@/lib/fruma/design/catalog-card";
import { PriorDevelopmentBadge } from "@/components/fruma/PriorDevelopmentBadge";
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
        <div className="space-y-4 rounded-sm border border-zinc-800/60 bg-zinc-900/40 p-4">
          <h3 className="border-b border-zinc-800/60 pb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
            Audited Catalog Output
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Article", "Weight", "Width", "Composition", "Prior Development"].map((label) => (
                  <th
                    key={label}
                    className="p-0 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((item) => (
                <tr key={item.id} className="border-t border-zinc-800/60 text-xs text-zinc-100">
                  <td className="p-0 pt-2">{item.articleCode}</td>
                  <td className="p-0 pt-2">{item.normalizedGsm}</td>
                  <td className="p-0 pt-2">{item.normalizedWidth}</td>
                  <td className="max-w-0 truncate p-0 pt-2">{item.composition}</td>
                  <td className="p-0 pt-2">
                    <div className="grid justify-items-start gap-1">
                      {(item.priorDevelopments ?? []).map((recall) => (
                        <PriorDevelopmentBadge
                          key={`${item.id}:${recall.article_code}:${recall.last_ordered_at}`}
                          article_code={recall.article_code}
                          last_ordered_at={recall.last_ordered_at}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
