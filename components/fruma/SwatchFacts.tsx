import {
  formatCare,
  formatCerts,
  formatFibreOrigin,
  formatFinish,
  formatGsm,
  formatLead,
  formatMoq,
  formatPerformance,
  formatPrice,
  formatWidth,
} from "@/lib/fruma/cloth";
import type { Fabric } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";

export function SwatchFacts({
  fabric: f,
  raw = false,
}: {
  fabric: Fabric;
  raw?: boolean;
}) {
  const rows: { k: string; v: string; warn?: boolean }[] = raw
    ? [
        { k: "Weight", v: f.raw.g, warn: true },
        { k: "Width", v: f.raw.w, warn: true },
        { k: "MOQ", v: f.raw.m, warn: true },
        { k: "Composition", v: f.raw.c, warn: true },
      ]
    : [
        { k: "Weight", v: formatGsm(f) },
        { k: "Width", v: formatWidth(f) },
        { k: "Finish", v: formatFinish(f) },
        { k: "MOQ", v: formatMoq(f) },
        { k: "Lead", v: formatLead(f) },
        { k: "£/m", v: formatPrice(f) },
        { k: "Performance", v: formatPerformance(f) },
        { k: "Care", v: formatCare(f) },
        { k: "Fibre origin", v: formatFibreOrigin(f) },
        { k: "Certs", v: formatCerts(f) },
      ];

  return (
    <dl className="mt-3" aria-label="Digital swatch card">
      {rows.map((row) => (
        <div key={row.k} className="kv">
          <dt className="kv-k">{row.k}</dt>
          <dd className={cn("kv-v spec", row.warn && "text-madder")}>{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}
