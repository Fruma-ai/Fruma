import { pathToFileURL } from "node:url";
import postgres from "postgres";
import {
  MATERIAL_SEARCH_CANDIDATE_LIMIT,
  briefEmbedding,
  vectorLiteral,
} from "../lib/fruma/persist/embeddings";
import { LEDGER_SCHEMAS, searchPathStatement } from "../lib/fruma/persist/postgres-schema";
import { loadCloudDatabaseEnv } from "./initialize-cloud-database";

/**
 * Times the fruma_demo HNSW material search.
 * One briefEmbedding for "100% Cotton Mesh", then 100 read-only executions
 * of the materialized nearest-50 scan.
 */

export const COTTON_MESH_BRIEF = "100% Cotton Mesh";
export const SEARCH_RUNS = 100;
export const LATENCY_BASELINE_MS = 50;

export function benchmarkSearchPathSql(): string {
  const statement = searchPathStatement("demo");
  if (LEDGER_SCHEMAS.demo !== "fruma_demo" || statement !== "SET search_path TO fruma_demo;") {
    throw new Error("fruma_demo search path is required");
  }
  return "SET LOCAL search_path TO fruma_demo";
}

function qualified(table: string): string {
  if (!/^[a-z_]+$/.test(table)) throw new Error("table name is not a ledger identifier");
  return `"${LEDGER_SCHEMAS.demo}"."${table}"`;
}

/** Same scan as PostgresSpineStore.searchMaterialEmbeddings. $vector is bound once as $1. */
export function materialSearchSql(): string {
  const embeddings = qualified("fruma_material_embeddings");
  const cells = qualified("fruma_source_cells");
  const deposits = qualified("fruma_deposits");
  const events = qualified("fruma_cell_mutation_events");
  return `
      WITH nearest AS MATERIALIZED (
        SELECT
          emb.source_cell_id,
          (emb.embedding OPERATOR(public.<=>) $vector::public.vector) AS cosine_distance
        FROM ${embeddings} emb
        ORDER BY emb.embedding OPERATOR(public.<=>) $vector::public.vector ASC
        LIMIT ${MATERIAL_SEARCH_CANDIDATE_LIMIT}
      )
      SELECT
        n.cosine_distance AS distance,
        c.id,
        c.deposit_id,
        c.sheet_name,
        c.row_index,
        c.col_index,
        c.raw_header,
        c.source_value,
        c.normalized_value,
        d.supplier_org_id,
        e.event_id,
        e.operator_cookie,
        e.action_type,
        e.old_standard_value,
        e.new_standard_value,
        e.standard_field,
        e.occurred_at
      FROM nearest n
      INNER JOIN ${cells} anchor ON anchor.id = n.source_cell_id
      INNER JOIN ${cells} c
        ON c.deposit_id = anchor.deposit_id
       AND c.sheet_name = anchor.sheet_name
       AND c.row_index = anchor.row_index
      INNER JOIN ${deposits} d ON d.id = c.deposit_id
      LEFT JOIN ${events} e ON e.source_cell_id = c.id
      ORDER BY n.cosine_distance ASC, c.col_index ASC, e.occurred_at ASC
  `.replaceAll("$vector", "$1");
}

export type LatencySummary = {
  runs: number;
  averageMs: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
};

/** Nearest-rank percentile. p95 of 100 samples is the 95th sorted value. */
export function percentile(samples: readonly number[], p: number): number {
  if (samples.length === 0) throw new Error("latency sample is required");
  if (!(p > 0 && p <= 100)) throw new Error("percentile must be in (0, 100]");
  const sorted = [...samples].sort((left, right) => left - right);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[rank - 1];
}

export function summarizeLatencies(samples: readonly number[]): LatencySummary {
  if (samples.length === 0) throw new Error("latency sample is required");
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    runs: samples.length,
    averageMs: total / samples.length,
    p95Ms: percentile(samples, 95),
    p99Ms: percentile(samples, 99),
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
  };
}

export type BenchmarkReport = LatencySummary & {
  brief: string;
  dimensions: number;
  rows: number;
  plan: string[];
};

export async function benchmarkMaterialSearch(
  sql: postgres.Sql,
  vector: string,
  runs = SEARCH_RUNS,
): Promise<BenchmarkReport> {
  if (!Number.isInteger(runs) || runs < 1) throw new Error("search runs must be a positive integer");
  const query = materialSearchSql();
  const plan = await readPlan(sql, query, vector);
  await timeSearch(sql, query, vector);
  const samples: number[] = [];
  let rows = 0;
  for (let run = 0; run < runs; run += 1) {
    const timed = await timeSearch(sql, query, vector);
    samples.push(timed.elapsedMs);
    rows = timed.rows;
  }
  return {
    brief: COTTON_MESH_BRIEF,
    dimensions: vector.split(",").length,
    rows,
    plan,
    ...summarizeLatencies(samples),
  };
}

async function readPlan(sql: postgres.Sql, query: string, vector: string): Promise<string[]> {
  const explained = await inReadOnlyDemo(sql, (tx) =>
    tx.unsafe(`EXPLAIN (ANALYZE, BUFFERS) ${query}`, [vector]),
  );
  return explained
    .map((row) => String(row["QUERY PLAN"] ?? ""))
    .filter((line) => /Index|hnsw|Seq Scan|Limit|Materialize|Bitmap/i.test(line));
}

async function timeSearch(
  sql: postgres.Sql,
  query: string,
  vector: string,
): Promise<{ elapsedMs: number; rows: number }> {
  return inReadOnlyDemo(sql, async (tx) => {
    const started = performance.now();
    const rows = await tx.unsafe(query, [vector]);
    return { elapsedMs: performance.now() - started, rows: rows.length };
  });
}

async function inReadOnlyDemo<T>(
  sql: postgres.Sql,
  read: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const result = await sql.begin("READ ONLY", async (tx) => {
    await tx.unsafe(benchmarkSearchPathSql());
    return read(tx);
  });
  return result as T;
}

export function formatBenchmark(report: BenchmarkReport): string[] {
  const lines = [
    `[benchmark] schema fruma_demo`,
    `[benchmark] brief "${report.brief}" dimensions ${report.dimensions}`,
    ...report.plan.map((line) => `[benchmark] plan ${line.trim()}`),
    `[benchmark] runs ${report.runs}`,
    `[benchmark] rows ${report.rows}`,
    `[benchmark] average ${report.averageMs.toFixed(2)} ms`,
    `[benchmark] p95 ${report.p95Ms.toFixed(2)} ms`,
    `[benchmark] p99 ${report.p99Ms.toFixed(2)} ms`,
    `[benchmark] min ${report.minMs.toFixed(2)} ms`,
    `[benchmark] max ${report.maxMs.toFixed(2)} ms`,
    baselineLine("average", report.averageMs),
    baselineLine("p95", report.p95Ms),
    baselineLine("p99", report.p99Ms),
  ];
  return lines;
}

function baselineLine(label: string, value: number): string {
  const relation = value <= LATENCY_BASELINE_MS ? "within" : "above";
  return `[benchmark] ${label} is ${relation} the ${LATENCY_BASELINE_MS} ms baseline`;
}

export async function runSearchBenchmark(env: NodeJS.ProcessEnv = process.env): Promise<BenchmarkReport> {
  const url = env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required to benchmark fruma_demo search.");
  const embedding = await briefEmbedding(COTTON_MESH_BRIEF);
  const vector = vectorLiteral(embedding);
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 0,
    connect_timeout: 30,
    connection: { application_name: "fruma-benchmark-search" },
  });
  try {
    const report = await benchmarkMaterialSearch(sql, vector, SEARCH_RUNS);
    for (const line of formatBenchmark(report)) console.log(line);
    return report;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function describeFailure(err: unknown): string {
  const message = err instanceof Error && err.message ? err.message : "search benchmark failed";
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-url]");
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  loadCloudDatabaseEnv();
  runSearchBenchmark().catch((err: unknown) => {
    console.error(`[benchmark] ${describeFailure(err)}`);
    process.exitCode = 1;
  });
}
