import type { StandardField } from "../ingest/types";
import { surfaceMillOrgId, TEST_SURFACE } from "../surfaces";
import {
  confirmHeaderMapping,
  confirmedHeaderOverlays,
  listConfirmedHeaderMappings,
} from "./confirmed-headers";
import { runCorpusHarness, type CorpusHarnessOutput } from "./corpus-harness";
import { proposeFieldForHeader, type MappingProposal } from "./mapping-lexicon";
import {
  createAgentRun,
  finishAgentRun,
  latestAgentRun,
  type StoredAgentRun,
} from "./run-store";

export type MappingAgentOutput = {
  proposals: MappingProposal[];
  confirmed: { header: string; field: StandardField }[];
  appliedFromHarness: boolean;
};

/**
 * Mapping agent v1: proposes Fruma fields for unmapped mill headers.
 * Uses harness fuel when available; never auto-confirms low-confidence guesses.
 */
export function runMappingAgent(args?: {
  autoConfirmHighConfidence?: boolean;
  idempotencyKey?: string;
}): StoredAgentRun<{ source: string }, MappingAgentOutput> {
  const overlays = confirmedHeaderOverlays(TEST_SURFACE);
  const harness = latestAgentRun("ingest") as
    | StoredAgentRun<{ scope: string }, CorpusHarnessOutput>
    | undefined;

  let proposals: MappingProposal[] = [];
  let appliedFromHarness = false;

  if (harness?.output?.mappingFuel?.length) {
    proposals = harness.output.mappingFuel.map((p) => ({
      ...p,
      confirmed: Boolean(overlays[p.header.toLowerCase()]),
    }));
    appliedFromHarness = true;
  } else {
    // Fresh pass via harness so Mapping always has fuel
    const fresh = runCorpusHarness({
      idempotencyKey: `mapping-fuel:${Date.now()}`,
    });
    proposals = (fresh.output?.mappingFuel ?? []).map((p) => ({
      ...p,
      confirmed: Boolean(overlays[p.header.toLowerCase()]),
    }));
    appliedFromHarness = true;
  }

  const run = createAgentRun<{ source: string }, MappingAgentOutput>({
    organisationId: surfaceMillOrgId(TEST_SURFACE),
    kind: "mapping",
    idempotencyKey: args?.idempotencyKey ?? `mapping:${new Date().toISOString().slice(0, 13)}`,
    input: { source: appliedFromHarness ? "corpus-harness" : "direct" },
    surface: TEST_SURFACE,
  });

  const autoConfirm = args?.autoConfirmHighConfidence ?? true;
  const newlyConfirmed: { header: string; field: StandardField }[] = [];

  if (autoConfirm) {
    for (const proposal of proposals) {
      if (proposal.alreadyMapped || proposal.confirmed) continue;
      if (proposal.confidence !== "high" || !proposal.proposedField) continue;
      confirmHeaderMapping(proposal.header, proposal.proposedField, TEST_SURFACE);
      proposal.confirmed = true;
      newlyConfirmed.push({ header: proposal.header.toLowerCase(), field: proposal.proposedField });
    }
  }

  const needsReview = proposals.filter((p) => !p.alreadyMapped && !p.confirmed);
  const output: MappingAgentOutput = {
    proposals,
    confirmed: listConfirmedHeaderMappings(TEST_SURFACE),
    appliedFromHarness,
  };

  return finishAgentRun(run, {
    status: needsReview.length ? "needs-review" : "succeeded",
    output,
    findings: [
      {
        severity: "info",
        code: "mapping_batch",
        message: `Proposed ${proposals.length} headers; auto-confirmed ${newlyConfirmed.length} high-confidence; ${needsReview.length} need human review.`,
      },
      ...needsReview.slice(0, 12).map((p) => ({
        severity: "warn" as const,
        code: "mapping_needs_review",
        message: p.proposedField
          ? `"${p.header}" → ${p.proposedField} @ ${p.confidence} (needs confirm)`
          : `"${p.header}" has no lexicon match — human must choose a Fruma field`,
        header: p.header,
      })),
    ],
    summary: `Mapping: ${newlyConfirmed.length} confirmed · ${needsReview.length} need review · ${output.confirmed.length} overlays live`,
  }) as StoredAgentRun<{ source: string }, MappingAgentOutput>;
}

export function confirmMappingProposal(
  header: string,
  field: StandardField,
): { header: string; field: StandardField }[] {
  confirmHeaderMapping(header, field, TEST_SURFACE);
  return listConfirmedHeaderMappings(TEST_SURFACE);
}

export function proposeSingleHeader(header: string, samples: string[] = []): MappingProposal | null {
  return proposeFieldForHeader(header, samples, confirmedHeaderOverlays(TEST_SURFACE));
}
