export type Stage = "intent" | "check" | "source" | "confirm" | "development" | "list" | "live";
export type Relationship = "preferred" | "proven" | "previous" | "excluded" | "new";

export type Requirement = {
  key: string;
  value: string;
  priority: "MUST" | "PREFER" | "OPEN";
  answerability: "Can check now" | "Needs mill confirmation" | "Physical validation" | "Not on file";
};

export type Mill = {
  id: string;
  name: string;
  region: string;
  country: string;
  relationship: Relationship;
  specialties: string[];
  qualities: number;
  moq: number;
  leadWeeks: number;
  evidenceCoverage: number;
  currentEvidence: number;
  staleEvidence: number;
  certifications: string[];
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stage: Stage;
  season: string;
  intent: string;
  requirements: Requirement[];
  shortlistMillIds: string[];
  selectedMillId?: string;
};

export type SourcingRequest = {
  id: string;
  productId: string;
  millId: string;
  status: "draft" | "sent" | "answered" | "declined";
  volume: string;
  requestedDelivery: string;
  quotedPrice?: number;
  currency?: "GBP" | "EUR";
  moq?: number;
  leadWeeks?: number;
  sampleDays?: number;
  note?: string;
};

export type DemoBrand = {
  id: string;
  name: string;
  market: string;
  products: number;
  activeCases: number;
};

const brandNames = [
  "Alder & Row", "Northline Studio", "Harbour Standard", "Nomae", "Cinder Works", "Field & Form",
  "Orison", "Morrow House", "Parlour Goods", "Greyweather", "Common Thread", "Mason & Vale",
  "Atelier Nine", "Fallow", "Kerr Studio", "Port & Pine", "Byre", "Low Tide", "Sable Works", "Arc & Loom",
  "March Office", "Kindred Uniform", "Hearth", "Outline", "Vela", "Westward Goods", "Juniper Room", "Foundry Club"
];

const millRoots = [
  "Vale do Ave", "Ribeira", "Serra", "Lima", "Tâmega", "Minho", "Arno", "Prato", "Biella", "Como", "Bursa", "Izmir",
  "Ege", "Denizli", "Lodz", "Braga", "Guimarães", "Famalicão", "Vicenza", "Treviso"
];

const specialtySets = [
  ["fine cotton", "jersey", "interlock"],
  ["merino", "wool blends", "double knit"],
  ["linen", "hemp blends", "summer weights"],
  ["warp knit", "mesh", "technical cotton"],
  ["brushed fleece", "sweat", "heavy jersey"],
  ["viscose", "modal", "cellulosics"],
  ["woven shirting", "poplin", "oxford"],
  ["outerwear", "wool coating", "compact twill"]
];

const regions = [
  ["Northern Portugal", "Portugal"],
  ["Tuscany", "Italy"],
  ["Piedmont", "Italy"],
  ["Aegean", "Türkiye"],
  ["Lower Silesia", "Poland"]
] as const;

const certSets = [
  ["OEKO-TEX Standard 100", "GRS"],
  ["GOTS", "OEKO-TEX Standard 100"],
  ["RWS", "ZDHC Supplier to Zero"],
  ["BCI chain-of-custody", "ISO 14001"],
  ["FSC", "OEKO-TEX Standard 100"]
];

export const demoBrands: DemoBrand[] = brandNames.map((name, i) => ({
  id: `brand-${String(i + 1).padStart(2, "0")}`,
  name,
  market: i % 3 === 0 ? "UK + EU" : i % 3 === 1 ? "EU" : "UK",
  products: 18 + ((i * 7) % 43),
  activeCases: 2 + ((i * 5) % 9),
}));

export const mills: Mill[] = Array.from({ length: 84 }, (_, i) => {
  const region = regions[i % regions.length];
  const rel: Relationship = i % 17 === 0 ? "excluded" : i % 9 === 0 ? "preferred" : i % 5 === 0 ? "proven" : i % 3 === 0 ? "previous" : "new";
  return {
    id: `mill-${String(i + 1).padStart(3, "0")}`,
    name: `${millRoots[i % millRoots.length]} Textile ${i % 4 === 0 ? "Works" : i % 4 === 1 ? "Lab" : i % 4 === 2 ? "Mill" : "Group"}`,
    region: region[0],
    country: region[1],
    relationship: rel,
    specialties: specialtySets[i % specialtySets.length],
    qualities: 12 + ((i * 13) % 76),
    moq: 250 + ((i * 75) % 1350),
    leadWeeks: 4 + (i % 9),
    evidenceCoverage: 62 + ((i * 7) % 37),
    currentEvidence: 6 + (i % 11),
    staleEvidence: i % 4,
    certifications: certSets[i % certSets.length],
  };
});

const baseRequirements: Requirement[] = [
  { key: "Material", value: "Extra-long staple cotton", priority: "MUST", answerability: "Can check now" },
  { key: "Construction", value: "Warp-knit mesh", priority: "MUST", answerability: "Can check now" },
  { key: "Colour", value: "Navy", priority: "PREFER", answerability: "Needs mill confirmation" },
  { key: "Weight", value: "Open", priority: "OPEN", answerability: "Not on file" },
  { key: "Handfeel", value: "Dry, breathable, clean", priority: "PREFER", answerability: "Physical validation" },
  { key: "MOQ", value: "≤ 600m", priority: "MUST", answerability: "Can check now" },
  { key: "Market", value: "UK + EU", priority: "MUST", answerability: "Can check now" },
];

const categories = ["Polo", "Sweater", "Shirt", "Jacket", "T-shirt", "Trouser", "Dress", "Overshirt"];
const stages: Stage[] = ["intent", "check", "source", "confirm", "development", "list", "live"];

export const products: Product[] = Array.from({ length: 126 }, (_, i) => {
  const category = categories[i % categories.length];
  const stage = stages[i % stages.length];
  const chosenMill = mills[(i * 11) % mills.length];
  return {
    id: `product-${String(i + 1).padStart(3, "0")}`,
    sku: `FR-${category.slice(0, 3).toUpperCase()}-${String(1001 + i)}`,
    name: `${i % 2 === 0 ? "Refined" : "Relaxed"} ${["navy", "stone", "forest", "black", "cream", "clay"][i % 6]} ${category.toLowerCase()}`,
    category,
    stage,
    season: i % 2 === 0 ? "SS27" : "AW27",
    intent: `A ${i % 2 === 0 ? "refined" : "relaxed"} ${category.toLowerCase()} with premium handfeel, credible evidence and a commercially realistic route to UK and EU retail.`,
    requirements: baseRequirements.map((r, j) => ({ ...r, value: j === 2 ? ["Navy", "Stone", "Forest", "Black"][i % 4] : r.value })),
    shortlistMillIds: [mills[(i * 7) % mills.length].id, mills[(i * 7 + 9) % mills.length].id, mills[(i * 7 + 19) % mills.length].id],
    selectedMillId: ["development", "list", "live"].includes(stage) ? chosenMill.id : undefined,
  };
});

export const featuredProduct: Product = {
  ...products[0],
  id: "product-featured",
  sku: "MPOL1026-BUAA",
  name: "Textured navy polo",
  stage: "source",
  intent: "A refined navy polo in breathable extra-long staple cotton. Structured enough to hold shape but not piqué. Premium dry handfeel, suitable for UK and EU retail, target MOQ under 600 metres.",
  shortlistMillIds: [mills[3].id, mills[18].id, mills[35].id],
};

export const requests: SourcingRequest[] = Array.from({ length: 168 }, (_, i) => {
  const product = products[i % products.length];
  const mill = mills[(i * 5 + 3) % mills.length];
  const status = i % 11 === 0 ? "declined" : i % 4 === 0 ? "sent" : i % 3 === 0 ? "draft" : "answered";
  return {
    id: `rfq-${String(i + 1).padStart(4, "0")}`,
    productId: product.id,
    millId: mill.id,
    status,
    volume: `${350 + (i % 6) * 100}–${500 + (i % 6) * 125}m`,
    requestedDelivery: `${6 + (i % 7)}–${8 + (i % 7)} weeks`,
    quotedPrice: status === "answered" ? Number((6.2 + (i % 15) * 0.41).toFixed(2)) : undefined,
    currency: i % 5 === 0 ? "GBP" : "EUR",
    moq: status === "answered" ? mill.moq : undefined,
    leadWeeks: status === "answered" ? mill.leadWeeks : undefined,
    sampleDays: status === "answered" ? 3 + (i % 8) : undefined,
    note: status === "declined" ? "Capacity unavailable for requested delivery window." : undefined,
  };
});

export const dashboardStats = {
  brands: demoBrands.length,
  mills: mills.length,
  products: products.length,
  requests: requests.length,
  answeredRequests: requests.filter((r) => r.status === "answered").length,
  liveProducts: products.filter((p) => p.stage === "live").length,
};
