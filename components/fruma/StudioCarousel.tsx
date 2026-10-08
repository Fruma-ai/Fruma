"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { uniformMaterialFromHit, type CatalogSearchHit, type UniformMaterialCard } from "@/lib/fruma/design/catalog-card";
import { briefEmbedding } from "@/lib/fruma/persist/embeddings";
import type { DiscoverySearchHit, DiscoverySearchPayload } from "./DiscoveryCanvas";
import { MaterialCatalogGrid } from "./MaterialCatalogGrid";

type SchemaName = "demo" | "test" | "production";

export type StudioSearchRequest = DiscoverySearchPayload & { submittedAt: number };

function isSearchHit(value: unknown): value is DiscoverySearchHit & CatalogSearchHit {
  if (!value || typeof value !== "object") return false;
  const row = value as DiscoverySearchHit;
  return (
    typeof row.id === "string" &&
    typeof row.depositId === "string" &&
    typeof row.millArticleCode === "string" &&
    typeof row.rank === "number" &&
    typeof row.cosineDistance === "number"
  );
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    /* The status line is enough when the body is not JSON. */
  }
  return response.status === 401 ? "Sign in to search materials." : "Search failed.";
}

/**
 * Loads Tactile Compass cards from the multi-modal vector search.
 * The request includes the founder session cookie. A 401 does not become catalog rows.
 */
export function StudioCarousel({
  activeSchema,
  searchRequest,
  onInspectMaterial,
  onResolved,
}: {
  activeSchema: SchemaName;
  searchRequest: StudioSearchRequest | null;
  onInspectMaterial: (id: string) => void;
  onResolved: (hits: DiscoverySearchHit[], error: string | null) => void;
}) {
  const [materials, setMaterials] = useState<UniformMaterialCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  useEffect(() => {
    if (!searchRequest) {
      setMaterials([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    void (async () => {
      try {
        const embedding = await briefEmbedding(searchRequest.prompt);
        const response = await fetch("/api/design/search", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "x-fruma-version": activeSchema,
          },
          body: JSON.stringify({
            embedding,
            complianceTarget: searchRequest.complianceTarget,
          }),
        });
        if (cancelled) return;
        if (!response.ok) {
          setMaterials([]);
          onResolvedRef.current([], await errorMessage(response));
          return;
        }
        const data: unknown = await response.json();
        const hits = Array.isArray(data) ? data.filter(isSearchHit) : [];
        setMaterials(hits.map((hit) => uniformMaterialFromHit(hit)));
        onResolvedRef.current(hits, null);
      } catch {
        if (cancelled) return;
        setMaterials([]);
        onResolvedRef.current([], "Search failed.");
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSchema, searchRequest]);

  if (isSearching) {
    return (
      <div className="space-y-3 py-20 text-center font-mono text-xs text-[#6E7E91]">
        <RefreshCw className="mx-auto h-5 w-5 animate-spin text-[#3B82F6]" />
        <p>Searching fruma_{activeSchema}…</p>
      </div>
    );
  }

  return <MaterialCatalogGrid materials={materials} onInspectMaterial={onInspectMaterial} />;
}
