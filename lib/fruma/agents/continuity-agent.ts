import type { CorpusHarnessOutput } from "./corpus-harness";
import type { RetrievalAgentOutput } from "./retrieval-agent";
import { runCorpusHarness } from "./corpus-harness";
import { runRetrievalAgent } from "./retrieval-agent";
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
};

export type ContinuityAgentOutput = {
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
): ContinuityException[] {
  const a = retrievalFingerprint(before);
  const b = retrievalFingerprint(after);
  const out: ContinuityException[] = [];

  if (a.productId !== b.productId) {
    out.push({
      scope: "retrieval",
      code: "product_changed",
      severity: "info",
      message: `Brief product ${a.productId} → ${b.productId}`,
      before: a.productId,
      after: b.productId,
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
      });
    }
  }

  return out;
}

/**
 * Continuity agent: emit only what changed vs the prior harness/retrieval snapshot.
 * Brand value = exception-only workload on rebuy / remapping.
 */
export function runContinuityAgent(args?: {
  refresh?: boolean;
  brandId?: string;
  idempotencyKey?: string;
}): StoredAgentRun<{ refresh: boolean }, ContinuityAgentOutput> {
  const refresh = args?.refresh ?? true;
  const brandId = args?.brandId ?? "brand-northline";

  let baselineHarness = completedRuns("ingest")[0] as
    | StoredAgentRun<unknown, CorpusHarnessOutput>
    | undefined;
  let baselineRetrieval = completedRuns("retrieval")[0] as
    | StoredAgentRun<unknown, RetrievalAgentOutput>
    | undefined;

  if (refresh) {
    // Capture current latest as baseline, then produce fresh runs to diff.
    runCorpusHarness({ idempotencyKey: `continuity-harness:${Date.now()}` });
    runRetrievalAgent({
      brandId,
      idempotencyKey: `continuity-retrieval:${Date.now()}`,
    });
  }

  const harnessRuns = completedRuns("ingest") as StoredAgentRun<unknown, CorpusHarnessOutput>[];
  const retrievalRuns = completedRuns("retrieval") as StoredAgentRun<
    unknown,
    RetrievalAgentOutput
  >[];

  const currentHarness = harnessRuns[0];
  const currentRetrieval = retrievalRuns[0];
  // After refresh, baseline is the previous completed run (index 1)
  if (refresh) {
    baselineHarness = harnessRuns[1] ?? baselineHarness;
    baselineRetrieval = retrievalRuns[1] ?? baselineRetrieval;
  } else {
    baselineHarness = harnessRuns[1];
    baselineRetrieval = retrievalRuns[1];
  }

  const run = createAgentRun<{ refresh: boolean }, ContinuityAgentOutput>({
    organisationId: surfaceMillOrgId(TEST_SURFACE),
    kind: "continuity",
    idempotencyKey: args?.idempotencyKey ?? `continuity:${Date.now()}`,
    input: { refresh },
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
    const retrievalDiff = diffRetrieval(baselineRetrieval.output, currentRetrieval.output);
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
      message:
        "No prior completed harness/retrieval pair to diff. Continuity established a baseline — run again after Mapping or a brief change to see exceptions only.",
    });
  }

  const blocks = exceptions.filter((e) => e.severity === "block").length;
  const warns = exceptions.filter((e) => e.severity === "warn").length;

  if (established && exceptions.length === 0) {
    findings.push({
      severity: "info",
      code: "no_exceptions",
      message: "No continuity exceptions — brand can treat this as a clean rebuy pass.",
    });
  } else if (exceptions.length) {
    findings.push({
      severity: blocks ? "block" : warns ? "warn" : "info",
      code: "exceptions_only",
      message: `${exceptions.length} continuity exceptions (${blocks} block, ${warns} warn) — ignore stable mills/qualities.`,
    });
  }

  const output: ContinuityAgentOutput = {
    baseline: {
      harnessRunId: baselineHarness?.id,
      retrievalRunId: baselineRetrieval?.id,
      established,
    },
    current: {
      harnessRunId: currentHarness?.id ?? latestAgentRun("ingest")?.id,
      retrievalRunId: currentRetrieval?.id ?? latestAgentRun("retrieval")?.id,
    },
    exceptions,
    unchanged: {
      harnessDialectsStable,
      retrievalShortlistStable,
    },
    brandValue: {
      headline: established
        ? exceptions.length === 0
          ? "Continuity: nothing material changed — Northline only needs to confirm the same shortlist."
          : `Continuity: ${exceptions.length} exceptions need attention; the rest of the network stays quiet.`
        : "Continuity baseline set — next run becomes exception-only work for the brand.",
      bullets: [
        established
          ? `${harnessDialectsStable} harness dialects stable; ${retrievalShortlistStable} shortlist articles unchanged.`
          : "First snapshot stored in agent memory (in-process until Postgres).",
        `${exceptions.filter((e) => e.scope === "harness").length} harness exceptions · ${exceptions.filter((e) => e.scope === "retrieval").length} retrieval exceptions.`,
        "Excluded mills and private preferred/proven memory remain tenant-private across diffs.",
        "This is the rebuy value: teams resolve only what changed since last confirmed truth.",
      ],
    },
  };

  return finishAgentRun(run, {
    status: !established ? "succeeded" : blocks ? "needs-review" : "succeeded",
    output,
    findings,
    summary: established
      ? `Continuity: ${exceptions.length} exceptions · ${retrievalShortlistStable} shortlist stable`
      : "Continuity: baseline established — run again for exception-only diff",
  }) as StoredAgentRun<{ refresh: boolean }, ContinuityAgentOutput>;
}
