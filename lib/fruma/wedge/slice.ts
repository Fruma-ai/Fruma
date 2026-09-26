import {
  answerMillRequest,
  createAnonymousMillRequest,
  millViewOfRequest,
} from "../confirm";
import {
  getSpineStore,
  setSpineStoreForTests,
  spineBackendKind,
  FileSpineStore,
  type MillConfirmation,
  type AnonymousMillRequest,
} from "../persist";
import { confirmedHeaderOverlays, confirmHeaders, resetHeaderOverlaysForTests } from "../intelligence/overlays";
import { TEST_SURFACE } from "../surfaces";
import {
  PILOT_WORKBOOK,
  pilotWorkbookBytes,
  resetPilotEngineForTests,
  runPilotSlice,
  type PilotSliceResult,
} from "../pilot";
import { lockProductSource } from "../truth/lock";
import type { ProductTruthRecord } from "../product-truth";
import { join } from "node:path";
import { tmpdir } from "node:os";

export type WedgeSliceResult = {
  surface: "test";
  honesty: string;
  persistence: { backend: "file" | "postgres" };
  pilot: PilotSliceResult;
  request: {
    brandSide: AnonymousMillRequest;
    millVisible: ReturnType<typeof millViewOfRequest>;
  };
  confirmation: MillConfirmation;
  locked: ProductTruthRecord;
  commercials: {
    before: "historical";
    after: "confirmed";
    moqM: number;
    leadWeeks: number;
    confirmedAt: string;
  };
};

async function persistPilotArtifacts(pilot: PilotSliceResult): Promise<void> {
  const store = getSpineStore();
  const overlays = confirmedHeaderOverlays(TEST_SURFACE);
  await store.saveHeaderMap({
    surface: TEST_SURFACE,
    overlays,
    updatedAt: new Date().toISOString(),
  });

  const bytes = pilotWorkbookBytes();
  await store.saveDepositPointer(
    {
      depositId: pilot.workbook.depositId,
      supplierOrgId: PILOT_WORKBOOK.millOrgId,
      filename: pilot.workbook.filename,
      sha256: pilot.workbook.sha256,
      byteLength: bytes.byteLength,
      receivedAt: new Date().toISOString(),
      objectKey: `${pilot.workbook.depositId}.bin`,
    },
    bytes,
  );
}

/**
 * Full Test wedge:
 * workbook → map → cited shortlist → anonymous mill request →
 * timestamped confirmation → locked product-truth record → durable spine.
 * Demo is never touched.
 */
export async function runWedgeSlice(options?: {
  moqM?: number;
  leadWeeks?: number;
}): Promise<WedgeSliceResult> {
  const pilot = runPilotSlice();
  await persistPilotArtifacts(pilot);

  const hit = pilot.shortlist.hits[0];
  if (!hit) throw new Error("wedge_no_shortlist_hit");

  const brandRequest = await createAnonymousMillRequest({
    brandId: pilot.brief.brandId,
    productId: pilot.brief.productId,
    millOrgId: PILOT_WORKBOOK.millOrgId,
    qualityArticle: hit.articleCode,
    millVisible: {
      category: "Polo",
      colour: hit.colourAsWritten || undefined,
      requestedMoqHint: "historical fabric-book figure only — mill must reconfirm",
      deliveryRegion: "UK/EU",
    },
  });

  const millVisible = millViewOfRequest(brandRequest);
  // Honesty: mill view must not carry brandId.
  if ("brandId" in (millVisible as object)) {
    throw new Error("brand_leaked_to_mill_view");
  }

  const moqM = options?.moqM ?? 320;
  const leadWeeks = options?.leadWeeks ?? 6;
  const { confirmation } = await answerMillRequest({
    requestId: brandRequest.id,
    millOrgId: PILOT_WORKBOOK.millOrgId,
    moqM,
    leadWeeks,
    available: true,
    note: "Pilot mill confirmation — current commercial terms.",
  });

  const locked = await lockProductSource({
    brief: pilot.brief,
    millOrgId: PILOT_WORKBOOK.millOrgId,
    millName: PILOT_WORKBOOK.millName,
    qualityArticle: hit.articleCode,
    depositId: pilot.workbook.depositId,
    constructionAsWritten: hit.constructionAsWritten,
    compositionAsWritten: hit.compositionAsWritten,
    weightAsWritten: hit.weightAsWritten,
    colourAsWritten: hit.colourAsWritten,
    confirmation,
  });

  // Refresh answerability commercially on the returned pilot copy for UI.
  const refreshedPilot: PilotSliceResult = {
    ...pilot,
    shortlist: {
      ...pilot.shortlist,
      commercials: {
        ...pilot.shortlist.commercials,
        freshness: "confirmed",
        moqAsWritten: String(confirmation.moqM),
      },
      evidence: pilot.shortlist.evidence.map((e) =>
        e.code === "historical-commercial"
          ? {
              code: "historical-commercial",
              severity: "info" as const,
              title: "MOQ and lead confirmed by mill",
              detail: `Mill confirmed MOQ ${confirmation.moqM}m / lead ${confirmation.leadWeeks}w at ${confirmation.confirmedAt}.`,
            }
          : e,
      ),
      answerability: pilot.shortlist.answerability.map((a) =>
        a.requirementId === "req-moq"
          ? {
              ...a,
              result: "on-file" as const,
              note: `Mill confirmed MOQ ${confirmation.moqM}m at ${confirmation.confirmedAt}.`,
            }
          : a,
      ),
    },
  };

  return {
    surface: "test",
    honesty:
      "Full Test wedge with durable spine. Brand stays hidden from the mill view. Demo stays frozen.",
    persistence: { backend: spineBackendKind() },
    pilot: refreshedPilot,
    request: { brandSide: brandRequest, millVisible },
    confirmation,
    locked,
    commercials: {
      before: "historical",
      after: "confirmed",
      moqM: confirmation.moqM,
      leadWeeks: confirmation.leadWeeks,
      confirmedAt: confirmation.confirmedAt,
    },
  };
}

/** Restore overlays from durable store after a process restart. */
export async function hydrateHeaderOverlaysFromStore(): Promise<Record<string, string>> {
  const snap = await getSpineStore().load();
  const map = snap.headerMaps.find((m) => m.surface === TEST_SURFACE);
  if (!map) return {};
  return confirmHeaders(
    Object.fromEntries(Object.entries(map.overlays).map(([h, f]) => [h, f])),
    TEST_SURFACE,
  );
}

export async function resetWedgeForTests(dataDir?: string) {
  resetHeaderOverlaysForTests();
  resetPilotEngineForTests();
  const dir = dataDir ?? join(tmpdir(), `fruma-wedge-${Date.now()}`);
  const store = new FileSpineStore(dir);
  await store.reset();
  setSpineStoreForTests(store);
}
