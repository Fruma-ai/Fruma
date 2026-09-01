import { FABRIC_BY_ID, FABRIC_USAGE, RANGE_FILE } from "./data";

export type RangeMatch = {
  style: string;
  sku: string;
  fabricId: string;
  fabricName: string;
  live: boolean;
  where?: string;
  image?: string;
};

export function rangeMatches(): RangeMatch[] {
  const out: RangeMatch[] = [];
  for (const [fabricId, items] of Object.entries(FABRIC_USAGE)) {
    const fabric = FABRIC_BY_ID[fabricId];
    for (const item of items) {
      out.push({
        style: item.name,
        sku: item.meta,
        fabricId,
        fabricName: fabric?.name ?? fabricId,
        live: item.live,
        where: item.where,
        image: item.image,
      });
    }
  }
  return out;
}

export function rangeSummary() {
  const matches = rangeMatches();
  const styles = new Set(matches.map((m) => m.style)).size;
  const inShop = matches.filter((m) => m.live).length;
  const fabrics = Object.values(FABRIC_USAGE).filter((u) => u.length > 0).length;
  return {
    file: RANGE_FILE,
    styles,
    colourways: matches.length,
    inShop,
    fabrics,
    unmatched: Object.values(FABRIC_USAGE).filter((u) => u.length === 0).length,
  };
}
