import type { CatalogField } from "./types";

const LEARN_KEY = "fruma-mill-learn";

export type MillLearn = {
  picks: number;
  firstHits: number;
  preferred: Record<string, string>;
};

export function emptyMillLearn(): MillLearn {
  return { picks: 0, firstHits: 0, preferred: {} };
}

export function loadMillLearn(): MillLearn {
  if (typeof window === "undefined") return emptyMillLearn();
  try {
    const raw = window.localStorage.getItem(LEARN_KEY);
    if (!raw) return emptyMillLearn();
    const parsed = JSON.parse(raw) as MillLearn;
    if (typeof parsed.picks !== "number") return emptyMillLearn();
    return {
      picks: parsed.picks,
      firstHits: parsed.firstHits,
      preferred: parsed.preferred ?? {},
    };
  } catch {
    return emptyMillLearn();
  }
}

export function saveMillLearn(state: MillLearn) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARN_KEY, JSON.stringify(state));
}

export function millKey(field: CatalogField, raw: string) {
  return `${field}:${raw.trim().toLowerCase()}`;
}

export function rankMillOptions(
  field: CatalogField,
  raw: string,
  options: string[],
  learn: MillLearn,
) {
  const preferred = learn.preferred[millKey(field, raw)];
  if (preferred && options.includes(preferred)) {
    return [preferred, ...options.filter((o) => o !== preferred)];
  }
  return options;
}

export function recordMillPick(
  learn: MillLearn,
  field: CatalogField,
  raw: string,
  value: string,
  ranked: string[],
): MillLearn {
  const first = ranked[0] ?? "";
  const next: MillLearn = {
    picks: learn.picks + 1,
    firstHits: learn.firstHits + (value === first ? 1 : 0),
    preferred: { ...learn.preferred, [millKey(field, raw)]: value },
  };
  saveMillLearn(next);
  return next;
}
