export const DEMO_MILL_FILE = {
  name: "Vale-do-Ave-hanger-list.xlsx",
  size: "48 KB",
  rows: 72,
} as const;

export const MILL_COLUMNS = [
  { id: "Fabric No", samples: "DPWR192924 · VDA-2401" },
  { id: "Construction", samples: "P/D WAFFEL RIB · PIQUE 20/1" },
  { id: "Composition", samples: "COTTON /SPN · 100% CO" },
  { id: "Weight", samples: "285 G/M2 · 8.2 OZ" },
  { id: "W", samples: "42 · 44 · 160cm" },
  { id: "Min", samples: "MIN 500YDS · 150M" },
  { id: "Colours", samples: "NVY/WHT/CHR · ECRU" },
  { id: "Fin.", samples: "P/D · GARMENT · BIO" },
  { id: "Others", samples: "VFB35860 · VFB35861" },
] as const;

export type FrumaMillField = {
  key: string;
  label: string;
  hint: string;
  path: string;
  required: boolean;
  suggested: string;
  preview: string;
  confidence: "high" | "med" | "low";
};

export const FRUMA_MILL_FIELDS: FrumaMillField[] = [
  {
    key: "article",
    label: "Article code",
    hint: "How designers find the quality",
    path: "Catalogue › Quality › Article",
    required: true,
    suggested: "Fabric No",
    preview: "DPWR192924",
    confidence: "high",
  },
  {
    key: "structure",
    label: "Structure",
    hint: "Mill construction → Fruma knit type",
    path: "Catalogue › Knit › Structure",
    required: true,
    suggested: "Construction",
    preview: "P/D WAFFEL RIB → waffle",
    confidence: "high",
  },
  {
    key: "composition",
    label: "Composition",
    hint: "Mill fibre string → Fruma composition",
    path: "Catalogue › Fibre › Composition",
    required: true,
    suggested: "Composition",
    preview: "COTTON /SPN → cotton + elastane",
    confidence: "med",
  },
  {
    key: "gsm",
    label: "Weight",
    hint: "Ounces and informal gsm become g/m²",
    path: "Catalogue › Quality › Weight",
    required: true,
    suggested: "Weight",
    preview: "285 G/M2 · 8.2 OZ",
    confidence: "med",
  },
  {
    key: "widthCm",
    label: "Width",
    hint: "Inches become centimetres",
    path: "Catalogue › Quality › Width",
    required: false,
    suggested: "W",
    preview: "42 · 44",
    confidence: "low",
  },
  {
    key: "moqM",
    label: "Minimum order",
    hint: "Yards become metres",
    path: "Catalogue › Commercial › MOQ",
    required: false,
    suggested: "Min",
    preview: "MIN 500YDS",
    confidence: "med",
  },
  {
    key: "colours",
    label: "Stock colourways",
    hint: "So colour search can hit this mill",
    path: "Catalogue › Colour › Stock",
    required: false,
    suggested: "Colours",
    preview: "NVY/WHT/CHR",
    confidence: "high",
  },
  {
    key: "finish",
    label: "Finish / treatment",
    hint: "Piece dye, garment, bio wash",
    path: "Catalogue › Finish › Treatment",
    required: false,
    suggested: "Fin.",
    preview: "P/D · GARMENT · BIO",
    confidence: "low",
  },
  {
    key: "yarn",
    label: "Yarn reference",
    hint: "Mill yarn codes — not a Fruma filter",
    path: "Catalogue › Yarn › Reference",
    required: false,
    suggested: "Others",
    preview: "VFB35860",
    confidence: "low",
  },
];

export const IGNORE = "__ignore__";

export function defaultMillMap(): Record<string, string> {
  return Object.fromEntries(FRUMA_MILL_FIELDS.map((f) => [f.key, f.suggested]));
}

/** Applied after the mill confirms column mapping — visible to the factory. */
export const APPLY_STEPS = [
  "Using your mill template",
  "Applying column mappings to Fruma catalogue fields",
  "Converting inches, ounces and yards",
  "Sorting qualities by construction",
  "Checking completeness against the mill profile",
  "Preparing exceptions for review",
] as const;

export const FRUMA_PATH: Record<string, string> = {
  waffle: "Catalogue › Knit › Waffle",
  pique: "Catalogue › Knit › Piqué",
  mesh: "Catalogue › Knit › Mesh",
  "single jersey": "Catalogue › Knit › Single jersey",
  "slub jersey": "Catalogue › Knit › Slub jersey",
  interlock: "Catalogue › Knit › Interlock",
  "rib 1x1": "Catalogue › Knit › Rib 1×1",
  "rib 2x2": "Catalogue › Knit › Rib 2×2",
  "french terry": "Catalogue › Knit › French terry",
  loopback: "Catalogue › Knit › Loopback",
};

export function frumaPath(structure: string) {
  return FRUMA_PATH[structure] ?? `Catalogue › Knit › ${structure}`;
}

export const EXCEPTION_GROUPS: { id: string; label: string; needle?: string }[] = [
  { id: "all", label: "All exceptions" },
  { id: "width in inches", label: "Width in inches", needle: "width in inches" },
  { id: "weight in ounces", label: "Weight in ounces", needle: "weight in ounces" },
  { id: "composition slash", label: "Mill composition strings", needle: "composition slash" },
  { id: "MOQ in yards", label: "MOQ in yards", needle: "MOQ in yards" },
  { id: "MOQ blank", label: "MOQ missing", needle: "MOQ blank" },
  { id: "review", label: "Low confidence" },
  { id: "gap", label: "Gaps" },
];
