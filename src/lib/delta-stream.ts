import type { LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import {
  tenantNamespaceFromSessionCookies,
  type SessionCookieStore,
} from "@/lib/fruma/persist/tenant-session";
import { executeTenantQuery, ledgerSql } from "@/src/lib/db";

/** Operator request for one brand's compliance delta feed. */
export type BrandDeltaPayload = {
  brand_org_id: string;
};

export type BrandDeltaAlert = {
  alert_kind: "confirm" | "certificate_expiry";
  article_id: string;
  article_code: string;
  supplier_org_id: string;
  mill_org_id: string | null;
  occurred_at: string;
  event_id: string | null;
  action_type: string | null;
  certificate_expiry_date: string | null;
  last_ordered_at: string;
};

type DeltaRow = {
  alert_kind: string;
  article_id: string;
  article_code: string;
  supplier_org_id: string;
  mill_org_id: string | null;
  occurred_at: Date | string;
  event_id: string | null;
  action_type: string | null;
  certificate_expiry_date: Date | string | null;
  last_ordered_at: Date | string;
};

function brandOrgIdFromPayload(payload: BrandDeltaPayload): string {
  const brandOrgId = payload.brand_org_id.trim();
  if (!brandOrgId || brandOrgId.length > 512) {
    throw new Error("brand_org_id is required.");
  }
  return brandOrgId;
}

async function activeNamespace(session?: SessionCookieStore): Promise<LedgerSchemaName> {
  const store = session ?? (await loadRequestCookies());
  const namespace = await tenantNamespaceFromSessionCookies(store);
  if (!namespace) {
    throw new Error("A tenant session is required to read the brand delta feed.");
  }
  return namespace;
}

async function loadRequestCookies(): Promise<SessionCookieStore> {
  const { cookies } = await import("next/headers");
  return cookies();
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function asIsoOrNull(value: Date | string | null): string | null {
  if (value == null) return null;
  return asIso(value);
}

function alertFromRow(row: DeltaRow): BrandDeltaAlert {
  const alertKind = row.alert_kind === "certificate_expiry" ? "certificate_expiry" : "confirm";
  return {
    alert_kind: alertKind,
    article_id: String(row.article_id),
    article_code: String(row.article_code),
    supplier_org_id: String(row.supplier_org_id),
    mill_org_id: row.mill_org_id == null ? null : String(row.mill_org_id),
    occurred_at: asIso(row.occurred_at),
    event_id: row.event_id == null ? null : String(row.event_id),
    action_type: row.action_type == null ? null : String(row.action_type),
    certificate_expiry_date: asIsoOrNull(row.certificate_expiry_date),
    last_ordered_at: asIso(row.last_ordered_at),
  };
}

/**
 * Read compliance deltas for one brand inside the active tenant schema.
 * `executeTenantQuery` opens a READ ONLY transaction and runs
 * `SET LOCAL search_path` to `fruma_demo`, `fruma_test`, or `fruma_production`.
 * A confirm event, or the latest factory `certificate_expiry_date`, qualifies
 * only when its timestamp is after that article's `last_ordered_at`.
 */
export async function getBrandDeltaFeed(
  payload: BrandDeltaPayload,
  session?: SessionCookieStore,
): Promise<BrandDeltaAlert[]> {
  const brandOrgId = brandOrgIdFromPayload(payload);
  const namespace = await activeNamespace(session);
  const rows = await executeTenantQuery<DeltaRow>(
    namespace,
    ledgerSql<DeltaRow>`
      WITH brand_articles AS (
        SELECT
          a.article_id,
          a.article_code,
          a.supplier_org_id,
          a.material_hash,
          a.last_ordered_at
        FROM fruma_brand_historical_articles a
        WHERE EXISTS (
          SELECT 1
          FROM fruma_named_grants g
          WHERE g.mill_org_id = a.supplier_org_id
            AND g.brand_org_id = ${brandOrgId}
        )
      )
      SELECT
        alerts.alert_kind,
        alerts.article_id,
        alerts.article_code,
        alerts.supplier_org_id,
        alerts.mill_org_id,
        alerts.occurred_at,
        alerts.event_id,
        alerts.action_type,
        alerts.certificate_expiry_date,
        alerts.last_ordered_at
      FROM (
        SELECT
          'confirm' AS alert_kind,
          a.article_id::text AS article_id,
          a.article_code,
          a.supplier_org_id,
          p.mill_org_id,
          e.occurred_at,
          e.event_id,
          e.action_type,
          p.certificate_expiry_date,
          a.last_ordered_at
        FROM brand_articles a
        INNER JOIN fruma_deposits d
          ON d.supplier_org_id = a.supplier_org_id
        INNER JOIN fruma_source_cells c
          ON c.deposit_id = d.id
         AND c.normalized_value = a.material_hash
        INNER JOIN fruma_cell_mutation_events e
          ON e.source_cell_id = c.id
         AND e.action_type = 'confirm'
         AND e.occurred_at > a.last_ordered_at
        LEFT JOIN LATERAL (
          SELECT mill_org_id, certificate_expiry_date
          FROM fruma_factory_profiles
          WHERE mill_org_id = a.supplier_org_id
          ORDER BY version DESC
          LIMIT 1
        ) p ON TRUE
        UNION ALL
        SELECT
          'certificate_expiry' AS alert_kind,
          a.article_id::text AS article_id,
          a.article_code,
          a.supplier_org_id,
          p.mill_org_id,
          p.certificate_expiry_date AS occurred_at,
          NULL::text AS event_id,
          NULL::text AS action_type,
          p.certificate_expiry_date,
          a.last_ordered_at
        FROM brand_articles a
        INNER JOIN LATERAL (
          SELECT mill_org_id, certificate_expiry_date
          FROM fruma_factory_profiles
          WHERE mill_org_id = a.supplier_org_id
          ORDER BY version DESC
          LIMIT 1
        ) p ON p.certificate_expiry_date > a.last_ordered_at
      ) alerts
      ORDER BY alerts.occurred_at DESC
    `,
    { readOnly: true },
  );
  return rows.map(alertFromRow);
}
