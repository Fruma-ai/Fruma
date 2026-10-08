import { cookies } from "next/headers";
import { AlertTriangle } from "lucide-react";
import { StudioDiscovery } from "@/components/fruma/StudioDiscovery";
import { WorkspaceShell } from "@/components/fruma/WorkspaceShell";
import { sessionFounder } from "@/lib/gate";
import {
  complianceFromQuery,
  loadStudioVectorSearch,
  readFounderTenant,
  versionFromNamespace,
  type StudioSearchLoad,
} from "@/lib/fruma/design/studio-search";
import { priorDevelopmentsFor, type UniformMaterialCard } from "@/lib/fruma/design/catalog-card";
import { getSpineStore } from "@/lib/fruma/persist";

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function MaterialDiscoveryStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string | string[]; compliance?: string | string[] }>;
}) {
  const cookieStore = await cookies();
  const gate = await readFounderTenant(cookieStore, sessionFounder);
  const params = await searchParams;
  const prompt = firstParam(params.prompt) ?? "";
  const complianceTarget = complianceFromQuery(firstParam(params.compliance));

  let notice: string | null = null;
  let hnswMatchCount: number | null = null;
  let materials: UniformMaterialCard[] = [];
  const activeSchema = gate ? versionFromNamespace(gate.namespace) : "demo";

  if (!gate) {
    notice = "Sign in to search materials.";
  } else if (prompt) {
    try {
      const store = getSpineStore(activeSchema);
      const loaded: StudioSearchLoad = await loadStudioVectorSearch(
        { prompt, complianceTarget },
        {
          searchMaterialEmbeddings: (embedding) => store.searchMaterialEmbeddings(embedding),
          listActiveProductTruthEvidence: () => store.listActiveProductTruthEvidence(),
        },
      );
      hnswMatchCount = loaded.hnswMatchCount;
      const historyById = new Map(loaded.hits.map((hit) => [hit.id, hit.historicalArticles]));
      materials = loaded.materials.map((card) => ({
        ...card,
        priorDevelopments: priorDevelopmentsFor(historyById.get(card.id)),
      }));
      if (hnswMatchCount === 0) notice = "No materials matched that search.";
    } catch (error) {
      console.error("[LEDGER READ FAILURE] Qualities page:", error);
      notice = error instanceof Error ? error.message : "Search failed.";
    }
  }

  return (
    <WorkspaceShell activeVersion={activeSchema} activeOntology="Retail/Apparel">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-[#F5F5F7]">
              Material Discovery Studio
            </h2>
            <p className="mt-0.5 text-xs text-[#6E7E91]">
              Query the active schema and align raw mill text to the uniform Fruma standard.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#6E7E91]">
            Session schema <span className="text-[#3B82F6]">{gate?.namespace ?? "unsigned"}</span>
          </p>
        </div>

        {notice && hnswMatchCount !== 0 ? (
          <div className="flex w-full items-center gap-2 rounded-sm border border-amber-500/20 bg-amber-500/5 p-3 font-mono text-xs text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        ) : null}

        <StudioDiscovery
          activeSchema={activeSchema}
          initialPrompt={prompt}
          initialCompliance={complianceTarget}
          materials={materials}
          hnswMatchCount={hnswMatchCount}
          notice={hnswMatchCount === 0 ? notice : null}
        />
      </div>
    </WorkspaceShell>
  );
}
