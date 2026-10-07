import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  LEDGER_TABLES,
  postgresLedgerSchema,
} from "../lib/fruma/persist/postgres-schema";
import {
  assertCloudLedgerProvisioned,
  assertLiveDatabaseUrl,
  describeDatabaseUrl,
  describeInitFailure,
  loadCloudDatabaseEnv,
  provisionLedgerSchemas,
  PUBLIC_VECTOR_EXTENSION_SQL,
  type CloudSql,
} from "./initialize-cloud-database";

const LIVE_URL =
  "postgresql://neondb_owner:secret-pass@ep-weathered-dream-zamxo4kk-pooler.eu-west-2.aws.neon.tech:6543/neondb?sslmode=require";

const CORE_TABLES = [
  "fruma_deposits",
  "fruma_source_cells",
  "fruma_cell_mutation_events",
  "fruma_staged_suggestions",
  "fruma_material_embeddings",
  "fruma_factory_profiles",
  "fruma_loom_capabilities",
  "fruma_search_telemetry",
] as const;

describe("initialize cloud database", () => {
  it("rejects a missing, placeholder, or non-Neon DATABASE_URL", () => {
    assert.throws(() => assertLiveDatabaseUrl(undefined), /DATABASE_URL is required/);
    assert.throws(
      () => assertLiveDatabaseUrl("postgresql://fruma:<PASSWORD>@<HOST>:6543/fruma?sslmode=require"),
      /placeholder/,
    );
    assert.throws(
      () =>
        assertLiveDatabaseUrl(
          "postgresql://neondb_owner:YOUR_SECRET_PASSWORD@ep-example.eu-west-2.aws.neon.tech:6543/neondb?sslmode=require",
        ),
      /placeholder/,
    );
    assert.throws(() => assertLiveDatabaseUrl("https://example.com"), /postgresql protocol/);
    assert.throws(
      () => assertLiveDatabaseUrl("postgresql://fruma:secret-pass@localhost:5432/fruma?sslmode=require"),
      /Neon host/,
    );
    assert.throws(
      () =>
        assertLiveDatabaseUrl(
          "postgresql://neondb_owner:secret-pass@ep-example.eu-west-2.aws.neon.tech:6543/neondb",
        ),
      /sslmode=require/,
    );
  });

  it("accepts a live Neon URL and describes it without the password", () => {
    assert.equal(assertLiveDatabaseUrl(LIVE_URL), LIVE_URL);
    const described = describeDatabaseUrl(LIVE_URL);
    assert.equal(
      described,
      "ep-weathered-dream-zamxo4kk-pooler.eu-west-2.aws.neon.tech:6543/neondb",
    );
    assert.equal(described.includes("secret-pass"), false);
  });

  it("keeps an exported DATABASE_URL ahead of the production template", () => {
    const root = mkdtempSync(join(tmpdir(), "fruma-cloud-env-"));
    writeFileSync(join(root, ".env.local"), "DATABASE_URL=postgresql://from-local\n");
    writeFileSync(
      join(root, ".env.production"),
      'DATABASE_URL="postgresql://fruma:<PASSWORD>@<HOST>:6543/fruma?sslmode=require"\n',
    );
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      loadCloudDatabaseEnv(root);
      assert.equal(process.env.DATABASE_URL, "postgresql://from-local");
      process.env.DATABASE_URL = LIVE_URL;
      loadCloudDatabaseEnv(root);
      assert.equal(process.env.DATABASE_URL, LIVE_URL);
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });

  it("installs public.vector and then creates every environment schema in one transaction", async () => {
    const calls: string[] = [];
    let began = false;
    const tx: CloudSql = {
      async unsafe(query: string) {
        assert.equal(began, true);
        calls.push(query);
        return [];
      },
      async begin() {
        throw new Error("nested transaction");
      },
    };
    const sql: CloudSql = {
      async unsafe(query: string) {
        assert.equal(began, false);
        calls.push(query);
        return [];
      },
      async begin(fn) {
        began = true;
        const result = await fn(tx);
        began = false;
        return result;
      },
    };

    await provisionLedgerSchemas(sql);

    assert.equal(calls[0], PUBLIC_VECTOR_EXTENSION_SQL);
    assert.match(calls[0], /WITH SCHEMA public/);
    assert.deepEqual(
      calls.slice(1).map((query) => query.match(/CREATE SCHEMA IF NOT EXISTS (fruma_[a-z]+)/)?.[1]),
      ["fruma_demo", "fruma_test", "fruma_production"],
    );
    for (const query of calls.slice(1)) {
      for (const table of CORE_TABLES) {
        assert.match(query, new RegExp(`CREATE TABLE IF NOT EXISTS fruma_(demo|test|production)\\.${table}\\b`));
      }
      assert.match(
        query,
        /CREATE INDEX IF NOT EXISTS material_embedding_hnsw_idx\s+ON fruma_(demo|test|production)\.fruma_material_embeddings\s+USING hnsw \(embedding public\.vector_cosine_ops\)/,
      );
      assert.equal(query.includes("ON CONFLICT"), false);
      assert.equal(query, postgresLedgerSchema(query.match(/CREATE SCHEMA IF NOT EXISTS (fruma_[a-z]+)/)![1]!));
    }
    assert.equal(LEDGER_TABLES.length, 14);
  });

  it("requires the vector extension, core tables, and an HNSW cosine index in each schema", async () => {
    const schemas = ["fruma_demo", "fruma_test", "fruma_production"];
    const complete: CloudSql = {
      async unsafe(query: string) {
        if (query.includes("pg_extension")) return [{ schema: "public" }];
        if (query.includes("information_schema.tables")) {
          return schemas.flatMap((schema) => LEDGER_TABLES.map((table) => ({ schema, table_name: table })));
        }
        return schemas.map((schema) => ({
          schema,
          access_method: "hnsw",
          operator_class: "vector_cosine_ops",
        }));
      },
      async begin() {
        throw new Error("verification does not open a transaction");
      },
    };
    await assertCloudLedgerProvisioned(complete);

    const missingIndex: CloudSql = {
      async unsafe(query: string) {
        if (query.includes("pg_extension")) return [{ schema: "public" }];
        if (query.includes("information_schema.tables")) {
          return schemas.flatMap((schema) => LEDGER_TABLES.map((table) => ({ schema, table_name: table })));
        }
        return [];
      },
      async begin() {
        throw new Error("verification does not open a transaction");
      },
    };
    await assert.rejects(() => assertCloudLedgerProvisioned(missingIndex), /HNSW cosine index is missing/);
  });

  it("reports a connection timeout when the aggregate error message is empty", () => {
    const err = new AggregateError([
      Object.assign(new Error("connect ETIMEDOUT 35.177.127.187:6543"), { code: "ETIMEDOUT" }),
      Object.assign(new Error("connect ETIMEDOUT 13.43.29.36:6543"), { code: "ETIMEDOUT" }),
    ]);
    err.message = "";
    const described = describeInitFailure(err);
    assert.match(described, /connect ETIMEDOUT 35\.177\.127\.187:6543/);
    assert.match(described, /connect ETIMEDOUT 13\.43\.29\.36:6543/);
    assert.equal(described.includes("postgresql://"), false);
  });
});
