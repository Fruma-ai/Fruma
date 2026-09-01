import type { CatalogField, CatalogFilter, CatalogStatus, ColourName, Fabric, FabricStructure } from "./types";
import { COLOURS } from "./cloth";
import { rankMillOptions, type MillLearn } from "./mill-learn";

export type CatalogRow = {
  id: string;
  article: string;
  raw: {
    construction: string;
    composition: string;
    weight: string;
    width: string;
    moq: string;
    colours: string;
  };
  options: Record<CatalogField, string[]>;
  values: Record<CatalogField, string>;
  issues: string[];
  confidence: number;
  status: CatalogStatus;
};

type Template = {
  construction: string;
  composition: string;
  weight: string;
  width: string;
  moq: string;
  colours: string[];
  options: Record<CatalogField, string[]>;
  issues: string[];
  confidence: number;
  status: CatalogStatus;
};

const TEMPLATES: Template[] = [
  {
    construction: "P/D WAFFEL RIB",
    composition: "COTTON /SPN",
    weight: "285 G/M2",
    width: "72\"",
    moq: "MIN 500YDS",
    colours: ["NVY/WHT/CHR", "ECRU/SAGE", "BLK"],
    options: {
      structure: ["waffle", "rib 2x2", "rib 1x1"],
      composition: ["cotton + elastane", "100% cotton", "cotton / viscose"],
      gsm: ["285 g/m²", "270 g/m²", "unpublished"],
      widthCm: ["183 cm", "180 cm", "72 in (as sent)"],
      moqM: ["460 m", "500 m", "—"],
    },
    issues: ["width in inches", "MOQ in yards", "composition slash"],
    confidence: 86,
    status: "ready",
  },
  {
    construction: "S/J 30/1",
    composition: "100% CO",
    weight: "185gr",
    width: "160cm",
    moq: "150M",
    colours: ["WHT/NVY", "STONE", ""],
    options: {
      structure: ["single jersey", "slub jersey", "interlock"],
      composition: ["100% cotton", "cotton + elastane", "cotton / polyester"],
      gsm: ["185 g/m²", "180 g/m²", "unpublished"],
      widthCm: ["160 cm", "162 cm", "—"],
      moqM: ["150 m", "200 m", "—"],
    },
    issues: ["weight unit informal"],
    confidence: 91,
    status: "ready",
  },
  {
    construction: "PIQUE 20/1",
    composition: "CO 95 / EA 5",
    weight: "220 G/M2",
    width: "68\"",
    moq: "",
    colours: ["NVY", "WHT/BLK", "FOREST"],
    options: {
      structure: ["pique", "mesh", "single jersey"],
      composition: ["95% cotton / 5% elastane", "100% cotton", "cotton + elastane"],
      gsm: ["220 g/m²", "210 g/m²", "unpublished"],
      widthCm: ["173 cm", "170 cm", "68 in (as sent)"],
      moqM: ["—", "150 m", "300 m"],
    },
    issues: ["width in inches", "MOQ blank"],
    confidence: 64,
    status: "review",
  },
  {
    construction: "INTERLOCK 40/1",
    composition: "CM 30/1",
    weight: "8.2 OZ",
    width: "180cm",
    moq: "300M",
    colours: ["CHR/GREY", "NVY", ""],
    options: {
      structure: ["interlock", "single jersey", "french terry"],
      composition: ["100% combed cotton", "100% cotton", "cotton / modal"],
      gsm: ["278 g/m²", "270 g/m²", "unpublished"],
      widthCm: ["180 cm", "178 cm", "—"],
      moqM: ["300 m", "250 m", "—"],
    },
    issues: ["weight in ounces", "yarn count in composition"],
    confidence: 71,
    status: "review",
  },
  {
    construction: "MESH Q75-TYPE",
    composition: "ELS COTTON",
    weight: "GSM UNPUBLISHED",
    width: "—",
    moq: "ON REQUEST",
    colours: ["NVY/CHR/WHT", "GREY MEL"],
    options: {
      structure: ["mesh", "pique", "single jersey"],
      composition: [
        "100% extra-long staple cotton",
        "100% cotton",
        "cotton + elastane",
      ],
      gsm: ["unpublished", "150 g/m²", "180 g/m²"],
      widthCm: ["—", "160 cm", "180 cm"],
      moqM: ["—", "150 m", "500 m"],
    },
    issues: ["GSM unpublished", "width missing"],
    confidence: 58,
    status: "review",
  },
  {
    construction: "1X1 RIB COLLAR",
    composition: "COTTON /SPN",
    weight: "268 G/M2",
    width: "60cm TUBULAR",
    moq: "80KG",
    colours: ["DYE TO MATCH", "NVY", "WHT"],
    options: {
      structure: ["rib 1x1", "rib 2x2", "waffle"],
      composition: ["cotton + elastane", "100% cotton", "cotton / viscose"],
      gsm: ["268 g/m²", "260 g/m²", "unpublished"],
      widthCm: ["60 cm tubular", "120 cm open", "—"],
      moqM: ["—", "150 m", "80 kg (as sent)"],
    },
    issues: ["MOQ in kilograms", "trim not a garment cloth"],
    confidence: 62,
    status: "review",
  },
  {
    construction: "FR. TERRY LOOP",
    composition: "80/20 CVC",
    weight: "340 G/M2",
    width: "180cm",
    moq: "500M",
    colours: ["GREY MARL", "NVY/BLK", "ECRU"],
    options: {
      structure: ["french terry", "loopback", "interlock"],
      composition: ["80% cotton / 20% polyester", "100% cotton", "cotton / viscose"],
      gsm: ["340 g/m²", "320 g/m²", "unpublished"],
      widthCm: ["180 cm", "175 cm", "—"],
      moqM: ["500 m", "400 m", "—"],
    },
    issues: [],
    confidence: 94,
    status: "ready",
  },
  {
    construction: "SLUB JERSEY",
    composition: "100% CO ORGANIC?",
    weight: "168 G/M2",
    width: "165cm",
    moq: "200M",
    colours: ["ECRU", "WHT", ""],
    options: {
      structure: ["slub jersey", "single jersey", "mesh"],
      composition: [
        "100% cotton — organic unconfirmed",
        "100% cotton",
        "GOTS cotton (needs cert)",
      ],
      gsm: ["168 g/m²", "170 g/m²", "unpublished"],
      widthCm: ["165 cm", "160 cm", "—"],
      moqM: ["200 m", "150 m", "—"],
    },
    issues: ["organic claimed, no cert on file"],
    confidence: 54,
    status: "review",
  },
  {
    construction: "2X2 RIB",
    composition: "CO 96 / EA 4",
    weight: "290 G/M2",
    width: "70\"",
    moq: "250M",
    colours: ["BURG/NVY", "BLK", "FOREST"],
    options: {
      structure: ["rib 2x2", "rib 1x1", "waffle"],
      composition: ["96% cotton / 4% elastane", "cotton + elastane", "100% cotton"],
      gsm: ["290 g/m²", "280 g/m²", "unpublished"],
      widthCm: ["178 cm", "180 cm", "70 in (as sent)"],
      moqM: ["250 m", "200 m", "—"],
    },
    issues: ["width in inches"],
    confidence: 88,
    status: "ready",
  },
  {
    construction: "LOOPBACK",
    composition: "100% CO",
    weight: "312 GSM",
    width: "170cm",
    moq: "",
    colours: ["", "", ""],
    options: {
      structure: ["loopback", "french terry", "interlock"],
      composition: ["100% cotton", "cotton / polyester", "cotton + elastane"],
      gsm: ["312 g/m²", "300 g/m²", "unpublished"],
      widthCm: ["170 cm", "175 cm", "—"],
      moqM: ["—", "150 m", "300 m"],
    },
    issues: ["no stock colours", "MOQ blank"],
    confidence: 41,
    status: "gap",
  },
  {
    construction: "SINGLE JERSEY",
    composition: "SUPIMA 100%",
    weight: "UNPUBLISHED",
    width: "160cm",
    moq: "ON REQ",
    colours: ["WHT/NVY/BLK", "STONE"],
    options: {
      structure: ["single jersey", "slub jersey", "interlock"],
      composition: [
        "100% extra-long staple Supima cotton",
        "100% cotton",
        "cotton + elastane",
      ],
      gsm: ["unpublished", "180 g/m²", "160 g/m²"],
      widthCm: ["160 cm", "162 cm", "—"],
      moqM: ["—", "150 m", "200 m"],
    },
    issues: ["GSM unpublished"],
    confidence: 77,
    status: "ready",
  },
  {
    construction: "TWILL 3/1",
    composition: "CO 100",
    weight: "265 G/M2",
    width: "148cm",
    moq: "800M",
    colours: ["NVY", "KHAKI", "STONE"],
    options: {
      structure: ["twill", "corduroy", "single jersey"],
      composition: ["100% cotton", "cotton / elastane", "cotton / polyester"],
      gsm: ["265 g/m²", "260 g/m²", "unpublished"],
      widthCm: ["148 cm", "150 cm", "—"],
      moqM: ["800 m", "500 m", "—"],
    },
    issues: [],
    confidence: 96,
    status: "confirmed",
  },
];

function seedValue(options: string[], status: CatalogStatus) {
  if (status === "confirmed") return options[0] ?? "";
  return "";
}

export function buildCatalog(): CatalogRow[] {
  const rows: CatalogRow[] = [];
  let n = 0;
  for (const t of TEMPLATES) {
    for (let i = 0; i < 6; i += 1) {
      n += 1;
      const colours = t.colours[i % t.colours.length] ?? "";
      const status: CatalogStatus =
        t.status === "gap" && i < 4
          ? "gap"
          : t.status === "confirmed" && i > 1
            ? "ready"
            : t.status;
      const confidence = Math.max(32, t.confidence - (i % 3) * 4);
      rows.push({
        id: `vda-${2400 + n}`,
        article: `VDA-${String(2400 + n).padStart(4, "0")}`,
        raw: {
          construction: t.construction,
          composition: t.composition,
          weight: t.weight,
          width: t.width,
          moq: t.moq || "—",
          colours: colours || "—",
        },
        options: t.options,
        values: {
          structure: seedValue(t.options.structure, status),
          composition: seedValue(t.options.composition, status),
          gsm: seedValue(t.options.gsm, status),
          widthCm: seedValue(t.options.widthCm, status),
          moqM: seedValue(t.options.moqM, status),
        },
        issues: [
          ...t.issues,
          !colours ? "no stock colours" : "",
        ].filter(Boolean),
        confidence,
        status: !colours && status !== "confirmed" ? (t.status === "gap" ? "gap" : status) : status,
      });
    }
  }
  return rows;
}

export const CATALOG_FIELDS: { key: CatalogField; label: string; raw: keyof CatalogRow["raw"] }[] =
  [
    { key: "structure", label: "Structure", raw: "construction" },
    { key: "composition", label: "Composition", raw: "composition" },
    { key: "gsm", label: "Weight", raw: "weight" },
    { key: "widthCm", label: "Width", raw: "width" },
    { key: "moqM", label: "MOQ", raw: "moq" },
  ];

export function catalogCounts(rows: CatalogRow[]) {
  return {
    total: rows.length,
    ready: rows.filter((r) => r.status === "ready").length,
    review: rows.filter((r) => r.status === "review").length,
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    gap: rows.filter((r) => r.status === "gap").length,
  };
}

export function filterCatalog(
  rows: CatalogRow[],
  filter: CatalogFilter,
  query: string,
) {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!q) return true;
    const hay = [
      r.article,
      r.raw.construction,
      r.raw.composition,
      r.raw.colours,
      r.values.structure,
      r.values.composition,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function applySuggestions(row: CatalogRow, learn: MillLearn): CatalogRow {
  const values = { ...row.values };
  for (const field of Object.keys(row.options) as CatalogField[]) {
    if (values[field]) continue;
    const ranked = rankMillOptions(field, row.raw[rawFor(field)], row.options[field], learn);
    values[field] = ranked[0] ?? "";
  }
  const filled = CATALOG_FIELDS.every((f) => values[f.key]);
  const gap = row.raw.colours === "—" || row.issues.includes("no stock colours");
  return {
    ...row,
    values,
    status: gap && row.status === "gap" ? "gap" : filled ? "confirmed" : row.status,
  };
}

function rawFor(field: CatalogField): keyof CatalogRow["raw"] {
  if (field === "structure") return "construction";
  if (field === "composition") return "composition";
  if (field === "gsm") return "weight";
  if (field === "widthCm") return "width";
  return "moq";
}

export { rawFor };

export function bulkIssue(rows: CatalogRow[], needle: string) {
  return rows.filter((r) => r.issues.some((i) => i.includes(needle)) && r.status !== "confirmed");
}

export function applyIssueFix(row: CatalogRow, needle: string, learn: MillLearn): CatalogRow {
  if (!row.issues.some((i) => i.includes(needle))) return row;
  const next = applySuggestions(row, learn);
  if (needle === "width in inches") {
    const ranked = rankMillOptions("widthCm", row.raw.width, row.options.widthCm, learn);
    next.values.widthCm = ranked.find((o) => /cm/.test(o)) ?? ranked[0] ?? next.values.widthCm;
  }
  if (needle === "weight in ounces" || needle === "weight unit informal") {
    const ranked = rankMillOptions("gsm", row.raw.weight, row.options.gsm, learn);
    next.values.gsm = ranked.find((o) => /g\/m/.test(o)) ?? ranked[0] ?? next.values.gsm;
  }
  if (needle === "composition slash" || needle === "yarn count") {
    const ranked = rankMillOptions(
      "composition",
      row.raw.composition,
      row.options.composition,
      learn,
    );
    next.values.composition = ranked[0] ?? next.values.composition;
  }
  if (needle === "MOQ in yards" || needle === "MOQ blank" || needle === "MOQ in kilograms") {
    const ranked = rankMillOptions("moqM", row.raw.moq, row.options.moqM, learn);
    next.values.moqM = ranked.find((o) => /m$/.test(o) && o !== "—") ?? ranked[0] ?? next.values.moqM;
  }
  const filled = CATALOG_FIELDS.every((f) => next.values[f.key] && next.values[f.key] !== "");
  return {
    ...next,
    status: next.status === "gap" ? "gap" : filled ? "confirmed" : "ready",
  };
}

const STRUCTURES: FabricStructure[] = [
  "mesh",
  "pique",
  "waffle",
  "rib 1x1",
  "rib 2x2",
  "single jersey",
  "interlock",
  "french terry",
  "loopback",
  "slub jersey",
  "twill",
  "corduroy",
];

const COLOUR_CODE: Record<string, ColourName> = {
  NVY: "Navy",
  NAVY: "Navy",
  WHT: "White",
  WHIT: "White",
  WHITE: "White",
  BLK: "Black",
  BLACK: "Black",
  CHR: "Charcoal",
  CHARCOAL: "Charcoal",
  ECRU: "Ecru",
  SAGE: "Sage",
  STONE: "Stone",
  FOREST: "Forest",
  OLIVE: "Olive",
  GREY: "Grey Melange",
  MEL: "Grey Melange",
  MELANGE: "Grey Melange",
  KHAKI: "Stone",
};

function asStructure(value: string): FabricStructure | null {
  const t = value.trim().toLowerCase();
  if ((STRUCTURES as string[]).includes(t)) return t as FabricStructure;
  if (/mesh/.test(t)) return "mesh";
  if (/piqu/.test(t)) return "pique";
  if (/waffle/.test(t)) return "waffle";
  if (/2\s*[x×]\s*2/.test(t)) return "rib 2x2";
  if (/rib/.test(t)) return "rib 1x1";
  if (/slub/.test(t)) return "slub jersey";
  if (/interlock/.test(t)) return "interlock";
  if (/terry/.test(t)) return "french terry";
  if (/loopback/.test(t)) return "loopback";
  if (/jersey/.test(t)) return "single jersey";
  if (/twill/.test(t)) return "twill";
  if (/cord/.test(t)) return "corduroy";
  return null;
}

function parseNum(value: string) {
  const m = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function waysFromMill(raw: string): ColourName[] {
  const parts = raw
    .toUpperCase()
    .split(/[/,+·]/)
    .map((p) => p.trim())
    .filter((p) => p && p !== "—");
  const out: ColourName[] = [];
  for (const p of parts) {
    const hit = COLOUR_CODE[p] ?? COLOUR_CODE[p.replace(/\s+/g, "")];
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out.length ? out : ["Navy"];
}

function millFinish(construction: string) {
  if (/P\/D|PIECE/.test(construction)) return "Piece dye";
  if (/GARMENT/.test(construction)) return "Garment dye";
  if (/BIO/.test(construction)) return "Bio wash";
  return "Not on file";
}

/** Qualities a designer can search once the mill file is on the Fruma standard. */
export function liveCatalogFabrics(rows: CatalogRow[], published: boolean): Fabric[] {
  return rows
    .filter((r) => {
      if (r.status === "gap" || r.status === "review") return false;
      if (r.status === "confirmed") return true;
      if (r.status === "ready") return published || r.confidence >= 86;
      return false;
    })
    .map(catalogToFabric)
    .filter((f): f is Fabric => Boolean(f));
}

export function catalogToFabric(row: CatalogRow): Fabric | null {
  const structure = asStructure(row.values.structure || row.options.structure[0] || "");
  if (!structure) return null;
  const composition = row.values.composition || "cotton";
  const gsmLabel = row.values.gsm || row.raw.weight;
  const widthLabel = row.values.widthCm || row.raw.width;
  const moqLabel = row.values.moqM || row.raw.moq;
  const gsm = /unpublish/i.test(gsmLabel) ? 0 : parseNum(gsmLabel);
  const ways = waysFromMill(row.raw.colours);
  const organic = /organic|gots/i.test(composition);
  return {
    id: row.id,
    name: `${row.article} ${structure}`,
    mill: "Têxteis Vale do Ave Lda",
    country: "PORTUGAL",
    structure,
    gsm,
    widthCm: parseNum(widthLabel),
    composition,
    moqM: /on req|—/i.test(moqLabel) ? 0 : parseNum(moqLabel),
    leadWeeks: 2,
    priceGbp: 0,
    certs: organic ? ["GOTS 2027"] : [],
    feel: ["from mill hanger list"],
    ways,
    baseHex: COLOURS[ways[0]] ?? "#27364F",
    raw: {
      g: row.raw.weight,
      w: row.raw.width,
      c: row.raw.composition,
      m: row.raw.moq,
    },
    finish: millFinish(row.raw.construction),
    care: "Ask the mill — not on this hanger list",
    fibreOrigin: "Portugal",
    source: "mill-file",
  };
}

