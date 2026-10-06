import { answerMillRequest, createAnonymousMillRequest, millViewOfRequest } from "../confirm";
import { PILOT_WORKBOOK, runPilotSlice, type PilotSliceResult } from "../pilot";
import { getSpineStore, type MillConfirmation } from "../persist";
import type { ProductTruthRecord } from "../product-truth";
import { DEMO_SURFACE } from "../surfaces";
import { lockProductSource } from "../truth/lock";
import type { FrumaVersion } from "../versions";
import { persistPilotArtifacts } from "./slice";

export type DemoCasePhase = "empty" | "cloth" | "asked" | "answered" | "locked";

export type DemoCaseView = {
  phase: DemoCasePhase;
  surface: FrumaVersion;
  honesty: string;
  millName: string;
  /** Colour treated as MUST. Null means the search did not invent a shade. */
  colourSearched: string | null;
  pilot: PilotSliceResult | null;
  selectedArticle: string | null;
  /** Brand-side request. Absent on an empty case. */
  brand: {
    brandId: string;
    brandName: string;
    requestId: string;
    status: "open" | "answered" | "withdrawn";
    qualityArticle: string;
  } | null;
  /** What the mill screen is allowed to show. No brand id. */
  mill: {
    requestId: string;
    status: "open" | "answered" | "withdrawn";
    qualityArticle: string;
    category: string;
    colour?: string;
    deliveryRegion: string;
    requestedMoqHint?: string;
  } | null;
  confirmation: {
    moqM: number;
    leadWeeks: number;
    confirmedAt: string;
    available: boolean;
    freshness: "confirmed";
  } | null;
  locked: {
    lockedSourceId: string;
    version: number;
    facts: { field: string; value: string; status: string; sourceType: string }[];
  } | null;
};

type DemoSession = {
  surface: FrumaVersion;
  pilot: PilotSliceResult;
  selectedArticle: string | null;
  request: Awaited<ReturnType<typeof createAnonymousMillRequest>> | null;
  confirmation: MillConfirmation | null;
  locked: ProductTruthRecord | null;
};

const sessions = new Map<FrumaVersion, DemoSession>();

const LOCK_FIELDS = [
  "intent",
  "mill_article",
  "construction",
  "composition",
  "weight",
  "colour",
  "moq_m",
  "lead_weeks",
  "source_mill",
];

export function resetDemoCasesForTests() {
  sessions.clear();
}

export function emptyDemoCase(surface: FrumaVersion = DEMO_SURFACE): DemoCaseView {
  return {
    phase: "empty",
    surface,
    honesty:
      "No case yet. Write the brief, then search the mill fabric book. File MOQ stays historical until the mill answers.",
    millName: PILOT_WORKBOOK.millName,
    colourSearched: null,
    pilot: null,
    selectedArticle: null,
    brand: null,
    mill: null,
    confirmation: null,
    locked: null,
  };
}

function colourSearched(pilot: PilotSliceResult): string | null {
  const colour = pilot.brief.requirements.find((req) => req.field === "colour");
  if (!colour || colour.kind !== "MUST") return null;
  return colour.value;
}

function phaseOf(session: DemoSession): DemoCasePhase {
  if (session.locked) return "locked";
  if (session.confirmation) return "answered";
  if (session.request) return "asked";
  return "cloth";
}

function toView(session: DemoSession): DemoCaseView {
  const request = session.request;
  const millVisible = request ? millViewOfRequest(request) : null;
  const pilot = session.pilot;
  if (session.confirmation) {
    const confirmed = session.confirmation;
    pilot.shortlist.commercials = {
      ...pilot.shortlist.commercials,
      freshness: "confirmed",
      moqAsWritten: String(confirmed.moqM),
    };
    pilot.shortlist.evidence = pilot.shortlist.evidence.map((flag) =>
      flag.code === "historical-commercial"
        ? {
            ...flag,
            title: "MOQ and lead confirmed by mill",
            detail: `Mill confirmed MOQ ${confirmed.moqM}m / lead ${confirmed.leadWeeks}w at ${confirmed.confirmedAt}.`,
          }
        : flag,
    );
  }
  return {
    phase: phaseOf(session),
    surface: session.surface,
    honesty:
      "One case: brief, cloth from the mill file, an anonymous ask, then a lock only after the mill confirms. File MOQ is historical until that answer.",
    millName: pilot.workbook.millName,
    colourSearched: colourSearched(pilot),
    pilot,
    selectedArticle: session.selectedArticle,
    brand: request
      ? {
          brandId: request.brandId,
          brandName: pilot.brief.brandName,
          requestId: request.id,
          status: request.status,
          qualityArticle: request.qualityArticle,
        }
      : null,
    mill: millVisible
      ? {
          requestId: millVisible.id,
          status: millVisible.status,
          qualityArticle: millVisible.qualityArticle,
          category: millVisible.millVisible.category,
          colour: millVisible.millVisible.colour,
          deliveryRegion: millVisible.millVisible.deliveryRegion,
          requestedMoqHint: millVisible.millVisible.requestedMoqHint,
        }
      : null,
    confirmation: session.confirmation
      ? {
          moqM: session.confirmation.moqM,
          leadWeeks: session.confirmation.leadWeeks,
          confirmedAt: session.confirmation.confirmedAt,
          available: session.confirmation.available,
          freshness: "confirmed",
        }
      : null,
    locked: session.locked?.lockedSourceId
      ? {
          lockedSourceId: session.locked.lockedSourceId,
          version: session.locked.version,
          facts: session.locked.facts
            .filter((fact) => LOCK_FIELDS.includes(fact.field))
            .map((fact) => ({
              field: fact.field,
              value: String(fact.value ?? ""),
              status: fact.status,
              sourceType: fact.sourceType,
            })),
        }
      : null,
  };
}

function requireSession(surface: FrumaVersion): DemoSession {
  const session = sessions.get(surface);
  if (!session) throw new Error("Search the mill book before asking.");
  return session;
}

export function getDemoCase(surface: FrumaVersion = DEMO_SURFACE): DemoCaseView {
  const session = sessions.get(surface);
  return session ? toView(session) : emptyDemoCase(surface);
}

export async function resetDemoCase(surface: FrumaVersion = DEMO_SURFACE): Promise<DemoCaseView> {
  sessions.delete(surface);
  await getSpineStore(surface).reset();
  return emptyDemoCase(surface);
}

/** Deposit the pilot fabric book and cite cloth. Does not ask, confirm, or lock. */
export async function sourceCloth(input?: {
  surface?: FrumaVersion;
  colour?: string | null;
  intent?: string;
  productName?: string;
}): Promise<DemoCaseView> {
  const surface = input?.surface ?? DEMO_SURFACE;
  const existing = sessions.get(surface);
  if (existing?.request) {
    throw new Error("This case already has a mill request. Reset it before searching again.");
  }
  const pilot = runPilotSlice({
    surface,
    colour: input?.colour,
    intent: input?.intent,
    productName: input?.productName,
  });
  await persistPilotArtifacts(pilot, surface);
  const session: DemoSession = {
    surface,
    pilot,
    selectedArticle: null,
    request: null,
    confirmation: null,
    locked: null,
  };
  sessions.set(surface, session);
  return toView(session);
}

/** Brand asks the mill about one cited cloth. Brand id stays off the mill view. */
export async function askMill(input: {
  surface?: FrumaVersion;
  articleCode: string;
}): Promise<DemoCaseView> {
  const surface = input.surface ?? DEMO_SURFACE;
  const session = requireSession(surface);
  const articleCode = input.articleCode.trim();
  const hit = session.pilot.shortlist.hits.find((row) => row.articleCode === articleCode);
  if (!hit) throw new Error("That cloth is not on the shortlist.");
  if (session.request) {
    if (session.request.qualityArticle === articleCode) return toView(session);
    throw new Error("This case already asked about a different cloth. Reset to start again.");
  }
  const request = await createAnonymousMillRequest({
    brandId: session.pilot.brief.brandId,
    productId: session.pilot.brief.productId,
    millOrgId: PILOT_WORKBOOK.millOrgId,
    qualityArticle: hit.articleCode,
    surface,
    millVisible: {
      category: "Polo",
      colour: hit.colourAsWritten || undefined,
      requestedMoqHint: "historical fabric-book figure only — mill must reconfirm",
      deliveryRegion: "UK/EU",
    },
  });
  session.selectedArticle = hit.articleCode;
  session.request = request;
  return toView(session);
}

/** Mill answers with current terms. This does not lock product truth. */
export async function answerDemoCase(input: {
  surface?: FrumaVersion;
  moqM: number;
  leadWeeks: number;
  available?: boolean;
}): Promise<DemoCaseView> {
  const surface = input.surface ?? DEMO_SURFACE;
  const session = requireSession(surface);
  if (!session.request) throw new Error("There is no open request to answer.");
  if (session.confirmation) return toView(session);
  const { request, confirmation } = await answerMillRequest({
    requestId: session.request.id,
    millOrgId: PILOT_WORKBOOK.millOrgId,
    moqM: input.moqM,
    leadWeeks: input.leadWeeks,
    available: input.available ?? true,
    surface,
    note: "Mill confirmation of current commercial terms.",
  });
  session.request = request;
  session.confirmation = confirmation;
  return toView(session);
}

/** Lock only after a mill said the quality is available and confirmed terms. */
export async function lockDemoCase(input?: { surface?: FrumaVersion }): Promise<DemoCaseView> {
  const surface = input?.surface ?? DEMO_SURFACE;
  const session = requireSession(surface);
  if (session.locked) return toView(session);
  if (!session.confirmation || !session.request) {
    throw new Error("The mill has not answered yet.");
  }
  if (!session.confirmation.available) {
    throw new Error("The mill said this cloth is not available, so it cannot be locked.");
  }
  const hit = session.pilot.shortlist.hits.find(
    (row) => row.articleCode === session.request!.qualityArticle,
  );
  if (!hit) throw new Error("That cloth is not on the shortlist.");
  const locked = await lockProductSource({
    brief: session.pilot.brief,
    millOrgId: PILOT_WORKBOOK.millOrgId,
    millName: PILOT_WORKBOOK.millName,
    qualityArticle: hit.articleCode,
    depositId: session.pilot.workbook.depositId,
    constructionAsWritten: hit.constructionAsWritten,
    compositionAsWritten: hit.compositionAsWritten,
    weightAsWritten: hit.weightAsWritten,
    colourAsWritten: hit.colourAsWritten,
    confirmation: session.confirmation,
    surface,
  });
  session.locked = locked;
  return toView(session);
}
