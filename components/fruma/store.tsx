"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  applyIssueFix,
  applySuggestions,
  buildCatalog,
  filterCatalog,
  liveCatalogFabrics,
  rawFor,
  type CatalogRow,
} from "@/lib/fruma/catalog";
import { DEMO_BRIEF, DRAFT_PRODUCT, FABRIC_BY_ID, MAX_DESK } from "@/lib/fruma/data";
import {
  FILE_RECEIVED_COPY,
  SEEDED_FILE_COPY,
  isOnTheStandard,
} from "@/lib/fruma/honesty";
import { type SellMarket } from "@/lib/fruma/market-score";
import { APPLY_STEPS, defaultMillMap, DEMO_MILL_FILE } from "@/lib/fruma/mill-ingest";
import {
  emptyMillLearn,
  loadMillLearn,
  rankMillOptions,
  recordMillPick,
  type MillLearn,
} from "@/lib/fruma/mill-learn";
import { garmentPreviewSrc } from "@/lib/fruma/preview";
import { isIndexError, parseBrief, searchFabrics } from "@/lib/fruma/search";
import {
  emptyLearn,
  firstDraft,
  loadLearn,
  rankOptions,
  recordPick,
  type LearnState,
} from "@/lib/fruma/suggest";
import { listingRecipe, readDesignImage, type VisualRead } from "@/lib/fruma/vision";
import type {
  AiFieldKey,
  AiFields,
  BrandRoom,
  CatalogField,
  CatalogFilter,
  Fabric,
  ImageStatus,
  MillApplyStatus,
  MillFile,
  MillReadStatus,
  MillRoom,
  Mode,
  ParsedBrief,
  SearchStatus,
  SetupPhase,
  SwatchStage,
} from "@/lib/fruma/types";

export type AiStatus = "idle" | "running" | "draft" | "approved";
export type { AiFields };

type State = {
  mode: Mode;
  brandRoom: BrandRoom;
  millRoom: MillRoom;
  setupPhase: SetupPhase;
  brief: string;
  parsed: ParsedBrief;
  searchStatus: SearchStatus;
  resultIds: string[];
  rawFromMills: boolean;
  deskIds: string[];
  chosenId: string | null;
  swatchStage: Record<string, SwatchStage>;
  colourwayIndex: number;
  designImage: string | null;
  productImage: string | null;
  productImageStatus: ImageStatus;
  imageRecipe: string[];
  aiStatus: AiStatus;
  ai: AiFields;
  aiCustom: Record<AiFieldKey, boolean>;
  learn: LearnState;
  published: Record<string, boolean>;
  millAdded: Record<string, boolean>;
  millFixed: Record<string, boolean>;
  millClaimed: boolean;
  millPct: number;
  millMarkets: Record<SellMarket, boolean>;
  millEvidence: Record<string, boolean>;
  ingestChoices: Record<number, "ok" | "alt">;
  ingestPublished: boolean;
  insightDone: Record<string, string>;
  showRule: boolean;
  feedDest: string;
  toast: string | null;
  millIndexWarning: boolean;
  deskError: boolean;
  catalog: CatalogRow[];
  catalogSelected: string[];
  catalogFilter: CatalogFilter;
  catalogQuery: string;
  millLearn: MillLearn;
  previewById: Record<string, { status: ImageStatus; src: string | null }>;
  millFile: MillFile | null;
  millReadStatus: MillReadStatus;
  millReadStep: number;
  millApplyStatus: MillApplyStatus;
  millApplyStep: number;
  millColumnMap: Record<string, string>;
  millTemplateName: string;
  millMapConfirmed: boolean;
  millReviewGroup: string;
  millExceptionOpen: boolean;
  millRowApproved: Record<string, boolean>;
};

type Action =
  | { type: "enter"; mode: "brand" | "mill" }
  | { type: "millClaim" }
  | { type: "setupPhase"; phase: SetupPhase }
  | { type: "setBrandRoom"; room: BrandRoom }
  | { type: "setMillRoom"; room: MillRoom }
  | { type: "setBrief"; brief: string }
  | { type: "searchStart" }
  | { type: "searchFinish"; brief: string }
  | { type: "toggleRaw" }
  | { type: "toggleDesk"; id: string }
  | { type: "pickProduct"; id: string }
  | { type: "orderSwatches" }
  | { type: "advanceSwatch"; id: string }
  | { type: "setColourway"; index: number }
  | { type: "setDesignImage"; src: string | null }
  | { type: "productImageStart" }
  | { type: "productImageReady"; src: string; recipe: string[] }
  | { type: "aiStart" }
  | { type: "aiSet"; fields: Partial<AiFields> }
  | { type: "aiDraft" }
  | { type: "aiApprove" }
  | { type: "aiPick"; field: AiFieldKey; value: string; custom: boolean }
  | { type: "hydrateLearn"; learn: LearnState }
  | { type: "publish"; dest: string }
  | { type: "millAdd"; key: string }
  | { type: "millFix"; key: string }
  | { type: "millToggleMarket"; market: SellMarket }
  | { type: "millEvidence"; id: string }
  | { type: "ingestChoose"; i: number; choice: "ok" | "alt" }
  | { type: "ingestPublish" }
  | { type: "millFile"; file: MillFile }
  | { type: "millApplyStart" }
  | { type: "millApplyTick"; step: number }
  | { type: "millApplyDone" }
  | { type: "millMapField"; key: string; column: string }
  | { type: "millTemplateName"; name: string }
  | { type: "millMapConfirm" }
  | { type: "millReviewGroup"; id: string }
  | { type: "millApproveRow"; id: string }
  | { type: "millApproveAll" }
  | { type: "millException"; open: boolean }
  | { type: "insightAct"; key: string; label: string }
  | { type: "setFeedDest"; id: string }
  | { type: "toast"; message: string | null }
  | { type: "dismissMillWarning" }
  | { type: "deskError"; on: boolean }
  | { type: "catalogFilter"; filter: CatalogFilter }
  | { type: "catalogQuery"; query: string }
  | { type: "catalogToggle"; id: string }
  | { type: "catalogSelectIds"; ids: string[] }
  | { type: "catalogClear" }
  | { type: "catalogApply"; ids: string[] }
  | { type: "catalogConfirm"; ids: string[] }
  | { type: "catalogField"; id: string; field: CatalogField; value: string }
  | { type: "catalogBulkFix"; needle: string; ids: string[] }
  | { type: "hydrateMillLearn"; learn: MillLearn }
  | { type: "previewStart"; id: string }
  | { type: "previewReady"; id: string; src: string };

const EMPTY_AI: AiFields = {
  title: "—",
  desc: "—",
  care: "—",
  attrs: "—",
  cat: "—",
};

const EMPTY_PARSED: ParsedBrief = {
  reading: "—",
  weight: "—",
  colour: "—",
  moq: "—",
};

const initial: State = {
  mode: "entry",
  brandRoom: "design",
  millRoom: "profile",
  setupPhase: "idle",
  brief: "",
  parsed: EMPTY_PARSED,
  searchStatus: "idle",
  resultIds: [],
  rawFromMills: false,
  deskIds: [],
  chosenId: null,
  swatchStage: {},
  colourwayIndex: 0,
  designImage: null,
  productImage: null,
  productImageStatus: "idle",
  imageRecipe: [],
  aiStatus: "idle",
  ai: EMPTY_AI,
  aiCustom: {
    title: false,
    desc: false,
    care: false,
    attrs: false,
    cat: false,
  },
  learn: emptyLearn(),
  published: {},
  millAdded: {},
  millFixed: {},
  millClaimed: false,
  millPct: 0,
  millMarkets: { eu: false, uk: false, us: false },
  millEvidence: {},
  ingestChoices: {},
  ingestPublished: false,
  insightDone: {},
  showRule: false,
  feedDest: "own",
  toast: null,
  millIndexWarning: false,
  deskError: false,
  catalog: buildCatalog(),
  catalogSelected: [],
  catalogFilter: "all",
  catalogQuery: "",
  millLearn: emptyMillLearn(),
  previewById: {},
  millFile: null,
  millReadStatus: "idle",
  millReadStep: 0,
  millApplyStatus: "idle",
  millApplyStep: 0,
  millColumnMap: defaultMillMap(),
  millTemplateName: "Mill template",
  millMapConfirmed: false,
  millReviewGroup: "all",
  millExceptionOpen: false,
  millRowApproved: {},
};

function millLive(state: State): Fabric[] {
  return liveCatalogFabrics(state.catalog, {
    claimed: state.millClaimed,
    file: state.millFile,
    mapped: state.millMapConfirmed,
  });
}

function fabricLookup(state: State): Record<string, Fabric> {
  const extra = millLive(state);
  if (!extra.length) return FABRIC_BY_ID;
  return {
    ...FABRIC_BY_ID,
    ...Object.fromEntries(extra.map((f) => [f.id, f])),
  };
}

function resolveProductFabric(state: State): Fabric | null {
  if (!state.chosenId || !state.deskIds.includes(state.chosenId)) return null;
  return fabricLookup(state)[state.chosenId] ?? null;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "enter":
      return {
        ...state,
        mode: action.mode,
        brief:
          action.mode === "brand" && !state.brief.trim()
            ? DEMO_BRIEF
            : state.brief,
        millRoom: action.mode === "mill" ? "profile" : state.millRoom,
        setupPhase:
          action.mode === "brand" && state.setupPhase === "idle"
            ? "reading"
            : state.setupPhase,
      };
    case "millClaim":
      if (state.millClaimed) return state;
      return { ...state, millClaimed: true };
    case "setupPhase":
      return { ...state, setupPhase: action.phase };
    case "setBrandRoom":
      return { ...state, brandRoom: action.room, deskError: false };
    case "setMillRoom":
      return { ...state, millRoom: action.room };
    case "setBrief":
      return { ...state, brief: action.brief };
    case "searchStart":
      return { ...state, searchStatus: "loading" };
    case "searchFinish": {
      if (isIndexError(action.brief)) {
        return {
          ...state,
          searchStatus: "error",
          parsed: parseBrief(action.brief),
          resultIds: [],
        };
      }
      const visual = readDesignImage(state.designImage);
      const { parsed, results } = searchFabrics(action.brief, visual, millLive(state));
      return {
        ...state,
        parsed,
        resultIds: results.map((f) => f.id),
        searchStatus: results.length
          ? "ready"
          : action.brief.trim()
            ? "empty"
            : "idle",
        millIndexWarning: /ho chi minh|vietnam/i.test(action.brief),
      };
    }
    case "toggleRaw":
      return { ...state, rawFromMills: !state.rawFromMills };
    case "toggleDesk": {
      const has = state.deskIds.includes(action.id);
      if (has) {
        const nextIds = state.deskIds.filter((id) => id !== action.id);
        const nextStage = { ...state.swatchStage };
        delete nextStage[action.id];
        const droppedChosen = state.chosenId === action.id;
        return {
          ...state,
          deskIds: nextIds,
          swatchStage: nextStage,
          chosenId: droppedChosen ? null : state.chosenId,
          ...(droppedChosen
            ? {
                productImage: null,
                productImageStatus: "idle" as const,
                imageRecipe: [],
                aiStatus: "idle" as const,
              }
            : {}),
        };
      }
      if (state.deskIds.length >= MAX_DESK) {
        return {
          ...state,
          toast: "Three product options is the limit. Compare them on the Desk, then pick one for Product.",
        };
      }
      return {
        ...state,
        deskIds: [...state.deskIds, action.id],
        swatchStage: { ...state.swatchStage, [action.id]: "desk" },
        deskError: false,
        previewById: {
          ...state.previewById,
          [action.id]: { status: "running", src: state.previewById[action.id]?.src ?? null },
        },
      };
    }
    case "pickProduct": {
      if (!state.deskIds.includes(action.id)) return state;
      if (state.chosenId === action.id) return state;
      const name = fabricLookup(state)[action.id]?.name ?? "Cloth";
      return {
        ...state,
        chosenId: action.id,
        productImage: null,
        productImageStatus: "idle",
        imageRecipe: [],
        aiStatus: "idle",
        toast: `${name} is the working style — Product will finish image and copy.`,
        brandRoom: "product",
      };
    }
    case "orderSwatches": {
      if (state.deskIds.length === 0) return state;
      const next = { ...state.swatchStage };
      for (const id of state.deskIds) {
        if (next[id] === "desk") next[id] = "ordered";
      }
      return {
        ...state,
        swatchStage: next,
        toast: "Hanger requested. Digital is not a hanger.",
        brandRoom: "desk",
      };
    }
    case "advanceSwatch": {
      const cur = state.swatchStage[action.id];
      const nextStage: SwatchStage | undefined =
        cur === "ordered" ? "in-hand" : cur === "in-hand" ? "signed-off" : cur;
      if (!nextStage) return state;
      return {
        ...state,
        swatchStage: { ...state.swatchStage, [action.id]: nextStage },
        toast:
          nextStage === "in-hand"
            ? `${fabricLookup(state)[action.id]?.name ?? "Cloth"} is in hand.`
            : nextStage === "signed-off"
              ? `${fabricLookup(state)[action.id]?.name ?? "Cloth"} signed off.`
              : state.toast,
      };
    }
    case "setColourway":
      return { ...state, colourwayIndex: action.index };
    case "setDesignImage": {
      const next = { ...state, designImage: action.src };
      if (state.searchStatus === "idle" || state.searchStatus === "loading") {
        return next;
      }
      const q = state.brief.trim() || DEMO_BRIEF;
      const { parsed, results } = searchFabrics(
        q,
        readDesignImage(action.src),
        millLive(next),
      );
      return {
        ...next,
        parsed,
        resultIds: results.map((f) => f.id),
        searchStatus: results.length ? "ready" : "empty",
      };
    }
    case "productImageStart":
      return { ...state, productImageStatus: "running" };
    case "productImageReady":
      return {
        ...state,
        productImageStatus: "ready",
        productImage: action.src,
        imageRecipe: action.recipe,
      };
    case "aiStart":
      return {
        ...state,
        aiStatus: "running",
        ai: { title: "", desc: "", care: "", attrs: "", cat: "" },
      };
    case "aiSet":
      return { ...state, ai: { ...state.ai, ...action.fields } };
    case "aiDraft":
      return { ...state, aiStatus: "draft" };
    case "aiApprove":
      return { ...state, aiStatus: "approved" };
    case "aiPick": {
      const ranked = rankOptions(action.field, state.learn);
      const learn = recordPick(state.learn, action.field, action.value, ranked);
      return {
        ...state,
        ai: { ...state.ai, [action.field]: action.value },
        aiCustom: { ...state.aiCustom, [action.field]: action.custom },
        learn,
        aiStatus: state.aiStatus === "approved" ? "draft" : state.aiStatus === "idle" ? "draft" : state.aiStatus,
      };
    }
    case "hydrateLearn":
      return { ...state, learn: action.learn };
    case "publish":
      return { ...state, published: { ...state.published, [action.dest]: true } };
    case "millAdd":
      if (state.millAdded[action.key]) return state;
      return {
        ...state,
        millAdded: { ...state.millAdded, [action.key]: true },
        millPct:
          !state.millClaimed || !state.millFile || !state.millMapConfirmed
            ? Math.min(99, state.millPct + 5)
            : Math.min(100, state.millPct + 5),
        millMarkets:
          action.key === "markets"
            ? { eu: true, uk: true, us: true }
            : state.millMarkets,
      };
    case "millToggleMarket":
      return {
        ...state,
        millMarkets: {
          ...state.millMarkets,
          [action.market]: !state.millMarkets[action.market],
        },
      };
    case "millEvidence":
      if (state.millEvidence[action.id]) return state;
      return {
        ...state,
        millEvidence: { ...state.millEvidence, [action.id]: true },
      };
    case "millFix":
      if (state.millFixed[action.key]) return state;
      return {
        ...state,
        millFixed: { ...state.millFixed, [action.key]: true },
        millPct:
          !state.millClaimed || !state.millFile || !state.millMapConfirmed
            ? Math.min(99, state.millPct + 6)
            : Math.min(100, state.millPct + 6),
      };
    case "ingestChoose":
      return {
        ...state,
        ingestChoices: { ...state.ingestChoices, [action.i]: action.choice },
      };
    case "ingestPublish":
      return {
        ...state,
        ingestPublished: true,
        millRoom: "catalog",
        millExceptionOpen: false,
        toast: "Working file open. Not in the live catalogue.",
      };
    case "millFile":
      return {
        ...state,
        millFile: action.file,
        millReadStatus: "idle",
        millReadStep: 0,
        millApplyStatus: "idle",
        millApplyStep: 0,
        millMapConfirmed: false,
        millColumnMap: defaultMillMap(),
        millTemplateName: action.file.name.replace(/\.[^.]+$/, ""),
        millRoom: "upload",
        millRowApproved: {},
        toast:
          action.file.source === "upload" ? FILE_RECEIVED_COPY : SEEDED_FILE_COPY,
      };
    case "millApplyStart":
      return { ...state, millApplyStatus: "running", millApplyStep: 0 };
    case "millApplyTick":
      return { ...state, millApplyStep: action.step };
    case "millApplyDone":
      return {
        ...state,
        millApplyStatus: "ready",
        millApplyStep: APPLY_STEPS.length,
        millMapConfirmed: true,
        millRoom: "review",
        toast: "Mapped. Exceptions stay on Review. Not in the live catalogue.",
      };
    case "millMapField":
      return {
        ...state,
        millColumnMap: { ...state.millColumnMap, [action.key]: action.column },
      };
    case "millTemplateName":
      return { ...state, millTemplateName: action.name };
    case "millMapConfirm":
      return {
        ...state,
        millApplyStatus: "running",
        millApplyStep: 0,
      };
    case "millReviewGroup":
      return { ...state, millReviewGroup: action.id };
    case "millApproveRow": {
      const catalog = state.catalog.map((row) => {
        if (row.id !== action.id) return row;
        const next = applySuggestions(row, state.millLearn);
        return {
          ...next,
          status: (next.status === "gap" ? "gap" : "confirmed") as CatalogRow["status"],
        };
      });
      return {
        ...state,
        catalog,
        millRowApproved: { ...state.millRowApproved, [action.id]: true },
      };
    }
    case "millApproveAll": {
      const nextApproved: Record<string, boolean> = { ...state.millRowApproved };
      const catalog = state.catalog.map((row) => {
        nextApproved[row.id] = true;
        if (row.status === "confirmed") return row;
        const next = applySuggestions(row, state.millLearn);
        return {
          ...next,
          status: row.status === "gap" ? ("gap" as const) : ("confirmed" as const),
        };
      });
      return {
        ...state,
        catalog,
        millRowApproved: nextApproved,
        millExceptionOpen: false,
        millRoom: "catalog",
        ingestPublished: true,
        toast: "Remaining suggestions approved. Not in the live catalogue.",
      };
    }
    case "millException":
      return { ...state, millExceptionOpen: action.open };
    case "insightAct":
      if (action.key === "rule") return { ...state, showRule: !state.showRule };
      return {
        ...state,
        insightDone: { ...state.insightDone, [action.key]: action.label },
        toast:
          action.key === "empty:Open destination"
            ? "John Lewis brand page is empty — no SKU to map."
            : action.label === "Dismissed"
              ? "Insight dismissed."
              : "Noted.",
      };
    case "setFeedDest":
      return { ...state, feedDest: action.id };
    case "toast":
      return { ...state, toast: action.message };
    case "dismissMillWarning":
      return { ...state, millIndexWarning: false };
    case "deskError":
      return { ...state, deskError: action.on };
    case "catalogFilter":
      return { ...state, catalogFilter: action.filter };
    case "catalogQuery":
      return { ...state, catalogQuery: action.query };
    case "catalogToggle": {
      const has = state.catalogSelected.includes(action.id);
      return {
        ...state,
        catalogSelected: has
          ? state.catalogSelected.filter((id) => id !== action.id)
          : [...state.catalogSelected, action.id],
      };
    }
    case "catalogSelectIds":
      return { ...state, catalogSelected: action.ids };
    case "catalogClear":
      return { ...state, catalogSelected: [] };
    case "catalogApply": {
      const ids = new Set(action.ids);
      return {
        ...state,
        catalog: state.catalog.map((row) =>
          ids.has(row.id) ? applySuggestions(row, state.millLearn) : row,
        ),
        toast: `Fruma standard applied · ${action.ids.length} ${action.ids.length === 1 ? "quality" : "qualities"}`,
      };
    }
    case "catalogConfirm": {
      const ids = new Set(action.ids);
      return {
        ...state,
        catalog: state.catalog.map((row) =>
          ids.has(row.id) ? { ...row, status: "confirmed" as const } : row,
        ),
        toast: `Confirmed · ${action.ids.length}. ${
          isOnTheStandard({
            claimed: state.millClaimed,
            file: state.millFile,
            mapped: state.millMapConfirmed,
            rowConfirmed: true,
          })
            ? "On the standard"
            : "Not in the live catalogue"
        }`,
      };
    }
    case "catalogField": {
      const row = state.catalog.find((r) => r.id === action.id);
      if (!row) return state;
      const ranked = rankMillOptions(
        action.field,
        row.raw[rawFor(action.field)],
        row.options[action.field],
        state.millLearn,
      );
      const millLearn = recordMillPick(
        state.millLearn,
        action.field,
        row.raw[rawFor(action.field)],
        action.value,
        ranked,
      );
      return {
        ...state,
        millLearn,
        catalog: state.catalog.map((r) =>
          r.id === action.id
            ? { ...r, values: { ...r.values, [action.field]: action.value } }
            : r,
        ),
      };
    }
    case "catalogBulkFix": {
      const ids = new Set(action.ids);
      return {
        ...state,
        catalog: state.catalog.map((row) =>
          ids.has(row.id) ? applyIssueFix(row, action.needle, state.millLearn) : row,
        ),
        toast: `Standard applied · ${action.ids.length} rows`,
      };
    }
    case "hydrateMillLearn":
      return { ...state, millLearn: action.learn };
    case "previewStart":
      return {
        ...state,
        previewById: {
          ...state.previewById,
          [action.id]: { status: "running", src: state.previewById[action.id]?.src ?? null },
        },
      };
    case "previewReady":
      return {
        ...state,
        previewById: {
          ...state.previewById,
          [action.id]: { status: "ready", src: action.src },
        },
      };
    default:
      return state;
  }
}

type Store = State & {
  results: Fabric[];
  desk: Fabric[];
  productFabric: Fabric | null;
  productComplete: boolean;
  chosenIndex: number;
  visualRead: VisualRead;
  enter: (mode: "brand" | "mill") => void;
  completeSetup: () => void;
  setSetupPhase: (phase: SetupPhase) => void;
  setBrandRoom: (room: BrandRoom) => void;
  setMillRoom: (room: MillRoom) => void;
  setBrief: (brief: string) => void;
  runSearch: (brief?: string) => void;
  toggleRaw: () => void;
  toggleDesk: (id: string) => void;
  pickProduct: (id: string) => void;
  orderSwatches: () => void;
  advanceSwatch: (id: string) => void;
  setColourway: (index: number) => void;
  setDesignImage: (src: string | null) => void;
  generateProductImage: () => void;
  seedProduct: () => void;
  ensurePreviews: () => void;
  runAI: () => Promise<void>;
  pickAi: (field: AiFieldKey, value: string, custom?: boolean) => void;
  approveAI: () => void;
  publish: (dest: string) => void;
  millAdd: (key: string) => void;
  millClaim: () => void;
  millFix: (key: string) => void;
  millToggleMarket: (market: SellMarket) => void;
  millAddEvidence: (id: string) => void;
  ingestChoose: (i: number, choice: "ok" | "alt") => void;
  ingestPublish: () => void;
  attachMillFile: (file?: MillFile) => void;
  setMillMapField: (key: string, column: string) => void;
  setMillTemplateName: (name: string) => void;
  confirmMillMap: () => void;
  setMillReviewGroup: (id: string) => void;
  approveMillRow: (id: string) => void;
  approveAllMill: () => void;
  setMillException: (open: boolean) => void;
  insightAct: (key: string, label: string) => void;
  setFeedDest: (id: string) => void;
  clearToast: () => void;
  dismissMillWarning: () => void;
  retrySearch: () => void;
  retryDesk: () => void;
  setCatalogFilter: (filter: CatalogFilter) => void;
  setCatalogQuery: (query: string) => void;
  toggleCatalogRow: (id: string) => void;
  selectCatalogFiltered: () => void;
  clearCatalogSelection: () => void;
  applyCatalogSuggested: (ids: string[]) => void;
  confirmCatalog: (ids: string[]) => void;
  setCatalogField: (id: string, field: CatalogField, value: string) => void;
  bulkFixCatalog: (needle: string, ids: string[]) => void;
};

const Ctx = createContext<Store | null>(null);

export function FrumaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const results = useMemo(
    () => state.resultIds.map((id) => fabricLookup(state)[id]).filter(Boolean),
    [state.resultIds, state.catalog, state.millClaimed, state.millFile, state.millMapConfirmed],
  );
  const desk = useMemo(
    () => state.deskIds.map((id) => fabricLookup(state)[id]).filter(Boolean),
    [state.deskIds, state.catalog, state.millClaimed, state.millFile, state.millMapConfirmed],
  );
  const productFabric = useMemo(
    () => resolveProductFabric(state),
    // chosen cloth on the desk is the working product
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.deskIds, state.chosenId, state.catalog, state.millClaimed, state.millFile, state.millMapConfirmed],
  );
  const chosenIndex = useMemo(() => {
    if (!state.chosenId) return -1;
    return state.deskIds.indexOf(state.chosenId);
  }, [state.chosenId, state.deskIds]);
  const productComplete = Boolean(
    productFabric &&
      state.aiStatus === "approved" &&
      state.productImageStatus === "ready" &&
      state.productImage,
  );
  const visualRead = useMemo(
    () => readDesignImage(state.designImage),
    [state.designImage],
  );

  const briefRef = useRef(state.brief);
  const stateRef = useRef(state);

  useEffect(() => {
    briefRef.current = state.brief;
    stateRef.current = state;
  }, [state]);

  const runSearch = useCallback((brief?: string) => {
    const q = (brief ?? briefRef.current).trim() ? (brief ?? briefRef.current) : DEMO_BRIEF;
    dispatch({ type: "setBrief", brief: q });
    dispatch({ type: "searchStart" });
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => dispatch({ type: "searchFinish", brief: q }),
      reduce ? 0 : 420,
    );
  }, []);

  const generateProductImage = useCallback(() => {
    const cur = stateRef.current;
    const fabric = resolveProductFabric(cur);
    if (!fabric) return;
    const visual = readDesignImage(cur.designImage);
    const colour =
      visual.colour !== "—" && visual.colour !== "from image"
        ? visual.colour
        : cur.parsed.colour !== "—"
          ? cur.parsed.colour
          : DRAFT_PRODUCT.colour;
    const recipe = listingRecipe({
      visual,
      fabricName: fabric.name,
      structure: fabric.structure,
      composition: fabric.composition,
      colour,
      title: cur.ai.title,
    });
    dispatch({ type: "productImageStart" });
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () =>
        dispatch({
          type: "productImageReady",
          src: cur.previewById[fabric.id]?.src || garmentPreviewSrc(fabric),
          recipe,
        }),
      reduce ? 0 : 780,
    );
  }, []);

  const schedulePreview = useCallback((id: string) => {
    const fabric = fabricLookup(stateRef.current)[id];
    if (!fabric) return;
    dispatch({ type: "previewStart", id });
    const src = garmentPreviewSrc(fabric);
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => dispatch({ type: "previewReady", id, src }),
      reduce ? 0 : 640,
    );
  }, []);

  const ensurePreviews = useCallback(() => {
    const cur = stateRef.current;
    for (const id of cur.deskIds) {
      const existing = cur.previewById[id];
      if (existing?.status === "ready" && existing.src) continue;
      if (existing?.status === "running") continue;
      schedulePreview(id);
    }
  }, [schedulePreview]);

  const seedProduct = useCallback(() => {
    const cur = stateRef.current;
    const fabric = resolveProductFabric(cur);
    if (!fabric) return;
    if (cur.aiStatus === "idle") {
      const learn = loadLearn();
      dispatch({ type: "hydrateLearn", learn });
      dispatch({ type: "aiSet", fields: firstDraft(learn, fabric) });
      dispatch({ type: "aiDraft" });
    }
    if (cur.productImageStatus === "idle") {
      generateProductImage();
    }
  }, [generateProductImage]);

  const runAI = useCallback(async () => {
    const learn = loadLearn();
    const fabric = resolveProductFabric(stateRef.current);
    dispatch({ type: "hydrateLearn", learn });
    dispatch({ type: "aiStart" });
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draft = firstDraft(learn, fabric);
    const keys: AiFieldKey[] = ["title", "desc", "care", "attrs", "cat"];
    await new Promise((r) => setTimeout(r, reduce ? 0 : 280));
    for (const key of keys) {
      const text = draft[key];
      if (reduce) {
        dispatch({ type: "aiSet", fields: { [key]: text } });
        continue;
      }
      for (let i = 0; i <= text.length; i += 3) {
        dispatch({ type: "aiSet", fields: { [key]: text.slice(0, i) } });
        await new Promise((r) => setTimeout(r, 6));
      }
      dispatch({ type: "aiSet", fields: { [key]: text } });
    }
    dispatch({ type: "aiDraft" });
  }, []);

  const store: Store = {
    ...state,
    results,
    desk,
    productFabric,
    productComplete,
    chosenIndex,
    visualRead,
    enter: (mode) => {
      dispatch({ type: "enter", mode });
      if (mode === "mill") {
        dispatch({ type: "hydrateMillLearn", learn: loadMillLearn() });
      }
    },
    completeSetup: () => {
      dispatch({ type: "setupPhase", phase: "ready" });
      if (stateRef.current.searchStatus === "idle") {
        runSearch(stateRef.current.brief.trim() ? stateRef.current.brief : DEMO_BRIEF);
      }
    },
    setSetupPhase: (phase) => dispatch({ type: "setupPhase", phase }),
    setBrandRoom: (room) => {
      dispatch({ type: "setBrandRoom", room });
      if (room === "product") seedProduct();
      if (room === "desk") ensurePreviews();
    },
    setMillRoom: (room) => {
      const cur = stateRef.current;
      if ((room === "map" || room === "review") && !cur.millFile) {
        dispatch({ type: "setMillRoom", room: "upload" });
        dispatch({ type: "toast", message: "Drop a mill file first — then we can map it." });
        return;
      }
      if (room === "review" && !cur.millMapConfirmed) {
        dispatch({ type: "setMillRoom", room: "map" });
        return;
      }
      dispatch({ type: "setMillRoom", room });
    },
    setBrief: (brief) => dispatch({ type: "setBrief", brief }),
    runSearch,
    toggleRaw: () => dispatch({ type: "toggleRaw" }),
    toggleDesk: (id) => {
      const cur = stateRef.current;
      const had = cur.deskIds.includes(id);
      dispatch({ type: "toggleDesk", id });
      if (had || cur.deskIds.length >= MAX_DESK) return;
      schedulePreview(id);
    },
    pickProduct: (id) => {
      dispatch({ type: "pickProduct", id });
      window.setTimeout(() => seedProduct(), 0);
    },
    orderSwatches: () => dispatch({ type: "orderSwatches" }),
    advanceSwatch: (id) => dispatch({ type: "advanceSwatch", id }),
    setColourway: (index) => dispatch({ type: "setColourway", index }),
    setDesignImage: (src) => dispatch({ type: "setDesignImage", src }),
    generateProductImage,
    seedProduct,
    ensurePreviews,
    runAI,
    pickAi: (field, value, custom = false) =>
      dispatch({ type: "aiPick", field, value, custom }),
    approveAI: () => dispatch({ type: "aiApprove" }),
    publish: (dest) => dispatch({ type: "publish", dest }),
    millAdd: (key) => dispatch({ type: "millAdd", key }),
    millClaim: () => dispatch({ type: "millClaim" }),
    millFix: (key) => dispatch({ type: "millFix", key }),
    millToggleMarket: (market) => dispatch({ type: "millToggleMarket", market }),
    millAddEvidence: (id) => dispatch({ type: "millEvidence", id }),
    ingestChoose: (i, choice) => dispatch({ type: "ingestChoose", i, choice }),
    ingestPublish: () => dispatch({ type: "ingestPublish" }),
    attachMillFile: (file) => {
      const next: MillFile =
        file ?? {
          name: DEMO_MILL_FILE.name,
          size: DEMO_MILL_FILE.size,
          rows: stateRef.current.catalog.length,
          source: "demo",
        };
      dispatch({
        type: "millFile",
        file: next.source === "upload" ? { ...next, rows: 0 } : next,
      });
    },
    setMillMapField: (key, column) => dispatch({ type: "millMapField", key, column }),
    setMillTemplateName: (name) => dispatch({ type: "millTemplateName", name }),
    confirmMillMap: () => {
      dispatch({ type: "millMapConfirm" });
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const delay = reduce ? 0 : 420;
      APPLY_STEPS.forEach((_, i) => {
        window.setTimeout(() => {
          if (i === APPLY_STEPS.length - 1) dispatch({ type: "millApplyDone" });
          else dispatch({ type: "millApplyTick", step: i + 1 });
        }, delay * (i + 1));
      });
    },
    setMillReviewGroup: (id) => dispatch({ type: "millReviewGroup", id }),
    approveMillRow: (id) => dispatch({ type: "millApproveRow", id }),
    approveAllMill: () => dispatch({ type: "millApproveAll" }),
    setMillException: (open) => dispatch({ type: "millException", open }),
    insightAct: (key, label) => dispatch({ type: "insightAct", key, label }),
    setFeedDest: (id) => dispatch({ type: "setFeedDest", id }),
    clearToast: () => dispatch({ type: "toast", message: null }),
    dismissMillWarning: () => dispatch({ type: "dismissMillWarning" }),
    retrySearch: () => runSearch(),
    retryDesk: () => dispatch({ type: "deskError", on: false }),
    setCatalogFilter: (filter) => dispatch({ type: "catalogFilter", filter }),
    setCatalogQuery: (query) => dispatch({ type: "catalogQuery", query }),
    toggleCatalogRow: (id) => dispatch({ type: "catalogToggle", id }),
    selectCatalogFiltered: () => {
      const ids = filterCatalog(
        stateRef.current.catalog,
        stateRef.current.catalogFilter,
        stateRef.current.catalogQuery,
      ).map((r) => r.id);
      dispatch({ type: "catalogSelectIds", ids });
    },
    clearCatalogSelection: () => dispatch({ type: "catalogClear" }),
    applyCatalogSuggested: (ids) => dispatch({ type: "catalogApply", ids }),
    confirmCatalog: (ids) => dispatch({ type: "catalogConfirm", ids }),
    setCatalogField: (id, field, value) =>
      dispatch({ type: "catalogField", id, field, value }),
    bulkFixCatalog: (needle, ids) =>
      dispatch({ type: "catalogBulkFix", needle, ids }),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useFruma() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFruma must be used inside FrumaProvider");
  return ctx;
}
