import type { OriginFacility } from "@/lib/oshub/types";

export function millKind(f: OriginFacility) {
  const s = f.sectors.map((x) => x.toLowerCase());
  const knit = s.some((x) => x.includes("textile"));
  const cut = s.some((x) => x.includes("apparel") || x.includes("footwear"));
  if (knit && cut) return "Mill & factory";
  if (knit) return "Mill";
  if (cut) return "Factory";
  return "Production site";
}
