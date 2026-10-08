import { isStandardField } from "../ingest/types";
import type { EvidenceRecord, ProductTruthRecord } from "../product-truth";
import { databaseUrlOrThrow } from "./configuration";
import {
  assertEmbeddingVector,
  assertMaterialEmbedding,
  MATERIAL_SEARCH_CANDIDATE_LIMIT,
  vectorLiteral,
} from "./embeddings";
import {
  conflictingDeposit,
  depositIdempotencyException,
  IdempotencyException,
  idempotencyFromUniqueViolation,
} from "./idempotency";
import {
  dropSchemaStatement,
  isSurfaceEnvironment,
  ledgerSchemaName,
  legacyLedgerMessage,
  postgresLedgerSchema,
  searchPathStatement,
  type LedgerSchemaName,
  type SurfaceEnvironment,
  LEDGER_TABLES,
} from "./postgres-schema";
import { reloadEnginesFromDatabase, type Client } from "./reload-engines";
import type {
  AnonymousMillRequest,
  MillConfirmation,
  DepositAuditRow,
  PersistedDepositPointer,
  PersistedHeaderMap,
  PersistedCellMutation,
  ActiveProductTruthEvidence,
  JoinedSourceCell,
  LinkedProductTruthFact,
  MaterialSearchHit,
  PersistedMaterialEmbedding,
  PersistedNamedGrant,
  PersistedSourceCell,
  SpineSnapshot,
  SpineStore,
} from "./types";

type Sql = ReturnType<typeof import("postgres")>;
type LedgerTable = (typeof LEDGER_TABLES)[number];

/** One connection already running SET search_path for its environment schema. */
export type PinnedLedgerClient = Client & {
  release(): void;
};

export type PostgresPool = {
  connect(): Promise<PinnedLedgerClient>;
};

/** Matches `postgres({ max })`. Every slot runs SET search_path before use. */
const POOL_MAX = 4;

/**
 * Postgres-backed spine. Requires DATABASE_URL and the `postgres` package.
 * Each environment is a schema: fruma_demo, fruma_test, or fruma_production.
 * Deposit bytes, source cells, and named grants are insert-only.
 * A repeated deposit_id or byte_hash throws IdempotencyException.
 */
export class PostgresSpineStore implements SpineStore {
  readonly kind = "postgres" as const;
  readonly surface: SurfaceEnvironment;
  readonly schemaName: LedgerSchemaName;
  private sql: Sql | null = null;
  private ready: Promise<void> | null = null;

  constructor(surface: SurfaceEnvironment) {
    if (!isSurfaceEnvironment(surface)) {
      throw new Error("surface must be demo, test, or production");
    }
    this.surface = surface;
    this.schemaName = ledgerSchemaName(surface);
  }

  private table(sql: { unsafe(query: string): ReturnType<Sql["unsafe"]> }, name: LedgerTable) {
    return sql.unsafe(`"${this.schemaName}"."${name}"`);
  }

  private async client(): Promise<Sql> {
    if (this.sql && this.ready) {
      await this.ready;
      return this.sql;
    }
    const url = databaseUrlOrThrow(this.surface);
    const postgres = (await import("postgres")).default;
    const statement = searchPathStatement(this.surface);
    this.sql = postgres(url, {
      max: POOL_MAX,
      prepare: false,
      connection: {
        options: `-c search_path=${this.schemaName}`,
      },
    });
    const sql = this.sql;
    this.ready = (async () => {
      await this.applySearchPath(sql, statement);
      await this.prepare(sql);
      await reloadEnginesFromDatabase(sql);
    })();
    await this.ready;
    return sql;
  }

  /** Run `SET search_path TO fruma_${version}` on every connection the pool can hand out. */
  private async applySearchPath(sql: Sql, statement: string): Promise<void> {
    const held = [];
    try {
      for (let i = 0; i < POOL_MAX; i += 1) {
        const reserved = await sql.reserve();
        await reserved.unsafe(statement);
        held.push(reserved);
      }
    } finally {
      for (const reserved of held) reserved.release();
    }
  }

  private async prepare(sql: Sql): Promise<void> {
    await sql.unsafe(postgresLedgerSchema(this.schemaName));
    const rows = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = ${this.schemaName}
        AND table_name IN (
          'fruma_header_maps',
          'fruma_mill_requests',
          'fruma_mill_confirmations',
          'fruma_product_truth',
          'fruma_deposits',
          'fruma_source_cells',
          'fruma_named_grants',
          'fruma_cell_mutation_events',
          'fruma_product_truth_facts',
          'fruma_material_embeddings'
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
    const [maps, requests, confirmations, truth, deposits, cells, grants, mutations] = await Promise.all([
      sql`
        SELECT DISTINCT ON (surface) surface, overlays, updated_at
        FROM ${this.table(sql, "fruma_header_maps")}
        ORDER BY surface, version DESC
      `,
      sql`
        SELECT DISTINCT ON (request_id) payload
        FROM ${this.table(sql, "fruma_mill_requests")}
        ORDER BY request_id, version DESC
      `,
      sql`
        SELECT DISTINCT ON (confirmation_id) payload
        FROM ${this.table(sql, "fruma_mill_confirmations")}
        ORDER BY confirmation_id, version DESC
      `,
      sql`
        SELECT DISTINCT ON (product_id) payload
        FROM ${this.table(sql, "fruma_product_truth")}
        ORDER BY product_id, version DESC
      `,
      sql`
        SELECT id, byte_hash, filename, received_at, supplier_org_id, octet_length(bytes) AS byte_length
        FROM ${this.table(sql, "fruma_deposits")}
      `,
      sql`
        SELECT id, deposit_id, sheet_name, row_index, col_index, raw_header, source_value, normalized_value
        FROM ${this.table(sql, "fruma_source_cells")}
      `,
      sql`
        SELECT id, mill_org_id, brand_org_id, scope_class, created_at
        FROM ${this.table(sql, "fruma_named_grants")}
      `,
      sql`
        SELECT event_id, source_cell_id, operator_cookie, action_type,
               old_standard_value, new_standard_value, standard_field, occurred_at
        FROM ${this.table(sql, "fruma_cell_mutation_events")}
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
    await retryUnique(() =>
      sql.begin(async (tx) => {
        await tx.unsafe(searchPathStatement(this.surface));
        const rows = await tx`
          SELECT COALESCE(MAX(version), 0) AS version
          FROM ${this.table(tx, "fruma_header_maps")}
          WHERE surface = ${map.surface}
        `;
        const version = Number(rows[0]?.version ?? 0) + 1;
        await tx`
          INSERT INTO ${this.table(tx, "fruma_header_maps")}
            (document_type, surface, version, overlays, updated_at)
          VALUES ('header_map', ${map.surface}, ${version}, ${tx.json(map.overlays)}, ${map.updatedAt})
        `;
      }),
    );
  }

  async saveRequest(request: AnonymousMillRequest): Promise<void> {
    const sql = await this.client();
    await retryUnique(() =>
      sql.begin(async (tx) => {
        await tx.unsafe(searchPathStatement(this.surface));
        const rows = await tx`
          SELECT COALESCE(MAX(version), 0) AS version
          FROM ${this.table(tx, "fruma_mill_requests")}
          WHERE request_id = ${request.id}
            AND mill_org_id = ${request.millOrgId}
        `;
        const version = Number(rows[0]?.version ?? 0) + 1;
        await tx`
          INSERT INTO ${this.table(tx, "fruma_mill_requests")}
            (document_type, request_id, mill_org_id, version, payload)
          VALUES ('mill_request', ${request.id}, ${request.millOrgId}, ${version}, ${tx.json(request)})
        `;
      }),
    );
  }

  async saveConfirmation(confirmation: MillConfirmation): Promise<void> {
    const sql = await this.client();
    await retryUnique(() =>
      sql.begin(async (tx) => {
        await tx.unsafe(searchPathStatement(this.surface));
        const rows = await tx`
          SELECT COALESCE(MAX(version), 0) AS version
          FROM ${this.table(tx, "fruma_mill_confirmations")}
          WHERE confirmation_id = ${confirmation.id}
            AND mill_org_id = ${confirmation.millOrgId}
        `;
        const version = Number(rows[0]?.version ?? 0) + 1;
        await tx`
          INSERT INTO ${this.table(tx, "fruma_mill_confirmations")}
            (document_type, confirmation_id, request_id, mill_org_id, version, payload)
          VALUES (
            'mill_confirmation',
            ${confirmation.id},
            ${confirmation.requestId},
            ${confirmation.millOrgId},
            ${version},
            ${tx.json(confirmation)}
          )
        `;
      }),
    );
  }

  async saveProductTruth(record: ProductTruthRecord): Promise<void> {
    const sql = await this.client();
    try {
      await retryUnique(() =>
        sql.begin(async (tx) => {
          await tx.unsafe(searchPathStatement(this.surface));
          const rows = await tx`
            SELECT COALESCE(MAX(version), 0) AS version
            FROM ${this.table(tx, "fruma_product_truth")}
            WHERE product_id = ${record.productId}
          `;
          const version = Number(rows[0]?.version ?? 0) + 1;
          const stored: ProductTruthRecord = {
            ...record,
            version,
            facts: record.facts.map((fact) => ({ ...fact, version })),
          };
          await tx`
            INSERT INTO ${this.table(tx, "fruma_product_truth")}
              (document_type, product_id, version, payload)
            VALUES ('product_truth', ${stored.productId}, ${version}, ${tx.json(stored)})
          `;
          for (const fact of stored.facts) {
            const linked = fact.sourceType === "mill-file" && fact.status !== "missing";
            if (linked && (!fact.sourceCellId || !fact.depositId)) {
              throw new Error(`product_truth_source_cell_required:${fact.field}`);
            }
            if (fact.sourceType === "mill-file" && fact.status === "missing") continue;
            await tx`
              INSERT INTO ${this.table(tx, "fruma_product_truth_facts")} (
                id, product_id, version, field, value, source_type,
                source_cell_id, deposit_id
              )
              VALUES (
                ${fact.id},
                ${fact.productId},
                ${fact.version},
                ${fact.field},
                ${fact.value == null ? null : String(fact.value)},
                ${fact.sourceType},
                ${fact.sourceCellId ?? null},
                ${fact.depositId ?? null}
              )
            `;
          }
        }),
      );
    } catch (err) {
      if (err instanceof IdempotencyException) throw err;
      const mapped = idempotencyFromUniqueViolation(err);
      if (mapped) throw mapped;
      throw err;
    }
  }

  async saveDepositPointer(pointer: PersistedDepositPointer, bytes: Uint8Array): Promise<void> {
    const sql = await this.client();
    const incoming = { id: pointer.depositId, byteHash: pointer.sha256 };
    try {
      await sql.begin(async (tx) => {
        const existing = await tx`
          SELECT id, byte_hash
          FROM ${this.table(tx, "fruma_deposits")}
          WHERE id = ${pointer.depositId} OR byte_hash = ${pointer.sha256}
        `;
        const conflict = conflictingDeposit(
          existing.map((row) => ({ id: String(row.id), byteHash: String(row.byte_hash) })),
          incoming,
        );
        if (conflict) throw depositIdempotencyException(conflict, incoming);
        await tx`
          INSERT INTO ${this.table(tx, "fruma_deposits")} (
            id, byte_hash, filename, received_at, supplier_org_id, bytes
          )
          VALUES (
            ${pointer.depositId},
            ${pointer.sha256},
            ${pointer.filename},
            ${pointer.receivedAt},
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
            SELECT id FROM ${this.table(tx, "fruma_deposits")}
            WHERE id = ${cell.depositId}
          `;
          if (!deposit.length) {
            throw new Error(`Deposit ${cell.depositId} is not in schema ${this.schemaName}.`);
          }
          const clash = await tx`
            SELECT id FROM ${this.table(tx, "fruma_source_cells")}
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
            INSERT INTO ${this.table(tx, "fruma_source_cells")} (
              id, deposit_id, sheet_name, row_index, col_index, raw_header, source_value, normalized_value
            )
            VALUES (
              ${cell.id},
              ${cell.depositId},
              ${cell.sheetName},
              ${cell.rowIndex},
              ${cell.colIndex},
              ${cell.rawHeader},
              ${cell.sourceValue},
              ${cell.normalizedValue}
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
        const existing = await tx`SELECT id FROM ${this.table(tx, "fruma_named_grants")} WHERE id = ${grant.id}`;
        if (existing.length) {
          throw new IdempotencyException(
            "named_grant",
            `Named grant ${grant.id} already exists. Grants are immutable.`,
            { id: grant.id },
          );
        }
        await tx`
          INSERT INTO ${this.table(tx, "fruma_named_grants")} (
            id, mill_org_id, brand_org_id, scope_class, created_at
          )
          VALUES (
            ${grant.id},
            ${grant.millOrgId},
            ${grant.brandOrgId},
            ${grant.scopeClass},
            ${grant.createdAt}
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
          SELECT id FROM ${this.table(tx, "fruma_source_cells")}
          WHERE id = ${event.sourceCellId}
        `;
        if (!cell.length) {
          throw new Error(
            `Source cell ${event.sourceCellId} is not in schema ${this.schemaName}.`,
          );
        }
        const existing = await tx`
          SELECT event_id FROM ${this.table(tx, "fruma_cell_mutation_events")} WHERE event_id = ${event.eventId}
        `;
        if (existing.length) {
          throw new IdempotencyException(
            "cell_mutation",
            `Cell mutation ${event.eventId} already exists. Mutations are append-only.`,
            { eventId: event.eventId },
          );
        }
        await tx`
          INSERT INTO ${this.table(tx, "fruma_cell_mutation_events")} (
            event_id, source_cell_id, operator_cookie, action_type,
            old_standard_value, new_standard_value, standard_field, occurred_at
          )
          VALUES (
            ${event.eventId},
            ${event.sourceCellId},
            ${event.operatorCookie},
            ${event.actionType},
            ${event.oldStandardValue},
            ${event.newStandardValue},
            ${event.standardField},
            ${event.occurredAt}
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
      SELECT bytes FROM ${this.table(sql, "fruma_deposits")}
      WHERE id = ${depositId}
    `;
    if (!rows[0]) return null;
    const buf = rows[0].bytes as Buffer;
    return new Uint8Array(buf);
  }

  async listSourceCellsWithMutations(filter?: { depositId?: string }): Promise<JoinedSourceCell[]> {
    const sql = await this.client();
    const cells = this.table(sql, "fruma_source_cells");
    const deposits = this.table(sql, "fruma_deposits");
    const events = this.table(sql, "fruma_cell_mutation_events");
    const depositId = filter?.depositId?.trim();
    const rows = depositId
      ? await sql`
          SELECT
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
          FROM ${cells} c
          INNER JOIN ${deposits} d ON d.id = c.deposit_id
          LEFT JOIN ${events} e ON e.source_cell_id = c.id
          WHERE c.deposit_id = ${depositId}
          ORDER BY e.occurred_at ASC
        `
      : await sql`
          SELECT
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
          FROM ${cells} c
          INNER JOIN ${deposits} d ON d.id = c.deposit_id
          LEFT JOIN ${events} e ON e.source_cell_id = c.id
          ORDER BY e.occurred_at ASC
        `;
    return groupCellMutationRows(rows);
  }

  async latestActiveHeaderMap(surface: string): Promise<PersistedHeaderMap | null> {
    if (surface !== this.surface) {
      throw new Error(
        `Refusing to read surface ${surface} through the ${this.surface} ledger.`,
      );
    }
    const sql = await this.client();
    const maps = this.table(sql, "fruma_header_maps");
    const rows = await sql`
      SELECT surface, overlays, updated_at, version
      FROM ${maps} AS h
      WHERE h.surface = ${this.surface}
        AND h.is_active = TRUE
        AND h.version = (
          SELECT MAX(version)
          FROM ${maps} AS m
          WHERE m.surface = h.surface
            AND m.is_active = TRUE
        )
    `;
    const row = rows[0];
    if (!row) return null;
    return headerMapFromRow(row);
  }

  async listDepositSourceCells(depositId: string): Promise<PersistedSourceCell[]> {
    const sql = await this.client();
    const rows = await sql`
      SELECT
        id,
        deposit_id,
        sheet_name,
        row_index,
        col_index,
        raw_header,
        source_value,
        normalized_value
      FROM ${this.table(sql, "fruma_source_cells")}
      WHERE deposit_id = ${depositId}
      ORDER BY sheet_name ASC, row_index ASC, col_index ASC
    `;
    return rows.map((row) => cellFromRow(row));
  }

  async listDepositAudit(): Promise<DepositAuditRow[]> {
    const sql = await this.client();
    const rows = await sql`
      SELECT id, filename, byte_hash, supplier_org_id, received_at
      FROM ${this.table(sql, "fruma_deposits")}
      ORDER BY received_at ASC, id ASC
    `;
    return rows.map((row) => ({
      id: String(row.id),
      filename: String(row.filename),
      byte_hash: String(row.byte_hash),
      supplier_org_id: String(row.supplier_org_id),
      received_at: new Date(row.received_at as string | Date).toISOString(),
    }));
  }

  async saveMaterialEmbedding(row: PersistedMaterialEmbedding): Promise<void> {
    assertMaterialEmbedding(row);
    const sql = await this.client();
    const literal = vectorLiteral(row.embedding);
    await sql.begin(async (tx) => {
      const cell = await tx`
        SELECT id FROM ${this.table(tx, "fruma_source_cells")}
        WHERE id = ${row.sourceCellId}
      `;
      if (!cell.length) {
        throw new Error(`Source cell ${row.sourceCellId} is not in schema ${this.schemaName}.`);
      }
      const existing = await tx`
        SELECT id FROM ${this.table(tx, "fruma_material_embeddings")}
        WHERE id = ${row.id}::uuid
      `;
      if (existing.length) {
        throw new Error(`Material embedding ${row.id} already exists.`);
      }
      await tx`
        INSERT INTO ${this.table(tx, "fruma_material_embeddings")} (
          id, source_cell_id, embedding, updated_at
        )
        VALUES (
          ${row.id}::uuid,
          ${row.sourceCellId},
          ${literal}::public.vector,
          ${row.updatedAt}
        )
      `;
    });
  }

  async searchMaterialEmbeddings(embedding: readonly number[]): Promise<MaterialSearchHit[]> {
    assertEmbeddingVector(embedding);
    const sql = await this.client();
    const embeddings = this.table(sql, "fruma_material_embeddings");
    const nearestCells = this.table(sql, "fruma_source_cells");
    const cells = this.table(sql, "fruma_source_cells");
    const deposits = this.table(sql, "fruma_deposits");
    const events = this.table(sql, "fruma_cell_mutation_events");
    const literal = vectorLiteral(embedding);
    // vector_cosine_ops is used only when ORDER BY is public.<=> itself.
    // MATERIALIZED keeps that ordered limit from being flattened into the joins.
    const rows = await sql`
      WITH nearest AS MATERIALIZED (
        SELECT
          emb.source_cell_id,
          (emb.embedding OPERATOR(public.<=>) ${literal}::public.vector) AS cosine_distance
        FROM ${embeddings} emb
        ORDER BY emb.embedding OPERATOR(public.<=>) ${literal}::public.vector ASC
        LIMIT ${MATERIAL_SEARCH_CANDIDATE_LIMIT}
      ),
      hit_rows AS (
        SELECT
          c.deposit_id,
          c.sheet_name,
          c.row_index,
          MIN(n.cosine_distance) AS distance
        FROM nearest n
        INNER JOIN ${nearestCells} c ON c.id = n.source_cell_id
        GROUP BY c.deposit_id, c.sheet_name, c.row_index
      )
      SELECT
        h.distance,
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
      FROM hit_rows h
      INNER JOIN ${cells} c
        ON c.deposit_id = h.deposit_id
       AND c.sheet_name = h.sheet_name
       AND c.row_index = h.row_index
      INNER JOIN ${deposits} d ON d.id = c.deposit_id
      LEFT JOIN ${events} e ON e.source_cell_id = c.id
      ORDER BY h.distance ASC, c.col_index ASC, e.occurred_at ASC
    `;
    return groupSearchRows(rows);
  }

  async listActiveProductTruthEvidence(): Promise<ActiveProductTruthEvidence[]> {
    const sql = await this.client();
    const truth = this.table(sql, "fruma_product_truth");
    const truthMax = this.table(sql, "fruma_product_truth");
    const facts = this.table(sql, "fruma_product_truth_facts");
    const rows = await sql`
      SELECT
        t.product_id,
        t.version,
        t.payload,
        f.id AS fact_id,
        f.field AS fact_field,
        f.source_type AS fact_source_type,
        f.source_cell_id,
        f.deposit_id
      FROM ${truth} t
      LEFT JOIN ${facts} f
        ON f.product_id = t.product_id
       AND f.version = t.version
      WHERE t.is_active = TRUE
        AND t.version = (
          SELECT MAX(version)
          FROM ${truthMax} m
          WHERE m.product_id = t.product_id
            AND m.is_active = TRUE
        )
    `;
    return groupProductTruthEvidence(rows);
  }

  /**
   * Reserve one pooled connection and pin it with SET search_path before it is used.
   * The caller releases it. Handshake reads current_schema() from this connection.
   */
  async connectPinned(): Promise<PinnedLedgerClient> {
    const sql = await this.client();
    const reserved = await sql.reserve();
    await reserved.unsafe(searchPathStatement(this.surface));
    return {
      unsafe(query: string, parameters?: readonly unknown[]) {
        if (parameters && parameters.length > 0) {
          return reserved.unsafe(query, parameters as never[]);
        }
        return reserved.unsafe(query);
      },
      release() {
        reserved.release();
      },
    };
  }

  async reset(): Promise<void> {
    const sql = await this.client();
    await sql.unsafe(`${dropSchemaStatement(this.surface)}
${postgresLedgerSchema(this.schemaName)}`);
    await this.applySearchPath(sql, searchPathStatement(this.surface));
  }

  private assertSameSurface(surface: string): void {
    if (surface !== this.surface) {
      throw new Error(
        `Refusing to write surface ${surface} through the ${this.surface} ledger.`,
      );
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "23505";
}

/** A concurrent writer that claims the same version number is retried. */
async function retryUnique(run: () => Promise<void>): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await run();
      return;
    } catch (err) {
      if (!isUniqueViolation(err) || attempt === 2) throw err;
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

function headerMapFromRow(row: Record<string, unknown>): PersistedHeaderMap {
  const raw = row.overlays;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const overlays: PersistedHeaderMap["overlays"] = {};
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const [header, field] of Object.entries(parsed)) {
      const key = header.trim().toLowerCase();
      if (key && typeof field === "string" && isStandardField(field)) overlays[key] = field;
    }
  }
  return {
    surface: String(row.surface),
    overlays,
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
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
    normalizedValue: row.normalized_value == null ? null : String(row.normalized_value),
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

const EVIDENCE_STATUSES = new Set(["current", "expired", "missing", "unverified"]);
const TRUTH_SCOPES = new Set([
  "quality",
  "product",
  "mill-site",
  "organisation",
  "process",
  "shipment",
]);

function payloadRecord(value: unknown): Record<string, unknown> | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function evidenceFromPayload(value: unknown): EvidenceRecord[] {
  const record = payloadRecord(value);
  if (!record || !Array.isArray(record.evidence)) return [];
  const evidence: EvidenceRecord[] = [];
  for (const item of record.evidence) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<EvidenceRecord>;
    if (typeof row.id !== "string" || typeof row.claim !== "string" || typeof row.subjectId !== "string") {
      continue;
    }
    if (typeof row.status !== "string" || !EVIDENCE_STATUSES.has(row.status)) continue;
    if (typeof row.scope !== "string" || !TRUTH_SCOPES.has(row.scope)) continue;
    evidence.push({
      id: row.id,
      claim: row.claim,
      scope: row.scope as EvidenceRecord["scope"],
      subjectId: row.subjectId,
      ...(typeof row.documentId === "string" ? { documentId: row.documentId } : {}),
      ...(typeof row.issuer === "string" ? { issuer: row.issuer } : {}),
      ...(typeof row.validFrom === "string" ? { validFrom: row.validFrom } : {}),
      ...(typeof row.validUntil === "string" ? { validUntil: row.validUntil } : {}),
      status: row.status as EvidenceRecord["status"],
    });
  }
  return evidence;
}

function factsFromPayload(value: unknown): LinkedProductTruthFact[] {
  const record = payloadRecord(value);
  if (!record || !Array.isArray(record.facts)) return [];
  const facts: LinkedProductTruthFact[] = [];
  for (const item of record.facts) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.field !== "string") continue;
    facts.push({
      id: row.id,
      field: row.field,
      sourceType: typeof row.sourceType === "string" ? row.sourceType : "",
      sourceCellId: typeof row.sourceCellId === "string" ? row.sourceCellId : null,
      depositId: typeof row.depositId === "string" ? row.depositId : null,
      evidenceId: typeof row.evidenceId === "string" ? row.evidenceId : null,
      status: typeof row.status === "string" ? row.status : null,
      confirmedBy: typeof row.confirmedBy === "string" ? row.confirmedBy : null,
      confirmedAt: typeof row.confirmedAt === "string" ? row.confirmedAt : null,
    });
  }
  return facts;
}

function groupProductTruthEvidence(rows: readonly Record<string, unknown>[]): ActiveProductTruthEvidence[] {
  const byProduct = new Map<string, ActiveProductTruthEvidence>();
  for (const row of rows) {
    const productId = String(row.product_id);
    let group = byProduct.get(productId);
    if (!group) {
      group = {
        productId,
        version: Number(row.version),
        facts: factsFromPayload(row.payload),
        evidence: evidenceFromPayload(row.payload),
      };
      byProduct.set(productId, group);
    }
    if (row.fact_id == null) continue;
    const id = String(row.fact_id);
    if (group.facts.some((fact) => fact.id === id)) continue;
    group.facts.push({
      id,
      field: String(row.fact_field ?? ""),
      sourceType: String(row.fact_source_type ?? ""),
      sourceCellId: row.source_cell_id == null ? null : String(row.source_cell_id),
      depositId: row.deposit_id == null ? null : String(row.deposit_id),
      evidenceId: null,
      status: null,
      confirmedBy: null,
      confirmedAt: null,
    });
  }
  return [...byProduct.values()];
}

function groupSearchRows(rows: readonly Record<string, unknown>[]): MaterialSearchHit[] {
  const byId = new Map<string, MaterialSearchHit>();
  for (const row of rows) {
    const id = String(row.id);
    let group = byId.get(id);
    if (!group) {
      group = {
        cell: cellFromRow(row),
        supplierOrgId: String(row.supplier_org_id),
        mutations: [],
        cosineDistance: Number(row.distance),
      };
      byId.set(id, group);
    }
    if (row.event_id != null) group.mutations.push(mutationFromRow(row));
  }
  for (const group of byId.values()) {
    group.mutations.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }
  return [...byId.values()];
}

function groupCellMutationRows(rows: readonly Record<string, unknown>[]): JoinedSourceCell[] {
  const byId = new Map<string, JoinedSourceCell>();
  for (const row of rows) {
    const id = String(row.id);
    let group = byId.get(id);
    if (!group) {
      group = {
        cell: cellFromRow(row),
        supplierOrgId: String(row.supplier_org_id),
        mutations: [],
      };
      byId.set(id, group);
    }
    if (row.event_id != null) group.mutations.push(mutationFromRow(row));
  }
  for (const group of byId.values()) {
    group.mutations.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }
  return [...byId.values()];
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

const spineStores = new Map<SurfaceEnvironment, PostgresSpineStore>();
const poolOverrides = new Map<SurfaceEnvironment, PostgresPool>();

/** One Postgres spine per environment, shared with getSpineStore when DATABASE_URL is set. */
export function postgresSpineStore(surface: SurfaceEnvironment): PostgresSpineStore {
  let store = spineStores.get(surface);
  if (!store) {
    store = new PostgresSpineStore(surface);
    spineStores.set(surface, store);
  }
  return store;
}

export function clearPostgresSpineStoresForTests(): void {
  spineStores.clear();
}

/** Tests supply a pool per environment. Pass null to remove that override. */
export function setPostgresPoolForTests(version: SurfaceEnvironment, pool: PostgresPool | null): void {
  if (pool) poolOverrides.set(version, pool);
  else poolOverrides.delete(version);
}

/**
 * Pool for `fruma_${version}`. connect() returns a client whose search_path is that schema.
 * The version must already be demo, test, or production.
 */
export function getPostgresPool(version: string): PostgresPool {
  if (!isSurfaceEnvironment(version)) {
    throw new Error("version must be demo, test, or production");
  }
  const override = poolOverrides.get(version);
  if (override) return override;
  databaseUrlOrThrow(version);
  const store = postgresSpineStore(version);
  return {
    connect: () => store.connectPinned(),
  };
}
