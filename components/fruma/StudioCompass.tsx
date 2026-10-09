"use client";

import { useEffect, useState } from "react";
import { compassScanBody, swatchHex } from "@/lib/fruma/design/compass-scan";
import type { TenantVersion } from "@/lib/fruma/persist/confirm-pending-overrides";

export type SwatchMatch = {
  id: string;
  resolved_gsm: string;
  width: string;
  supplier_org_id?: string;
  article_code?: string | null;
  composition?: string | null;
  hex_variants?: string[];
};

const FRAME = "border border-zinc-800/60 bg-[#0B0C0E]";

/** Horizontal cloth matches for one GSM and width on the session schema. */
export function StudioCompass({
  currentGsm,
  currentWidth,
  tenantVersion,
}: {
  currentGsm: number;
  currentWidth: number;
  tenantVersion: TenantVersion;
}) {
  const [matches, setMatches] = useState<SwatchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function executeCompassScan() {
      setLoading(true);
      setNotice(null);
      try {
        const res = await fetch("/api/qualities/compass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(compassScanBody(currentGsm, currentWidth, tenantVersion)),
        });
        if (cancelled) return;
        if (!res.ok) {
          setMatches([]);
          setNotice("The cloth scan did not complete.");
          return;
        }
        const data = (await res.json()) as { matches?: SwatchMatch[] };
        const rows = Array.isArray(data.matches) ? data.matches : [];
        if (cancelled) return;
        setMatches(rows);
        const initialColors: Record<string, string> = {};
        for (const match of rows) {
          const first = match.hex_variants?.map(swatchHex).find((hex): hex is string => hex !== null);
          if (first) initialColors[match.id] = first;
        }
        setActiveColor(initialColors);
      } catch {
        if (!cancelled) {
          setMatches([]);
          setNotice("The cloth scan did not complete.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void executeCompassScan();
    return () => {
      cancelled = true;
    };
  }, [currentGsm, currentWidth, tenantVersion]);

  if (loading) {
    return (
      <div className={`${FRAME} px-3 py-2`}>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Scanning cloth</p>
      </div>
    );
  }

  if (notice) {
    return (
      <div className={`${FRAME} px-3 py-2`}>
        <p className="text-[11px] uppercase tracking-[0.14em] text-amber-200">{notice}</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800/60 bg-[#0B0C0E] px-3 py-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          No matching cloth for this weight and width
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Tactile compass" className={`${FRAME} px-3 py-2 text-zinc-100`}>
      <h3 className="border-b border-zinc-800/60 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
        Tactile compass ({matches.length})
      </h3>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {matches.map((swatch) => {
          const title = swatch.article_code || swatch.composition || swatch.id;
          const colors = (swatch.hex_variants ?? []).map(swatchHex).filter((hex): hex is string => hex !== null);
          return (
            <article
              key={swatch.id}
              className="flex min-w-[220px] flex-col gap-2 border border-zinc-800/60 bg-zinc-900/40 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="min-w-0 truncate text-[11px] uppercase tracking-[0.14em] text-zinc-100">{title}</h4>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                  {swatch.resolved_gsm}
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                {swatch.supplier_org_id ? `${swatch.supplier_org_id} · ` : null}
                {swatch.width}
              </p>
              {colors.length > 0 ? (
                <div className="flex items-center gap-1">
                  {colors.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={hex}
                      onClick={() => setActiveColor((previous) => ({ ...previous, [swatch.id]: hex }))}
                      style={{ backgroundColor: hex }}
                      className={
                        activeColor[swatch.id] === hex
                          ? "h-4 w-4 border border-zinc-100"
                          : "h-4 w-4 border border-zinc-800/60"
                      }
                    />
                  ))}
                  <span className="ml-auto text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                    {activeColor[swatch.id] ?? "None"}
                  </span>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
