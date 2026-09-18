import type { EvidenceRecord, TruthScope } from "../product-truth";
import { assertBoundedRun, DEFAULT_AGENT_LIMITS, type SourcePointer } from "../agent-runtime";
import { TEST_SURFACE } from "../surfaces";
import { TEST_BRANDS, TEST_FACTORIES, factoryById } from "../test-corpus";
import type { RetrievalAgentOutput, ShortlistItem } from "./retrieval-agent";
import { runRetrievalAgent } from "./retrieval-agent";
import {
  createAgentRun,
  finishAgentRun,
  latestAgentRun,
  type AgentFinding,
  type StoredAgentRun,
} from "./run-store";

export type ClaimVerdict =
  | "missing"
  | "fibre-not-cert"
  | "unscoped"
  | "org-scope-only"
  | "needs-issuer"
  | "needs-validity"
  | "usable-with-confirm";

export type ClaimAssessment = {
  sourceRecordId: string;
  factoryId: string;
  factoryName: string;
  articleCode?: string;
  claimAsWritten: string;
  claimKind: "cert-string" | "composition-fibre" | "mill-programme";
  programme: string | null;
  inferredScope: TruthScope | "unknown";
  verdict: ClaimVerdict;
  brandSafeToState: boolean;
  blockers: string[];
  evidenceStub: EvidenceRecord;
};

export type EvidenceAgentOutput = {
  brandId: string;
  brandName: string;
  productId?: string;
  assessments: ClaimAssessment[];
  summaryCounts: Record<ClaimVerdict, number>;
  brandValue: {
    headline: string;
    bullets: string[];
  };
};

const PROGRAMME_SCOPE: Record<string, TruthScope> = {
  gots: "organisation",
  "oeko-tex standard 100": "quality",
  "oeko-tex": "quality",
  grs: "organisation",
  rws: "organisation",
  "zdhc supplier to zero": "mill-site",
  zdhc: "mill-site",
  "bci chain-of-custody": "organisation",
  bci: "organisation",
  fsc: "organisation",
  "iso 14001": "organisation",
};

function normalizeProgramme(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  for (const name of Object.keys(PROGRAMME_SCOPE)) {
    if (key.includes(name)) return name;
  }
  return null;
}

function isOrganicFibreWording(text: string) {
  return /organic\s+cotton|organic\s+co\b/i.test(text);
}

/**
 * Evaluate a single as-written claim. Never invents issuer, dates, or product-level
 * compliance from a mill string alone.
 */
export function assessClaim(args: {
  claimAsWritten: string;
  claimKind: ClaimAssessment["claimKind"];
  sourceRecordId: string;
  factoryId: string;
  factoryName: string;
  articleCode?: string;
  millHasProgramme?: boolean;
}): ClaimAssessment {
  const written = args.claimAsWritten.trim();
  const blockers: string[] = [];

  if (!written) {
    const stub: EvidenceRecord = {
      id: `ev:${args.sourceRecordId}:missing`,
      claim: "(none)",
      scope: "quality",
      subjectId: args.articleCode ?? args.factoryId,
      status: "missing",
    };
    return {
      sourceRecordId: args.sourceRecordId,
      factoryId: args.factoryId,
      factoryName: args.factoryName,
      articleCode: args.articleCode,
      claimAsWritten: "",
      claimKind: args.claimKind,
      programme: null,
      inferredScope: "unknown",
      verdict: "missing",
      brandSafeToState: false,
      blockers: ["No claim on file — do not invent a certification."],
      evidenceStub: stub,
    };
  }

  if (args.claimKind === "composition-fibre" && isOrganicFibreWording(written)) {
    blockers.push(
      "Fibre wording describes material, not a certification. Never treat as GOTS/organic cert.",
    );
    return {
      sourceRecordId: args.sourceRecordId,
      factoryId: args.factoryId,
      factoryName: args.factoryName,
      articleCode: args.articleCode,
      claimAsWritten: written,
      claimKind: "composition-fibre",
      programme: null,
      inferredScope: "quality",
      verdict: "fibre-not-cert",
      brandSafeToState: false,
      blockers,
      evidenceStub: {
        id: `ev:${args.sourceRecordId}:fibre`,
        claim: written,
        scope: "quality",
        subjectId: args.articleCode ?? args.factoryId,
        status: "unverified",
      },
    };
  }

  const programme = normalizeProgramme(written);
  const inferredScope = programme ? PROGRAMME_SCOPE[programme] ?? "unknown" : "unknown";

  if (!programme) {
    blockers.push(`Unrecognised programme string "${written}" — needs human classification.`);
  }

  // Hanger strings never carry issuer or validity in the Test corpus.
  blockers.push("Issuer not on hanger row.");
  blockers.push("Validity window not on hanger row.");

  if (inferredScope === "organisation" || inferredScope === "mill-site") {
    blockers.push(
      `Programme scope is ${inferredScope} — must not be stated as product-level compliance without scoped evidence.`,
    );
  } else if (inferredScope === "unknown") {
    blockers.push("Scope unknown — cannot promote to product truth.");
  } else {
    blockers.push("Quality/product scope possible only after issuer + applicability confirm.");
  }

  if (args.millHasProgramme === false && programme) {
    blockers.push("Mill profile does not list this programme — hanger string needs mill confirm.");
  }

  let verdict: ClaimVerdict = "needs-issuer";
  if (inferredScope === "organisation" || inferredScope === "mill-site") {
    verdict = "org-scope-only";
  } else if (inferredScope === "unknown" || !programme) {
    verdict = "unscoped";
  } else {
    verdict = "needs-validity";
  }

  // usable-with-confirm only when programme known + quality scope — still not brand-safe alone
  if (programme && inferredScope === "quality") {
    verdict = "usable-with-confirm";
  }

  return {
    sourceRecordId: args.sourceRecordId,
    factoryId: args.factoryId,
    factoryName: args.factoryName,
    articleCode: args.articleCode,
    claimAsWritten: written,
    claimKind: args.claimKind,
    programme,
    inferredScope,
    verdict,
    brandSafeToState: false, // never auto-safe from hanger string alone
    blockers,
    evidenceStub: {
      id: `ev:${args.sourceRecordId}:${programme ?? "claim"}`,
      claim: written,
      scope: inferredScope === "unknown" ? "organisation" : inferredScope,
      subjectId: args.articleCode ?? args.factoryId,
      status: "unverified",
    },
  };
}

function assessmentsFromShortlist(shortlist: ShortlistItem[]): ClaimAssessment[] {
  const out: ClaimAssessment[] = [];
  for (const row of shortlist) {
    const factory = factoryById(row.factoryId) ?? TEST_FACTORIES.find((f) => f.id === row.factoryId);
    const millProgrammes = factory?.certifications ?? [];
    out.push(
      assessClaim({
        claimAsWritten: row.certAsWritten,
        claimKind: "cert-string",
        sourceRecordId: `${row.factoryId}:${row.articleCode}:cert`,
        factoryId: row.factoryId,
        factoryName: row.factoryName,
        articleCode: row.articleCode,
        millHasProgramme: row.certAsWritten
          ? millProgrammes.some((c) => {
              const prog = normalizeProgramme(row.certAsWritten);
              if (!prog) return false;
              return c.toLowerCase().includes(prog) || prog.includes(c.toLowerCase().slice(0, 4));
            })
          : undefined,
      }),
    );
    if (isOrganicFibreWording(row.composition)) {
      out.push(
        assessClaim({
          claimAsWritten: row.composition,
          claimKind: "composition-fibre",
          sourceRecordId: `${row.factoryId}:${row.articleCode}:composition`,
          factoryId: row.factoryId,
          factoryName: row.factoryName,
          articleCode: row.articleCode,
        }),
      );
    }
  }
  return out;
}

function emptyCounts(): Record<ClaimVerdict, number> {
  return {
    missing: 0,
    "fibre-not-cert": 0,
    unscoped: 0,
    "org-scope-only": 0,
    "needs-issuer": 0,
    "needs-validity": 0,
    "usable-with-confirm": 0,
  };
}

/**
 * Evidence agent: audit claims on the latest (or fresh) Northline shortlist.
 * Blocks legal/marketing shortcuts — cert strings stay unverified without issuer/scope.
 */
export function runEvidenceAgent(args?: {
  brandId?: string;
  refreshRetrieval?: boolean;
  idempotencyKey?: string;
}): StoredAgentRun<{ brandId: string }, EvidenceAgentOutput> {
  const brandId = args?.brandId ?? "brand-northline";
  const brand = TEST_BRANDS.find((b) => b.id === brandId) ?? TEST_BRANDS[0];

  let retrieval = latestAgentRun("retrieval") as
    | StoredAgentRun<unknown, RetrievalAgentOutput>
    | undefined;
  if (args?.refreshRetrieval !== false) {
    retrieval = runRetrievalAgent({
      brandId,
      idempotencyKey: `evidence-fuel:${Date.now()}`,
    });
  }

  const shortlist = retrieval?.output?.shortlist ?? [];
  const assessments = assessmentsFromShortlist(shortlist).slice(
    0,
    DEFAULT_AGENT_LIMITS.sourcePointersPerRun,
  );

  const sourcePointers: SourcePointer[] = assessments.map((a) => ({
    organisationId: a.factoryId,
    sourceRecordId: a.sourceRecordId,
    fields: ["cert", "composition"],
  }));

  const run = createAgentRun<{ brandId: string }, EvidenceAgentOutput>({
    organisationId: brand.id,
    kind: "evidence",
    idempotencyKey: args?.idempotencyKey ?? `evidence:${brand.id}:${Date.now()}`,
    input: { brandId: brand.id },
    surface: TEST_SURFACE,
    sourcePointers,
  });
  assertBoundedRun(run);

  const summaryCounts = emptyCounts();
  for (const a of assessments) summaryCounts[a.verdict] += 1;

  const unsafe = assessments.filter((a) => !a.brandSafeToState).length;
  const fibreTraps = summaryCounts["fibre-not-cert"];
  const orgOnly = summaryCounts["org-scope-only"];
  const missing = summaryCounts.missing;
  const confirmable = summaryCounts["usable-with-confirm"];

  const findings: AgentFinding[] = [
    {
      severity: "info",
      code: "evidence_audit",
      message: `Audited ${assessments.length} claims on ${brand.name} shortlist — ${unsafe} not brand-safe to state as compliance.`,
    },
  ];
  if (fibreTraps) {
    findings.push({
      severity: "block",
      code: "organic_fibre_not_cert",
      message: `${fibreTraps} composition rows say organic fibre — blocked from being treated as GOTS/organic certification.`,
    });
  }
  if (orgOnly) {
    findings.push({
      severity: "warn",
      code: "org_scope_certs",
      message: `${orgOnly} programmes are organisation/site scoped (e.g. GOTS mill, ISO 14001) — not product pass statements.`,
    });
  }
  if (missing) {
    findings.push({
      severity: "info",
      code: "cert_missing",
      message: `${missing} shortlist rows have no cert string — gap left open.`,
    });
  }

  const output: EvidenceAgentOutput = {
    brandId: brand.id,
    brandName: brand.name,
    productId: retrieval?.output?.brief.productId,
    assessments,
    summaryCounts,
    brandValue: {
      headline: `${brand.name} gets an honest evidence gap report — Fruma will not greenwash hanger cert strings into legal readiness.`,
      bullets: [
        `${assessments.length} claims reviewed on the current shortlist.`,
        `${missing} missing · ${fibreTraps} fibre≠cert traps · ${orgOnly} org/site-scope-only · ${confirmable} quality-scope candidates still need issuer/validity.`,
        `0 claims auto-marked brand-safe — confirmation + scoped evidence still required.`,
        "This is trust value: retailers and regulators care that you did not invent GOTS from a CSV cell.",
      ],
    },
  };

  return finishAgentRun(run, {
    status: fibreTraps || orgOnly ? "needs-review" : "succeeded",
    output,
    findings,
    summary: `Evidence: ${brand.name} · ${assessments.length} claims · ${unsafe} not brand-safe · ${fibreTraps} fibre traps`,
  }) as StoredAgentRun<{ brandId: string }, EvidenceAgentOutput>;
}
