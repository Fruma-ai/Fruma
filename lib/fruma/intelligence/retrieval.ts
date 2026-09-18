import type { StandardField } from "../ingest/types";
import { TEST_BRANDS } from "../test-corpus/brands";
import { TEST_FACTORIES, factoryById } from "../test-corpus/factories";
import { hangerRowsFor } from "../test-corpus/hanger";
import { TEST_LINKS, TEST_PRODUCTS } from "../test-corpus/products";
import type { BrandFactoryLink, TestFactory, TestProduct } from "../test-corpus/types";
import { scoreFactoryCoverage, type CoverageStatus } from "./coverage";

export type RequirementKind = "MUST" | "PREFER" | "OPEN";

export type BriefRequirement = {
  id: string;
  field: StandardField | "geography";
  kind: RequirementKind;
  label: string;
  value: string;
};

export type BrandBrief = {
  brandId: string;
  brandName: string;
  productId: string;
  productName: string;
  sku: string;
  intent: string;
  requirements: BriefRequirement[];
};

export type Answerability = "on-file" | "unmapped" | "missing" | "needs-confirm" | "physical-only";

export type EvidenceFlag = {
  code: "organic-not-gots" | "mill-programme-not-quality" | "missing-cert" | "historical-commercial";
  severity: "block" | "warn" | "info";
  title: string;
  detail: string;
};

export type SourceCandidate = {
  factoryId: string;
  factoryName: string;
  country: string;
  dialect: string;
  relationship: BrandFactoryLink["relationship"];
  coverage: CoverageStatus;
  qualities: number;
  grantedArticles: number;
  eligibility: "eligible" | "ineligible" | "unknown";
  retrievalScore: number;
  colourMatch: "match" | "mismatch" | "open";
  answerability: { requirementId: string; result: Answerability; note: string }[];
  evidence: EvidenceFlag[];
  commercials: { moqM: number; leadWeeks: number; freshness: "historical" };
  excluded: false;
};

export type SourceShortlist = {
  brief: BrandBrief;
  excludedHidden: number;
  darkMillsSkipped: number;
  candidates: SourceCandidate[];
  continuity: {
    priorProductId: string | null;
    addedFactoryIds: string[];
    removedFactoryIds: string[];
  };
};

const COLOURS = ["navy", "stone", "forest", "black", "cream", "clay", "white", "ecru", "charcoal"] as const;

function namedColour(product: TestProduct): string | null {
  const lower = product.name.toLowerCase();
  return COLOURS.find((c) => lower.includes(c)) ?? null;
}

export function briefFromProduct(product: TestProduct): BrandBrief {
  const brand = TEST_BRANDS.find((b) => b.id === product.brandId);
  const colour = namedColour(product);
  const requirements: BriefRequirement[] = [
    {
      id: "req-category",
      field: "construction",
      kind: "MUST",
      label: "Category / construction",
      value: product.category,
    },
    colour
      ? {
          id: "req-colour",
          field: "colour",
          kind: "MUST",
          label: "Colourway",
          value: colour,
        }
      : {
          id: "req-colour",
          field: "colour",
          kind: "OPEN",
          label: "Colourway",
          value: "unnamed — will not invent a default shade",
        },
    {
      id: "req-moq",
      field: "moq",
      kind: "PREFER",
      label: "MOQ discipline",
      value: "realistic mill MOQ (hanger figure is historical)",
    },
    {
      id: "req-geo",
      field: "geography",
      kind: "PREFER",
      label: "Geography",
      value: brand?.market.includes("UK") ? "UK / EU mills with evidence on file" : "EU mills",
    },
  ];

  return {
    brandId: product.brandId,
    brandName: brand?.name ?? product.brandId,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    intent: product.intent,
    requirements,
  };
}

function rowHasColour(factory: TestFactory, colour: string): boolean {
  const needle = colour.toLowerCase();
  return hangerRowsFor(factory).some((row) =>
    Object.values(row).some((value) => value.toLowerCase().includes(needle)),
  );
}

function compositionSamples(factory: TestFactory): string[] {
  return hangerRowsFor(factory)
    .map((row) => row.Composition || row["Comp."] || row.Fibre || row.composition || "")
    .filter(Boolean);
}

export function evidenceForFactory(factory: TestFactory): EvidenceFlag[] {
  const flags: EvidenceFlag[] = [];
  const compositions = compositionSamples(factory);
  const organicOnRow = compositions.some((c) => /organic/i.test(c));
  const millHasGots = factory.certifications.some((c) => /GOTS/i.test(c));
  const millHasAny = factory.certifications.length > 0;

  if (organicOnRow && !millHasGots) {
    flags.push({
      code: "organic-not-gots",
      severity: "block",
      title: "Organic fibre is not GOTS",
      detail:
        "A hanger composition mentions organic cotton. That is not a product-level GOTS claim. Missing stays missing.",
    });
  }

  if (millHasAny) {
    flags.push({
      code: "mill-programme-not-quality",
      severity: "warn",
      title: "Mill programme is organisation-scope",
      detail: `${factory.certifications.join(", ")} sits on the mill, not automatically on each quality.`,
    });
  } else {
    flags.push({
      code: "missing-cert",
      severity: "info",
      title: "No programme on file",
      detail: "Fruma will not invent a certificate to fill the gap.",
    });
  }

  flags.push({
    code: "historical-commercial",
    severity: "info",
    title: "MOQ and lead are historical",
    detail: `Hanger MOQ ${factory.moqM}m / lead ${factory.leadWeeks}w is not a current mill confirmation.`,
  });

  return flags;
}

function answerFor(
  req: BriefRequirement,
  factory: TestFactory,
  coverage: ReturnType<typeof scoreFactoryCoverage>,
  colour: string | null,
): { requirementId: string; result: Answerability; note: string } {
  if (req.field === "geography") {
    const ukEu = factory.markets.includes("UK") || factory.markets.includes("EU");
    return {
      requirementId: req.id,
      result: ukEu ? "on-file" : "missing",
      note: `${factory.country} · ${factory.markets.join("/")}`,
    };
  }
  if (req.field === "colour") {
    if (req.kind === "OPEN") {
      return { requirementId: req.id, result: "needs-confirm", note: "Colour left OPEN — no default invented." };
    }
    if (coverage.unmappedHeaders.some((h) => /colou?r/i.test(h))) {
      return { requirementId: req.id, result: "unmapped", note: "Colour column is not on the Fruma standard yet." };
    }
    if (colour && rowHasColour(factory, colour)) {
      return { requirementId: req.id, result: "on-file", note: `Hanger includes ${colour} as written.` };
    }
    return { requirementId: req.id, result: "missing", note: `No ${colour} colourway on this hanger.` };
  }
  if (req.field === "moq") {
    const mapped = !coverage.unmappedHeaders.some((h) => /moq|min order/i.test(h));
    return {
      requirementId: req.id,
      result: mapped ? "needs-confirm" : "unmapped",
      note: "Hanger MOQ is historical until the mill reconfirms.",
    };
  }
  if (req.field === "construction") {
    if (coverage.unmappedHeaders.some((h) => /weave|knit|structure/i.test(h))) {
      return {
        requirementId: req.id,
        result: "unmapped",
        note: "Construction column is present but not mapped.",
      };
    }
    return {
      requirementId: req.id,
      result: coverage.status === "dark" ? "unmapped" : "on-file",
      note: coverage.status === "dark" ? "Mill is dark until article identity is mapped." : "Construction on file as written.",
    };
  }
  return { requirementId: req.id, result: "needs-confirm", note: "Needs mill confirmation." };
}

function scoreCandidate(
  factory: TestFactory,
  link: BrandFactoryLink,
  brief: BrandBrief,
  overlays: Record<string, StandardField> | undefined,
): SourceCandidate {
  const coverage = scoreFactoryCoverage(factory, overlays);
  const colourReq = brief.requirements.find((r) => r.field === "colour");
  const colour = colourReq?.kind === "MUST" ? colourReq.value : null;
  const colourOk = !colour || rowHasColour(factory, colour);
  const colourMatch: SourceCandidate["colourMatch"] = !colour ? "open" : colourOk ? "match" : "mismatch";

  let eligibility: SourceCandidate["eligibility"] = "eligible";
  if (coverage.status === "dark") eligibility = "ineligible";
  else if (colour && !colourOk) eligibility = "ineligible";

  const relationshipBoost =
    link.relationship === "preferred"
      ? 24
      : link.relationship === "proven"
        ? 18
        : link.relationship === "previous"
          ? 8
          : 0;
  const coverageBoost = coverage.status === "searchable" ? 20 : coverage.status === "partial" ? 8 : 0;
  const geoBoost = factory.country === "Portugal" ? 6 : 0;
  const grantBoost = Math.min(link.grantedArticles.length, 6);
  const retrievalScore =
    eligibility === "ineligible" ? 0 : 40 + relationshipBoost + coverageBoost + geoBoost + grantBoost;

  return {
    factoryId: factory.id,
    factoryName: factory.name,
    country: factory.country,
    dialect: factory.dialect,
    relationship: link.relationship,
    coverage: coverage.status,
    qualities: coverage.qualities,
    grantedArticles: link.grantedArticles.length,
    eligibility,
    retrievalScore,
    colourMatch,
    answerability: brief.requirements.map((req) => answerFor(req, factory, coverage, colour)),
    evidence: evidenceForFactory(factory),
    commercials: { moqM: factory.moqM, leadWeeks: factory.leadWeeks, freshness: "historical" },
    excluded: false,
  };
}

export function sourceShortlist(input: {
  brandId: string;
  productId: string;
  overlays?: Record<string, StandardField>;
  priorFactoryIds?: string[];
  limit?: number;
}): SourceShortlist {
  const product = TEST_PRODUCTS.find((p) => p.id === input.productId && p.brandId === input.brandId);
  if (!product) {
    throw new Error("unknown_product");
  }
  const brief = briefFromProduct(product);
  const links = TEST_LINKS.filter((l) => l.brandId === input.brandId);
  const excludedHidden = links.filter((l) => l.relationship === "excluded").length;
  const visible = links.filter((l) => l.relationship !== "excluded");

  const scored: SourceCandidate[] = [];
  let darkMillsSkipped = 0;
  for (const link of visible) {
    const factory = factoryById(link.factoryId) ?? TEST_FACTORIES.find((f) => f.id === link.factoryId);
    if (!factory) continue;
    const candidate = scoreCandidate(factory, link, brief, input.overlays);
    if (candidate.eligibility === "ineligible" && candidate.coverage === "dark") {
      darkMillsSkipped += 1;
      continue;
    }
    if (candidate.eligibility === "ineligible") continue;
    scored.push(candidate);
  }

  scored.sort((a, b) => b.retrievalScore - a.retrievalScore || a.factoryName.localeCompare(b.factoryName));
  const limit = input.limit ?? 12;
  const candidates = scored.slice(0, limit);
  const currentIds = candidates.map((c) => c.factoryId);
  const prior = input.priorFactoryIds ?? [];
  const priorSet = new Set(prior);
  const currentSet = new Set(currentIds);

  return {
    brief,
    excludedHidden,
    darkMillsSkipped,
    candidates,
    continuity: {
      priorProductId: prior.length ? input.productId : null,
      addedFactoryIds: currentIds.filter((id) => !priorSet.has(id)),
      removedFactoryIds: prior.filter((id) => !currentSet.has(id)),
    },
  };
}

export function tenantIsolationProof(factoryId = "factory-001") {
  return TEST_BRANDS.map((brand) => {
    const link = TEST_LINKS.find((l) => l.brandId === brand.id && l.factoryId === factoryId);
    return {
      brandId: brand.id,
      brandName: brand.name,
      factoryId,
      relationship: link?.relationship ?? "new",
    };
  });
}
