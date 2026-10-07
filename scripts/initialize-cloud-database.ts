import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";
import {
  LEDGER_SCHEMAS,
  LEDGER_TABLES,
  ledgerSchemaName,
  postgresLedgerSchema,
} from "../lib/fruma/persist/postgres-schema";
import { FRUMA_VERSION_IDS } from "../lib/fruma/versions";

/**
 * Install pgvector once, in public, before any environment schema is created.
 * The type used by fruma_material_embeddings is public.vector(1536).
 */
export const PUBLIC_VECTOR_EXTENSION_SQL = "CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;";

const LEDGER_SCHEMA_NAMES = Object.values(LEDGER_SCHEMAS);
const PLACEHOLDER = /<[^>\s]+>|YOUR_SECRET_PASSWORD|changeme/i;

export interface CloudSql {
  unsafe(query: string): PromiseLike<readonly Record<string, unknown>[]>;
  begin<T>(fn: (tx: CloudSql) => Promise<T>): Promise<T>;
}

/**
 * Load operator environment files. An already exported DATABASE_URL wins.
 * `.env.local` is read before the committed `.env.production` template so a
 * placeholder host or password cannot replace a live connection string.
 */
export function loadCloudDatabaseEnv(root = join(import.meta.dirname, "..")): void {
  loadDotenv({ path: join(root, ".env.local"), quiet: true });
  loadDotenv({ path: join(root, ".env"), quiet: true });
  loadDotenv({ path: join(root, ".env.production"), quiet: true });
}

/** Accept only a TLS Neon URL. The returned string is the connection value, never logged. */
export function assertLiveDatabaseUrl(raw: string | undefined): string {
  const value = raw?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!value) {
    throw new Error("DATABASE_URL is required to initialize the Neon ledger.");
  }
  if (PLACEHOLDER.test(value)) {
    throw new Error(
      "DATABASE_URL still contains a placeholder. Set the live Neon connection string in the environment.",
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a postgresql connection string.");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql protocol.");
  }
  if (!url.username || !url.password) {
    throw new Error("DATABASE_URL must include a username and password.");
  }
  if (!url.hostname.endsWith(".neon.tech")) {
    throw new Error("DATABASE_URL must point at a Neon host.");
  }
  if (url.pathname === "/" || url.pathname === "") {
    throw new Error("DATABASE_URL must include a database name.");
  }
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode !== "require" && sslmode !== "verify-full" && sslmode !== "verify-ca") {
    throw new Error("DATABASE_URL must require TLS (sslmode=require).");
  }
  return value;
}

/** Host, port, and database only. The user and password stay out of the log. */
export function describeDatabaseUrl(value: string): string {
  const url = new URL(value);
  const database = url.pathname.replace(/^\//, "");
  return `${url.hostname}:${url.port || "5432"}/${database}`;
}

/**
 * The Vercel build cannot open the Neon pooler on port 6543.
 * The same database accepts the direct compute host on port 5432.
 * Password and query string stay intact. Only the pooler host label and port change.
 */
export function toDirectComputeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const wasPooler = url.hostname.includes("-pooler");
  url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
  if (url.port === "6543" || wasPooler) url.port = "5432";
  // Node's Postgres client reports a channel-binding mismatch as a password failure.
  url.searchParams.delete("channel_binding");
  return url.href;
}

/**
 * Install public.vector, then create fruma_demo, fruma_test, and fruma_production
 * in one transaction. Each schema uses postgresLedgerSchema, including the HNSW
 * cosine index on fruma_material_embeddings.
 */
export async function provisionLedgerSchemas(sql: CloudSql): Promise<void> {
  await sql.begin(async (tx) => {
    await tx.unsafe(PUBLIC_VECTOR_EXTENSION_SQL);
    for (const version of FRUMA_VERSION_IDS) {
      console.log(`Provisioning Namespace Surface: ${ledgerSchemaName(version)}...`);
      await tx.unsafe(postgresLedgerSchema(ledgerSchemaName(version)));
    }
  });
}

export async function assertCloudLedgerProvisioned(sql: CloudSql): Promise<void> {
  const schemaList = LEDGER_SCHEMA_NAMES.map((name) => `'${name}'`).join(", ");
  const extension = await sql.unsafe(`
    SELECT n.nspname AS schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector'
  `);
  if (extension.length !== 1 || extension[0]?.schema !== "public") {
    throw new Error("public.vector is not installed.");
  }

  const tables = await sql.unsafe(`
    SELECT table_schema AS schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN (${schemaList})
      AND table_type = 'BASE TABLE'
  `);
  const present = new Set(tables.map((row) => `${row.schema}.${row.table_name}`));
  const missing = LEDGER_SCHEMA_NAMES.flatMap((schema) =>
    LEDGER_TABLES.filter((table) => !present.has(`${schema}.${table}`)).map((table) => `${schema}.${table}`),
  );
  if (missing.length > 0) {
    throw new Error(`Neon ledger is missing ${missing.join(", ")}.`);
  }

  const indexes = await sql.unsafe(`
    SELECT n.nspname AS schema, am.amname AS access_method, opc.opcname AS operator_class
    FROM pg_class index_rel
    JOIN pg_namespace n ON n.oid = index_rel.relnamespace
    JOIN pg_am am ON am.oid = index_rel.relam
    JOIN pg_index idx ON idx.indexrelid = index_rel.oid
    JOIN pg_opclass opc ON opc.oid = idx.indclass[0]
    WHERE index_rel.relkind = 'i'
      AND index_rel.relname = 'material_embedding_hnsw_idx'
      AND n.nspname IN (${schemaList})
  `);
  const ready = new Set(
    indexes
      .filter((row) => row.access_method === "hnsw" && row.operator_class === "vector_cosine_ops")
      .map((row) => String(row.schema)),
  );
  const missingIndexes = LEDGER_SCHEMA_NAMES.filter((schema) => !ready.has(schema));
  if (missingIndexes.length > 0) {
    throw new Error(`HNSW cosine index is missing from ${missingIndexes.join(", ")}.`);
  }
}

export async function initializeCloudDatabase(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const url = assertLiveDatabaseUrl(env.DATABASE_URL);
  const directUrl = toDirectComputeUrl(url);
  const target = new URL(directUrl);
  console.log("Normalizing connection coordinates for build-phase traversal...");
  console.log(`Targeting Direct Compute Node: ${target.hostname}:${target.port || "5432"}`);
  const sql = postgres(directUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 5,
    ssl: { rejectUnauthorized: false },
    connection: { application_name: "fruma-initialize-cloud-database" },
  });
  try {
    await provisionLedgerSchemas(sql);
    await assertCloudLedgerProvisioned(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
  console.log("Core ledger schemas and HNSW indexes are ready.");
  console.log(`Neon ledger schemas are ready: ${LEDGER_SCHEMA_NAMES.join(", ")}`);
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

/** AggregateError from a failed connect often has an empty message. Keep the URL out of the log. */
export function describeInitFailure(err: unknown): string {
  const lines: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (value instanceof AggregateError) {
      for (const nested of value.errors) visit(nested);
      return;
    }
    if (value instanceof Error && value.message) lines.push(value.message);
  };
  visit(err);
  const unique = [...new Set(lines.map((line) => line.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-url]")))];
  if (unique.length > 0) return unique.join("; ");
  if (err instanceof Error && err.message) return err.message;
  return "Neon ledger initialization failed.";
}

if (invokedDirectly()) {
  loadCloudDatabaseEnv();
  initializeCloudDatabase().catch((err: unknown) => {
    console.error(`Cloud Migration Refused: ${describeInitFailure(err)}`);
    process.exitCode = 1;
  });
}
