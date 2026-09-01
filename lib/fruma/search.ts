import type { Fabric, FabricStructure, ParsedBrief } from "./types";
import { FABRICS } from "./data";
import { EMPTY_VISUAL, visualQuery, type VisualRead } from "./vision";

const EMPTY: ParsedBrief = {
  reading: "—",
  weight: "—",
  colour: "—",
  moq: "—",
};

const STRUCTURE_TERMS: { re: RegExp; structure: FabricStructure; label: string }[] =
  [
    { re: /mesh|q75|riviera/, structure: "mesh", label: "mesh" },
    { re: /piqu[eé]/, structure: "pique", label: "piqué" },
    { re: /polo/, structure: "mesh", label: "polo" },
    { re: /waffle/, structure: "waffle", label: "waffle" },
    { re: /french terry|terry/, structure: "french terry", label: "french terry" },
    { re: /loopback/, structure: "loopback", label: "loopback" },
    { re: /interlock/, structure: "interlock", label: "interlock" },
    { re: /slub/, structure: "slub jersey", label: "slub jersey" },
    { re: /single jersey|jersey/, structure: "single jersey", label: "jersey" },
    { re: /2\s*[x×]\s*2|rib 2/, structure: "rib 2x2", label: "rib 2x2" },
    { re: /1\s*[x×]\s*1|rib/, structure: "rib 1x1", label: "rib" },
    { re: /twill/, structure: "twill", label: "twill" },
    { re: /corduroy|cord/, structure: "corduroy", label: "corduroy" },
  ];

const KNOWN =
  /piqu[eé]|polo|mesh|q75|q82|riviera|sunspel|supima|knit|jersey|waffle|rib|terry|loopback|interlock|twill|corduroy|cotton|wool|merino|modal|elastane|organic|gots|oeko|green|forest|navy|ecru|sand|olive|charcoal|white|grey|melange|heavy|light|collar|structured|jacket|jumper|summer|winter|moq|run|portugal|england|eaton|t[uü]rkiye|turkey|italy|vietnam|mill|cloth|fabric|gsm|weight|swatch|guimar|vale do ave|tekirda|malhas|ave/i;

export function parseBrief(text: string): ParsedBrief {
  const t = text.toLowerCase();
  if (!t.trim()) return EMPTY;

  const reading: string[] = [];
  for (const term of STRUCTURE_TERMS) {
    if (term.re.test(t) && !reading.includes(term.label)) {
      reading.push(term.label);
      if (term.label === "piqué" || term.label === "polo" || term.label === "mesh")
        reading.push("knit");
      break;
    }
  }
  if (/knit/.test(t) && !reading.includes("knit")) reading.push("knit");

  let weight = "—";
  if (/heavy|260|270|280/.test(t) && !/summer|light|mesh/.test(t))
    weight = "260–300 g/m²";
  else if (/summer|light|mesh|q75|airy/.test(t)) weight = "lightweight";
  else if (/hold a collar|structured enough/.test(t)) weight = "enough to hold a collar";
  else if (/winter|heavyweight|340/.test(t)) weight = "300 g/m²+";

  let colour = "—";
  if (/grey melange|melange|mélange/.test(t)) colour = "grey melange";
  else if (/charcoal/.test(t)) colour = "charcoal";
  else if (/navy/.test(t)) colour = "navy";
  else if (/deep green|forest|green/.test(t)) colour = "deep green";
  else if (/ecru/.test(t)) colour = "ecru";
  else if (/sand/.test(t)) colour = "sand";
  else if (/white/.test(t)) colour = "white";
  else if (/black/.test(t)) colour = "black";

  let moq = "—";
  if (/small first run|small run|low moq|under 500|first run/.test(t))
    moq = "under 500m";
  else if (/800|1000|large/.test(t)) moq = "500m+";

  return {
    reading: reading.length ? reading.join(", ") : "cloth",
    weight,
    colour,
    moq,
  };
}

export function isIndexError(brief: string) {
  return /offline|index down|mill index/.test(brief.trim().toLowerCase());
}

export function searchFabrics(
  brief: string,
  visual: VisualRead = EMPTY_VISUAL,
  millFabrics: Fabric[] = [],
): {
  parsed: ParsedBrief;
  results: Fabric[];
} {
  const extra = visualQuery(visual);
  const trimmed = brief.trim();
  const combined = [trimmed, extra].filter(Boolean).join(" ");
  if (!trimmed && visual.source === "none") {
    return { parsed: EMPTY, results: [] };
  }
  if (isIndexError(trimmed)) return { parsed: parseBrief(trimmed), results: [] };
  if (!KNOWN.test(combined)) return { parsed: parseBrief(combined), results: [] };

  const parsed = parseBrief(combined);
  const t = combined.toLowerCase();
  const pool = [...FABRICS, ...millFabrics.filter((f) => !FABRICS.some((s) => s.id === f.id))];
  const ranked = pool
    .map((f) => ({ f, s: score(f, t, parsed) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.f)
    .slice(0, 12);

  return { parsed, results: ranked };
}

function score(f: Fabric, t: string, parsed: ParsedBrief) {
  let s = 0;
  const hit = STRUCTURE_TERMS.find((term) => term.re.test(t));
  if (hit) {
    if (f.structure === hit.structure) s += 40;
    else if (hit.structure === "pique" && f.structure === "mesh") s += 22;
    else if (f.feel.includes("holds a collar") || f.feel.includes("structured"))
      s += 12;
  }
  if (/polo|collar|jacket|jumper|riviera|chest pocket/.test(t) && f.structure === "mesh") s += 28;
  if (/mesh, not piqu|not piqu/.test(t) && f.structure === "mesh") s += 18;
  if (/mesh, not piqu|not piqu/.test(t) && f.structure === "pique") s -= 12;
  if (parsed.weight === "260–300 g/m²") {
    if (f.gsm >= 260 && f.gsm <= 300) s += 28;
    else if (f.gsm >= 230 && f.gsm < 260) s += 10;
  }
  if (parsed.weight === "lightweight") {
    if (f.structure === "mesh" || f.id === "q75-mesh-pt") s += 26;
    else if (f.gsm > 0 && f.gsm < 200) s += 14;
    else if (f.gsm === 0) s += 8;
  }
  if (parsed.colour === "deep green") {
    if (f.ways.some((w) => ["Forest", "Olive", "Sage"].includes(w))) s += 16;
  } else if (parsed.colour === "grey melange") {
    if (f.ways.includes("Grey Melange")) s += 16;
  } else if (parsed.colour !== "—") {
    if (f.ways.some((w) => w.toLowerCase() === parsed.colour)) s += 16;
  }
  if (parsed.moq === "under 500m") {
    if (f.moqM > 0 && f.moqM < 500) s += 20;
    else if (f.moqM === 500) s += 6;
  }
  if (/gots|organic/.test(t) && f.certs.some((c) => c.startsWith("GOTS"))) s += 12;
  if (/stretch|pilling|colourfast|colorfast|shrink|martindale/.test(t)) {
    s += f.performance ? 14 : -4;
  }
  if (/supima|els|long-staple/.test(t) && /supima/i.test(f.composition)) s += 16;
  if (/portugal|guimar|vale do ave|famalic/.test(t) && f.country === "PORTUGAL")
    s += 10;
  if (/long eaton|england/.test(t) && f.country === "ENGLAND") s += 10;
  if (/tekirda|t[uü]rkiye|turkey/.test(t) && f.country === "TÜRKIYE") s += 10;
  if (f.country === "PORTUGAL") s += 4;
  if (f.structure === "mesh") s += 6;
  if (f.source === "mill-file") s += 3;
  return s;
}
