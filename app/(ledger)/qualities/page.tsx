import { cookies } from "next/headers";
import { StudioDiscovery } from "@/components/fruma/StudioDiscovery";
import { WorkspaceShell } from "@/components/fruma/WorkspaceShell";
import type { UniformMaterialCard } from "@/lib/fruma/design/catalog-card";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import { tenantNamespaceFromSessionCookies } from "@/lib/fruma/persist/tenant-session";

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function versionFromNamespace(namespace: LedgerSchemaName | null): "demo" | "test" | "production" {
  if (namespace === LEDGER_SCHEMAS.test) return "test";
  if (namespace === LEDGER_SCHEMAS.production) return "production";
  return "demo";
}

function complianceFromQuery(value: string | undefined): "EU_DPP" | "UK_STANDARDS" | null {
  if (value === "EU_DPP" || value === "UK_STANDARDS") return value;
  return null;
}

export default async function MaterialDiscoveryStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string | string[]; compliance?: string | string[] }>;
}) {
  const cookieStore = await cookies();
  const namespace = await tenantNamespaceFromSessionCookies(cookieStore);
  const params = await searchParams;
  const prompt = firstParam(params.prompt) ?? "";
  const complianceTarget = complianceFromQuery(firstParam(params.compliance));
  const activeSchema = versionFromNamespace(namespace);
  const materials: UniformMaterialCard[] = [];
  const notice = namespace ? null : "Sign in to search materials.";

  return (
    <WorkspaceShell activeVersion={activeSchema} activeOntology="Retail/Apparel">
      <div className="min-h-full bg-[#0B0C0E] text-zinc-100">
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-800/60 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-100">
                Material Discovery Studio
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Query the active schema and align raw mill text to the uniform Fruma standard.
              </p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
              Session schema <span className="text-zinc-100">{namespace ?? "unsigned"}</span>
            </p>
          </div>

          {notice ? (
            <p className="font-mono text-xs text-zinc-400" role="status">
              {notice}
            </p>
          ) : null}

          <StudioDiscovery
            activeSchema={activeSchema}
            initialPrompt={prompt}
            initialCompliance={complianceTarget}
            materials={materials}
            hnswMatchCount={null}
            notice={null}
            scanEnabled={namespace !== null}
          />
        </div>
      </div>
    </WorkspaceShell>
  );
}
