"use client";

import { COLOURS } from "@/lib/fruma/cloth";
import { inShopCount, usageFor } from "@/lib/fruma/data";
import type { ClothHistoryItem, ColourName } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";
import { PoloPhoto } from "./PoloPhoto";

export function ClothUsage({
  fabricId,
  compact = false,
}: {
  fabricId: string;
  compact?: boolean;
}) {
  const items = usageFor(fabricId);
  const live = inShopCount(fabricId);

  if (items.length === 0) {
    return (
      <p className={cn("text-[13px] leading-relaxed text-mute", compact ? "mt-3" : "mt-4")}>
        Not in the range yet. A swatch has to come from the mill.
      </p>
    );
  }

  const names = items.filter((i) => i.live).map((i) => i.name.replace(/ Shirt$/i, ""));
  const unique = [...new Set(names)];

  return (
    <div className={cn(compact ? "mt-3" : "mt-4")}>
      {live > 0 ? (
        <p className="text-[13px] leading-snug text-ink">
          In shops: {unique.slice(0, 2).join(", ")}
          {unique.length > 2 ? ` +${unique.length - 2}` : ""}
        </p>
      ) : (
        <p className="text-[13px] text-mute">Used before, not on the floor now.</p>
      )}
      {live > 0 && (
        <p className="mt-1 text-[12.5px] leading-relaxed text-mute">
          Handle it in store instead of waiting on a swatch.
        </p>
      )}
      {!compact && (
        <ul className="mt-3">
          {items.map((h) => (
            <UsageRow key={h.meta} item={h} />
          ))}
        </ul>
      )}
      {compact && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[12.5px] text-mute hover:text-ink">
            {items.length} style{items.length === 1 ? "" : "s"} on this cloth
          </summary>
          <ul className="mt-2">
            {items.map((h) => (
              <UsageRow key={h.meta} item={h} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function UsageRow({ item: h }: { item: ClothHistoryItem }) {
  const colour = h.name.match(/Navy|White|Charcoal|Black|Sage|Stone|Cobalt|Burgundy|Forest|Grey/i);
  const swatch = (colour?.[0] ?? "") as ColourName;
  return (
    <li className="flex items-center gap-3 border-b border-line py-2 last:border-0">
      {h.image ? (
        <span className="size-9 shrink-0 overflow-hidden rounded-[6px]">
          <PoloPhoto src={h.image} alt="" className="h-full w-full" />
        </span>
      ) : (
        <span
          className="size-7 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(47,44,42,.15)]"
          style={{ background: COLOURS[swatch] ?? h.hex }}
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{h.name}</span>
        <span className="mt-0.5 block text-[12px] text-mute">
          {h.meta}
          {h.where ? ` · ${h.where}` : ""}
        </span>
      </span>
      <span className={cn("shrink-0 text-[12px]", h.live ? "text-ok" : "text-mute")}>{h.tag}</span>
    </li>
  );
}
