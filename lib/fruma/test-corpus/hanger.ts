import type { HangerDialect, TestFactory } from "./types";

type Row = Record<string, string>;

/**
 * Dummy mill files are fabric / material qualities — construction, fibre,
 * weight, colour as written. Mills do not submit product SKUs or garment hangers.
 * Dialect-specific cloth is what lets Source infer possible end products.
 */

const STRUCTURES_BY_DIALECT: Record<HangerDialect, readonly string[]> = {
  "pt-standard": ["S/J 30/1", "PIQUE 20/1", "INTERLOCK 40/1", "WARP MESH"],
  "it-shirting": ["POPLIN", "OXFORD", "COMPACT TWILL"],
  "tr-knit": ["S/J 30/1", "RIB 1X1", "RIB 2X2", "INTERLOCK 40/1"],
  "uk-imperial": ["S/J 30/1", "PIQUE 20/1", "OXFORD", "COMPACT TWILL"],
  "pl-fleece": ["BRUSHED FLEECE", "FRENCH TERRY", "LOOPBACK"],
  "messy-mixed": ["S/J 30/1", "WARP MESH", "POPLIN", "BRUSHED FLEECE"],
};

const COMPOSITIONS_BY_DIALECT: Record<HangerDialect, readonly string[]> = {
  "pt-standard": ["100% SUPIMA COTTON", "100% CO", "CO 95 / EA 5", "70% ORGANIC COTTON / 30% COTTON"],
  "it-shirting": ["100% CO", "CO 95 / EA 5", "LINEN 55 / CO 45"],
  "tr-knit": ["100% CO", "CO 95 / EA 5", "MERINO 100%"],
  "uk-imperial": ["100% CO", "100% SUPIMA COTTON", "WOOL 80 / PA 20"],
  "pl-fleece": ["100% CO", "CO 95 / EA 5", "70% ORGANIC COTTON / 30% COTTON"],
  "messy-mixed": ["100% CO", "CV 100%", "COTTON / SPN", "MERINO 100%"],
};

const COLOURS = [
  "Navy",
  "Ecru",
  "White",
  "Charcoal",
  "Stone",
  "Forest",
  "Black",
  "Grey Melange",
  "Sand",
  "Olive",
] as const;

/** Header sets per dialect — mirrors real mill file variance. */
const HEADERS: Record<HangerDialect, string[]> = {
  "pt-standard": [
    "Article",
    "Construction",
    "Composition",
    "Weight",
    "Width",
    "Colour",
    "MOQ",
    "Customer",
    "Cert",
  ],
  "it-shirting": [
    "Fabric No",
    "Weave",
    "Comp.",
    "Wgt gsm",
    "Usable width",
    "Color",
    "Min order",
    "Buyer",
    "Certification",
  ],
  "tr-knit": [
    "Mill article code",
    "Knit type",
    "Fibre",
    "Weight",
    "Width cm",
    "Colours",
    "MOQ M",
    "Customer",
    "Cert",
  ],
  "uk-imperial": [
    "Article code",
    "Construction",
    "Composition",
    "Weight oz",
    'Width "',
    "Colour",
    "MOQ yds",
    "Customer",
    "Cert",
  ],
  "pl-fleece": [
    "Art.",
    "Structure",
    "Composition",
    "GSM",
    "Width",
    "Colourway",
    "MOQ",
    "Customer ref",
    "Certificate",
  ],
  "messy-mixed": [
    "article",
    "construction",
    "composition",
    "weight",
    "width",
    "colour",
    "moq",
    "customer",
    "cert",
  ],
};

function articleCode(factory: TestFactory, row: number) {
  const prefix = factory.id.replace("factory-", "F");
  return `${prefix}-Q${String(100 + row).padStart(3, "0")}`;
}

function weightFor(dialect: HangerDialect, i: number) {
  let gsm = 160 + ((i * 17) % 220);
  if (dialect === "pl-fleece") gsm = 280 + ((i * 13) % 160);
  if (dialect === "it-shirting") gsm = 110 + ((i * 11) % 70);
  if (dialect === "pt-standard") gsm = 140 + ((i * 15) % 90);
  if (dialect === "uk-imperial") return `${(gsm / 33.906).toFixed(1)} OZ`;
  if (dialect === "it-shirting" || dialect === "pl-fleece") return String(gsm);
  if (dialect === "messy-mixed" && i % 4 === 0) return `${gsm}gr`;
  if (dialect === "messy-mixed" && i % 4 === 1) return `${(gsm / 33.906).toFixed(1)} OZ`;
  return `${gsm} G/M2`;
}

function widthFor(dialect: HangerDialect, i: number) {
  const cm = 150 + ((i * 5) % 40);
  if (dialect === "uk-imperial") return `${Math.round(cm / 2.54)}"`;
  if (dialect === "messy-mixed" && i % 3 === 0) return `${Math.round(cm / 2.54)}"`;
  if (dialect === "it-shirting") return `${cm}cm`;
  return `${cm}cm`;
}

function moqFor(factory: TestFactory, dialect: HangerDialect, i: number) {
  const base = factory.moqM + (i % 5) * 50;
  if (dialect === "uk-imperial") return `MIN ${Math.round(base * 1.0936)}YDS`;
  if (dialect === "it-shirting") return String(base);
  if (dialect === "messy-mixed" && i % 5 === 0) return ""; // deliberate gap
  return `${base}M`;
}

function certFor(factory: TestFactory, i: number) {
  if (factory.certifications.length === 0) return "";
  if (i % 7 === 0) return ""; // some rows lack cert even if mill has programme
  return factory.certifications[i % factory.certifications.length];
}

function customerFor(i: number, brandHints: string[]) {
  if (i % 9 === 0 && brandHints[0]) return brandHints[0];
  if (i % 11 === 0 && brandHints[1]) return brandHints[1];
  return "";
}

function buildRow(factory: TestFactory, i: number, brandHints: string[]): Row {
  const headers = HEADERS[factory.dialect];
  const structures = STRUCTURES_BY_DIALECT[factory.dialect];
  const compositions = COMPOSITIONS_BY_DIALECT[factory.dialect];
  const values = [
    articleCode(factory, i),
    structures[i % structures.length],
    compositions[i % compositions.length],
    weightFor(factory.dialect, i),
    widthFor(factory.dialect, i),
    COLOURS[i % COLOURS.length],
    moqFor(factory, factory.dialect, i),
    customerFor(i, brandHints),
    certFor(factory, i),
  ];

  // Deliberate blank article on one row for exception testing
  if (i === 3 && factory.dialect === "messy-mixed") {
    values[0] = "";
  }

  const row: Row = {};
  headers.forEach((h, idx) => {
    row[h] = values[idx] ?? "";
  });
  return row;
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function rowsToCsv(headers: string[], rows: Row[]) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

/** Brand names that may appear as customer columns (private / customer-specific). */
export const CUSTOMER_HINTS = ["Northline Studio", "Harbour Standard", "Field & Form"];

export function hangerRowsFor(factory: TestFactory, brandHints = CUSTOMER_HINTS): Row[] {
  return Array.from({ length: factory.rowCount }, (_, i) => buildRow(factory, i, brandHints));
}

export function hangerCsvFor(factory: TestFactory, brandHints = CUSTOMER_HINTS): string {
  const headers = HEADERS[factory.dialect];
  return rowsToCsv(headers, hangerRowsFor(factory, brandHints));
}

export function hangerBytesFor(factory: TestFactory): Uint8Array {
  return new TextEncoder().encode(hangerCsvFor(factory));
}

export function articleCodesFor(factory: TestFactory): string[] {
  return hangerRowsFor(factory)
    .map((row) => {
      const headers = HEADERS[factory.dialect];
      return row[headers[0]] ?? "";
    })
    .filter(Boolean);
}
