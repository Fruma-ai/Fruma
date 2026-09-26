import type { ProductTruthRecord } from "../product-truth";
import type {
  AnonymousMillRequest,
  MillConfirmation,
  PersistedDepositPointer,
  PersistedHeaderMap,
  SpineSnapshot,
  SpineStore,
} from "./types";

type Sql = ReturnType<typeof import("postgres")>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS fruma_header_maps (
  surface TEXT PRIMARY KEY,
  overlays JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS fruma_mill_requests (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS fruma_mill_confirmations (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS fruma_product_truth (
  product_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (product_id, version)
);
CREATE TABLE IF NOT EXISTS fruma_deposits (
  deposit_id TEXT PRIMARY KEY,
  pointer JSONB NOT NULL,
  bytes BYTEA NOT NULL
);
`;

/**
 * Postgres-backed spine. Requires DATABASE_URL and the `postgres` package.
 * Object bytes live in `fruma_deposits.bytes` for the first vertical slice
 * (swap to S3/Blob later without changing the call sites).
 */
export class PostgresSpineStore implements SpineStore {
  readonly kind = "postgres" as const;
  private sql: Sql | null = null;
  private ready: Promise<void> | null = null;

  private async client(): Promise<Sql> {
    if (this.sql) return this.sql;
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error("DATABASE_URL is required for PostgresSpineStore");
    const postgres = (await import("postgres")).default;
    this.sql = postgres(url, { max: 4, prepare: false });
    this.ready = this.sql.unsafe(SCHEMA).then(() => undefined);
    await this.ready;
    return this.sql;
  }

  async load(): Promise<SpineSnapshot> {
    const sql = await this.client();
    const [maps, requests, confirmations, truth, deposits] = await Promise.all([
      sql`SELECT surface, overlays, updated_at FROM fruma_header_maps`,
      sql`SELECT payload FROM fruma_mill_requests`,
      sql`SELECT payload FROM fruma_mill_confirmations`,
      sql`SELECT payload FROM fruma_product_truth`,
      sql`SELECT pointer FROM fruma_deposits`,
    ]);
    return {
      headerMaps: maps.map((row) => ({
        surface: String(row.surface),
        overlays: row.overlays as PersistedHeaderMap["overlays"],
        updatedAt: new Date(row.updated_at as string | Date).toISOString(),
      })),
      requests: requests.map((row) => row.payload as AnonymousMillRequest),
      confirmations: confirmations.map((row) => row.payload as MillConfirmation),
      productTruth: truth.map((row) => row.payload as ProductTruthRecord),
      deposits: deposits.map((row) => row.pointer as PersistedDepositPointer),
    };
  }

  async saveHeaderMap(map: PersistedHeaderMap): Promise<void> {
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_header_maps (surface, overlays, updated_at)
      VALUES (${map.surface}, ${sql.json(map.overlays)}, ${map.updatedAt})
      ON CONFLICT (surface) DO UPDATE
      SET overlays = EXCLUDED.overlays, updated_at = EXCLUDED.updated_at
    `;
  }

  async saveRequest(request: AnonymousMillRequest): Promise<void> {
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_mill_requests (id, payload)
      VALUES (${request.id}, ${sql.json(request)})
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload
    `;
  }

  async saveConfirmation(confirmation: MillConfirmation): Promise<void> {
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_mill_confirmations (id, payload)
      VALUES (${confirmation.id}, ${sql.json(confirmation)})
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload
    `;
  }

  async saveProductTruth(record: ProductTruthRecord): Promise<void> {
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_product_truth (product_id, version, payload)
      VALUES (${record.productId}, ${record.version}, ${sql.json(record)})
      ON CONFLICT (product_id, version) DO UPDATE SET payload = EXCLUDED.payload
    `;
  }

  async saveDepositPointer(pointer: PersistedDepositPointer, bytes: Uint8Array): Promise<void> {
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_deposits (deposit_id, pointer, bytes)
      VALUES (${pointer.depositId}, ${sql.json(pointer)}, ${Buffer.from(bytes)})
      ON CONFLICT (deposit_id) DO UPDATE
      SET pointer = EXCLUDED.pointer, bytes = EXCLUDED.bytes
    `;
  }

  async getDepositBytes(depositId: string): Promise<Uint8Array | null> {
    const sql = await this.client();
    const rows = await sql`SELECT bytes FROM fruma_deposits WHERE deposit_id = ${depositId}`;
    if (!rows[0]) return null;
    const buf = rows[0].bytes as Buffer;
    return new Uint8Array(buf);
  }

  async reset(): Promise<void> {
    const sql = await this.client();
    await sql`TRUNCATE fruma_header_maps, fruma_mill_requests, fruma_mill_confirmations, fruma_product_truth, fruma_deposits`;
  }
}
