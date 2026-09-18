import { millIngestEngineFor } from "../ingest/deposits-http";
import type { StandardField } from "../ingest/types";
import { surfaceMillOrgId, TEST_SURFACE } from "../surfaces";
import { TEST_FACTORIES, hangerCsvFor } from "../test-corpus";
import type { HangerDialect } from "../test-corpus/types";
import { confirmedHeaderOverlays } from "./confirmed-headers";
import { proposeFieldForHeader, type MappingProposal } from "./mapping-lexicon";
import {
  createAgentRun,
  finishAgentRun,
  type AgentFinding,
  type StoredAgentRun,
} from "./run-store";

export type FactoryHarnessRow = {
  factoryId: string;
  factoryName: string;
  dialect: HangerDialect;
  depositId?: string;
  qualities: number;
  exceptions: number;
  unmappedHeaders: string[];
  emptyArticleRows: number;
  ok: boolean;
  error?: string;
};

export type CorpusHarnessOutput = {
  factoriesTotal: number;
  factoriesOk: number;
  factoriesFailed: number;
  qualitiesTotal: number;
  exceptionsTotal: number;
  unmappedHeaderCount: number;
  byDialect: Record<
    string,
    { factories: number; ok: number; qualities: number; exceptions: number; unmapped: string[] }
  >;
  rows: FactoryHarnessRow[];
  mappingFuel: MappingProposal[];
};

function uniqueHeadersFromCells(
  cells: { header: string; standardField?: string; sourceValue: string }[],
): { unmapped: string[]; samples: Map<string, string[]> } {
  const samples = new Map<string, string[]>();
  const unmapped = new Set<string>();
  for (const cell of cells) {
    const list = samples.get(cell.header) ?? [];
    if (list.length < 3 && cell.sourceValue) list.push(cell.sourceValue);
    samples.set(cell.header, list);
    if (!cell.standardField && cell.header.trim()) unmapped.add(cell.header);
  }
  return { unmapped: [...unmapped].sort(), samples };
}

export function runCorpusHarness(args?: {
  idempotencyKey?: string;
}): StoredAgentRun<{ scope: string }, CorpusHarnessOutput> {
  const overlays = confirmedHeaderOverlays(TEST_SURFACE);
  const run = createAgentRun<{ scope: string }, CorpusHarnessOutput>({
    organisationId: surfaceMillOrgId(TEST_SURFACE),
    kind: "ingest",
    idempotencyKey: args?.idempotencyKey ?? `corpus-harness:${new Date().toISOString().slice(0, 13)}`,
    input: { scope: "all-test-factories" },
    surface: TEST_SURFACE,
  });

  const engine = millIngestEngineFor(TEST_SURFACE);
  const rows: FactoryHarnessRow[] = [];
  const findings: AgentFinding[] = [];
  const dialectAgg = new Map<
    string,
    { factories: number; ok: number; qualities: number; exceptions: number; unmapped: Set<string> }
  >();
  const proposalByHeader = new Map<string, MappingProposal>();

  for (const factory of TEST_FACTORIES) {
    const agg = dialectAgg.get(factory.dialect) ?? {
      factories: 0,
      ok: 0,
      qualities: 0,
      exceptions: 0,
      unmapped: new Set<string>(),
    };
    agg.factories += 1;

    try {
      const csv = hangerCsvFor(factory);
      const result = engine.deposit({
        supplierOrgId: `${surfaceMillOrgId(TEST_SURFACE)}:${factory.id}`,
        filename: factory.filename,
        bytes: new TextEncoder().encode(csv),
        headerOverlays: overlays,
      });
      const { unmapped, samples } = uniqueHeadersFromCells(result.cells);
      const emptyArticleRows = result.exceptions.filter((e) => e.code === "empty_article").length;

      for (const header of unmapped) {
        agg.unmapped.add(header);
        if (!proposalByHeader.has(header)) {
          const proposal = proposeFieldForHeader(header, samples.get(header) ?? [], overlays);
          if (proposal && !proposal.alreadyMapped) proposalByHeader.set(header, proposal);
        }
      }

      if (emptyArticleRows > 0) {
        findings.push({
          severity: "warn",
          code: "empty_article_rows",
          message: `${factory.name}: ${emptyArticleRows} rows missing a mapped article header.`,
          factoryId: factory.id,
          dialect: factory.dialect,
        });
      }
      if (unmapped.length > 0) {
        findings.push({
          severity: "info",
          code: "unmapped_headers",
          message: `${factory.name} (${factory.dialect}): unmapped headers ${unmapped.join(", ")}`,
          factoryId: factory.id,
          dialect: factory.dialect,
        });
      }

      const row: FactoryHarnessRow = {
        factoryId: factory.id,
        factoryName: factory.name,
        dialect: factory.dialect,
        depositId: result.deposit.depositId,
        qualities: result.qualities.length,
        exceptions: result.exceptions.length,
        unmappedHeaders: unmapped,
        emptyArticleRows,
        ok: result.qualities.length > 0,
      };
      if (!row.ok) {
        findings.push({
          severity: "block",
          code: "zero_qualities",
          message: `${factory.name}: ingest produced 0 qualities — likely unmapped article header.`,
          factoryId: factory.id,
          dialect: factory.dialect,
        });
      } else {
        agg.ok += 1;
      }
      agg.qualities += row.qualities;
      agg.exceptions += row.exceptions;
      rows.push(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : "deposit_failed";
      findings.push({
        severity: "block",
        code: "deposit_failed",
        message: `${factory.name}: ${message}`,
        factoryId: factory.id,
        dialect: factory.dialect,
      });
      rows.push({
        factoryId: factory.id,
        factoryName: factory.name,
        dialect: factory.dialect,
        qualities: 0,
        exceptions: 0,
        unmappedHeaders: [],
        emptyArticleRows: 0,
        ok: false,
        error: message,
      });
    }

    dialectAgg.set(factory.dialect, agg);
  }

  const factoriesOk = rows.filter((r) => r.ok).length;
  const factoriesFailed = rows.length - factoriesOk;
  const mappingFuel = [...proposalByHeader.values()].sort((a, b) =>
    a.header.localeCompare(b.header),
  );

  const byDialect: CorpusHarnessOutput["byDialect"] = {};
  for (const [dialect, agg] of dialectAgg) {
    byDialect[dialect] = {
      factories: agg.factories,
      ok: agg.ok,
      qualities: agg.qualities,
      exceptions: agg.exceptions,
      unmapped: [...agg.unmapped].sort(),
    };
  }

  const output: CorpusHarnessOutput = {
    factoriesTotal: rows.length,
    factoriesOk,
    factoriesFailed,
    qualitiesTotal: rows.reduce((n, r) => n + r.qualities, 0),
    exceptionsTotal: rows.reduce((n, r) => n + r.exceptions, 0),
    unmappedHeaderCount: mappingFuel.length,
    byDialect,
    rows,
    mappingFuel,
  };

  const zeroDialects = Object.entries(byDialect)
    .filter(([, d]) => d.ok === 0)
    .map(([name]) => name);

  if (zeroDialects.length) {
    findings.unshift({
      severity: "block",
      code: "dialect_total_failure",
      message: `Dialects with zero successful factories: ${zeroDialects.join(", ")}. Mapping agent should confirm article headers first.`,
    });
  }

  return finishAgentRun(run, {
    status: factoriesFailed === 0 ? "succeeded" : "needs-review",
    output,
    findings,
    summary: `Harness: ${factoriesOk}/${rows.length} factories ok · ${output.qualitiesTotal} qualities · ${mappingFuel.length} headers need mapping`,
  }) as StoredAgentRun<{ scope: string }, CorpusHarnessOutput>;
}
