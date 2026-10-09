import { cookies } from "next/headers";
import { FactoryIngestWorkbench } from "@/components/fruma/FactoryIngestWorkbench";
import { ANOMALY_PROPOSAL, SupplierExceptionGrid } from "@/components/fruma/SupplierExceptionGrid";
import { WorkspaceShell } from "@/components/fruma/WorkspaceShell";
import type { SupplierParsingAnomaly } from "@/lib/fruma/ingest/supplier-anomalies";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import { tenantNamespaceFromSessionCookies } from "@/lib/fruma/persist/tenant-session";

function versionFromNamespace(namespace: LedgerSchemaName | null): "demo" | "test" | "production" {
  if (namespace === LEDGER_SCHEMAS.test) return "test";
  if (namespace === LEDGER_SCHEMAS.production) return "production";
  return "demo";
}

export default async function DepositsWorkspacePage() {
  const namespace = await tenantNamespaceFromSessionCookies(await cookies());
  const activeSchema = versionFromNamespace(namespace);
  const anomalies: SupplierParsingAnomaly[] = [];

  return (
    <WorkspaceShell activeVersion={activeSchema} activeOntology="Retail/Apparel">
      <div className="min-h-full bg-[#0B0C0E] text-zinc-100">
        <div className="space-y-6">
          <FactoryIngestWorkbench activeSchema={activeSchema} />
          <SupplierExceptionGrid anomalies={anomalies} className={ANOMALY_PROPOSAL} />
        </div>
      </div>
    </WorkspaceShell>
  );
}
