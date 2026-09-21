import type { StandardField } from "../ingest/types";
import type { FieldCitation } from "../pilot/citations";
import { TEST_BRANDS } from "../test-corpus/brands";
import { TEST_FACTORIES, factoryById } from "../test-corpus/factories";
import { TEST_LINKS, TEST_PRODUCTS } from "../test-corpus/products";
import type { BrandFactoryLink, TestFactory, TestProduct } from "../test-corpus/types";
import { scoreFactoryCoverage, type CoverageStatus } from "./coverage";
import {
  categoryToEndProduct,
  fabricBookFor,
  fabricsMatchingEndProduct,
  type EndProductFamily,
  type FabricQuality,
} from "./fabrics";

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
  answerability: { requirementId: string; result: Answerability; note: string; citations: FieldCitation[] }[];
  evidence: EvidenceFlag[];
  commercials: { moqM: number; leadWeeks: number; freshness: "historical" };
  excluded: false;
  /** Cloth that can become the intended end product. Not mill product SKUs. */
  matchedFabrics: FabricQuality[];
  matchingFabricCount: number;
  endProduct: EndProductFamily | null;
};

export type SourceShortlist = {
  brief: BrandBrief;
  excludedHidden: number;
  darkMillsSkipped: number;
  fabricMisses: number;
  matchingFabricTotal: number;
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
  const endProduct = categoryToEndProduct(product.category);
  const requirements: BriefRequirement[] = [
    {
      id: "req-category",
      field: "construction",
      kind: "MUST",
      label: "End product from cloth",
      value: endProduct
        ? `${endProduct} — match mill fabrics that can become this. Mills do not file product SKUs.`
        : product.category,
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
      value: "realistic mill MOQ (fabric-book figure is historical)",
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

function rowHasColour(factory: TestFactory, colour: string, overlays?: Record<string, StandardField>): boolean {
  const book = fabricBookFor(factory, overlays);
  const needle = colour.toLowerCase();
  return book.qualities.some((q) => q.colourAsWritten.toLowerCase().includes(needle));
}

function compositionSamples(factory: TestFactory, overlays?: Record<string, StandardField>): string[] {
  return fabricBookFor(factory, overlays)
    .qualities.map((q) => q.compositionAsWritten)
    .filter(Boolean);
}

export function evidenceForFactory(
  factory: TestFactory,
  overlays?: Record<string, StandardField>,
): EvidenceFlag[] {
  const flags: EvidenceFlag[] = [];
  const compositions = compositionSamples(factory, overlays);
  const organicOnRow = compositions.some((c) => /organic/i.test(c));
  const millHasGots = factory.certifications.some((c) => /GOTS/i.test(c));
  const millHasAny = factory.certifications.length > 0;

  if (organicOnRow && !millHasGots) {
    flags.push({
      code: "organic-not-gots",
      severity: "block",
      title: "Organic fibre is not GOTS",
      detail:
        "A mill fabric composition mentions organic cotton. That is not a product-level GOTS claim. Missing stays missing.",
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
    detail: `Fabric-book MOQ ${factory.moqM}m / lead ${factory.leadWeeks}w is not a current mill confirmation.`,
  });

  return flags;
}

function answerFor(
  req: BriefRequirement,
  factory: TestFactory,
  coverage: ReturnType<typeof scoreFactoryCoverage>,
  colour: string | null,
  overlays: Record<string, StandardField> | undefined,
  matchedFabrics: FabricQuality[],
): { requirementId: string; result: Answerability; note: string; citations: FieldCitation[] } {
  const cite = (fields: StandardField[]) =>
    matchedFabrics.flatMap((f) => (f.citations ?? []).filter((c) => fields.includes(c.field))).slice(0, 6);

  if (req.field === "geography") {
    const ukEu = factory.markets.includes("UK") || factory.markets.includes("EU");
    return {
      requirementId: req.id,
      result: ukEu ? "on-file" : "missing",
      note: `${factory.country} · ${factory.markets.join("/")}`,
      citations: [],
    };
  }
  if (req.field === "colour") {
    if (req.kind === "OPEN") {
      return {
        requirementId: req.id,
        result: "needs-confirm",
        note: "Colour left OPEN — no default invented.",
        citations: [],
      };
    }
    if (coverage.unmappedHeaders.some((h) => /colou?r/i.test(h))) {
      return {
        requirementId: req.id,
        result: "unmapped",
        note: "Colour column is not on the Fruma standard yet.",
        citations: [],
      };
    }
    if (colour && matchedFabrics.some((f) => f.colourAsWritten.toLowerCase().includes(colour))) {
      return {
        requirementId: req.id,
        result: "on-file",
        note: `A mill colourway includes ${colour} as written.`,
        citations: cite(["colour", "article"]),
      };
    }
    if (colour && rowHasColour(factory, colour, overlays)) {
      return {
        requirementId: req.id,
        result: "on-file",
        note: `A mill colourway includes ${colour} as written.`,
        citations: cite(["colour", "article"]),
      };
    }
    return {
      requirementId: req.id,
      result: "missing",
      note: `No ${colour} colourway on this fabric book.`,
      citations: [],
    };
  }
  if (req.field === "moq") {
    const mapped = !coverage.unmappedHeaders.some((h) => /moq|min order/i.test(h));
    return {
      requirementId: req.id,
      result: mapped ? "needs-confirm" : "unmapped",
      note: "Fabric-book MOQ is historical until the mill reconfirms.",
      citations: cite(["moq"]),
    };
  }
  if (req.field === "construction") {
    if (coverage.status === "dark") {
      return {
        requirementId: req.id,
        result: "unmapped",
        note: "Mill is dark until article identity is mapped.",
        citations: [],
      };
    }
    if (matchedFabrics.length === 0) {
      return {
        requirementId: req.id,
        result: "missing",
        note: "No mill fabric in this book can become that end product.",
        citations: [],
      };
    }
    if (coverage.unmappedHeaders.some((h) => /weave|knit|structure/i.test(h))) {
      return {
        requirementId: req.id,
        result: "unmapped",
        note: `${matchedFabrics.length} fabrics match from mill wording; construction column is not on the standard yet.`,
        citations: cite(["construction", "article"]),
      };
    }
    return {
      requirementId: req.id,
      result: "on-file",
      note: `${matchedFabrics.length} mill fabrics can become this end product.`,
      citations: cite(["construction", "article", "composition"]),
    };
  }
  return {
    requirementId: req.id,
    result: "needs-confirm",
    note: "Needs mill confirmation.",
    citations: [],
  };
}

function scoreCandidate(
  factory: TestFactory,
  link: BrandFactoryLink,
  brief: BrandBrief,
  overlays: Record<string, StandardField> | undefined,
  endProduct: EndProductFamily | null,
): SourceCandidate {
  const coverage = scoreFactoryCoverage(factory, overlays);
  const book = fabricBookFor(factory, overlays);
  const colourReq = brief.requirements.find((r) => r.field === "colour");
  const colour = colourReq?.kind === "MUST" ? colourReq.value : null;
  const matchedFabrics = endProduct
    ? fabricsMatchingEndProduct(book, endProduct, colour)
    : book.qualities.slice(0, 4);
  const colourOk = !colour || matchedFabrics.length > 0 || rowHasColour(factory, colour, overlays);
  const colourMatch: SourceCandidate["colourMatch"] = !colour ? "open" : colourOk ? "match" : "mismatch";

  let eligibility: SourceCandidate["eligibility"] = "eligible";
  if (coverage.status === "dark") eligibility = "ineligible";
  else if (endProduct && matchedFabrics.length === 0) eligibility = "ineligible";

  const relationshipBoost =
    link.relationship === "preferred"
      ? 24
      : link.relationship === "proven"
        ? 18
        : link.relationship === "previous"
          ? 8
          : 0;
  const coverageBoost = coverage.status === "searchable" ? 20 : coverage.status === "partial" ? 8 : 0;
  const fabricBoost = Math.min(matchedFabrics.length, 12);
  const geoBoost = factory.country === "Portugal" ? 6 : 0;
  const grantBoost = Math.min(link.grantedArticles.length, 6);
  const retrievalScore =
    eligibility === "ineligible"
      ? 0
      : 40 + relationshipBoost + coverageBoost + fabricBoost + geoBoost + grantBoost;

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
    answerability: brief.requirements.map((req) =>
      answerFor(req, factory, coverage, colour, overlays, matchedFabrics),
    ),
    evidence: evidenceForFactory(factory, overlays),
    commercials: { moqM: factory.moqM, leadWeeks: factory.leadWeeks, freshness: "historical" },
    excluded: false,
    matchedFabrics: matchedFabrics.slice(0, 4),
    matchingFabricCount: matchedFabrics.length,
    endProduct,
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
  const endProduct = categoryToEndProduct(product.category);
  const links = TEST_LINKS.filter((l) => l.brandId === input.brandId);
  const excludedHidden = links.filter((l) => l.relationship === "excluded").length;
  const visible = links.filter((l) => l.relationship !== "excluded");

  const scored: SourceCandidate[] = [];
  let darkMillsSkipped = 0;
  let fabricMisses = 0;
  for (const link of visible) {
    const factory = factoryById(link.factoryId) ?? TEST_FACTORIES.find((f) => f.id === link.factoryId);
    if (!factory) continue;
    const candidate = scoreCandidate(factory, link, brief, input.overlays, endProduct);
    if (candidate.eligibility === "ineligible" && candidate.coverage === "dark") {
      darkMillsSkipped += 1;
      continue;
    }
    if (candidate.eligibility === "ineligible") {
      fabricMisses += 1;
      continue;
    }
    scored.push(candidate);
  }

  scored.sort((a, b) => b.retrievalScore - a.retrievalScore || a.factoryName.localeCompare(b.factoryName));
  const limit = input.limit ?? 12;
  const candidates = scored.slice(0, limit);
  const currentIds = candidates.map((c) => c.factoryId);
  const prior = input.priorFactoryIds ?? [];
  const hasBaseline = prior.length > 0;
  const priorSet = new Set(prior);
  const currentSet = new Set(currentIds);

  return {
    brief,
    excludedHidden,
    darkMillsSkipped,
    fabricMisses,
    matchingFabricTotal: candidates.reduce((n, c) => n + c.matchingFabricCount, 0),
    candidates,
    continuity: {
      priorProductId: hasBaseline ? input.productId : null,
      addedFactoryIds: hasBaseline ? currentIds.filter((id) => !priorSet.has(id)) : [],
      removedFactoryIds: hasBaseline ? prior.filter((id) => !currentSet.has(id)) : [],
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
