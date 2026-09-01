import type { Fabric, FabricStructure } from "./types";

export const COLOURS: Record<string, string> = {
  Black: "#23252A",
  White: "#EFEDE7",
  Navy: "#27364F",
  Ecru: "#DED6C4",
  "Grey Marl": "#8A8D8F",
  "Grey Melange": "#9A9B99",
  Olive: "#5E6142",
  Burgundy: "#5E2733",
  Sky: "#8FB2CC",
  Sand: "#C4AE92",
  Forest: "#2E4034",
  Charcoal: "#3A3D42",
  Stone: "#B3ABA0",
  Rust: "#9A4F30",
  Sage: "#93A08A",
  Cobalt: "#2D4C86",
  "Dark Clay": "#6B5344",
};

export function shade(hex: string, p: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v));
  const r = c((n >> 16) + p);
  const g = c(((n >> 8) & 255) + p);
  const b = c((n & 255) + p);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function clothBackground(structure: FabricStructure, hex: string) {
  const d = "rgba(0,0,0,.30)";
  const l = "rgba(255,255,255,.13)";
  const patterns: Record<FabricStructure, string> = {
    mesh: `repeating-radial-gradient(circle at 3px 3px,transparent 0 1.15px,${d} 1.15px 1.45px,transparent 1.45px 6px),repeating-linear-gradient(0deg,${l} 0 .5px,transparent .5px 7px)`,
    pique: `repeating-linear-gradient(45deg,${d} 0 1px,transparent 1px 5px),repeating-linear-gradient(-45deg,${l} 0 1px,transparent 1px 5px)`,
    waffle: `repeating-linear-gradient(0deg,${d} 0 2px,transparent 2px 9px),repeating-linear-gradient(90deg,${d} 0 2px,transparent 2px 9px)`,
    "rib 1x1": `repeating-linear-gradient(90deg,${d} 0 2px,transparent 2px 4px,${l} 4px 5px,transparent 5px 7px)`,
    "rib 2x2": `repeating-linear-gradient(90deg,${d} 0 3px,transparent 3px 7px,${l} 7px 9px,transparent 9px 13px)`,
    "single jersey": `repeating-linear-gradient(0deg,${d} 0 .5px,transparent .5px 3px)`,
    interlock: `repeating-linear-gradient(0deg,${d} 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,${l} 0 .5px,transparent .5px 4px)`,
    "french terry": `repeating-radial-gradient(circle at 3px 3px,${d} 0 1px,transparent 1px 4px)`,
    loopback: `repeating-radial-gradient(circle at 4px 4px,${d} 0 1.5px,transparent 1.5px 6px)`,
    "slub jersey": `repeating-linear-gradient(0deg,${d} 0 1px,transparent 1px 5px),repeating-linear-gradient(84deg,${l} 0 1px,transparent 1px 17px)`,
    twill: `repeating-linear-gradient(62deg,${d} 0 1.5px,transparent 1.5px 5px)`,
    corduroy: `repeating-linear-gradient(90deg,${d} 0 3px,transparent 3px 5px,${l} 5px 7px,transparent 7px 10px)`,
  };
  return `${patterns[structure]},linear-gradient(160deg,${hex},${shade(hex, -16)})`;
}

export function certDetail(cert: string) {
  if (cert.startsWith("GOTS 2028"))
    return { name: "GOTS", until: "March 2028" };
  if (cert.startsWith("GOTS"))
    return { name: "GOTS", until: "March 2027" };
  if (cert.includes("OEKO"))
    return { name: "OEKO-TEX Standard 100", until: "August 2027" };
  return { name: cert, until: "" };
}

export function formatGsm(f: Pick<Fabric, "gsm" | "raw">, raw = false) {
  if (raw) return f.raw.g;
  if (!f.gsm) return "unpublished";
  return `${f.gsm} g/m²`;
}

export function formatMoq(f: Pick<Fabric, "moqM" | "raw">, raw = false) {
  if (raw) return f.raw.m;
  if (!f.moqM) return "—";
  return `${f.moqM}m`;
}

export function formatPrice(f: Pick<Fabric, "priceGbp">) {
  if (!f.priceGbp) return "—";
  return `£${f.priceGbp.toFixed(2)}`;
}

export function formatWidth(f: Pick<Fabric, "widthCm" | "raw">, raw = false) {
  if (raw) return f.raw.w;
  if (!f.widthCm) return "—";
  return `${f.widthCm}cm`;
}

export function formatLead(f: Pick<Fabric, "leadWeeks">) {
  if (!f.leadWeeks) return "—";
  return `${f.leadWeeks}wk`;
}

export function formatFinish(f: Pick<Fabric, "finish">) {
  return f.finish?.trim() || "Not on file";
}

export function formatCare(f: Pick<Fabric, "care">) {
  return f.care?.trim() || "Ask the mill — not on file";
}

export function formatFibreOrigin(f: Pick<Fabric, "fibreOrigin" | "country">) {
  return f.fibreOrigin?.trim() || f.country;
}

export function formatCerts(f: Pick<Fabric, "certs">) {
  if (!f.certs.length) return "None listed — not GOTS";
  return f.certs.join(" · ");
}

export function formatPerformance(f: Pick<Fabric, "performance">) {
  const p = f.performance;
  if (!p) return "Not on file — mill hasn't digitised this";
  const bits = [
    p.stretch && `stretch ${p.stretch}`,
    p.shrinkage && `shrink ${p.shrinkage}`,
    p.colourfastness && `colourfast ${p.colourfastness}`,
    p.pilling && `pilling ${p.pilling}`,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "Not on file — mill hasn't digitised this";
}

export function toPublicProduct(path: string) {
  return `/products/${path.replace(/^images\//, "")}`;
}
