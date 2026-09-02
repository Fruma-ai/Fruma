import { IngestException } from "./exceptions";
import type { SourceCell } from "./types";
import { columnLetter } from "./columns";

const HEADER_TO_FIELD: Record<string, SourceCell["standardField"]> = {
  article: "article",
  "article code": "article",
  "fabric no": "article",
  "mill article code": "article",
  construction: "construction",
  composition: "composition",
  weight: "weight",
  width: "width",
  colour: "colour",
  color: "colour",
  colours: "colour",
  colors: "colour",
  moq: "moq",
  customer: "customer",
  cert: "cert",
  certification: "cert",
};

export function decodeUtf8(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3));
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new IngestException(
      "uncertain_bytes",
      "CSV is not valid UTF-8; ingest will not guess an encoding.",
    );
  }
}

export function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (inQuotes) {
    throw new IngestException(
      "uncertain_bytes",
      "CSV has an unclosed quote; ingest will not guess the remainder.",
    );
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.length > 0));
}

export function cellsFromTable(sheet: string, records: string[][]): SourceCell[] {
  if (records.length < 2) {
    throw new IngestException(
      "uncertain_bytes",
      "File has no header-plus-data rows; ingest will not invent a table.",
    );
  }
  const headers = records[0]!.map((h) => h.trim());
  const cells: SourceCell[] = [];
  for (let r = 1; r < records.length; r += 1) {
    const record = records[r]!;
    for (let c = 0; c < headers.length; c += 1) {
      const header = headers[c] ?? "";
      const sourceValue = record[c] ?? "";
      const standardField = HEADER_TO_FIELD[header.toLowerCase()];
      cells.push({
        pointer: {
          sheet,
          row: r + 1,
          column: columnLetter(c),
        },
        sourceValue,
        header,
        ...(standardField ? { standardField } : {}),
      });
    }
  }
  return cells;
}

export function parseCsvBytes(filename: string, bytes: Uint8Array): SourceCell[] {
  const text = decodeUtf8(bytes);
  if (text.includes("\u0000")) {
    throw new IngestException("uncertain_bytes", "CSV contains NUL bytes.");
  }
  return cellsFromTable(filename, parseCsvRecords(text));
}
