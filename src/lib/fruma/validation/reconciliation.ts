import { executeTenantQuery, ledgerSql, type TenantNamespace } from "@/src/lib/db";

export type LedgerTrackingPayload = {
  deposit_id: string;
  /** Active tenant schema. The read transaction pins `search_path` to this name. */
  namespace: TenantNamespace;
};

export type ConsistentLedger = {
  isConsistent: true;
};

export type OrphanedMutationSequence = {
  isConsistent: false;
  error: "ORPHANED_MUTATION_SEQUENCE_DETECTED";
};

export type LedgerReconciliation = ConsistentLedger | OrphanedMutationSequence;

type ReconciliationRow = {
  confirm_count: number | string;
  suggestion_count: number | string;
  orphaned_confirms: number | string;
};

const ORPHANED: OrphanedMutationSequence = {
  isConsistent: false,
  error: "ORPHANED_MUTATION_SEQUENCE_DETECTED",
};

function count(value: number | string | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

/**
 * Compare confirm events for one deposit with the staged suggestion cells
 * already logged for that deposit. A confirm whose source cell has no
 * suggestion row is an orphan. The statement is a single read.
 */
export async function reconcileLedgerSequence(
  payload: LedgerTrackingPayload,
): Promise<LedgerReconciliation> {
  const depositId = payload.deposit_id.trim();
  if (!depositId) throw new Error("deposit_id is required");

  const rows = await executeTenantQuery<ReconciliationRow>(
    payload.namespace,
    ledgerSql<ReconciliationRow>`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM fruma_cell_mutation_events e
          INNER JOIN fruma_source_cells c ON c.id = e.source_cell_id
          WHERE c.deposit_id = ${depositId}
            AND e.action_type = 'confirm'
        ) AS confirm_count,
        (
          SELECT COUNT(*)::int
          FROM fruma_staged_suggestions s
          WHERE s.deposit_id = ${depositId}
        ) AS suggestion_count,
        (
          SELECT COUNT(*)::int
          FROM fruma_cell_mutation_events e
          INNER JOIN fruma_source_cells c ON c.id = e.source_cell_id
          WHERE c.deposit_id = ${depositId}
            AND e.action_type = 'confirm'
            AND NOT EXISTS (
              SELECT 1
              FROM fruma_staged_suggestions s
              WHERE s.deposit_id = c.deposit_id
                AND s.source_cell_id = e.source_cell_id
            )
        ) AS orphaned_confirms
    `,
    { readOnly: true },
  );

  const row = rows[0];
  if (count(row?.orphaned_confirms) > 0) return ORPHANED;
  return { isConsistent: true };
}
