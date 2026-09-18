import {
  assertBoundedRun,
  DEFAULT_AGENT_LIMITS,
  type MatchEvidence,
  type RetrievalCandidate,
  type SourcePointer,
} from "../agent-runtime";
import { resolveHeaderField } from "../ingest/header-map";
import type { StandardField } from "../ingest/types";
import { TEST_SURFACE, surfaceMillOrgId } from "../surfaces";
import {
  TEST_BRANDS,
  TEST_FACTORIES,
  TEST_PRODUCTS,
  hangerRowsFor,
  linksForBrand,
  productsForBrand,
} from "../test-corpus";
import type { Relationship } from "../demo-data";
import type { TestFactory, TestProduct } from "../test-corpus/types";
import { confirmedHeaderOverlays } from "./confirmed-headers";
import { briefFromProduct, type BriefRequirement, type ProductBrief } from "./brief";
import { lexiconHeaderOverlays } from "./mapping-lexicon";
import {
  createAgentRun,
  finishAgentRun,
  type AgentFinding,
  type StoredAgentRun,
} from "./run-store";

export type ShortlistItem = {
  rank: number;
  factoryId: string;
  factoryName: string;
  country: string;
  dialect: string;
  relationship: Relationship;
  articleCode: string;
  construction: string;
  composition: string;
  colour: string;
  weightAsWritten: string;
  moqAsWritten: string;
  certAsWritten: string;
  structuredScore: number;
  evidence: MatchEvidence[];
  brandValueNote: string;
};

export type RetrievalAgentOutput = {
  brief: ProductBrief;
  candidatesConsidered: number;
  shortlist: ShortlistItem[];
  excludedFactoriesSkipped: number;
  brandValue: {
    headline: string;
    bullets: string[];
  };
};

type NormalizedQuality = {
  factory: TestFactory;
  article: string;
  construction: string;
  composition: string;
  colour: string;
  weight: string;
  moq: string;
  cert: string;
  sourceRecordId: string;
};

function normalizeRow(
  factory: TestFactory,
  row: Record<string, string>,
  overlays: Record<string, StandardField>,
  rowIndex: number,
): NormalizedQuality | null {
  const byField: Partial<Record<StandardField, string>> = {};
  for (const [header, value] of Object.entries(row)) {
    const field = resolveHeaderField(header, overlays);
    if (field && value.trim()) byField[field] = value.trim();
  }
  const article = byField.article ?? "";
  if (!article) return null;
  return {
    factory,
    article,
    construction: byField.construction ?? "",
    composition: byField.composition ?? "",
    colour: byField.colour ?? "",
    weight: byField.weight ?? "",
    moq: byField.moq ?? "",
    cert: byField.cert ?? "",
    sourceRecordId: `${factory.id}:${article}:r${rowIndex}`,
  };
}

function targetParts(target: string) {
  return target.toLowerCase().split("|").map((s) => s.trim()).filter(Boolean);
}

function includesAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

function relationshipSignal(
  rel: Relationship,
): RetrievalCandidate["relationshipSignal"] {
  if (rel === "preferred") return "preferred";
  if (rel === "proven") return "proven";
  if (rel === "previous") return "previously-used";
  return "none";
}

function scoreQuality(args: {
  quality: NormalizedQuality;
  brief: ProductBrief;
  relationship: Relationship;
}): { score: number; evidence: MatchEvidence[]; eligible: boolean } {
  const { quality, brief, relationship } = args;
  const evidence: MatchEvidence[] = [];
  let score = 0;
  let mustFail = false;

  for (const req of brief.requirements) {
    const ev = evaluateRequirement(req, quality, relationship);
    evidence.push(ev);
    if (req.kind === "MUST" && (ev.result === "mismatch" || ev.result === "not-on-file")) {
      mustFail = true;
    }
    if (ev.result === "evidenced") {
      score += req.kind === "MUST" ? 30 : req.kind === "PREFER" ? 12 : 4;
    } else if (ev.result === "needs-confirmation") {
      score += 2;
    }
  }

  if (relationship === "preferred") score += 20;
  else if (relationship === "proven") score += 14;
  else if (relationship === "previous") score += 6;

  return { score, evidence, eligible: !mustFail };
}

function evaluateRequirement(
  req: BriefRequirement,
  quality: NormalizedQuality,
  relationship: Relationship,
): MatchEvidence {
  const base = {
    requirementId: req.id,
    sourceRecordId: quality.sourceRecordId,
  };

  switch (req.field) {
    case "market": {
      const needs = targetParts(req.target).map((n) => n.toUpperCase());
      const ok = needs.some((need) =>
        quality.factory.markets.some((m) => m.toUpperCase() === need),
      );
      return {
        ...base,
        sourceField: "factory.markets",
        result: ok ? "evidenced" : "mismatch",
        explanation: ok
          ? `Factory markets include ${needs.join(" or ")}.`
          : `Factory markets ${quality.factory.markets.join("/")} miss ${needs.join("|")}.`,
      };
    }
    case "category": {
      const needles = targetParts(req.target);
      const blob = quality.factory.specialties.join(" ");
      const ok = includesAny(blob, needles);
      return {
        ...base,
        sourceField: "factory.specialties",
        result: ok ? "evidenced" : "mismatch",
        explanation: ok
          ? `Specialty match on "${blob}".`
          : `Specialties "${blob}" do not cover ${needles.join(", ")}.`,
      };
    }
    case "construction": {
      const needles = targetParts(req.target);
      if (!quality.construction) {
        return {
          ...base,
          sourceField: "construction",
          result: "not-on-file",
          explanation: "Construction not mapped on this hanger row.",
        };
      }
      const ok = includesAny(quality.construction, needles);
      return {
        ...base,
        sourceField: "construction",
        result: ok ? "evidenced" : "mismatch",
        explanation: ok
          ? `Construction "${quality.construction}" fits brief.`
          : `Construction "${quality.construction}" does not match ${needles.join(", ")}.`,
      };
    }
    case "composition": {
      const needles = targetParts(req.target);
      if (!quality.composition) {
        return {
          ...base,
          sourceField: "composition",
          result: "not-on-file",
          explanation: "Composition not mapped on this hanger row.",
        };
      }
      const ok = includesAny(quality.composition, needles);
      return {
        ...base,
        sourceField: "composition",
        result: ok ? "evidenced" : "mismatch",
        explanation: ok
          ? `Composition "${quality.composition}" on file.`
          : `Composition "${quality.composition}" is not cotton/fibre match.`,
      };
    }
    case "colour": {
      if (!quality.colour) {
        return {
          ...base,
          sourceField: "colour",
          result: "not-on-file",
          explanation: "Colourway not on this row.",
        };
      }
      const ok = quality.colour.toLowerCase().includes(req.target.toLowerCase());
      return {
        ...base,
        sourceField: "colour",
        result: ok ? "evidenced" : "mismatch",
        explanation: ok
          ? `Colourway "${quality.colour}" matches brief.`
          : `Colourway "${quality.colour}" ≠ ${req.target}.`,
      };
    }
    case "moq": {
      const max = Number(req.target);
      const ok = quality.factory.moqM <= max;
      return {
        ...base,
        sourceField: "factory.moqM",
        result: ok ? "evidenced" : "mismatch",
        explanation: ok
          ? `Factory MOQ baseline ${quality.factory.moqM}m ≤ ${max}m.`
          : `Factory MOQ baseline ${quality.factory.moqM}m exceeds ${max}m.`,
      };
    }
    case "cert": {
      if (!quality.cert) {
        return {
          ...base,
          sourceField: "cert",
          result: "not-on-file",
          explanation: "No cert on this row — left open; not invented.",
        };
      }
      return {
        ...base,
        sourceField: "cert",
        result: "needs-confirmation",
        explanation: `Cert "${quality.cert}" on file — scope/issuer still need confirmation.`,
      };
    }
    case "relationship": {
      if (relationship === "excluded") {
        return {
          ...base,
          sourceField: "brand_factory_link",
          result: "mismatch",
          explanation: "Excluded by brand-private memory.",
        };
      }
      if (relationship === "preferred" || relationship === "proven") {
        return {
          ...base,
          sourceField: "brand_factory_link",
          result: "evidenced",
          explanation: `Brand-private ${relationship} relationship (tenant-only).`,
        };
      }
      return {
        ...base,
        sourceField: "brand_factory_link",
        result: "needs-confirmation",
        explanation: `Relationship is ${relationship} — usable but not preferred.`,
      };
    }
    default:
      return {
        ...base,
        result: "not-on-file",
        explanation: "Unknown requirement field.",
      };
  }
}

function defaultProductForBrand(brandId: string): TestProduct {
  const products = productsForBrand(brandId);
  if (brandId === "brand-northline") {
    return (
      products.find((p) => p.category === "Polo" && p.stage === "intent") ??
      products.find((p) => p.category === "Polo") ??
      products[0] ??
      TEST_PRODUCTS[0]
    );
  }
  if (brandId === "brand-harbour") {
    return (
      products.find((p) => p.category === "T-shirt" && p.stage === "intent") ??
      products.find((p) => p.category === "T-shirt") ??
      products.find((p) => p.category === "Sweater") ??
      products[0] ??
      TEST_PRODUCTS[0]
    );
  }
  if (brandId === "brand-fieldform") {
    return (
      products.find((p) => p.category === "Jacket" && p.stage === "intent") ??
      products.find((p) => p.category === "Jacket") ??
      products.find((p) => p.category === "Overshirt") ??
      products[0] ??
      TEST_PRODUCTS[0]
    );
  }
  return products[0] ?? TEST_PRODUCTS[0];
}

/**
 * Retrieval agent: structured eligibility first, then bounded shortlist with evidence.
 * Relationship memory reorders; it never invents mill facts.
 */
export function runRetrievalAgent(args?: {
  productId?: string;
  brandId?: string;
  candidateLimit?: number;
  shortlistLimit?: number;
  idempotencyKey?: string;
}): StoredAgentRun<{ productId: string; brandId: string }, RetrievalAgentOutput> {
  const brandId = args?.brandId ?? "brand-northline";
  const brand = TEST_BRANDS.find((b) => b.id === brandId) ?? TEST_BRANDS[0];
  const product =
    (args?.productId
      ? TEST_PRODUCTS.find((p) => p.id === args.productId)
      : undefined) ?? defaultProductForBrand(brandId);

  const brief = briefFromProduct({
    product,
    brandName: brand.name,
    market: brand.market,
  });

  const links = linksForBrand(brand.id);
  const linkByFactory = new Map(links.map((l) => [l.factoryId, l]));
  const overlays = {
    ...lexiconHeaderOverlays(),
    ...confirmedHeaderOverlays(TEST_SURFACE),
  };
  const candidateLimit = Math.min(
    args?.candidateLimit ?? DEFAULT_AGENT_LIMITS.retrievalCandidates,
    DEFAULT_AGENT_LIMITS.retrievalCandidates,
  );
  const shortlistLimit = Math.min(
    args?.shortlistLimit ?? DEFAULT_AGENT_LIMITS.deepMatchCandidates,
    DEFAULT_AGENT_LIMITS.deepMatchCandidates,
  );

  let excludedFactoriesSkipped = 0;
  const scored: {
    quality: NormalizedQuality;
    relationship: Relationship;
    score: number;
    evidence: MatchEvidence[];
  }[] = [];

  for (const factory of TEST_FACTORIES) {
    const link = linkByFactory.get(factory.id);
    const relationship = link?.relationship ?? "new";
    if (relationship === "excluded") {
      excludedFactoriesSkipped += 1;
      continue;
    }

    const rows = hangerRowsFor(factory);
    rows.forEach((row, rowIndex) => {
      const quality = normalizeRow(factory, row, overlays, rowIndex);
      if (!quality) return;
      const { score, evidence, eligible } = scoreQuality({
        quality,
        brief,
        relationship,
      });
      if (!eligible) return;
      scored.push({ quality, relationship, score, evidence });
    });
  }

  scored.sort((a, b) => b.score - a.score || a.quality.article.localeCompare(b.quality.article));
  const bounded = scored.slice(0, candidateLimit);

  const sourcePointers: SourcePointer[] = bounded.map((c) => ({
    organisationId: c.quality.factory.id,
    sourceRecordId: c.quality.sourceRecordId,
    fields: ["article", "construction", "composition", "colour", "moq", "cert"],
  }));

  const run = createAgentRun<{ productId: string; brandId: string }, RetrievalAgentOutput>({
    organisationId: brand.id,
    kind: "retrieval",
    idempotencyKey:
      args?.idempotencyKey ?? `retrieval:${brand.id}:${product.id}:${Date.now()}`,
    input: { productId: product.id, brandId: brand.id },
    surface: TEST_SURFACE,
    sourcePointers,
  });

  assertBoundedRun(run);

  const shortlist: ShortlistItem[] = bounded.slice(0, shortlistLimit).map((c, i) => {
    const preferred = c.relationship === "preferred" || c.relationship === "proven";
    return {
      rank: i + 1,
      factoryId: c.quality.factory.id,
      factoryName: c.quality.factory.name,
      country: c.quality.factory.country,
      dialect: c.quality.factory.dialect,
      relationship: c.relationship,
      articleCode: c.quality.article,
      construction: c.quality.construction,
      composition: c.quality.composition,
      colour: c.quality.colour,
      weightAsWritten: c.quality.weight,
      moqAsWritten: c.quality.moq,
      certAsWritten: c.quality.cert,
      structuredScore: c.score,
      evidence: c.evidence,
      brandValueNote: preferred
        ? `Prioritised because ${brand.name} already marks this mill ${c.relationship} (private).`
        : `Eligible on evidence; relationship is ${c.relationship}.`,
    };
  });

  const preferredCount = shortlist.filter(
    (s) => s.relationship === "preferred" || s.relationship === "proven",
  ).length;
  const withCert = shortlist.filter((s) => s.certAsWritten).length;

  const findings: AgentFinding[] = [
    {
      severity: "info",
      code: "brand_value_shortlist",
      message: `${brand.name} shortlist: ${shortlist.length} qualities from ${new Set(shortlist.map((s) => s.factoryId)).size} mills; ${excludedFactoriesSkipped} excluded mills never shown.`,
    },
    {
      severity: "info",
      code: "private_memory",
      message: `${preferredCount}/${shortlist.length} shortlist rows boosted by private preferred/proven memory.`,
    },
  ];
  if (withCert < shortlist.length) {
    findings.push({
      severity: "warn",
      code: "cert_gaps",
      message: `${shortlist.length - withCert} shortlist rows have no cert on file — shown as gaps, not invented.`,
    });
  }

  const output: RetrievalAgentOutput = {
    brief,
    candidatesConsidered: bounded.length,
    shortlist,
    excludedFactoriesSkipped,
    brandValue: {
      headline: `${brand.name} can brief → evidence-linked mill shortlist without scanning the whole network or leaking private supplier memory.`,
      bullets: [
        `Product "${product.name}" (${product.sku}) → ${brief.requirements.length} requirements.`,
        `${excludedFactoriesSkipped} mills hidden by brand-private exclusions.`,
        `${preferredCount} shortlist hits from preferred/proven mills (reorder only — facts still from hangers).`,
        `${withCert} rows carry a cert string on file; others stay OPEN — no fake GOTS.`,
        `Bounded to ${shortlist.length} deep-match rows (cap ${shortlistLimit}) after ${bounded.length} structured candidates.`,
      ],
    },
  };

  return finishAgentRun(run, {
    status: shortlist.length ? "succeeded" : "needs-review",
    output,
    findings,
    summary: `Retrieval: ${brand.name} · ${shortlist.length} shortlisted · ${excludedFactoriesSkipped} excluded skipped · ${preferredCount} relationship-boosted`,
  }) as StoredAgentRun<{ productId: string; brandId: string }, RetrievalAgentOutput>;
}
