import type { Founder } from "@/lib/gate";
import { uniformMaterialFromHit, type UniformMaterialCard } from "@/lib/fruma/design/catalog-card";
import { applyEuDppCompliance, certificatesForQuality, type ComplianceTarget } from "@/lib/fruma/design/compliance";
import { COMPLIANCE_READY_COEFFICIENT, rerankByComplianceReadiness } from "@/lib/fruma/design/rerank";
import { rankDesignSearchHits, type RankedMaterialQuality } from "@/lib/fruma/design/search-http";
import type { SessionCookieStore } from "@/lib/fruma/ingest/deposit-anomaly-loader";
import {
  isTenantNamespace,
  versionFromNamespace,
} from "@/lib/fruma/ingest/deposit-anomaly-loader";
import type { ActiveProductTruthEvidence, MaterialSearchHit } from "@/lib/fruma/persist";
import { assertEmbeddingVector, briefEmbedding, MATERIAL_EMBEDDING_DIMENSIONS } from "@/lib/fruma/persist/embeddings";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";

const TENANT_NAMESPACES = Object.values(LEDGER_SCHEMAS);

export type FounderTenant = {
  founder: Founder;
  namespace: LedgerSchemaName;
};

export type StudioVectorSearch = {
  searchMaterialEmbeddings: (embedding: readonly number[]) => Promise<MaterialSearchHit[]>;
  listActiveProductTruthEvidence?: () => Promise<ActiveProductTruthEvidence[]>;
};

export type StudioSearchLoad = {
  /** Rows returned by the materialized HNSW scan. Zero is a real empty match. */
  hnswMatchCount: number;
  materials: UniformMaterialCard[];
  hits: RankedMaterialQuality[];
};

/**
 * Founder session first, then the tenant schema.
 * A cookie value of `fruma_demo`, `fruma_test`, or `fruma_production` selects
 * that schema only after `sessionFounder` accepts a session cookie.
 */
export async function readFounderTenant(
  store: SessionCookieStore,
  validate: (cookie: string | undefined) => Promise<Founder | null>,
): Promise<FounderTenant | null> {
  let founder: Founder | null = null;
  let named: LedgerSchemaName | null = null;
  for (const name of TENANT_NAMESPACES) {
    const who = await validate(store.get(name)?.value);
    if (!who) continue;
    founder = who;
    named = name;
    break;
  }
  if (!founder) {
    for (const cookie of store.getAll()) {
      const who = await validate(cookie.value);
      if (!who) continue;
      founder = who;
      break;
    }
  }
  if (!founder) return null;
  for (const cookie of store.getAll()) {
    if (isTenantNamespace(cookie.value)) return { founder, namespace: cookie.value };
  }
  if (named) return { founder, namespace: named };
  return { founder, namespace: "fruma_demo" };
}

export function complianceFromQuery(value: string | undefined): ComplianceTarget | null {
  if (value === "EU_DPP" || value === "UK_STANDARDS") return value;
  return null;
}

/**
 * Read-only catalog search. Builds the 1536-d brief, forwards it to the
 * vector search module, then applies the 1.25 compliance boost to that
 * 50-row materialized window.
 */
export async function loadStudioVectorSearch(
  input: { prompt: string; complianceTarget: ComplianceTarget | null },
  search: StudioVectorSearch,
): Promise<StudioSearchLoad> {
  const embedding = await briefEmbedding(input.prompt);
  if (embedding.length !== MATERIAL_EMBEDDING_DIMENSIONS) {
    throw new Error(`Brief vector must be ${MATERIAL_EMBEDDING_DIMENSIONS} dimensions.`);
  }
  assertEmbeddingVector(embedding);
  const hits = await search.searchMaterialEmbeddings(embedding);
  if (hits.length === 0) return { hnswMatchCount: 0, materials: [], hits: [] };

  const complianceTarget = input.complianceTarget;
  const ranked = rankDesignSearchHits(hits);
  const records =
    complianceTarget === "EU_DPP" || complianceTarget === "UK_STANDARDS"
      ? await search.listActiveProductTruthEvidence?.() ?? []
      : [];
  const marked =
    complianceTarget === "EU_DPP" ? applyEuDppCompliance(ranked, records, hits) : ranked;
  const withCertificates = marked.map((quality) => ({
    ...quality,
    certificates: certificatesForQuality(quality, records, hits),
  }));
  const reranked = rerankByComplianceReadiness(withCertificates, complianceTarget ?? "");
  return {
    hnswMatchCount: hits.length,
    hits: reranked,
    materials: reranked.map((hit) => uniformMaterialFromHit(hit)),
  };
}

export { COMPLIANCE_READY_COEFFICIENT, versionFromNamespace };
