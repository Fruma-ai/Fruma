export const SELL_MARKETS = ["eu", "uk", "us"] as const;
export type SellMarket = (typeof SELL_MARKETS)[number];

export const MARKET_LABEL: Record<SellMarket, string> = {
  eu: "EU",
  uk: "UK",
  us: "US",
};

export type EvidenceKind = "required" | "boost";

export type EvidenceItem = {
  id: string;
  title: string;
  sub: string;
  action: string;
  added: string;
  kind: EvidenceKind;
  markets: SellMarket[];
  /** Already on file for the Vale do Ave demo mill. */
  seed?: boolean;
};

/**
 * Evidence for selling into a market — not an audit, not a legal opinion.
 * Cloth-level certs still live on the quality. GOTS on the mill does not
 * make Q75 organic.
 */
export const EVIDENCE: EvidenceItem[] = [
  {
    id: "rs-oeko",
    title: "Restricted substances",
    sub: "OEKO-TEX, REACH dossier, or equivalent — so a listing can inherit chemistry, not a guess",
    action: "Add OEKO-TEX",
    added: "OEKO-TEX on file",
    kind: "required",
    markets: ["eu", "uk", "us"],
    seed: true,
  },
  {
    id: "eu-due-diligence",
    title: "EU due diligence contact",
    sub: "Named person for CSDDD-scale buyers. Paper in a drawer does not count",
    action: "Add EU desk",
    added: "EU due diligence desk",
    kind: "required",
    markets: ["eu"],
  },
  {
    id: "uk-modern-slavery",
    title: "UK Modern Slavery Act",
    sub: "Statement on file, or a below-threshold declaration if you are not in scope",
    action: "Add statement",
    added: "UK MSA on file",
    kind: "required",
    markets: ["uk"],
  },
  {
    id: "forced-labour",
    title: "Forced labour policy",
    sub: "EU and UK buyers now ask before they ask about GSM",
    action: "Add policy",
    added: "Policy on file",
    kind: "required",
    markets: ["eu", "uk", "us"],
  },
  {
    id: "gots",
    title: "GOTS (mill programme)",
    sub: "Only where the mill file has it. Does not apply to every quality — not to Q75",
    action: "Add GOTS",
    added: "GOTS knitted apparel to 2027",
    kind: "boost",
    markets: [],
    seed: true,
  },
  {
    id: "wastewater",
    title: "Chemical / wastewater",
    sub: "ZDHC or mill procedure. Helps EU chemical due diligence, not a hangtag",
    action: "Add ZDHC",
    added: "ZDHC on file",
    kind: "boost",
    markets: ["eu", "uk"],
  },
  {
    id: "grs",
    title: "GRS recycled",
    sub: "Only if you run recycled fibre. Empty is better than a false claim",
    action: "Add GRS",
    added: "GRS on file",
    kind: "boost",
    markets: [],
  },
];

export type MarketScore = {
  score: number;
  required: EvidenceItem[];
  requiredDone: number;
  requiredTotal: number;
  ready: boolean;
  boosts: number;
  suggestions: string[];
};

export function requiredEvidence(markets: SellMarket[]) {
  if (!markets.length) return [];
  return EVIDENCE.filter(
    (e) =>
      e.kind === "required" &&
      (e.markets.length === 0 || e.markets.some((m) => markets.includes(m))),
  );
}

export function scoreMarket(input: {
  markets: SellMarket[];
  evidence: Record<string, boolean>;
  millPct: number;
  hasFile: boolean;
}): MarketScore {
  const required = requiredEvidence(input.markets);
  const requiredDone = required.filter((e) => input.evidence[e.id]).length;
  const requiredTotal = required.length;
  const ready = requiredTotal > 0 && requiredDone === requiredTotal;
  const boosts = EVIDENCE.filter((e) => e.kind === "boost" && input.evidence[e.id])
    .length;
  const requiredPct = requiredTotal
    ? Math.round((requiredDone / requiredTotal) * 80)
    : 0;
  const score = input.markets.length
    ? Math.min(100, requiredPct + boosts * 7)
    : 0;

  return {
    score,
    required,
    requiredDone,
    requiredTotal,
    ready,
    boosts,
    suggestions: suggestions({ ...input, required, requiredDone, requiredTotal, ready }),
  };
}

function suggestions(input: {
  markets: SellMarket[];
  evidence: Record<string, boolean>;
  millPct: number;
  hasFile: boolean;
  required: EvidenceItem[];
  requiredDone: number;
  requiredTotal: number;
  ready: boolean;
}): string[] {
  const out: string[] = [];
  if (!input.markets.length) {
    out.push(
      "Choose EU and UK if you ship there. That unlocks the evidence list buyers will filter on.",
    );
    return out;
  }
  const missing = input.required.filter((e) => !input.evidence[e.id]);
  if (missing[0]) {
    out.push(
      `Buyers in the markets you ticked will not see you as ready until “${missing[0].title}” is on file.`,
    );
  }
  if (missing[1]) {
    out.push(`Next: ${missing[1].title}. One click. It stays on this mill, not on every quality.`);
  }
  if (input.evidence.gots) {
    out.push(
      "GOTS is on the mill programme. It still must not land on a quality that is only traceable cotton — Q75 stays empty.",
    );
  }
  if (input.hasFile && !input.evidence.wastewater) {
    out.push(
      "You have a hanger list. Add chemical / wastewater and listings can inherit mill chemistry instead of a merchandiser guessing.",
    );
  }
  if (input.ready && input.millPct < 70) {
    out.push(
      "EU/UK evidence is complete. MOQ, lead and gauges are still what Design search filters on — fill those next.",
    );
  }
  if (input.ready && input.millPct >= 70 && !input.hasFile) {
    out.push(
      "Score and commercial card are in shape. Drop the hanger list — that is what designers actually search.",
    );
  }
  if (input.ready && input.hasFile) {
    out.push(
      "More mapped mill files, and more listing outcomes from brands, is what makes the next suggestion sharper. Empty certs stay empty.");
  }
  return out.slice(0, 3);
}

export function seedEvidence(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const e of EVIDENCE) {
    if (e.seed) out[e.id] = true;
  }
  return out;
}
