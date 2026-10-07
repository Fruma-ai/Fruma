import type { ProductTruthRecord } from "../product-truth";
import {
  conflictingDeposit,
  depositIdempotencyException,
  IdempotencyException,
  idempotencyFromUniqueViolation,
} from "./idempotency";
import {
  isSurfaceEnvironment,
  legacyLedgerMessage,
  POSTGRES_LEDGER_SCHEMA,
  type SurfaceEnvironment,
} from "./postgres-schema";
import type {
  AnonymousMillRequest,
  MillConfirmation,
  PersistedDepositPointer,
  PersistedHeaderMap,
  PersistedCellMutation,
  PersistedNamedGrant,
  PersistedSourceCell,
  SpineSnapshot,
  SpineStore,
} from "./types";

type Sql = ReturnType<typeof import("postgres")>;

/**
 * Postgres-backed spine. Requires DATABASE_URL and the `postgres` package.
 * Deposit bytes, source cells, and named grants are insert-only.
 * A repeated deposit_id or byte_hash throws IdempotencyException.
 */
export class PostgresSpineStore implements SpineStore {
  readonly kind = "postgres" as const;
  readonly surface: SurfaceEnvironment;
  private sql: Sql | null = null;
  private ready: Promise<void> | null = null;

  constructor(surface: SurfaceEnvironment) {
    if (!isSurfaceEnvironment(surface)) {
      throw new Error("surface_environment must be demo, test, or production");
    }
    this.surface = surface;
  }

  private async client(): Promise<Sql> {
    if (this.sql && this.ready) {
      await this.ready;
      return this.sql;
    }
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error("DATABASE_URL is required for PostgresSpineStore");
    const postgres = (await import("postgres")).default;
    this.sql = postgres(url, { max: 4, prepare: false });
    this.ready = this.prepare(this.sql);
    await this.ready;
    return this.sql;
  }

  private async prepare(sql: Sql): Promise<void> {
    await sql.unsafe(POSTGRES_LEDGER_SCHEMA);
    const rows = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'fruma_header_maps',
          'fruma_mill_requests',
          'fruma_mill_confirmations',
          'fruma_product_truth',
          'fruma_deposits',
          'fruma_source_cells',
          'fruma_named_grants',
          'fruma_cell_mutation_events'
        )
    `;
    const columnsByTable = new Map<string, Set<string>>();
    for (const row of rows) {
      const table = String(row.table_name);
      const set = columnsByTable.get(table) ?? new Set<string>();
      set.add(String(row.column_name));
      columnsByTable.set(table, set);
    }
    const legacy = legacyLedgerMessage(columnsByTable);
    if (legacy) throw new Error(legacy);
  }

  async load(): Promise<SpineSnapshot> {
    const sql = await this.client();
    const surface = this.surface;
    const [maps, requests, confirmations, truth, deposits, cells, grants, mutations] = await Promise.all([
      sql`
        SELECT surface, overlays, updated_at
        FROM fruma_header_maps
        WHERE surface_environment = ${surface}
      `,
      sql`SELECT payload FROM fruma_mill_requests WHERE surface_environment = ${surface}`,
      sql`SELECT payload FROM fruma_mill_confirmations WHERE surface_environment = ${surface}`,
      sql`SELECT payload FROM fruma_product_truth WHERE surface_environment = ${surface}`,
      sql`
        SELECT id, byte_hash, filename, received_at, supplier_org_id, octet_length(bytes) AS byte_length
        FROM fruma_deposits
        WHERE surface_environment = ${surface}
      `,
      sql`
        SELECT id, deposit_id, sheet_name, row_index, col_index, raw_header, source_value
        FROM fruma_source_cells
        WHERE surface_environment = ${surface}
      `,
      sql`
        SELECT id, mill_org_id, brand_org_id, scope_class, created_at
        FROM fruma_named_grants
        WHERE surface_environment = ${surface}
      `,
      sql`
        SELECT event_id, source_cell_id, operator_cookie, action_type,
               old_standard_value, new_standard_value, standard_field, occurred_at
        FROM fruma_cell_mutation_events
        WHERE surface_environment = ${surface}
        ORDER BY occurred_at, event_id
      `,
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
      deposits: deposits.map((row) => depositFromRow(row)),
      sourceCells: cells.map((row) => cellFromRow(row)),
      namedGrants: grants.map((row) => grantFromRow(row)),
      cellMutations: mutations.map((row) => mutationFromRow(row)),
    };
  }

  async saveHeaderMap(map: PersistedHeaderMap): Promise<void> {
    this.assertSameSurface(map.surface);
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_header_maps (surface_environment, surface, overlays, updated_at)
      VALUES (${this.surface}, ${map.surface}, ${sql.json(map.overlays)}, ${map.updatedAt})
      ON CONFLICT (surface_environment, surface) DO UPDATE
      SET overlays = EXCLUDED.overlays, updated_at = EXCLUDED.updated_at
    `;
  }

  async saveRequest(request: AnonymousMillRequest): Promise<void> {
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_mill_requests (surface_environment, id, payload)
      VALUES (${this.surface}, ${request.id}, ${sql.json(request)})
      ON CONFLICT (surface_environment, id) DO UPDATE SET payload = EXCLUDED.payload
    `;
  }

  async saveConfirmation(confirmation: MillConfirmation): Promise<void> {
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_mill_confirmations (surface_environment, id, payload)
      VALUES (${this.surface}, ${confirmation.id}, ${sql.json(confirmation)})
      ON CONFLICT (surface_environment, id) DO UPDATE SET payload = EXCLUDED.payload
    `;
  }

  async saveProductTruth(record: ProductTruthRecord): Promise<void> {
    const sql = await this.client();
    await sql`
      INSERT INTO fruma_product_truth (surface_environment, product_id, version, payload)
      VALUES (${this.surface}, ${record.productId}, ${record.version}, ${sql.json(record)})
      ON CONFLICT (surface_environment, product_id, version) DO UPDATE SET payload = EXCLUDED.payload
    `;
  }

  async saveDepositPointer(pointer: PersistedDepositPointer, bytes: Uint8Array): Promise<void> {
    const sql = await this.client();
    const incoming = { id: pointer.depositId, byteHash: pointer.sha256 };
    try {
      await sql.begin(async (tx) => {
        const existing = await tx`
          SELECT id, byte_hash
          FROM fruma_deposits
          WHERE id = ${pointer.depositId} OR byte_hash = ${pointer.sha256}
        `;
        const conflict = conflictingDeposit(
          existing.map((row) => ({ id: String(row.id), byteHash: String(row.byte_hash) })),
          incoming,
        );
        if (conflict) throw depositIdempotencyException(conflict, incoming);
        await tx`
          INSERT INTO fruma_deposits (
            id, byte_hash, filename, received_at, surface_environment, supplier_org_id, bytes
          )
          VALUES (
            ${pointer.depositId},
            ${pointer.sha256},
            ${pointer.filename},
            ${pointer.receivedAt},
            ${this.surface},
            ${pointer.supplierOrgId},
            ${Buffer.from(bytes)}
          )
        `;
      });
    } catch (err) {
      if (err instanceof IdempotencyException) throw err;
      const mapped = idempotencyFromUniqueViolation(err, incoming);
      if (mapped) throw mapped;
      throw err;
    }
  }

  async saveSourceCells(cells: PersistedSourceCell[]): Promise<void> {
    if (!cells.length) return;
    for (const cell of cells) assertCell(cell);
    const sql = await this.client();
    try {
      await sql.begin(async (tx) => {
        for (const cell of cells) {
          const deposit = await tx`
            SELECT id FROM fruma_deposits
            WHERE id = ${cell.depositId} AND surface_environment = ${this.surface}
          `;
          if (!deposit.length) {
            throw new Error(`Deposit ${cell.depositId} is not in surface ${this.surface}.`);
          }
          const clash = await tx`
            SELECT id FROM fruma_source_cells
            WHERE id = ${cell.id}
               OR (
                 deposit_id = ${cell.depositId}
                 AND sheet_name = ${cell.sheetName}
                 AND row_index = ${cell.rowIndex}
                 AND col_index = ${cell.colIndex}
               )
          `;
          if (clash.length) {
            throw new IdempotencyException(
              "source_cell",
              `Source cell ${cell.id} already exists. Source values are immutable.`,
              { id: cell.id, depositId: cell.depositId },
            );
          }
          await tx`
            INSERT INTO fruma_source_cells (
              id, deposit_id, sheet_name, row_index, col_index, raw_header, source_value, surface_environment
            )
            VALUES (
              ${cell.id},
              ${cell.depositId},
              ${cell.sheetName},
              ${cell.rowIndex},
              ${cell.colIndex},
              ${cell.rawHeader},
              ${cell.sourceValue},
              ${this.surface}
            )
          `;
        }
      });
    } catch (err) {
      if (err instanceof IdempotencyException) throw err;
      const mapped = idempotencyFromUniqueViolation(err);
      if (mapped) throw mapped;
      throw err;
    }
  }

  async saveNamedGrant(grant: PersistedNamedGrant): Promise<void> {
    const sql = await this.client();
    try {
      await sql.begin(async (tx) => {
        const existing = await tx`SELECT id FROM fruma_named_grants WHERE id = ${grant.id}`;
        if (existing.length) {
          throw new IdempotencyException(
            "named_grant",
            `Named grant ${grant.id} already exists. Grants are immutable.`,
            { id: grant.id },
          );
        }
        await tx`
          INSERT INTO fruma_named_grants (
            id, mill_org_id, brand_org_id, scope_class, created_at, surface_environment
          )
          VALUES (
            ${grant.id},
            ${grant.millOrgId},
            ${grant.brandOrgId},
            ${grant.scopeClass},
            ${grant.createdAt},
            ${this.surface}
          )
        `;
      });
    } catch (err) {
      if (err instanceof IdempotencyException) throw err;
      const mapped = idempotencyFromUniqueViolation(err);
      if (mapped) throw mapped;
      throw err;
    }
  }

  async appendCellMutation(event: PersistedCellMutation): Promise<void> {
    if (event.actionType !== "map" && event.actionType !== "confirm") {
      throw new Error("action_type must be map or confirm.");
    }
    const sql = await this.client();
    try {
      await sql.begin(async (tx) => {
        const cell = await tx`
          SELECT id FROM fruma_source_cells
          WHERE id = ${event.sourceCellId} AND surface_environment = ${this.surface}
        `;
        if (!cell.length) {
          throw new Error(
            `Source cell ${event.sourceCellId} is not in surface ${this.surface}.`,
          );
        }
        const existing = await tx`
          SELECT event_id FROM fruma_cell_mutation_events WHERE event_id = ${event.eventId}
        `;
        if (existing.length) {
          throw new IdempotencyException(
            "cell_mutation",
            `Cell mutation ${event.eventId} already exists. Mutations are append-only.`,
            { eventId: event.eventId },
          );
        }
        await tx`
          INSERT INTO fruma_cell_mutation_events (
            event_id, source_cell_id, operator_cookie, action_type,
            old_standard_value, new_standard_value, standard_field, occurred_at, surface_environment
          )
          VALUES (
            ${event.eventId},
            ${event.sourceCellId},
            ${event.operatorCookie},
            ${event.actionType},
            ${event.oldStandardValue},
            ${event.newStandardValue},
            ${event.standardField},
            ${event.occurredAt},
            ${this.surface}
          )
        `;
      });
    } catch (err) {
      if (err instanceof IdempotencyException) throw err;
      const mapped = idempotencyFromUniqueViolation(err);
      if (mapped) throw mapped;
      throw err;
    }
  }

  async getDepositBytes(depositId: string): Promise<Uint8Array | null> {
    const sql = await this.client();
    const rows = await sql`
      SELECT bytes FROM fruma_deposits
      WHERE id = ${depositId} AND surface_environment = ${this.surface}
    `;
    if (!rows[0]) return null;
    const buf = rows[0].bytes as Buffer;
    return new Uint8Array(buf);
  }

  async reset(): Promise<void> {
    const sql = await this.client();
    const surface = this.surface;
    await sql.begin(async (tx) => {
      await tx`DELETE FROM fruma_cell_mutation_events WHERE surface_environment = ${surface}`;
      await tx`DELETE FROM fruma_source_cells WHERE surface_environment = ${surface}`;
      await tx`DELETE FROM fruma_named_grants WHERE surface_environment = ${surface}`;
      await tx`DELETE FROM fruma_deposits WHERE surface_environment = ${surface}`;
      await tx`DELETE FROM fruma_header_maps WHERE surface_environment = ${surface}`;
      await tx`DELETE FROM fruma_mill_requests WHERE surface_environment = ${surface}`;
      await tx`DELETE FROM fruma_mill_confirmations WHERE surface_environment = ${surface}`;
      await tx`DELETE FROM fruma_product_truth WHERE surface_environment = ${surface}`;
    });
  }

  private assertSameSurface(surface: string): void {
    if (surface !== this.surface) {
      throw new Error(
        `Refusing to write surface ${surface} through the ${this.surface} ledger.`,
      );
    }
  }
}

function assertCell(cell: PersistedSourceCell): void {
  if (!cell.id.trim() || !cell.depositId.trim()) {
    throw new Error("Source cell requires id and deposit_id.");
  }
  if (!Number.isInteger(cell.rowIndex) || cell.rowIndex < 1) {
    throw new Error("row_index must be a 1-based integer.");
  }
  if (!Number.isInteger(cell.colIndex) || cell.colIndex < 1) {
    throw new Error("col_index must be a 1-based integer.");
  }
}

function depositFromRow(row: Record<string, unknown>): PersistedDepositPointer {
  const id = String(row.id);
  return {
    depositId: id,
    supplierOrgId: String(row.supplier_org_id),
    filename: String(row.filename),
    sha256: String(row.byte_hash),
    byteLength: Number(row.byte_length),
    receivedAt: new Date(row.received_at as string | Date).toISOString(),
    objectKey: `${id}.bin`,
  };
}

function cellFromRow(row: Record<string, unknown>): PersistedSourceCell {
  return {
    id: String(row.id),
    depositId: String(row.deposit_id),
    sheetName: String(row.sheet_name),
    rowIndex: Number(row.row_index),
    colIndex: Number(row.col_index),
    rawHeader: String(row.raw_header),
    sourceValue: String(row.source_value),
  };
}

function mutationFromRow(row: Record<string, unknown>): PersistedCellMutation {
  const field = row.standard_field;
  return {
    eventId: String(row.event_id),
    sourceCellId: String(row.source_cell_id),
    operatorCookie: String(row.operator_cookie),
    actionType: row.action_type === "confirm" ? "confirm" : "map",
    oldStandardValue: row.old_standard_value == null ? null : String(row.old_standard_value),
    newStandardValue: row.new_standard_value == null ? null : String(row.new_standard_value),
    standardField: field == null ? null : (String(field) as PersistedCellMutation["standardField"]),
    occurredAt: new Date(row.occurred_at as string | Date).toISOString(),
  };
}

function grantFromRow(row: Record<string, unknown>): PersistedNamedGrant {
  return {
    id: String(row.id),
    millOrgId: String(row.mill_org_id),
    brandOrgId: String(row.brand_org_id),
    scopeClass: String(row.scope_class),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
  };
}
