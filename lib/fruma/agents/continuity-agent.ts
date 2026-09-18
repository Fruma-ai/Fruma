import type { CorpusHarnessOutput } from "./corpus-harness";
import type { RetrievalAgentOutput } from "./retrieval-agent";
import { runCorpusHarness } from "./corpus-harness";
import { runRetrievalAgent } from "./retrieval-agent";
import { TEST_BRANDS } from "../test-corpus";
import { TEST_SURFACE, surfaceMillOrgId } from "../surfaces";
import {
  createAgentRun,
  finishAgentRun,
  latestAgentRun,
  listAgentRuns,
  type AgentFinding,
  type StoredAgentRun,
} from "./run-store";
import type { AgentKind } from "../agent-runtime";

export type ContinuityException = {
  scope: "harness" | "retrieval";
  code: string;
  severity: "info" | "warn" | "block";
  message: string;
  before?: string;
  after?: string;
  factoryId?: string;
  dialect?: string;
  articleCode?: string;
  /** Present when the exception is scoped to one brand’s retrieval snapshot. */
  brandId?: string;
  brandName?: string;
};

export type BrandContinuitySlice = {
  brandId: string;
  brandName: string;
  established: boolean;
  exceptionCount: number;
  retrievalShortlistStable: number;
  baselineRetrievalRunId?: string;
  currentRetrievalRunId?: string;
};

export type ContinuityAgentOutput = {
  scope: "single" | "all-test-brands";
  brandId?: string;
  brandName?: string;
  baseline: {
    harnessRunId?: string;
    retrievalRunId?: string;
    established: boolean;
  };
  current: {
    harnessRunId?: string;
    retrievalRunId?: string;
  };
  exceptions: ContinuityException[];
  unchanged: {
    harnessDialectsStable: number;
    retrievalShortlistStable: number;
  };
  slices?: BrandContinuitySlice[];
  tenantIsolation?: {
    brandsCompared: number;
    crossBrandRetrievalDiffs: number;
    leakDetected: boolean;
    note: string;
  };
  brandValue: {
    headline: string;
    bullets: string[];
  };
};

function completedRuns(kind: AgentKind): StoredAgentRun[] {
  return listAgentRuns(100).filter(
    (r) => r.kind === kind && r.status !== "running" && r.completedAt,
  );
}

function retrievalBrandId(run: StoredAgentRun): string | undefined {
  const fromInput = (run.input as { brandId?: string } | undefined)?.brandId;
  if (fromInput) return fromInput;
  const fromOutput = (run.output as RetrievalAgentOutput | undefined)?.brief?.brandId;
  if (fromOutput) return fromOutput;
  if (run.organisationId?.startsWith("brand-")) return run.organisationId;
  return undefined;
}

/** Tenant-safe: only retrieval snapshots belonging to this brand. */
function completedRetrievalRunsForBrand(brandId: string): StoredAgentRun<
  unknown,
  RetrievalAgentOutput
>[] {
  return completedRuns("retrieval").filter(
    (r) => retrievalBrandId(r) === brandId,
  ) as StoredAgentRun<unknown, RetrievalAgentOutput>[];
}

function harnessFingerprint(output: CorpusHarnessOutput) {
  return {
    factoriesOk: output.factoriesOk,
    factoriesFailed: output.factoriesFailed,
    qualitiesTotal: output.qualitiesTotal,
    unmappedHeaderCount: output.unmappedHeaderCount,
    failedFactoryIds: output.rows.filter((r) => !r.ok).map((r) => r.factoryId).sort(),
    dialectOk: Object.fromEntries(
      Object.entries(output.byDialect).map(([d, v]) => [d, `${v.ok}/${v.factories}`]),
    ),
    unmappedByDialect: Object.fromEntries(
      Object.entries(output.byDialect).map(([d, v]) => [d, v.unmapped.slice().sort().join(",")]),
    ),
  };
}

function retrievalFingerprint(output: RetrievalAgentOutput) {
  return {
    productId: output.brief.productId,
    brandId: output.brief.brandId,
    excluded: output.excludedFactoriesSkipped,
    articles: output.shortlist.map((s) => ({
      key: `${s.factoryId}:${s.articleCode}`,
      rank: s.rank,
      relationship: s.relationship,
      score: s.structuredScore,
      colour: s.colour,
      construction: s.construction,
      evidenceDigest: s.evidence.map((e) => `${e.requirementId}:${e.result}`).join("|"),
    })),
  };
}

function diffHarness(
  before: CorpusHarnessOutput,
  after: CorpusHarnessOutput,
): ContinuityException[] {
  const a = harnessFingerprint(before);
  const b = harnessFingerprint(after);
  const out: ContinuityException[] = [];

  if (a.factoriesOk !== b.factoriesOk || a.factoriesFailed !== b.factoriesFailed) {
    out.push({
      scope: "harness",
      code: "factory_ok_changed",
      severity: b.factoriesFailed > a.factoriesFailed ? "block" : "info",
      message: `Factory success ${a.factoriesOk}/${a.factoriesOk + a.factoriesFailed} → ${b.factoriesOk}/${b.factoriesOk + b.factoriesFailed}`,
      before: `${a.factoriesOk} ok`,
      after: `${b.factoriesOk} ok`,
    });
  }

  const failedBefore = new Set(a.failedFactoryIds);
  const failedAfter = new Set(b.failedFactoryIds);
  for (const id of failedAfter) {
    if (!failedBefore.has(id)) {
      out.push({
        scope: "harness",
        code: "factory_newly_failed",
        severity: "block",
        message: `${id} newly failed ingest`,
        factoryId: id,
        after: "failed",
      });
    }
  }
  for (const id of failedBefore) {
    if (!failedAfter.has(id)) {
      out.push({
        scope: "harness",
        code: "factory_recovered",
        severity: "info",
        message: `${id} recovered after mapping/ingest improvement`,
        factoryId: id,
        before: "failed",
        after: "ok",
      });
    }
  }

  for (const dialect of new Set([...Object.keys(a.unmappedByDialect), ...Object.keys(b.unmappedByDialect)])) {
    const prev = a.unmappedByDialect[dialect] ?? "";
    const next = b.unmappedByDialect[dialect] ?? "";
    if (prev !== next) {
      out.push({
        scope: "harness",
        code: "unmapped_headers_changed",
        severity: "warn",
        message: `${dialect} unmapped headers changed`,
        dialect,
        before: prev || "(none)",
        after: next || "(none)",
      });
    }
    const prevOk = a.dialectOk[dialect];
    const nextOk = b.dialectOk[dialect];
    if (prevOk && nextOk && prevOk !== nextOk) {
      out.push({
        scope: "harness",
        code: "dialect_ok_changed",
        severity: "warn",
        message: `${dialect} success ${prevOk} → ${nextOk}`,
        dialect,
        before: prevOk,
        after: nextOk,
      });
    }
  }

  return out;
}

function diffRetrieval(
  before: RetrievalAgentOutput,
  after: RetrievalAgentOutput,
  brandMeta?: { brandId: string; brandName: string },
): ContinuityException[] {
  const a = retrievalFingerprint(before);
  const b = retrievalFingerprint(after);
  const tag = brandMeta
    ? { brandId: brandMeta.brandId, brandName: brandMeta.brandName }
    : a.brandId
      ? {
          brandId: a.brandId,
          brandName:
            TEST_BRANDS.find((br) => br.id === a.brandId)?.name ?? a.brandId,
        }
      : {};

  // Hard guard — never invent a cross-tenant continuity story or leak private memory.
  if (a.brandId && b.brandId && a.brandId !== b.brandId) {
    return [
      {
        scope: "retrieval",
        code: "brand_scope_guard",
        severity: "block",
        message: `Refused to diff ${a.brandId} against ${b.brandId} — brand-private shortlists stay tenant-isolated.`,
        before: a.brandId,
        after: b.brandId,
        ...tag,
      },
    ];
  }

  const out: ContinuityException[] = [];

  if (a.productId !== b.productId) {
    out.push({
      scope: "retrieval",
      code: "product_changed",
      severity: "info",
      message: `Brief product ${a.productId} → ${b.productId}`,
      before: a.productId,
      after: b.productId,
      ...tag,
    });
  }

  if (a.excluded !== b.excluded) {
    out.push({
      scope: "retrieval",
      code: "excluded_count_changed",
      severity: "warn",
      message: `Excluded mills ${a.excluded} → ${b.excluded}`,
      before: String(a.excluded),
      after: String(b.excluded),
      ...tag,
    });
  }

  const beforeMap = new Map(a.articles.map((x) => [x.key, x]));
  const afterMap = new Map(b.articles.map((x) => [x.key, x]));

  for (const [key, row] of afterMap) {
    const prev = beforeMap.get(key);
    if (!prev) {
      out.push({
        scope: "retrieval",
        code: "shortlist_added",
        severity: "info",
        message: `${key} entered shortlist at rank ${row.rank}`,
        articleCode: key.split(":")[1],
        factoryId: key.split(":")[0],
        after: `rank ${row.rank}`,
        ...tag,
      });
      continue;
    }
    if (prev.rank !== row.rank) {
      out.push({
        scope: "retrieval",
        code: "rank_changed",
        severity: "info",
        message: `${key} rank ${prev.rank} → ${row.rank}`,
        articleCode: key.split(":")[1],
        factoryId: key.split(":")[0],
        before: String(prev.rank),
        after: String(row.rank),
        ...tag,
      });
    }
    if (prev.relationship !== row.relationship) {
      // Relationship is brand-private; only emit within the same brand scope.
      out.push({
        scope: "retrieval",
        code: "relationship_changed",
        severity: "warn",
        message: `${key} private relationship ${prev.relationship} → ${row.relationship}`,
        articleCode: key.split(":")[1],
        factoryId: key.split(":")[0],
        before: prev.relationship,
        after: row.relationship,
        ...tag,
      });
    }
    if (prev.evidenceDigest !== row.evidenceDigest) {
      out.push({
        scope: "retrieval",
        code: "evidence_changed",
        severity: "warn",
        message: `${key} evidence results changed`,
        articleCode: key.split(":")[1],
        factoryId: key.split(":")[0],
        before: prev.evidenceDigest,
        after: row.evidenceDigest,
        ...tag,
      });
    }
  }

  for (const [key] of beforeMap) {
    if (!afterMap.has(key)) {
      out.push({
        scope: "retrieval",
        code: "shortlist_removed",
        severity: "warn",
        message: `${key} left the shortlist`,
        articleCode: key.split(":")[1],
        factoryId: key.split(":")[0],
        before: "on shortlist",
        after: "removed",
        ...tag,
      });
    }
  }

  return out;
}

function pickHarnessPair(refresh: boolean): {
  baseline?: StoredAgentRun<unknown, CorpusHarnessOutput>;
  current?: StoredAgentRun<unknown, CorpusHarnessOutput>;
} {
  const harnessRuns = completedRuns("ingest") as StoredAgentRun<unknown, CorpusHarnessOutput>[];
  const current = harnessRuns[0];
  const baseline = refresh ? harnessRuns[1] : harnessRuns[1];
  return { baseline, current };
}

function pickBrandRetrievalPair(
  brandId: string,
): {
  baseline?: StoredAgentRun<unknown, RetrievalAgentOutput>;
  current?: StoredAgentRun<unknown, RetrievalAgentOutput>;
} {
  const runs = completedRetrievalRunsForBrand(brandId);
  return { current: runs[0], baseline: runs[1] };
}

function brandLabel(brandId: string): string {
  return TEST_BRANDS.find((b) => b.id === brandId)?.name ?? brandId;
}

/**
 * Continuity agent: emit only what changed vs the prior harness/retrieval snapshot.
 * Retrieval baselines are brand-scoped so switching Harbour ↔ Field & Form ↔ Northline
 * never diffs another tenant’s shortlist or private relationships.
 */
export function runContinuityAgent(args?: {
  refresh?: boolean;
  brandId?: string;
  allBrands?: boolean;
  idempotencyKey?: string;
}): StoredAgentRun<{ refresh: boolean; scope: string; brandId?: string }, ContinuityAgentOutput> {
  if (args?.allBrands) {
    return runMultiBrandContinuity({
      refresh: args.refresh,
      idempotencyKey: args.idempotencyKey,
    });
  }

  const refresh = args?.refresh ?? true;
  const brandId = args?.brandId ?? "brand-northline";
  const brandName = brandLabel(brandId);

  if (refresh) {
    runCorpusHarness({ idempotencyKey: `continuity-harness:${Date.now()}` });
    runRetrievalAgent({
      brandId,
      idempotencyKey: `continuity-retrieval:${brandId}:${Date.now()}`,
    });
  }

  const { baseline: baselineHarness, current: currentHarness } = pickHarnessPair(refresh);
  const { baseline: baselineRetrieval, current: currentRetrieval } =
    pickBrandRetrievalPair(brandId);

  const run = createAgentRun<
    { refresh: boolean; scope: string; brandId?: string },
    ContinuityAgentOutput
  >({
    organisationId: brandId,
    kind: "continuity",
    idempotencyKey: args?.idempotencyKey ?? `continuity:${brandId}:${Date.now()}`,
    input: { refresh, scope: "single", brandId },
    surface: TEST_SURFACE,
  });

  const exceptions: ContinuityException[] = [];
  let harnessDialectsStable = 0;
  let retrievalShortlistStable = 0;
  const established = Boolean(
    (baselineHarness?.output && currentHarness?.output) ||
      (baselineRetrieval?.output && currentRetrieval?.output),
  );

  if (baselineHarness?.output && currentHarness?.output) {
    const dialectNames = Object.keys(currentHarness.output.byDialect);
    const harnessDiff = diffHarness(baselineHarness.output, currentHarness.output);
    exceptions.push(...harnessDiff);
    harnessDialectsStable = dialectNames.filter(
      (d) =>
        !harnessDiff.some((e) => e.dialect === d && e.code.startsWith("dialect")),
    ).length;
  }

  if (baselineRetrieval?.output && currentRetrieval?.output) {
    const retrievalDiff = diffRetrieval(baselineRetrieval.output, currentRetrieval.output, {
      brandId,
      brandName,
    });
    exceptions.push(...retrievalDiff);
    const beforeKeys = new Set(
      baselineRetrieval.output.shortlist.map((s) => `${s.factoryId}:${s.articleCode}`),
    );
    const afterKeys = currentRetrieval.output.shortlist.map(
      (s) => `${s.factoryId}:${s.articleCode}`,
    );
    retrievalShortlistStable = afterKeys.filter((k) => beforeKeys.has(k)).length;
  }

  const findings: AgentFinding[] = [];
  if (!established) {
    findings.push({
      severity: "info",
      code: "baseline_established",
      message: `No prior ${brandName} harness/retrieval pair to diff. Continuity established a brand-scoped baseline — run again after Mapping or a brief change to see exceptions only.`,
    });
  }

  const blocks = exceptions.filter((e) => e.severity === "block").length;
  const warns = exceptions.filter((e) => e.severity === "warn").length;

  if (established && exceptions.length === 0) {
    findings.push({
      severity: "info",
      code: "no_exceptions",
      message: `No continuity exceptions — ${brandName} can treat this as a clean rebuy pass.`,
    });
  } else if (exceptions.length) {
    findings.push({
      severity: blocks ? "block" : warns ? "warn" : "info",
      code: "exceptions_only",
      message: `${exceptions.length} continuity exceptions for ${brandName} (${blocks} block, ${warns} warn) — ignore stable mills/qualities.`,
    });
  }

  const output: ContinuityAgentOutput = {
    scope: "single",
    brandId,
    brandName,
    baseline: {
      harnessRunId: baselineHarness?.id,
      retrievalRunId: baselineRetrieval?.id,
      established,
    },
    current: {
      harnessRunId: currentHarness?.id ?? latestAgentRun("ingest")?.id,
      retrievalRunId: currentRetrieval?.id,
    },
    exceptions,
    unchanged: {
      harnessDialectsStable,
      retrievalShortlistStable,
    },
    brandValue: {
      headline: established
        ? exceptions.length === 0
          ? `Continuity: nothing material changed — ${brandName} only needs to confirm the same shortlist.`
          : `Continuity: ${exceptions.length} exceptions need attention for ${brandName}; the rest of the network stays quiet.`
        : `Continuity baseline set for ${brandName} — next run becomes exception-only work for this tenant.`,
      bullets: [
        established
          ? `${harnessDialectsStable} harness dialects stable; ${retrievalShortlistStable} shortlist articles unchanged.`
          : "First brand-scoped snapshot stored in agent memory (in-process until Postgres).",
        `${exceptions.filter((e) => e.scope === "harness").length} harness exceptions · ${exceptions.filter((e) => e.scope === "retrieval").length} retrieval exceptions.`,
        "Excluded mills and private preferred/proven memory remain tenant-private across diffs — never compared to other brands.",
        "This is the rebuy value: teams resolve only what changed since last confirmed truth.",
      ],
    },
  };

  return finishAgentRun(run, {
    status: !established ? "succeeded" : blocks ? "needs-review" : "succeeded",
    output,
    findings,
    summary: established
      ? `Continuity: ${brandName} · ${exceptions.length} exceptions · ${retrievalShortlistStable} shortlist stable`
      : `Continuity: ${brandName} baseline established — run again for exception-only diff`,
  }) as StoredAgentRun<
    { refresh: boolean; scope: string; brandId?: string },
    ContinuityAgentOutput
  >;
}

/**
 * Continuity across all Test brands: one shared harness spine + per-brand
 * retrieval snapshots. Never diffs one brand’s shortlist against another’s.
 */
export function runMultiBrandContinuity(args?: {
  refresh?: boolean;
  idempotencyKey?: string;
}): StoredAgentRun<{ refresh: boolean; scope: string }, ContinuityAgentOutput> {
  const refresh = args?.refresh ?? true;

  if (refresh) {
    runCorpusHarness({ idempotencyKey: `continuity-harness:all:${Date.now()}` });
    for (const brand of TEST_BRANDS) {
      runRetrievalAgent({
        brandId: brand.id,
        idempotencyKey: `continuity-retrieval:${brand.id}:${Date.now()}`,
      });
    }
  }

  const { baseline: baselineHarness, current: currentHarness } = pickHarnessPair(refresh);

  const exceptions: ContinuityException[] = [];
  let harnessDialectsStable = 0;
  const slices: BrandContinuitySlice[] = [];
  let totalRetrievalStable = 0;
  let brandsEstablished = 0;

  if (baselineHarness?.output && currentHarness?.output) {
    const dialectNames = Object.keys(currentHarness.output.byDialect);
    const harnessDiff = diffHarness(baselineHarness.output, currentHarness.output);
    exceptions.push(...harnessDiff);
    harnessDialectsStable = dialectNames.filter(
      (d) =>
        !harnessDiff.some((e) => e.dialect === d && e.code.startsWith("dialect")),
    ).length;
  }

  for (const brand of TEST_BRANDS) {
    const { baseline, current } = pickBrandRetrievalPair(brand.id);
    const established = Boolean(baseline?.output && current?.output);
    let shortlistStable = 0;
    let brandExceptions: ContinuityException[] = [];

    if (baseline?.output && current?.output) {
      brandExceptions = diffRetrieval(baseline.output, current.output, {
        brandId: brand.id,
        brandName: brand.name,
      });
      exceptions.push(...brandExceptions);
      const beforeKeys = new Set(
        baseline.output.shortlist.map((s) => `${s.factoryId}:${s.articleCode}`),
      );
      const afterKeys = current.output.shortlist.map(
        (s) => `${s.factoryId}:${s.articleCode}`,
      );
      shortlistStable = afterKeys.filter((k) => beforeKeys.has(k)).length;
      totalRetrievalStable += shortlistStable;
      brandsEstablished += 1;
    }

    slices.push({
      brandId: brand.id,
      brandName: brand.name,
      established,
      exceptionCount: brandExceptions.length,
      retrievalShortlistStable: shortlistStable,
      baselineRetrievalRunId: baseline?.id,
      currentRetrievalRunId: current?.id,
    });
  }

  const crossBrandGuards = exceptions.filter((e) => e.code === "brand_scope_guard");
  const leakDetected = crossBrandGuards.length > 0;
  const established = Boolean(
    (baselineHarness?.output && currentHarness?.output) || brandsEstablished > 0,
  );

  const run = createAgentRun<{ refresh: boolean; scope: string }, ContinuityAgentOutput>({
    organisationId: surfaceMillOrgId(TEST_SURFACE),
    kind: "continuity",
    idempotencyKey: args?.idempotencyKey ?? `continuity:all:${Date.now()}`,
    input: { refresh, scope: "all-test-brands" },
    surface: TEST_SURFACE,
  });

  const findings: AgentFinding[] = [];
  if (!established) {
    findings.push({
      severity: "info",
      code: "baseline_established",
      message:
        "Multi-brand Continuity established shared harness + per-brand retrieval baselines. Run again after Mapping to see exception-only diffs per tenant.",
    });
  }

  for (const slice of slices) {
    findings.push({
      severity: "info",
      code: "brand_continuity_slice",
      message: slice.established
        ? `${slice.brandName}: ${slice.exceptionCount} retrieval exceptions · ${slice.retrievalShortlistStable} shortlist stable`
        : `${slice.brandName}: brand-scoped baseline set (no prior pair to diff)`,
    });
  }

  findings.push({
    severity: leakDetected ? "block" : "info",
    code: leakDetected ? "tenant_isolation_fail" : "tenant_isolation_ok",
    message: leakDetected
      ? `Blocked ${crossBrandGuards.length} cross-brand retrieval diff attempt(s).`
      : `Tenant isolation ok — Continuity compared ${TEST_BRANDS.length} brands only against their own prior snapshots (0 cross-brand retrieval diffs).`,
  });

  const blocks = exceptions.filter((e) => e.severity === "block").length;
  const warns = exceptions.filter((e) => e.severity === "warn").length;

  if (established && exceptions.length === 0) {
    findings.push({
      severity: "info",
      code: "no_exceptions",
      message:
        "No continuity exceptions across Harbour, Field & Form, and Northline — clean multi-brand rebuy pass.",
    });
  } else if (exceptions.length) {
    findings.push({
      severity: blocks ? "block" : warns ? "warn" : "info",
      code: "exceptions_only",
      message: `${exceptions.length} continuity exceptions across brands (${blocks} block, ${warns} warn) — each brand only sees its own deltas.`,
    });
  }

  const output: ContinuityAgentOutput = {
    scope: "all-test-brands",
    baseline: {
      harnessRunId: baselineHarness?.id,
      established,
    },
    current: {
      harnessRunId: currentHarness?.id ?? latestAgentRun("ingest")?.id,
    },
    exceptions,
    unchanged: {
      harnessDialectsStable,
      retrievalShortlistStable: totalRetrievalStable,
    },
    slices,
    tenantIsolation: {
      brandsCompared: TEST_BRANDS.length,
      crossBrandRetrievalDiffs: crossBrandGuards.length,
      leakDetected,
      note: leakDetected
        ? "Cross-brand retrieval diff was attempted and blocked."
        : "Each brand’s shortlist and private relationships are diffed only against that brand’s prior snapshot. Shared harness spine is compared once.",
    },
    brandValue: {
      headline: established
        ? exceptions.length === 0
          ? "Continuity: three brands, one catalogue spine — nothing material changed for any tenant."
          : `Continuity: ${exceptions.length} exceptions across Harbour, Field & Form, and Northline — each brand only resolves its own deltas.`
        : "Multi-brand Continuity baselines set — next run is exception-only work per tenant.",
      bullets: [
        `Shared harness: ${harnessDialectsStable} dialects stable · ${exceptions.filter((e) => e.scope === "harness").length} harness exceptions.`,
        ...slices.map(
          (s) =>
            `${s.brandName}: ${s.established ? `${s.exceptionCount} retrieval exceptions · ${s.retrievalShortlistStable} shortlist stable` : "baseline set"}`,
        ),
        "No brand’s preferred/excluded memory is compared to another brand’s — tenant moat holds across snapshot diffs.",
      ],
    },
  };

  return finishAgentRun(run, {
    status: leakDetected || blocks ? "needs-review" : "succeeded",
    output,
    findings,
    summary: established
      ? `Continuity: all brands · ${exceptions.length} exceptions · ${brandsEstablished}/${TEST_BRANDS.length} tenants with pairs · isolation ${leakDetected ? "FAIL" : "ok"}`
      : "Continuity: multi-brand baselines established — run again for exception-only diffs",
  }) as StoredAgentRun<{ refresh: boolean; scope: string }, ContinuityAgentOutput>;
}
