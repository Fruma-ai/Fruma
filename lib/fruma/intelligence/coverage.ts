import { qualitiesFromCells } from "../ingest/identity";
import { parseCsvBytes } from "../ingest/parse-csv";
import type { StandardField } from "../ingest/types";
import { TEST_FACTORIES } from "../test-corpus/factories";
import { hangerBytesFor, hangerRowsFor } from "../test-corpus/hanger";
import type { HangerDialect, TestFactory } from "../test-corpus/types";
import { proposeFieldForHeader, type MappingProposal } from "./mapping-lexicon";

export type CoverageStatus = "searchable" | "partial" | "dark";

export type FactoryCoverage = {
  factoryId: string;
  factoryName: string;
  dialect: HangerDialect;
  country: string;
  rowCount: number;
  qualities: number;
  emptyArticleRows: number;
  unmappedHeaders: string[];
  mappedCellPct: number;
  status: CoverageStatus;
  blocker: string | null;
  proposals: MappingProposal[];
};

export type DialectCoverage = {
  dialect: HangerDialect;
  factories: number;
  searchable: number;
  partial: number;
  dark: number;
  qualities: number;
  unmappedHeaders: string[];
};

export type CorpusCoverage = {
  factoriesTotal: number;
  searchable: number;
  partial: number;
  dark: number;
  qualitiesTotal: number;
  emptyArticleRows: number;
  unmappedHeaderCount: number;
  byDialect: DialectCoverage[];
  factories: FactoryCoverage[];
  mappingQueue: MappingProposal[];
};

function unmappedHeadersFrom(
  cells: { header: string; standardField?: StandardField }[],
): string[] {
  const set = new Set<string>();
  for (const cell of cells) {
    if (!cell.standardField && cell.header.trim()) set.add(cell.header);
  }
  return [...set].sort();
}

function sampleValuesFor(factory: TestFactory, header: string): string[] {
  const rows = hangerRowsFor(factory);
  const samples: string[] = [];
  for (const row of rows) {
    const value = row[header]?.trim();
    if (value && !samples.includes(value)) samples.push(value);
    if (samples.length >= 3) break;
  }
  return samples;
}

function blockerFor(factory: TestFactory, unmapped: string[], qualities: number): string | null {
  if (qualities > 0) return null;
  if (unmapped.includes("Art.")) {
    return "Article identity unmapped — mill column “Art.” is not an alias. Eight Polish mills stay dark until this is confirmed.";
  }
  if (unmapped.length) {
    return `No qualities — identity column not mapped (${unmapped.join(", ")}).`;
  }
  return "No qualities created from this hanger.";
}

export function scoreFactoryCoverage(
  factory: TestFactory,
  overlays?: Record<string, StandardField>,
): FactoryCoverage {
  const bytes = hangerBytesFor(factory);
  const cells = parseCsvBytes(factory.filename, bytes, overlays);
  const built = qualitiesFromCells({
    supplierOrgId: factory.id,
    depositId: `cov:${factory.id}`,
    cells,
  });
  const unmappedHeaders = unmappedHeadersFrom(cells);
  const mapped = cells.filter((c) => c.standardField).length;
  const mappedCellPct = cells.length ? Math.round((100 * mapped) / cells.length) : 0;
  const emptyArticleRows = built.exceptions.filter((e) => e.code === "empty_article").length;
  const qualities = built.qualities.length;
  const status: CoverageStatus =
    qualities === 0 ? "dark" : unmappedHeaders.length > 0 ? "partial" : "searchable";
  const proposals = unmappedHeaders.map((header) =>
    proposeFieldForHeader(header, sampleValuesFor(factory, header), overlays),
  );

  return {
    factoryId: factory.id,
    factoryName: factory.name,
    dialect: factory.dialect,
    country: factory.country,
    rowCount: factory.rowCount,
    qualities,
    emptyArticleRows,
    unmappedHeaders,
    mappedCellPct,
    status,
    blocker: blockerFor(factory, unmappedHeaders, qualities),
    proposals,
  };
}

export function scoreCorpusCoverage(
  overlays?: Record<string, StandardField>,
  factories: TestFactory[] = TEST_FACTORIES,
): CorpusCoverage {
  const rows = factories.map((factory) => scoreFactoryCoverage(factory, overlays));
  const dialectMap = new Map<HangerDialect, FactoryCoverage[]>();
  for (const row of rows) {
    const list = dialectMap.get(row.dialect) ?? [];
    list.push(row);
    dialectMap.set(row.dialect, list);
  }

  const byDialect: DialectCoverage[] = [...dialectMap.entries()].map(([dialect, list]) => ({
    dialect,
    factories: list.length,
    searchable: list.filter((r) => r.status === "searchable").length,
    partial: list.filter((r) => r.status === "partial").length,
    dark: list.filter((r) => r.status === "dark").length,
    qualities: list.reduce((n, r) => n + r.qualities, 0),
    unmappedHeaders: [...new Set(list.flatMap((r) => r.unmappedHeaders))].sort(),
  }));

  const queueByHeader = new Map<string, MappingProposal>();
  for (const row of rows) {
    for (const proposal of row.proposals) {
      const existing = queueByHeader.get(proposal.header);
      if (!existing) {
        queueByHeader.set(proposal.header, { ...proposal });
        continue;
      }
      const samples = [...existing.sampleValues];
      for (const value of proposal.sampleValues) {
        if (!samples.includes(value) && samples.length < 3) samples.push(value);
      }
      queueByHeader.set(proposal.header, { ...existing, sampleValues: samples });
    }
  }

  return {
    factoriesTotal: rows.length,
    searchable: rows.filter((r) => r.status === "searchable").length,
    partial: rows.filter((r) => r.status === "partial").length,
    dark: rows.filter((r) => r.status === "dark").length,
    qualitiesTotal: rows.reduce((n, r) => n + r.qualities, 0),
    emptyArticleRows: rows.reduce((n, r) => n + r.emptyArticleRows, 0),
    unmappedHeaderCount: queueByHeader.size,
    byDialect,
    factories: rows,
    mappingQueue: [...queueByHeader.values()].sort((a, b) => a.header.localeCompare(b.header)),
  };
}
