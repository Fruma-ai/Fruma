export type ViewId =
  | "designer"
  | "ingest"
  | "mill"
  | "product"
  | "feeds"
  | "suppliers";

export type Mode = "entry" | "brand" | "mill";
export type BrandRoom = "design" | "desk" | "product" | "feeds" | "suppliers";
export type MillRoom = "profile" | "upload" | "map" | "review" | "catalog";
export type MillReadStatus = "idle" | "reading" | "ready";
export type MillApplyStatus = "idle" | "running" | "ready";
export type MillFile = {
  name: string;
  size: string;
  rows: number;
  source: "demo" | "upload";
};
export type CatalogStatus = "ready" | "review" | "confirmed" | "gap";
export type CatalogField = "structure" | "composition" | "gsm" | "widthCm" | "moqM";
export type CatalogFilter = "all" | "review" | "ready" | "confirmed" | "gap";
export type SearchStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type SwatchStage = "desk" | "ordered" | "in-hand" | "signed-off";
export type SetupPhase = "idle" | "reading" | "matching" | "ready";
export type ImageStatus = "idle" | "running" | "ready";
export type AiFieldKey = "title" | "desc" | "care" | "attrs" | "cat";

export type AiFields = {
  title: string;
  desc: string;
  care: string;
  attrs: string;
  cat: string;
};

export type FabricStructure =
  | "mesh"
  | "pique"
  | "waffle"
  | "rib 1x1"
  | "rib 2x2"
  | "single jersey"
  | "interlock"
  | "french terry"
  | "loopback"
  | "slub jersey"
  | "twill"
  | "corduroy";

export type ColourName =
  | "Black"
  | "White"
  | "Navy"
  | "Ecru"
  | "Grey Marl"
  | "Grey Melange"
  | "Olive"
  | "Burgundy"
  | "Sky"
  | "Sand"
  | "Forest"
  | "Charcoal"
  | "Stone"
  | "Rust"
  | "Sage"
  | "Cobalt"
  | "Dark Clay";

export type FabricPerformance = {
  stretch?: string;
  shrinkage?: string;
  colourfastness?: string;
  pilling?: string;
};

export type Fabric = {
  id: string;
  name: string;
  mill: string;
  country: string;
  structure: FabricStructure;
  /** 0 = unpublished / not disclosed */
  gsm: number;
  widthCm: number;
  composition: string;
  moqM: number;
  leadWeeks: number;
  priceGbp: number;
  certs: string[];
  feel: string[];
  ways: ColourName[];
  baseHex: string;
  raw: { g: string; w: string; c: string; m: string };
  /** Piece dye, compact, bio wash — empty if the mill file has none. */
  finish?: string;
  /** Legal care. Listing copy may rephrase; this is the mill source. */
  care?: string;
  /** Fibre origin, distinct from knit country. */
  fibreOrigin?: string;
  performance?: FabricPerformance;
  /** Index seed vs a mill hanger list after Fruma mapped it. */
  source?: "index" | "mill-file";
};

export type FeedRule = "trunc" | "map" | "strip" | "fmt" | "blocked" | "gap" | null;

export type FeedRow = {
  field: string;
  outgoing: string;
  was?: string;
  rule: FeedRule;
  why: string;
};

export type DestinationStatus = "ok" | "warn" | "empty";

export type Destination = {
  id: string;
  label: string;
  short?: string;
  status: DestinationStatus;
  banner: string;
  note: string;
  rows: FeedRow[];
  href?: string;
  image?: string;
  imagesNote?: string;
  price?: string;
  colour?: string;
  sku?: string;
  availability?: string;
};

export type ParsedBrief = {
  reading: string;
  weight: string;
  colour: string;
  moq: string;
};

export type Colourway = {
  n: string;
  t: string;
  hex: string;
  sku: string;
  image: string;
  gallery: string[];
};

export type ProductDest = {
  id: string;
  name: string;
  pct: number;
  tone: "ok" | "weld" | "madder";
  gap: string;
  action: "SEE LISTING" | "NOT LISTED";
  ready: boolean;
};

export type SupplierMetric = {
  k: string;
  v: string;
  note: string;
  trend: "up" | "down" | "flat";
};

export type Supplier = {
  name: string;
  loc: string;
  grade: string;
  gradeTone: "weld" | "ok";
  metrics: SupplierMetric[];
  foot: string;
};

export type ClothHistoryItem = {
  name: string;
  meta: string;
  hex: string;
  tag: string;
  live: boolean;
  image?: string;
  /** Where a designer can handle it today */
  where?: string;
};
