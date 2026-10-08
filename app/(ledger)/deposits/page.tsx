import { cookies } from "next/headers";
import { DepositsIngestConsole } from "@/components/fruma/DepositsIngestConsole";
import { SupplierExceptionGrid } from "@/components/fruma/SupplierExceptionGrid";
import { WorkspaceShell } from "@/components/fruma/WorkspaceShell";
import {
  joinedCellsFromLedgerRows,
  overlaysFromLedger,
  tenantNamespaceFromSessionCookies,
  versionFromNamespace,
  type DepositCellLedgerRow,
} from "@/lib/fruma/ingest/deposit-anomaly-loader";
import {
  supplierParsingAnomalies,
  type SupplierParsingAnomaly,
} from "@/lib/fruma/ingest/supplier-anomalies";
import type { LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import { executeTenantQuery, ledgerSql } from "@/src/lib/db";

/** Editable dashed amber proposal blocks for parsing anomalies. */
const ANOMALY_PROPOSAL = "border-dashed border-amber-500/80 bg-amber-500/5";

type DepositIdRow = { id: string };
type HeaderMapRow = { overlays: unknown };

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Read-only cell state for one deposit.
 * Source rows, a chronological mutation join, then in-memory replay.
 */
export async function loadLiveDepositAnomalies(
  namespace: LedgerSchemaName,
  depositId: string | undefined,
): Promise<{ depositId: string | null; anomalies: SupplierParsingAnomaly[] }> {
  const requested = depositId?.trim();
  const depositRows = requested
    ? [{ id: requested }]
    : await executeTenantQuery<DepositIdRow>(
        namespace,
        ledgerSql<DepositIdRow>`
          SELECT id
          FROM fruma_deposits
          ORDER BY received_at DESC
          LIMIT 1
        `,
      );
  const activeDepositId = depositRows[0]?.id?.trim() || null;
  if (!activeDepositId) return { depositId: null, anomalies: [] };

  const [cellRows, mapRows] = await Promise.all([
    executeTenantQuery<DepositCellLedgerRow>(
      namespace,
      ledgerSql<DepositCellLedgerRow>`
        SELECT
          c.id,
          c.deposit_id,
          c.sheet_name,
          c.row_index,
          c.col_index,
          c.raw_header,
          c.source_value,
          c.normalized_value,
          e.event_id,
          e.action_type,
          e.old_standard_value,
          e.new_standard_value,
          e.standard_field,
          e.occurred_at
        FROM fruma_source_cells c
        LEFT JOIN fruma_cell_mutation_events e ON e.source_cell_id = c.id
        WHERE c.deposit_id = ${activeDepositId}
        ORDER BY e.occurred_at ASC
      `,
    ),
    executeTenantQuery<HeaderMapRow>(
      namespace,
      ledgerSql<HeaderMapRow>`
        SELECT overlays
        FROM fruma_header_maps
        WHERE is_active = TRUE
        ORDER BY version DESC
        LIMIT 1
      `,
    ),
  ]);

  return {
    depositId: activeDepositId,
    anomalies: supplierParsingAnomalies(
      joinedCellsFromLedgerRows(cellRows),
      overlaysFromLedger(mapRows[0]?.overlays),
    ),
  };
}

export default async function DepositsWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ depositId?: string | string[] }>;
}) {
  const cookieStore = await cookies();
  const namespace = await tenantNamespaceFromSessionCookies(cookieStore);
  const requestedDepositId = firstParam((await searchParams).depositId);

  let anomalies: SupplierParsingAnomaly[] = [];
  let notice: string | null = null;
  let activeSchema: "demo" | "test" | "production" = "demo";

  if (!namespace) {
    notice = "Sign in to read mill cells.";
  } else {
    activeSchema = versionFromNamespace(namespace);
    try {
      const loaded = await loadLiveDepositAnomalies(namespace, requestedDepositId);
      anomalies = loaded.anomalies;
    } catch (error) {
      console.error("[LEDGER READ FAILURE] Deposits page:", error);
      notice = error instanceof Error ? error.message : "The ledger read did not complete.";
    }
  }

  return (
    <WorkspaceShell activeVersion={activeSchema} activeOntology="Retail/Apparel">
      <div className="space-y-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#6E7E91]">
          Session schema{" "}
          <span className="text-[#3B82F6]">{namespace ?? "unsigned"}</span>
        </p>
        <DepositsIngestConsole activeSchema={activeSchema} />
        {notice ? <p className="font-mono text-[11px] text-amber-400">{notice}</p> : null}
        <SupplierExceptionGrid anomalies={anomalies} className={ANOMALY_PROPOSAL} />
      </div>
    </WorkspaceShell>
  );
}
