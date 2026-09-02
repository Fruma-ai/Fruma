import { IngestException } from "./exceptions";
import { parseCsvBytes } from "./parse-csv";
import { parseXlsxBytes } from "./parse-xlsx";
import type { SourceCell } from "./types";

export type MillFormat = "csv" | "xlsx";

const PDF = new TextEncoder().encode("%PDF");
const OLE = Uint8Array.of(0xd0, 0xcf, 0x11, 0xe0);
const ZIP_PK = Uint8Array.of(0x50, 0x4b);

function startsWith(bytes: Uint8Array, magic: Uint8Array): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot).toLowerCase() : "";
}

export function detectMillFormat(filename: string, bytes: Uint8Array): MillFormat {
  if (!bytes.length) {
    throw new IngestException("unparsed_bytes", "Empty file; ingest will not invent rows.");
  }
  if (startsWith(bytes, PDF)) {
    throw new IngestException("unparsed_bytes", "PDF is out of scope. Parse xlsx and csv only.");
  }
  if (startsWith(bytes, OLE)) {
    throw new IngestException("unparsed_bytes", "Legacy .xls / OLE is out of scope. Parse xlsx and csv only.");
  }
  const ext = extensionOf(filename);
  const zip = startsWith(bytes, ZIP_PK);

  if (ext === ".xlsx") {
    if (!zip) {
      throw new IngestException(
        "uncertain_bytes",
        "Filename says xlsx but bytes are not a ZIP package.",
      );
    }
    return "xlsx";
  }
  if (ext === ".csv") {
    if (zip) {
      throw new IngestException(
        "uncertain_bytes",
        "Filename says csv but bytes are a ZIP package.",
      );
    }
    return "csv";
  }
  if (ext === ".xls" || ext === ".pdf" || ext === ".json" || ext === ".png" || ext === ".jpg") {
    throw new IngestException(
      "unparsed_bytes",
      `${ext} is out of scope. Parse xlsx and csv only.`,
    );
  }
  throw new IngestException(
    "unparsed_bytes",
    "Format is not csv or xlsx; ingest will not guess or template a catalogue.",
  );
}

export function parseMillBytes(filename: string, bytes: Uint8Array): {
  format: MillFormat;
  cells: SourceCell[];
} {
  const format = detectMillFormat(filename, bytes);
  const cells = format === "xlsx" ? parseXlsxBytes(bytes) : parseCsvBytes(filename, bytes);
  return { format, cells };
}
