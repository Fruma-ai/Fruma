import { IngestEngine } from "../ingest/engine";
import type { DepositResult, SourceCell, StandardField } from "../ingest/types";
import { proposeFieldForHeader } from "../intelligence/mapping-lexicon";
import { confirmHeaders, confirmedHeaderOverlays } from "../intelligence/overlays";
import {
  briefFromProduct,
  type Answerability,
  type BrandBrief,
  type EvidenceFlag,
} from "../intelligence/retrieval";
import {
  endProductsFromCloth,
  fabricsMatchingEndProduct,
  type EndProductFamily,
  type FabricQuality,
} from "../intelligence/fabrics";
import { TEST_PRODUCTS } from "../test-corpus/products";
import { TEST_SURFACE } from "../surfaces";
import { citationFromCell, formatCitation, type FieldCitation } from "./citations";
import { PILOT_HEADERS, PILOT_WORKBOOK, pilotWorkbookBytes } from "./workbook";

export type PilotMappingProposal = {
  header: string;
  proposedField: StandardField | null;
  confidence: "high" | "med" | "low";
  rationale: string;
  sampleValues: string[];
  alreadyMapped: boolean;
};

export type CitedAnswer = {
  requirementId: string;
  result: Answerability;
  note: string;
  citations: FieldCitation[];
};

export type PilotShortlistHit = {
  articleCode: string;
  constructionAsWritten: string;
  compositionAsWritten: string;
  weightAsWritten: string;
  colourAsWritten: string;
  possibleEndProducts: EndProductFamily[];
  citations: FieldCitation[];
  citationLines: string[];
};

export type PilotSliceResult = {
  surface: "test";
  honesty: string;
  workbook: {
    filename: string;
    millName: string;
    depositId: string;
    sha256: string;
    qualitiesBeforeConfirm: number;
    qualitiesAfterConfirm: number;
    exceptionsBefore: number;
    exceptionsAfter: number;
  };
  mapping: {
    proposals: PilotMappingProposal[];
    confirmed: Record<string, StandardField>;
    neededConfirm: boolean;
  };
  brief: BrandBrief;
  shortlist: {
    matchingFabricCount: number;
    hits: PilotShortlistHit[];
    answerability: CitedAnswer[];
    evidence: EvidenceFlag[];
    commercials: {
      moqAsWritten: string;
      freshness: "historical" | "confirmed";
      citations: FieldCitation[];
    };
  };
};

const engines = new Map<string, IngestEngine>();

function engineForSurface(): IngestEngine {
  const key = TEST_SURFACE;
  let eng = engines.get(key);
  if (!eng) {
    eng = new IngestEngine();
    engines.set(key, eng);
  }
  return eng;
}

export function resetPilotEngineForTests() {
  engines.clear();
}

function cellsByRow(cells: SourceCell[]): SourceCell[][] {
  const map = new Map<string, SourceCell[]>();
  for (const cell of cells) {
    const key = `${cell.pointer.sheet}:${cell.pointer.row}`;
    const list = map.get(key) ?? [];
    list.push(cell);
    map.set(key, list);
  }
  return [...map.values()];
}

function cellForField(
  row: SourceCell[],
  field: StandardField,
  overlays?: Record<string, StandardField>,
): SourceCell | undefined {
  const mapped = row.find((c) => c.standardField === field);
  if (mapped) return mapped;
  return row.find((c) => {
    const key = c.header.trim().toLowerCase();
    return overlays?.[key] === field;
  });
}

function qualityFromRow(
  row: SourceCell[],
  meta: { factoryId: string; filename: string; depositId: string },
  overlays?: Record<string, StandardField>,
): FabricQuality | null {
  const article = cellForField(row, "article", overlays);
  if (!article?.sourceValue) return null;
  const construction = cellForField(row, "construction", overlays);
  const composition = cellForField(row, "composition", overlays);
  const weight = cellForField(row, "weight", overlays);
  const width = cellForField(row, "width", overlays);
  const colour = cellForField(row, "colour", overlays);
  const moq = cellForField(row, "moq", overlays);

  const citations: FieldCitation[] = [];
  for (const [field, cell] of [
    ["article", article],
    ["construction", construction],
    ["composition", composition],
    ["weight", weight],
    ["width", width],
    ["colour", colour],
    ["moq", moq],
  ] as const) {
    if (cell) citations.push(citationFromCell(cell, field, meta));
  }

  const constructionValue = construction?.sourceValue ?? "";
  const compositionValue = composition?.sourceValue ?? "";

  return {
    factoryId: meta.factoryId,
    articleCode: article.sourceValue,
    constructionAsWritten: constructionValue,
    compositionAsWritten: compositionValue,
    weightAsWritten: weight?.sourceValue ?? "",
    widthAsWritten: width?.sourceValue ?? "",
    colourAsWritten: colour?.sourceValue ?? "",
    moqAsWritten: moq?.sourceValue ?? "",
    constructionMapped: Boolean(construction?.standardField),
    compositionMapped: Boolean(composition?.standardField),
    possibleEndProducts: endProductsFromCloth(constructionValue, compositionValue),
    citations,
  };
}

function sampleValues(cells: SourceCell[], header: string): string[] {
  return cells
    .filter((c) => c.header === header && c.sourceValue.trim())
    .map((c) => c.sourceValue)
    .slice(0, 3);
}

function proposalsFromDeposit(
  cells: SourceCell[],
  overlays?: Record<string, StandardField>,
): PilotMappingProposal[] {
  const headers = [...new Set(cells.map((c) => c.header).filter(Boolean))];
  return headers.map((header) => {
    const proposal = proposeFieldForHeader(header, sampleValues(cells, header), overlays);
    return {
      header: proposal.header,
      proposedField: proposal.proposedField,
      confidence: proposal.confidence,
      rationale: proposal.rationale,
      sampleValues: proposal.sampleValues,
      alreadyMapped: proposal.alreadyMapped,
    };
  });
}

function confirmPilotLexicon(headers: string[]): Record<string, StandardField> {
  const batch: Record<string, string> = {};
  for (const header of headers) {
    const proposal = proposeFieldForHeader(header);
    if (proposal.proposedField && !proposal.alreadyMapped) {
      batch[header] = proposal.proposedField;
    }
  }
  if (Object.keys(batch).length === 0) return confirmedHeaderOverlays(TEST_SURFACE);
  return confirmHeaders(batch, TEST_SURFACE);
}

function pilotProduct() {
  const navyPolo = TEST_PRODUCTS.find(
    (p) =>
      p.brandId === PILOT_WORKBOOK.brandId &&
      p.category === PILOT_WORKBOOK.productCategory &&
      /navy/i.test(p.name),
  );
  const anyPolo = TEST_PRODUCTS.find(
    (p) => p.brandId === PILOT_WORKBOOK.brandId && p.category === PILOT_WORKBOOK.productCategory,
  );
  const product = navyPolo ?? anyPolo;
  if (!product) throw new Error("pilot_product_missing");
  return product;
}

function citedAnswers(
  brief: BrandBrief,
  hits: PilotShortlistHit[],
  allQualities: FabricQuality[],
): CitedAnswer[] {
  const colourReq = brief.requirements.find((r) => r.field === "colour");
  const colour = colourReq?.kind === "MUST" ? colourReq.value : null;

  return brief.requirements.map((req) => {
    if (req.field === "construction") {
      const citations = hits.flatMap((h) =>
        h.citations.filter((c) => c.field === "construction" || c.field === "article"),
      );
      return {
        requirementId: req.id,
        result: hits.length > 0 ? ("on-file" as const) : ("missing" as const),
        note:
          hits.length > 0
            ? `${hits.length} mill fabrics can become this end product — cited from the deposited workbook.`
            : "No mill fabric in this book can become that end product.",
        citations,
      };
    }
    if (req.field === "colour") {
      if (req.kind === "OPEN") {
        return {
          requirementId: req.id,
          result: "needs-confirm" as const,
          note: "Colour left OPEN — no default invented.",
          citations: [],
        };
      }
      const colourHits = hits.filter((h) =>
        h.colourAsWritten.toLowerCase().includes((colour ?? "").toLowerCase()),
      );
      const citations = colourHits.flatMap((h) => h.citations.filter((c) => c.field === "colour"));
      return {
        requirementId: req.id,
        result: colourHits.length > 0 ? ("on-file" as const) : ("missing" as const),
        note:
          colourHits.length > 0
            ? `Colourway “${colour}” as written on the mill row.`
            : `No ${colour} colourway on this fabric book.`,
        citations,
      };
    }
    if (req.field === "moq") {
      const citations = allQualities
        .flatMap((q) => q.citations ?? [])
        .filter((c) => c.field === "moq")
        .slice(0, 3);
      return {
        requirementId: req.id,
        result: "needs-confirm" as const,
        note: "Fabric-book MOQ is historical until the mill reconfirms.",
        citations,
      };
    }
    if (req.field === "geography") {
      return {
        requirementId: req.id,
        result: "on-file" as const,
        note: `${PILOT_WORKBOOK.country} · EU/UK pilot mill profile`,
        citations: [],
      };
    }
    return {
      requirementId: req.id,
      result: "needs-confirm" as const,
      note: "Needs mill confirmation.",
      citations: [],
    };
  });
}

/**
 * One-shot sellability slice on Test:
 * real XLSX → deposit → confirm maps → searchable qualities → evidence-first shortlist with citations.
 * Demo is never touched.
 */
export function runPilotSlice(options?: { skipConfirm?: boolean }): PilotSliceResult {
  const bytes = pilotWorkbookBytes();
  const eng = engineForSurface();
  const product = pilotProduct();
  const brief = briefFromProduct(product);

  const before: DepositResult = eng.deposit({
    supplierOrgId: PILOT_WORKBOOK.millOrgId,
    filename: PILOT_WORKBOOK.filename,
    bytes,
  });

  const proposals = proposalsFromDeposit(before.cells);
  const needsConfirm = proposals.some((p) => p.proposedField && !p.alreadyMapped);

  let overlays = confirmedHeaderOverlays(TEST_SURFACE);
  if (!options?.skipConfirm) {
    overlays = confirmPilotLexicon([...PILOT_HEADERS]);
  }

  const after: DepositResult = eng.deposit({
    supplierOrgId: PILOT_WORKBOOK.millOrgId,
    filename: PILOT_WORKBOOK.filename,
    bytes,
    headerOverlays: overlays,
  });

  const meta = {
    factoryId: PILOT_WORKBOOK.millOrgId,
    filename: PILOT_WORKBOOK.filename,
    depositId: after.deposit.depositId,
  };

  const qualities = cellsByRow(after.cells)
    .map((row) => qualityFromRow(row, meta, overlays))
    .filter((q): q is FabricQuality => q !== null);

  const book = {
    factoryId: PILOT_WORKBOOK.millOrgId,
    factoryName: PILOT_WORKBOOK.millName,
    dialect: "pilot-xlsx" as const,
    millSubmits: "fabrics-and-materials" as const,
    qualities,
    endProductSupport: [],
  };

  const colourReq = brief.requirements.find((r) => r.field === "colour");
  const colour = colourReq?.kind === "MUST" ? colourReq.value : null;
  const matched = fabricsMatchingEndProduct(book, "Polo", colour);

  const hits: PilotShortlistHit[] = matched.map((q) => ({
    articleCode: q.articleCode,
    constructionAsWritten: q.constructionAsWritten,
    compositionAsWritten: q.compositionAsWritten,
    weightAsWritten: q.weightAsWritten,
    colourAsWritten: q.colourAsWritten,
    possibleEndProducts: q.possibleEndProducts,
    citations: q.citations ?? [],
    citationLines: (q.citations ?? []).map(formatCitation),
  }));

  const answerability = citedAnswers(brief, hits, qualities);
  const moqCitations = qualities
    .flatMap((q) => q.citations ?? [])
    .filter((c) => c.field === "moq")
    .slice(0, 3);

  const organicHit = qualities.find((q) => /organic/i.test(q.compositionAsWritten));
  const evidence: EvidenceFlag[] = [];
  if (organicHit) {
    evidence.push({
      code: "organic-not-gots",
      severity: "block",
      title: "Organic fibre is not GOTS",
      detail:
        "A mill fabric composition mentions organic cotton. That is not a product-level GOTS claim. Missing stays missing.",
    });
  }
  evidence.push({
    code: "missing-cert",
    severity: "info",
    title: "No programme on file for the matched navy polo cloth",
    detail: "Fruma will not invent a certificate to fill the gap.",
  });
  evidence.push({
    code: "historical-commercial",
    severity: "info",
    title: "MOQ and lead are historical",
    detail: "Fabric-book Min order is not a current mill confirmation.",
  });

  return {
    surface: "test",
    honesty:
      "Pilot fixture workbook — shaped like a real mill fabric book, not a live customer file. Demo stays frozen.",
    workbook: {
      filename: PILOT_WORKBOOK.filename,
      millName: PILOT_WORKBOOK.millName,
      depositId: after.deposit.depositId,
      sha256: after.deposit.sha256,
      qualitiesBeforeConfirm: before.qualities.length,
      qualitiesAfterConfirm: after.qualities.length,
      exceptionsBefore: before.exceptions.length,
      exceptionsAfter: after.exceptions.length,
    },
    mapping: {
      proposals,
      confirmed: overlays,
      neededConfirm: needsConfirm,
    },
    brief,
    shortlist: {
      matchingFabricCount: hits.length,
      hits,
      answerability,
      evidence,
      commercials: {
        moqAsWritten: hits[0]?.citations.find((c) => c.field === "moq")?.sourceValue ?? "300",
        freshness: "historical",
        citations: moqCitations,
      },
    },
  };
}
