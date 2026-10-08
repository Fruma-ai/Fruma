import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Wordmark } from "@/components/fruma/Wordmark";
import {
  regulatoryHealthScore,
  type RegulatoryHealthCounts,
  type RegulatoryHealthScore,
} from "@/lib/fruma/persist/regulatory-health";
import type { LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import { tenantNamespaceFromSessionCookies } from "@/lib/fruma/persist/tenant-session";
import { executeTenantQuery, ledgerSql } from "@/src/lib/db";

export const metadata: Metadata = {
  title: "Regulatory health score",
  description: "Live compliance ratio for one mill, read from the ledger.",
};

type HealthRow = {
  total_cells: number | string;
  confirm_events: number | string;
  certified_rows: number | string;
};

type ProfileView =
  | { kind: "invalid" }
  | { kind: "unsigned"; supplierOrgId: string }
  | { kind: "error"; supplierOrgId: string; namespace: LedgerSchemaName }
  | {
      kind: "score";
      supplierOrgId: string;
      namespace: LedgerSchemaName;
      health: RegulatoryHealthScore;
    };

function supplierOrgIdFromRoute(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed || trimmed.length > 512) return null;
  return trimmed;
}

function countsFromRow(row: HealthRow | undefined): RegulatoryHealthCounts {
  return {
    totalCells: Number(row?.total_cells ?? 0),
    confirmEvents: Number(row?.confirm_events ?? 0),
    certifiedRows: Number(row?.certified_rows ?? 0),
  };
}

/**
 * One read of source cells, confirm events, and cells whose latest event
 * is a non-blank cert confirm. Fibre text is not a certificate.
 */
async function loadRegulatoryHealth(id: string): Promise<ProfileView> {
  const supplierOrgId = supplierOrgIdFromRoute(id);
  if (!supplierOrgId) return { kind: "invalid" };

  const namespace = await tenantNamespaceFromSessionCookies(await cookies());
  if (!namespace) return { kind: "unsigned", supplierOrgId };

  try {
    const rows = await executeTenantQuery<HealthRow>(
      namespace,
      ledgerSql<HealthRow>`
        WITH mill_cells AS (
          SELECT c.id
          FROM fruma_source_cells c
          INNER JOIN fruma_deposits d ON d.id = c.deposit_id
          WHERE d.supplier_org_id = ${supplierOrgId}
        ),
        latest AS (
          SELECT DISTINCT ON (e.source_cell_id)
            e.source_cell_id,
            e.action_type,
            e.standard_field,
            e.new_standard_value
          FROM fruma_cell_mutation_events e
          INNER JOIN mill_cells c ON c.id = e.source_cell_id
          ORDER BY e.source_cell_id, e.occurred_at DESC
        )
        SELECT
          (SELECT COUNT(*)::int FROM mill_cells) AS total_cells,
          (
            SELECT COUNT(*)::int
            FROM fruma_cell_mutation_events e
            INNER JOIN mill_cells c ON c.id = e.source_cell_id
            WHERE e.action_type = 'confirm'
          ) AS confirm_events,
          (
            SELECT COUNT(*)::int
            FROM latest
            WHERE latest.action_type = 'confirm'
              AND latest.standard_field = 'cert'
              AND btrim(COALESCE(latest.new_standard_value, '')) <> ''
          ) AS certified_rows
      `,
      { readOnly: true },
    );
    return {
      kind: "score",
      supplierOrgId,
      namespace,
      health: regulatoryHealthScore(countsFromRow(rows[0])),
    };
  } catch (error) {
    console.error("[LEDGER READ FAILURE] Regulatory health score:", error);
    return { kind: "error", supplierOrgId, namespace };
  }
}

function ScorePanel({ health }: { health: RegulatoryHealthScore }) {
  const badge = health.greenlit ? "Greenlit" : "Review";
  return (
    <section className="mt-10 border border-[var(--line)] bg-[var(--canvas)] p-8 md:p-10">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="ui-label">Raw score</p>
          <p
            id="regulatory-health-score"
            className="spec mt-3 text-6xl leading-none text-[var(--ink)] md:text-7xl"
          >
            {`${health.score}%`}
          </p>
          <p className="page-lede mt-4">
            Human-confirmed rows with an active evidence certificate, divided by source cells for this mill.
          </p>
        </div>
        <div
          id="regulatory-health-badge"
          data-status={health.greenlit ? "greenlit" : "review"}
          className={
            health.greenlit
              ? "flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-[var(--ok)] text-white"
              : "flex h-36 w-36 shrink-0 items-center justify-center rounded-full border border-[var(--line2)] bg-[var(--panel2)] text-[var(--ink)]"
          }
        >
          <span className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-inherit">
            {badge}
          </span>
        </div>
      </div>
      <dl className="mt-10 grid gap-6 border-t border-[var(--line)] pt-6 sm:grid-cols-3">
        <div>
          <dt className="ui-label">Source cells</dt>
          <dd className="spec mt-2 text-2xl">{health.totalCells}</dd>
        </div>
        <div>
          <dt className="ui-label">Confirm events</dt>
          <dd className="spec mt-2 text-2xl">{health.confirmEvents}</dd>
        </div>
        <div>
          <dt className="ui-label">Certified rows</dt>
          <dd className="spec mt-2 text-2xl">{health.certifiedRows}</dd>
        </div>
      </dl>
    </section>
  );
}

export default async function RegulatoryFactoryProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const view = await loadRegulatoryHealth(id);

  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <header className="app-chrome">
        <div className="app-chrome-inner">
          <Wordmark />
          <span className="ui-label">Factory profile</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        <p className="ui-label">Regulatory health score</p>
        <h1 className="page-title mt-3">
          {view.kind === "invalid" ? "Factory profile" : view.supplierOrgId}
        </h1>
        {view.kind === "score" || view.kind === "error" ? (
          <p className="ui-label mt-4">Session schema {view.namespace}</p>
        ) : null}

        {view.kind === "invalid" ? (
          <p className="page-lede mt-8">This profile route has no supplier organisation id.</p>
        ) : null}
        {view.kind === "unsigned" ? (
          <p className="page-lede mt-8">Sign in to read this mill&apos;s regulatory health score.</p>
        ) : null}
        {view.kind === "error" ? (
          <p className="page-lede mt-8">The regulatory health score could not be read.</p>
        ) : null}
        {view.kind === "score" ? <ScorePanel health={view.health} /> : null}
      </main>
    </div>
  );
}
