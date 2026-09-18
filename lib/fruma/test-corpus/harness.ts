import { millIngestEngineFor } from "../ingest/deposits-http";
import type { DepositResult } from "../ingest/types";
import { surfaceMillOrgId, TEST_SURFACE } from "../surfaces";
import { TEST_FACTORIES } from "./factories";
import { hangerCsvFor } from "./hanger";
import type { HangerDialect, TestFactory } from "./types";

export type FactoryHarnessRow = {
  factoryId: string;
  factoryName: string;
  dialect: HangerDialect;
  filename: string;
  depositId: string;
  sha256: string;
  qualities: number;
  exceptions: number;
  emptyArticleRows: number;
  unmappedHeaders: string[];
  ok: boolean;
  error?: string;
};

export type CorpusHarnessResult = {
  surface: typeof TEST_SURFACE;
  factoriesTotal: number;
  factoriesOk: number;
  factoriesFailed: number;
  qualitiesTotal: number;
  exceptionsTotal: number;
  unmappedHeaderCount: number;
  byDialect: Record<
    string,
    {
      factories: number;
      ok: number;
      qualities: number;
      exceptions: number;
      unmapped: string[];
    }
  >;
  rows: FactoryHarnessRow[];
};

function unmappedHeadersFrom(cells: DepositResult["cells"]): string[] {
  const unmapped = new Set<string>();
  for (const cell of cells) {
    if (!cell.standardField && cell.header.trim()) unmapped.add(cell.header);
  }
  return [...unmapped].sort();
}

function depositFactory(factory: TestFactory): FactoryHarnessRow {
  const engine = millIngestEngineFor(TEST_SURFACE);
  const csv = hangerCsvFor(factory);
  try {
    const result = engine.deposit({
      supplierOrgId: `${surfaceMillOrgId(TEST_SURFACE)}:${factory.id}`,
      filename: factory.filename,
      bytes: new TextEncoder().encode(csv),
    });
    const unmappedHeaders = unmappedHeadersFrom(result.cells);
    const emptyArticleRows = result.exceptions.filter((e) => e.code === "empty_article").length;
    return {
      factoryId: factory.id,
      factoryName: factory.name,
      dialect: factory.dialect,
      filename: factory.filename,
      depositId: result.deposit.depositId,
      sha256: result.deposit.sha256,
      qualities: result.qualities.length,
      exceptions: result.exceptions.length,
      emptyArticleRows,
      unmappedHeaders,
      ok: result.qualities.length > 0,
    };
  } catch (err) {
    return {
      factoryId: factory.id,
      factoryName: factory.name,
      dialect: factory.dialect,
      filename: factory.filename,
      depositId: "",
      sha256: "",
      qualities: 0,
      exceptions: 0,
      emptyArticleRows: 0,
      unmappedHeaders: [],
      ok: false,
      error: err instanceof Error ? err.message : "deposit_failed",
    };
  }
}

/**
 * Deposit every Test corpus hanger through the Test ingest engine.
 * Proves immutable file → source rows → exceptions → searchable qualities
 * for all fifty factory dialects without touching Demo.
 */
export function runCorpusHarness(): CorpusHarnessResult {
  const rows = TEST_FACTORIES.map(depositFactory);
  const dialectAgg = new Map<
    string,
    { factories: number; ok: number; qualities: number; exceptions: number; unmapped: Set<string> }
  >();

  for (const row of rows) {
    const agg = dialectAgg.get(row.dialect) ?? {
      factories: 0,
      ok: 0,
      qualities: 0,
      exceptions: 0,
      unmapped: new Set<string>(),
    };
    agg.factories += 1;
    if (row.ok) agg.ok += 1;
    agg.qualities += row.qualities;
    agg.exceptions += row.exceptions;
    for (const h of row.unmappedHeaders) agg.unmapped.add(h);
    dialectAgg.set(row.dialect, agg);
  }

  const byDialect: CorpusHarnessResult["byDialect"] = {};
  for (const [dialect, agg] of dialectAgg) {
    byDialect[dialect] = {
      factories: agg.factories,
      ok: agg.ok,
      qualities: agg.qualities,
      exceptions: agg.exceptions,
      unmapped: [...agg.unmapped].sort(),
    };
  }

  const factoriesOk = rows.filter((r) => r.ok).length;
  const unmapped = new Set(rows.flatMap((r) => r.unmappedHeaders));

  return {
    surface: TEST_SURFACE,
    factoriesTotal: rows.length,
    factoriesOk,
    factoriesFailed: rows.length - factoriesOk,
    qualitiesTotal: rows.reduce((n, r) => n + r.qualities, 0),
    exceptionsTotal: rows.reduce((n, r) => n + r.exceptions, 0),
    unmappedHeaderCount: unmapped.size,
    byDialect,
    rows,
  };
}
