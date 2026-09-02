import { IngestException } from "./exceptions";
import { cellsFromTable } from "./parse-csv";
import type { SourceCell } from "./types";
import { parseCellRef } from "./columns";
import { unzip, zip } from "./zip";

function xmlUnescape(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeXml(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new IngestException("uncertain_bytes", "XLSX part is not UTF-8.");
  }
}

function attr(tag: string, name: string): string | undefined {
  const re = new RegExp(`(?:^|\\s)${name}="([^"]*)"`, "i");
  return tag.match(re)?.[1];
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const sis = xml.match(/<si\b[^>]*>[\s\S]*?<\/si>/gi) ?? [];
  for (const si of sis) {
    const texts = [...si.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((m) =>
      xmlUnescape(m[1] ?? ""),
    );
    out.push(texts.join(""));
  }
  return out;
}

function parseSheetGrid(xml: string, shared: string[]): string[][] {
  const grid: string[][] = [];
  const cells = [...xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)];
  if (xml.includes("<c ") && cells.length === 0) {
    throw new IngestException("uncertain_bytes", "XLSX sheet cells could not be read.");
  }
  for (const match of cells) {
    const head = match[1] ?? "";
    const body = match[2] ?? "";
    const ref = attr(head, "r");
    if (!ref) {
      throw new IngestException(
        "uncertain_bytes",
        "XLSX cell is missing a ref; ingest will not guess its place.",
      );
    }
    const { column, row } = parseCellRef(ref);
    const type = attr(head, "t") ?? "";
    let value = "";
    if (type === "inlineStr") {
      const t = body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/i);
      value = t ? xmlUnescape(t[1] ?? "") : "";
    } else if (type === "s") {
      const v = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
      if (!v) {
        throw new IngestException("uncertain_bytes", `Shared-string cell ${ref} has no value.`);
      }
      const idx = Number(xmlUnescape(v[1] ?? ""));
      if (!Number.isInteger(idx) || idx < 0 || idx >= shared.length) {
        throw new IngestException("uncertain_bytes", `Shared-string index out of range at ${ref}.`);
      }
      value = shared[idx] ?? "";
    } else if (type === "b" || type === "e" || type === "str") {
      throw new IngestException(
        "uncertain_bytes",
        `XLSX cell ${ref} uses an unsupported type '${type}'.`,
      );
    } else {
      const v = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
      const f = body.match(/<f\b[^>]*>[\s\S]*?<\/f>/i);
      if (f && !v) {
        throw new IngestException(
          "uncertain_bytes",
          `XLSX cell ${ref} is a formula without a cached value.`,
        );
      }
      value = v ? xmlUnescape(v[1] ?? "") : "";
    }
    const colIdx = columnToIndex(column);
    const rowIdx = row - 1;
    while (grid.length <= rowIdx) grid.push([]);
    const line = grid[rowIdx]!;
    while (line.length <= colIdx) line.push("");
    line[colIdx] = value;
  }
  return grid;
}

function columnToIndex(column: string): number {
  let n = 0;
  for (const ch of column.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function parseWorkbookSheets(xml: string): { name: string; rid: string }[] {
  const sheets: { name: string; rid: string }[] = [];
  const tags = xml.match(/<sheet\b[^>]*\/?>/gi) ?? [];
  for (const tag of tags) {
    const name = attr(tag, "name");
    const rid = attr(tag, "r:id") ?? attr(tag, "id");
    if (!name || !rid) {
      throw new IngestException("uncertain_bytes", "XLSX workbook sheet is missing name or id.");
    }
    sheets.push({ name, rid });
  }
  if (!sheets.length) {
    throw new IngestException("uncertain_bytes", "XLSX workbook has no sheets.");
  }
  return sheets;
}

function parseRels(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  const tags = xml.match(/<Relationship\b[^>]*\/?>/gi) ?? [];
  for (const tag of tags) {
    const id = attr(tag, "Id");
    const target = attr(tag, "Target");
    if (id && target) map.set(id, target);
  }
  return map;
}

function joinXlPath(target: string): string {
  const cleaned = target.replace(/^\//, "");
  if (cleaned.startsWith("xl/")) return cleaned;
  return `xl/${cleaned}`;
}

export function parseXlsxBytes(bytes: Uint8Array): SourceCell[] {
  let entries;
  try {
    entries = unzip(bytes);
  } catch (err) {
    throw new IngestException(
      "uncertain_bytes",
      "Bytes look like a ZIP but are not a readable XLSX.",
      { cause: err instanceof Error ? err.message : String(err) },
    );
  }
  const files = new Map(entries.map((e) => [e.name.replace(/^\/+/, ""), e.bytes]));
  const workbook = files.get("xl/workbook.xml");
  if (!workbook || !files.get("[Content_Types].xml")) {
    throw new IngestException(
      "uncertain_bytes",
      "ZIP is not an Office Open XML workbook.",
    );
  }
  const sheets = parseWorkbookSheets(decodeXml(workbook));
  const relsXml = files.get("xl/_rels/workbook.xml.rels");
  if (!relsXml) {
    throw new IngestException("uncertain_bytes", "XLSX workbook relationships are missing.");
  }
  const rels = parseRels(decodeXml(relsXml));
  const sharedXml = files.get("xl/sharedStrings.xml");
  const shared = sharedXml ? parseSharedStrings(decodeXml(sharedXml)) : [];

  const cells: SourceCell[] = [];
  for (const sheet of sheets) {
    const target = rels.get(sheet.rid);
    if (!target) {
      throw new IngestException(
        "uncertain_bytes",
        `XLSX sheet '${sheet.name}' has no relationship target.`,
      );
    }
    const part = files.get(joinXlPath(target));
    if (!part) {
      throw new IngestException(
        "uncertain_bytes",
        `XLSX sheet '${sheet.name}' part is missing.`,
      );
    }
    const grid = parseSheetGrid(decodeXml(part), shared);
    cells.push(...cellsFromTable(sheet.name, grid));
  }
  return cells;
}

/** Build a small synthetic XLSX. Used by tests only — not a mill template. */
export function buildXlsx(sheets: { name: string; rows: string[][] }[]): Uint8Array {
  const enc = (s: string) => new TextEncoder().encode(s);
  const parts: { name: string; bytes: Uint8Array }[] = [
    {
      name: "[Content_Types].xml",
      bytes: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          sheets
            .map(
              (_, i) =>
                `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
            )
            .join("") +
          `</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      bytes: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      bytes: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets>` +
          sheets
            .map(
              (s, i) =>
                `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
            )
            .join("") +
          `</sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      bytes: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          sheets
            .map(
              (_, i) =>
                `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
            )
            .join("") +
          `</Relationships>`,
      ),
    },
  ];

  sheets.forEach((sheet, i) => {
    const rowsXml = sheet.rows
      .map((row, r) => {
        const cells = row
          .map((value, c) => {
            const ref = `${String.fromCharCode(65 + c)}${r + 1}`;
            return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
          })
          .join("");
        return `<row r="${r + 1}">${cells}</row>`;
      })
      .join("");
    parts.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      bytes: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
          `<sheetData>${rowsXml}</sheetData></worksheet>`,
      ),
    });
  });

  return zip(parts);
}
