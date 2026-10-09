"use client";

import type { UniformMaterialCard } from "@/lib/fruma/design/catalog-card";
import { MaterialCatalogGrid } from "./MaterialCatalogGrid";

type SchemaName = "demo" | "test" | "production";

/**
 * Renders the server-loaded catalog.
 * The empty specification state appears only when the HNSW scan returned zero neighbors.
 */
export function StudioCarousel({
  activeSchema,
  materials,
  hnswMatchCount,
  onInspectMaterial,
}: {
  activeSchema: SchemaName;
  materials: UniformMaterialCard[];
  hnswMatchCount: number | null;
  onInspectMaterial: (id: string) => void;
}) {
  if (hnswMatchCount === null) return null;
  if (hnswMatchCount === 0) {
    return <MaterialCatalogGrid materials={[]} onInspectMaterial={onInspectMaterial} />;
  }
  if (materials.length === 0) return null;
  return (
    <div data-schema={activeSchema}>
      <MaterialCatalogGrid materials={materials} onInspectMaterial={onInspectMaterial} />
    </div>
  );
}
