import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { sourceCellId } from "../lib/fruma/ingest/cell-mutations";
import { STANDARD_FIELDS, type StandardField } from "../lib/fruma/ingest/types";
import { briefEmbedding, vectorLiteral } from "../lib/fruma/persist/embeddings";
import { LEDGER_SCHEMAS } from "../lib/fruma/persist/postgres-schema";
import { loadCloudDatabaseEnv } from "./initialize-cloud-database";

/**
 * Append-only fruma_demo stress seed for HNSW search and mutation-log replay.
 * 1,000 deposits, 100,000 source cells, 3 historic events on every 10th cell,
 * and one briefEmbedding vector per cell. Each sql.begin() batch is 5,000 rows.
 */

export const DEPOSIT_COUNT = 1_000;
export const SOURCE_CELL_COUNT = 100_000;
export const BATCH_SIZE = 5_000;
export const TRACKED_CELL_STRIDE = 10;
export const EVENTS_PER_TRACKED_CELL = 3;
export const EMBED_CONCURRENCY = 32;
const SHEET_NAME = "Hanger";
const OPERATOR_HANDLE = "owen";
const EVENT_EPOCH_MS = Date.parse("2024-06-01T00:00:00.000Z");

const MILLS = [
  { file: "vale-do-ave", org: "org_vale_do_ave" },
  { file: "porto-fios", org: "org_porto_fios" },
  { file: "guimaraes-malhas", org: "org_guimaraes_malhas" },
  { file: "barcelos-tece", org: "org_barcelos_tece" },
  { file: "famalicao-mesh", org: "org_famalicao_mesh" },
] as const;

const FILENAME_CLOTHS = ["cotton-mesh", "wool-nylon", "organic-jersey", "linen-canvas"] as const;
const FILENAME_DOCS = ["hanger", "fabric-book", "shade-card", "quality-sheet"] as const;
const FILENAME_SHADES = ["navy", "ecru"] as const;

const RAW_HEADERS: Record<StandardField, string> = {
  article: "Art.",
  construction: "Construction",
  composition: "Composition",
  weight: "Weight",
  width: "Width",
  colour: "Shade",
  moq: "MOQ",
  customer: "Customer",
  cert: "Cert",
};

const CATALOG: Record<StandardField, readonly string[]> = {
  article: ["ART-1042", "ART-2208", "ART-3310", "ART-4481"],
  construction: ["Single jersey", "Pique", "2/2 Twill", "Plain weave"],
  composition: ["100% Cotton Mesh", "80% Wool / 20% Nylon", "100% Organic Cotton", "65% Polyester / 35% Cotton"],
  weight: ["240 GSM", "180 GSM", "320 GSM", "140 GSM"],
  width: ["150 cm", "180 cm", "160 cm", "140 cm"],
  colour: ["Navy", "Ecru", "Optic White", "Olive"],
  moq: ["300 m", "500 m", "1000 m"],
  customer: ["Atelier North", "House Linden", "Studio Mar"],
  cert: ["GOTS", "Oeko-Tex Standard 100", "GRS"],
};

export type DepositSeed = {
  id: string;
  byte_hash: string;
  filename: string;
  received_at: Date;
  supplier_org_id: string;
  bytes: Buffer;
};

export type SourceCellSeed = {
  id: string;
  deposit_id: string;
  sheet_name: string;
  row_index: number;
  col_index: number;
  raw_header: string;
  source_value: string;
  normalized_value: string;
  standard_field: StandardField;
};

export type MutationSeed = {
  event_id: string;
  source_cell_id: string;
  operator_cookie: string;
  action_type: "map" | "confirm";
  old_standard_value: string | null;
  new_standard_value: string;
  standard_field: StandardField;
  occurred_at: Date;
};

type EmbeddingSeed = {
  source_cell_id: string;
  embedding: string;
  updated_at: string;
};

export type StressSeedOptions = {
  deposits?: number;
  cells?: number;
};

export type StressSeedReport = {
  deposits: number;
  cells: number;
  events: number;
  embeddings: number;
  elapsedMs: number;
};

type BatchSql = postgres.TransactionSql;

export function chunk<T>(rows: readonly T[], size = BATCH_SIZE): T[][] {
  if (!Number.isInteger(size) || size < 1 || size > BATCH_SIZE) {
    throw new Error(`batch size must be an integer from 1 to ${BATCH_SIZE}`);
  }
  const batches: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    batches.push(rows.slice(index, index + size));
  }
  return batches;
}

export function cellsPerDeposit(cellCount: number, depositCount: number): number {
  if (!Number.isInteger(cellCount) || !Number.isInteger(depositCount) || cellCount < 1 || depositCount < 1) {
    throw new Error("deposit and cell counts must be positive integers");
  }
  if (cellCount % depositCount !== 0) {
    throw new Error("source cells must divide evenly across deposits");
  }
  const perDeposit = cellCount / depositCount;
  if (perDeposit > BATCH_SIZE || BATCH_SIZE % perDeposit !== 0) {
    throw new Error("each deposit cluster must fit inside a 5000-row batch without splitting");
  }
  return perDeposit;
}

export function isTrackedCell(index: number): boolean {
  return index >= 0 && (index + 1) % TRACKED_CELL_STRIDE === 0;
}

export function searchPathSql(): string {
  if (LEDGER_SCHEMAS.demo !== "fruma_demo") {
    throw new Error("fruma_demo schema boundary is required");
  }
  return "SET LOCAL search_path TO fruma_demo, public";
}

export function embeddingBrief(cell: SourceCellSeed): string {
  return `${cell.standard_field}\n${cell.raw_header}\n${cell.source_value}\n${cell.id}`;
}

export function buildDeposits(count = DEPOSIT_COUNT): DepositSeed[] {
  if (!Number.isInteger(count) || count < 1) throw new Error("deposit count must be a positive integer");
  return Array.from({ length: count }, (_, index) => {
    const mill = MILLS[index % MILLS.length];
    const cloth = FILENAME_CLOTHS[index % FILENAME_CLOTHS.length];
    const doc = FILENAME_DOCS[Math.floor(index / MILLS.length) % FILENAME_DOCS.length];
    const shade = FILENAME_SHADES[index % FILENAME_SHADES.length];
    const ext = index % 2 === 0 ? "xlsx" : "csv";
    const filename = `${mill.file}-${cloth}-240gsm-${shade}-${doc}-${String(index + 1).padStart(4, "0")}.${ext}`;
    const id = randomUUID();
    const bytes = Buffer.from(`${filename}\narticle,composition,weight,colour\n`, "utf8");
    const byteHash = createHash("sha256").update(id).update(bytes).digest("hex");
    return {
      id,
      byte_hash: byteHash,
      filename,
      received_at: new Date(Date.UTC(2025, 0, 1) + index * 3_600_000),
      supplier_org_id: mill.org,
      bytes,
    };
  });
}

export function buildSourceCell(
  deposits: readonly DepositSeed[],
  index: number,
  perDeposit: number,
): SourceCellSeed {
  if (!Number.isInteger(index) || index < 0) throw new Error("cell index must be a non-negative integer");
  const deposit = deposits[Math.floor(index / perDeposit)];
  if (!deposit) throw new Error("cell index is outside the deposit set");
  const local = index % perDeposit;
  const field = STANDARD_FIELDS[local % STANDARD_FIELDS.length];
  const variant = Math.floor(local / STANDARD_FIELDS.length);
  const sourceValue = CATALOG[field][variant % CATALOG[field].length];
  const rowIndex = Math.floor(local / STANDARD_FIELDS.length) + 1;
  const colIndex = (local % STANDARD_FIELDS.length) + 1;
  return {
    id: sourceCellId(deposit.id, {
      sheet: SHEET_NAME,
      row: rowIndex,
      column: String.fromCharCode(64 + colIndex),
    }),
    deposit_id: deposit.id,
    sheet_name: SHEET_NAME,
    row_index: rowIndex,
    col_index: colIndex,
    raw_header: RAW_HEADERS[field],
    source_value: sourceValue,
    normalized_value: sourceValue,
    standard_field: field,
  };
}

export function buildMutationEvents(cell: SourceCellSeed, index: number): MutationSeed[] {
  if (!isTrackedCell(index)) return [];
  const draft = parsedDraft(cell.source_value);
  const confirmed = cell.source_value;
  const base = EVENT_EPOCH_MS + index * 60_000;
  const stages = [
    { action_type: "map" as const, old_standard_value: null, new_standard_value: draft, at: base },
    { action_type: "map" as const, old_standard_value: draft, new_standard_value: confirmed, at: base + 1_000 },
    { action_type: "confirm" as const, old_standard_value: confirmed, new_standard_value: confirmed, at: base + 2_000 },
  ];
  return stages.map((stage, stageIndex) => ({
    event_id: `evt:${cell.id}:${stageIndex + 1}`,
    source_cell_id: cell.id,
    operator_cookie: OPERATOR_HANDLE,
    action_type: stage.action_type,
    old_standard_value: stage.old_standard_value,
    new_standard_value: stage.new_standard_value,
    standard_field: cell.standard_field,
    occurred_at: new Date(stage.at),
  }));
}

export async function seedStressLedger(
  sql: postgres.Sql,
  options: StressSeedOptions = {},
): Promise<StressSeedReport> {
  const started = performance.now();
  const depositCount = options.deposits ?? DEPOSIT_COUNT;
  const cellCount = options.cells ?? SOURCE_CELL_COUNT;
  const perDeposit = cellsPerDeposit(cellCount, depositCount);
  const deposits = buildDeposits(depositCount);
  let events = 0;

  for (const batch of chunk(deposits)) {
    await inSchema(sql, (tx) => insertDeposits(tx, batch));
  }
  console.log(`[stress] seeded ${depositCount} fruma_demo.deposits`);

  const batchTotal = Math.ceil(cellCount / BATCH_SIZE);
  for (let offset = 0, batchNumber = 1; offset < cellCount; offset += BATCH_SIZE, batchNumber += 1) {
    const size = Math.min(BATCH_SIZE, cellCount - offset);
    const cells = Array.from({ length: size }, (_, index) => buildSourceCell(deposits, offset + index, perDeposit));
    const history = cells.flatMap((cell, index) => buildMutationEvents(cell, offset + index));
    events += history.length;
    const embedStarted = performance.now();
    const embeddings = await embedCells(cells);
    const embedMs = performance.now() - embedStarted;
    const insertStarted = performance.now();
    await inSchema(sql, async (tx) => {
      await insertCells(tx, cells);
      for (const batch of chunk(history)) await insertEvents(tx, batch);
      await insertEmbeddings(tx, embeddings);
    });
    const insertMs = performance.now() - insertStarted;
    console.log(
      `[stress] batch ${batchNumber}/${batchTotal} committed ${cells.length} cells, ${history.length} events, ${embeddings.length} embeddings (embed ${Math.round(embedMs)} ms, insert ${Math.round(insertMs)} ms)`,
    );
  }

  const elapsedMs = performance.now() - started;
  console.log(
    `[stress] total execution time ${Math.round(elapsedMs)} ms | deposits=${depositCount} cells=${cellCount} events=${events} embeddings=${cellCount}`,
  );
  return { deposits: depositCount, cells: cellCount, events, embeddings: cellCount, elapsedMs };
}

async function embedCells(cells: readonly SourceCellSeed[]): Promise<EmbeddingSeed[]> {
  const embeddings = new Array<EmbeddingSeed>(cells.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= cells.length) return;
      const cell = cells[index];
      const vector = await briefEmbedding(embeddingBrief(cell));
      embeddings[index] = {
        source_cell_id: cell.id,
        embedding: vectorLiteral(vector),
        updated_at: new Date().toISOString(),
      };
    }
  }
  const workers = Math.min(EMBED_CONCURRENCY, cells.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return embeddings;
}

async function inSchema(sql: postgres.Sql, write: (tx: BatchSql) => Promise<void>): Promise<void> {
  await sql.begin(async (tx) => {
    await tx.unsafe(searchPathSql());
    await write(tx);
  });
}

async function insertDeposits(tx: BatchSql, rows: readonly DepositSeed[]): Promise<void> {
  assertBatch(rows, "deposits");
  if (rows.length === 0) return;
  await tx`
    INSERT INTO fruma_deposits ${tx([...rows], "id", "byte_hash", "filename", "received_at", "supplier_org_id", "bytes")}
  `;
}

async function insertCells(tx: BatchSql, rows: readonly SourceCellSeed[]): Promise<void> {
  assertBatch(rows, "source cells");
  if (rows.length === 0) return;
  const payload = rows.map((row) => ({
    id: row.id,
    deposit_id: row.deposit_id,
    sheet_name: row.sheet_name,
    row_index: row.row_index,
    col_index: row.col_index,
    raw_header: row.raw_header,
    source_value: row.source_value,
    normalized_value: row.normalized_value,
  }));
  await tx`
    INSERT INTO fruma_source_cells ${tx(payload, "id", "deposit_id", "sheet_name", "row_index", "col_index", "raw_header", "source_value", "normalized_value")}
  `;
}

async function insertEvents(tx: BatchSql, rows: readonly MutationSeed[]): Promise<void> {
  assertBatch(rows, "mutation events");
  if (rows.length === 0) return;
  await tx`
    INSERT INTO fruma_cell_mutation_events ${tx(
      [...rows],
      "event_id",
      "source_cell_id",
      "operator_cookie",
      "action_type",
      "old_standard_value",
      "new_standard_value",
      "standard_field",
      "occurred_at",
    )}
  `;
}

async function insertEmbeddings(tx: BatchSql, rows: readonly EmbeddingSeed[]): Promise<void> {
  assertBatch(rows, "material embeddings");
  if (rows.length === 0) return;
  await tx`
    INSERT INTO fruma_material_embeddings (source_cell_id, embedding, updated_at)
    SELECT source_cell_id, embedding::public.vector, updated_at
    FROM unnest(
      ${tx.array(rows.map((row) => row.source_cell_id))}::text[],
      ${tx.array(rows.map((row) => row.embedding))}::text[],
      ${tx.array(rows.map((row) => row.updated_at))}::timestamptz[]
    ) AS batch(source_cell_id, embedding, updated_at)
  `;
}

function assertBatch(rows: readonly unknown[], label: string): void {
  if (rows.length > BATCH_SIZE) {
    throw new Error(`${label} batch of ${rows.length} exceeds ${BATCH_SIZE} rows`);
  }
}

function parsedDraft(value: string): string {
  const cut = value.replace(/\s+\S+$/, "");
  return cut.length > 0 && cut !== value ? cut : `${value} draft`;
}

export async function runStressSeed(env: NodeJS.ProcessEnv = process.env): Promise<StressSeedReport> {
  const url = env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required to seed the fruma_demo stress ledger.");
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 0,
    connect_timeout: 30,
    connection: { application_name: "fruma-stress-test-ledger" },
  });
  try {
    return await seedStressLedger(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function describeFailure(err: unknown): string {
  const message = err instanceof Error && err.message ? err.message : "stress seed failed";
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-url]");
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  loadCloudDatabaseEnv();
  runStressSeed().catch((err: unknown) => {
    console.error(`[stress] ${describeFailure(err)}`);
    process.exitCode = 1;
  });
}
