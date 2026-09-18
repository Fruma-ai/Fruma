import type { TestProduct } from "../test-corpus/types";

export type RequirementKind = "MUST" | "PREFER" | "OPEN";

export type BriefRequirement = {
  id: string;
  kind: RequirementKind;
  field:
    | "market"
    | "category"
    | "construction"
    | "composition"
    | "colour"
    | "moq"
    | "cert"
    | "relationship";
  label: string;
  /** Structured target used by retrieval filters. */
  target: string;
};

export type ProductBrief = {
  productId: string;
  brandId: string;
  brandName: string;
  sku: string;
  name: string;
  intent: string;
  requirements: BriefRequirement[];
};

const CATEGORY_CONSTRUCTION: Record<string, string[]> = {
  Polo: ["mesh", "pique", "jersey", "interlock", "warp"],
  "T-shirt": ["jersey", "s/j", "interlock"],
  Overshirt: ["twill", "oxford", "poplin"],
  Shirt: ["poplin", "oxford", "weave"],
  Sweater: ["rib", "terry", "fleece", "loopback"],
  Jacket: ["twill", "fleece", "coating"],
  Trouser: ["twill", "compact"],
  Dress: ["jersey", "viscose", "modal"],
};

const CATEGORY_SPECIALTY: Record<string, string[]> = {
  Polo: ["fine cotton", "jersey", "mesh", "warp knit", "technical cotton"],
  "T-shirt": ["fine cotton", "jersey", "interlock"],
  Overshirt: ["woven shirting", "compact twill", "outerwear"],
  Shirt: ["woven shirting", "poplin", "oxford"],
  Sweater: ["merino", "brushed fleece", "sweat"],
  Jacket: ["outerwear", "wool coating", "compact twill"],
  Trouser: ["compact twill", "outerwear"],
  Dress: ["viscose", "modal", "cellulosics"],
};

/**
 * Turn a Test product into a bounded requirement contract.
 * Deterministic — no LLM. Agents retrieve against these IDs only.
 */
export function briefFromProduct(args: {
  product: TestProduct;
  brandName: string;
  market: string;
}): ProductBrief {
  const { product, brandName, market } = args;
  const colourMatch = product.name.match(
    /\b(navy|stone|forest|black|cream|clay)\b/i,
  );
  const colour = colourMatch?.[1]?.toLowerCase() ?? "navy";
  const constructions = CATEGORY_CONSTRUCTION[product.category] ?? ["jersey"];
  const specialties = CATEGORY_SPECIALTY[product.category] ?? ["fine cotton"];

  const requirements: BriefRequirement[] = [
    {
      id: "req-market",
      kind: "MUST",
      field: "market",
      label: `Serve ${market} markets`,
      target: market.includes("UK") ? "UK" : market.includes("EU") ? "EU" : "UK",
    },
    {
      id: "req-category",
      kind: "MUST",
      field: "category",
      label: `Mill specialty fits ${product.category}`,
      target: specialties.join("|"),
    },
    {
      id: "req-construction",
      kind: "PREFER",
      field: "construction",
      label: `Construction suitable for ${product.category}`,
      target: constructions.join("|"),
    },
    {
      id: "req-composition",
      kind: "PREFER",
      field: "composition",
      label: "Cotton-led or named fibre on file",
      target: "cotton|co |supima|merino",
    },
    {
      id: "req-colour",
      kind: "PREFER",
      field: "colour",
      label: `Colourway ${colour} on hanger`,
      target: colour,
    },
    {
      id: "req-moq",
      kind: "MUST",
      field: "moq",
      label: "Realistic MOQ for brand discipline (≤ 600m factory baseline)",
      target: "600",
    },
    {
      id: "req-cert",
      kind: "OPEN",
      field: "cert",
      label: "Cert only if on file — never invent",
      target: "optional",
    },
    {
      id: "req-relationship",
      kind: "PREFER",
      field: "relationship",
      label: "Prefer private preferred/proven mills; never show excluded",
      target: "preferred|proven",
    },
  ];

  return {
    productId: product.id,
    brandId: product.brandId,
    brandName,
    sku: product.sku,
    name: product.name,
    intent: product.intent,
    requirements,
  };
}
