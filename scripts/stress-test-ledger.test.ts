import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type postgres from "postgres";
import { MATERIAL_EMBEDDING_DIMENSIONS } from "../lib/fruma/persist/embeddings";
import {
  BATCH_SIZE,
  DEPOSIT_COUNT,
  EVENTS_PER_TRACKED_CELL,
  SOURCE_CELL_COUNT,
  TRACKED_CELL_STRIDE,
  buildDeposits,
  buildMutationEvents,
  buildSourceCell,
  cellsPerDeposit,
  chunk,
  embeddingBrief,
  isTrackedCell,
  searchPathSql,
  seedStressLedger,
} from "./stress-test-ledger";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RecordedBatch = { count: number; columns: string[] };

function isTemplateStrings(value: unknown): value is TemplateStringsArray {
  return Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "raw");
}

function createRecorder(): {
  sql: postgres.Sql;
  statements: string[];
  batches: RecordedBatch[];
  arrays: unknown[][];
} {
  const statements: string[] = [];
  const batches: RecordedBatch[] = [];
  const arrays: unknown[][] = [];

  function sql(first: unknown, ...rest: unknown[]): unknown {
    if (isTemplateStrings(first)) {
      let rendered = first[0] ?? "";
      for (let index = 0; index < rest.length; index += 1) {
        const value = rest[index];
        const token =
          value && typeof value === "object" && "__array" in value
            ? "[array]"
            : value && typeof value === "object" && "__batch" in value
              ? "[batch]"
              : "?";
        if (value && typeof value === "object" && "__array" in value) {
          arrays.push((value as { __array: unknown[] }).__array);
        }
        rendered += token + (first[index + 1] ?? "");
      }
      statements.push(rendered);
      return Promise.resolve([]);
    }
    if (Array.isArray(first)) {
      const columns = rest.map(String);
      batches.push({ count: first.length, columns });
      return { __batch: true, count: first.length, columns };
    }
    return { __ident: first };
  }

  sql.unsafe = async (query: string) => {
    statements.push(query);
    return [];
  };
  sql.array = (value: readonly unknown[]) => ({ __array: [...value] });
  sql.begin = async (fn: (tx: typeof sql) => Promise<unknown>) => fn(sql);
  sql.end = async () => undefined;
  return { sql: sql as unknown as postgres.Sql, statements, batches, arrays };
}

describe("fruma_demo stress ledger seed", () => {
  it("builds 1000 textile deposits and exactly 100000 cells with a replay event on every tenth row", () => {
    assert.equal(DEPOSIT_COUNT, 1_000);
    assert.equal(SOURCE_CELL_COUNT, 100_000);
    assert.equal(BATCH_SIZE, 5_000);
    assert.equal(cellsPerDeposit(SOURCE_CELL_COUNT, DEPOSIT_COUNT), 100);
    const deposits = buildDeposits(DEPOSIT_COUNT);
    assert.equal(deposits.length, DEPOSIT_COUNT);
    assert.equal(new Set(deposits.map((row) => row.id)).size, DEPOSIT_COUNT);
    assert.equal(new Set(deposits.map((row) => row.byte_hash)).size, DEPOSIT_COUNT);
    assert.equal(new Set(deposits.map((row) => row.filename)).size, DEPOSIT_COUNT);
    assert.ok(deposits.every((row) => UUID_RE.test(row.id)));
    assert.ok(deposits.every((row) => /^[0-9a-f]{64}$/.test(row.byte_hash)));
    assert.ok(
      deposits.every((row) =>
        /^(vale-do-ave|porto-fios|guimaraes-malhas|barcelos-tece|famalicao-mesh)-(cotton-mesh|wool-nylon|organic-jersey|linen-canvas)-240gsm-(navy|ecru)-(hanger|fabric-book|shade-card|quality-sheet)-\d{4}\.(xlsx|csv)$/.test(
          row.filename,
        ),
      ),
    );

    const ids = new Set<string>();
    const slots = new Set<string>();
    const fields = new Set<string>();
    let events = 0;
    let cotton = false;
    let wool = false;
    let gsm = false;
    let navy = false;
    let ecru = false;
    for (let index = 0; index < SOURCE_CELL_COUNT; index += 1) {
      const cell = buildSourceCell(deposits, index, 100);
      ids.add(cell.id);
      slots.add(`${cell.deposit_id}|${cell.sheet_name}|${cell.row_index}|${cell.col_index}`);
      fields.add(cell.standard_field);
      if (cell.standard_field === "composition" && cell.source_value === "100% Cotton Mesh") cotton = true;
      if (cell.standard_field === "composition" && cell.source_value === "80% Wool / 20% Nylon") wool = true;
      if (cell.standard_field === "weight" && cell.source_value === "240 GSM") gsm = true;
      if (cell.standard_field === "colour" && cell.source_value === "Navy") navy = true;
      if (cell.standard_field === "colour" && cell.source_value === "Ecru") ecru = true;
      if (!isTrackedCell(index)) {
        assert.equal(buildMutationEvents(cell, index).length, 0);
        continue;
      }
      const history = buildMutationEvents(cell, index);
      assert.equal(history.length, EVENTS_PER_TRACKED_CELL);
      assert.deepEqual(
        history.map((event) => event.action_type),
        ["map", "map", "confirm"],
      );
      assert.ok(history[0].occurred_at < history[1].occurred_at);
      assert.ok(history[1].occurred_at < history[2].occurred_at);
      assert.equal(history[2].new_standard_value, cell.source_value);
      assert.equal(history[0].operator_cookie, "owen");
      events += history.length;
    }
    assert.equal(ids.size, SOURCE_CELL_COUNT);
    assert.equal(slots.size, SOURCE_CELL_COUNT);
    assert.deepEqual(
      [...fields].sort(),
      ["article", "cert", "colour", "composition", "construction", "customer", "moq", "weight", "width"],
    );
    assert.equal(cotton && wool && gsm && navy && ecru, true);
    assert.equal(events, (SOURCE_CELL_COUNT / TRACKED_CELL_STRIDE) * EVENTS_PER_TRACKED_CELL);
    const batches = chunk(Array.from({ length: SOURCE_CELL_COUNT }, (_, index) => index));
    assert.equal(batches.length, 20);
    assert.ok(batches.every((batch) => batch.length === BATCH_SIZE));
  });

  it("inserts fruma_demo batches through sql.begin and the brief embedding pipeline", async () => {
    const recorded = createRecorder();
    const report = await seedStressLedger(recorded.sql, { deposits: 2, cells: 20 });
    assert.equal(report.deposits, 2);
    assert.equal(report.cells, 20);
    assert.equal(report.events, 6);
    assert.equal(report.embeddings, 20);
    assert.equal(searchPathSql(), "SET LOCAL search_path TO fruma_demo, public");
    assert.ok(recorded.statements.filter((statement) => statement.startsWith("SET LOCAL")).every((statement) => statement === searchPathSql()));
    assert.equal(recorded.statements.filter((statement) => statement.includes("INSERT INTO fruma_deposits")).length, 1);
    assert.equal(recorded.statements.filter((statement) => statement.includes("INSERT INTO fruma_source_cells")).length, 1);
    assert.equal(recorded.statements.filter((statement) => statement.includes("INSERT INTO fruma_cell_mutation_events")).length, 1);
    assert.equal(recorded.statements.filter((statement) => statement.includes("embedding::public.vector")).length, 1);
    assert.equal(recorded.batches.map((batch) => batch.count).join(","), "2,20,6");
    assert.ok(recorded.batches.every((batch) => batch.count <= BATCH_SIZE));
    assert.deepEqual(
      recorded.arrays.map((values) => values.length),
      [20, 20, 20],
    );
    const literal = String(recorded.arrays[1][0]);
    assert.equal(literal.startsWith("["), true);
    assert.equal(literal.endsWith("]"), true);
    assert.equal(literal.slice(1, -1).split(",").length, MATERIAL_EMBEDDING_DIMENSIONS);
    assert.doesNotMatch(recorded.statements.join("\n"), /\b(?:UPDATE|DELETE|DROP|TRUNCATE)\b/);

    const source = readFileSync(new URL("./stress-test-ledger.ts", import.meta.url), "utf8");
    assert.match(source, /sql\.begin\(/);
    assert.match(source, /briefEmbedding\(embeddingBrief\(cell\)\)/);
    assert.match(source, /BATCH_SIZE = 5_000/);
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE)\b/);
    const sample = buildSourceCell(buildDeposits(1), 0, 1);
    assert.equal(embeddingBrief(sample).includes(sample.source_value), true);
  });
});
