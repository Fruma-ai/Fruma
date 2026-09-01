import type { AiFieldKey, AiFields, Fabric } from "./types";

export const AI_FIELD_ORDER: AiFieldKey[] = [
  "title",
  "desc",
  "care",
  "attrs",
  "cat",
];

export const AI_FIELD_LABEL: Record<AiFieldKey, string> = {
  title: "Product title",
  desc: "Description",
  care: "Listing care",
  attrs: "Search attributes",
  cat: "Category path",
};

export const AI_SUGGESTIONS: Record<AiFieldKey, string[]> = {
  title: [
    "Men's slim polo in Navy",
    "Navy polo shirt — structured collar",
    "Men's Q75 mesh polo, Navy",
    "Short-sleeve polo in extra-long staple cotton",
  ],
  desc: [
    "Slim polo in Q75 cotton mesh, knitted in Portugal. Extra-long staple California Supima, traceable to one farm. Collar holds under a jacket. Not GOTS.",
    "A navy polo cut slim, in open warp-knit mesh rather than dense piqué. Knitted in Portugal from extra-long staple Supima.",
    "Summer polo in Q75 mesh. Structured collar, chest patch pocket, short sleeve. Fibre is traceable Supima, not certified organic.",
  ],
  care: [
    "Gentle wash at 30°C with similar colours. Do not tumble dry. Dry cleanable.",
    "Cool wash 30°C. Reshape while damp. Do not tumble dry.",
    "Wash with similar colours at 30°C. Dry cleanable. Avoid tumble drying the mesh.",
  ],
  attrs: [
    "sleeve: short · neckline: polo collar · closure: button placket · fit: slim · pocket: chest patch · season: spring/summer · construction: Q75 mesh · origin: Portugal",
    "garment: polo · colour: navy · fibre: supima cotton · knit: mesh · fit: slim",
    "category: polo · sleeve: short · collar: structured · pocket: yes · origin: Portugal",
  ],
  cat: [
    "Menswear › Tops › Polo Shirts",
    "Men › Knitwear › Polo",
    "Menswear › Short sleeve › Polo",
  ],
};

const LEARN_KEY = "fruma-demo-learn";

export type LearnState = {
  picks: number;
  firstHits: number;
  preferred: Partial<Record<AiFieldKey, string>>;
};

export function emptyLearn(): LearnState {
  return { picks: 0, firstHits: 0, preferred: {} };
}

export function loadLearn(): LearnState {
  if (typeof window === "undefined") return emptyLearn();
  try {
    const raw = window.localStorage.getItem(LEARN_KEY);
    if (!raw) return emptyLearn();
    const parsed = JSON.parse(raw) as LearnState;
    if (typeof parsed.picks !== "number") return emptyLearn();
    return {
      picks: parsed.picks,
      firstHits: parsed.firstHits,
      preferred: parsed.preferred ?? {},
    };
  } catch {
    return emptyLearn();
  }
}

export function saveLearn(state: LearnState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARN_KEY, JSON.stringify(state));
}

export function withCloth(text: string, fabric: Fabric) {
  if (fabric.structure === "mesh") return text;
  const knit = fabric.name;
  return text
    .replace(/Q75 cotton mesh/gi, knit)
    .replace(/Q75 mesh/gi, knit)
    .replace(/open warp-knit mesh/gi, fabric.structure)
    .replace(/warp-knit mesh/gi, fabric.structure)
    .replace(/construction: Q75 mesh/gi, `construction: ${fabric.structure}`)
    .replace(/knit: mesh/gi, `knit: ${fabric.structure}`);
}

export function rankOptions(
  field: AiFieldKey,
  learn: LearnState,
  fabric?: Fabric | null,
): string[] {
  const options = AI_SUGGESTIONS[field].map((opt) =>
    fabric ? withCloth(opt, fabric) : opt,
  );
  const preferred = learn.preferred[field];
  const preferredText = preferred
    ? fabric
      ? withCloth(preferred, fabric)
      : preferred
    : undefined;
  let ranked = options;
  if (field === "care" && fabric?.care && !ranked.includes(fabric.care)) {
    ranked = [fabric.care, ...ranked];
  }
  if (preferredText && ranked.includes(preferredText)) {
    return [preferredText, ...ranked.filter((o) => o !== preferredText)];
  }
  return ranked;
}

export function firstDraft(learn: LearnState, fabric?: Fabric | null): AiFields {
  const careRanked = rankOptions("care", learn, fabric);
  const millCare = fabric?.care?.trim();
  return {
    title: rankOptions("title", learn, fabric)[0] ?? "",
    desc: rankOptions("desc", learn, fabric)[0] ?? "",
    care: millCare || careRanked[0] || "",
    attrs: rankOptions("attrs", learn, fabric)[0] ?? "",
    cat: rankOptions("cat", learn, fabric)[0] ?? "",
  };
}

export function recordPick(
  learn: LearnState,
  field: AiFieldKey,
  value: string,
  ranked: string[],
): LearnState {
  const first = ranked[0] ?? "";
  const next: LearnState = {
    picks: learn.picks + 1,
    firstHits: learn.firstHits + (value === first ? 1 : 0),
    preferred: { ...learn.preferred, [field]: value },
  };
  saveLearn(next);
  return next;
}

export function hitRate(learn: LearnState) {
  if (learn.picks === 0) return null;
  return Math.round((learn.firstHits / learn.picks) * 100);
}
