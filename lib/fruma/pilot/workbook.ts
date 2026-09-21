import { buildXlsx } from "../ingest/parse-xlsx";

/**
 * Pilot mill workbook for the first sellable vertical slice.
 *
 * Honest about what it is: a realistic Portuguese fabric-book shaped as an
 * XLSX mills actually send — not a live customer file, not product SKUs.
 * Headers are dialect-messy so mapping confirm is required before search.
 */
export const PILOT_WORKBOOK = {
  millOrgId: "pilot-mill-vale-do-ave",
  millName: "Têxteis Vale do Ave (pilot workbook)",
  country: "Portugal",
  filename: "Vale-do-Ave-fabric-book-pilot.xlsx",
  sheetName: "Qualities",
  /** Brand that will source against this book on Test. */
  brandId: "brand-northline",
  /** Prefer a named-navy polo so colour MUST is exercised. */
  productCategory: "Polo" as const,
} as const;

/** Headers that builtin aliases miss — confirm via lexicon before search. */
export const PILOT_HEADERS = [
  "Art.",
  "Knit type",
  "Fibre",
  "GSM",
  "Width cm",
  "Colourway",
  "Min order",
  "Buyer",
  "Certificate",
] as const;

/**
 * Fabric / material rows only. Includes navy piqué/mesh suitable for a polo,
 * plus organic fibre without GOTS so Evidence stays honest.
 */
export const PILOT_ROWS: string[][] = [
  [...PILOT_HEADERS],
  ["Q75-MESH", "WARP MESH", "100% SUPIMA COTTON", "160", "150", "Navy", "300", "Northline", ""],
  ["Q75-PIQ", "PIQUE 20/1", "100% SUPIMA COTTON", "190", "150", "Navy", "300", "Northline", ""],
  ["Q40-SJ", "S/J 30/1", "100% CO", "140", "160", "Ecru", "500", "", "OEKO-TEX Standard 100"],
  [
    "Q88-ORG",
    "INTERLOCK 40/1",
    "70% ORGANIC COTTON / 30% COTTON",
    "180",
    "150",
    "White",
    "400",
    "",
    "",
  ],
  ["Q12-FLE", "BRUSHED FLEECE", "100% CO", "280", "160", "Charcoal", "250", "", ""],
];

export function pilotWorkbookBytes(): Uint8Array {
  return buildXlsx([{ name: PILOT_WORKBOOK.sheetName, rows: PILOT_ROWS }]);
}

export function pilotWorkbookShaHint(): { filename: string; rowCount: number; headers: string[] } {
  return {
    filename: PILOT_WORKBOOK.filename,
    rowCount: PILOT_ROWS.length - 1,
    headers: [...PILOT_HEADERS],
  };
}
