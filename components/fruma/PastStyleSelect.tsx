"use client";

import { useState } from "react";
import { COLOURS } from "@/lib/fruma/cloth";
import { usageFor, usageHeadline } from "@/lib/fruma/data";
import type { ClothHistoryItem, ColourName } from "@/lib/fruma/types";
import { PoloPhoto } from "./PoloPhoto";

export function PastStyleSelect({
  fabricId,
  fabricName,
}: {
  fabricId: string;
  fabricName: string;
}) {
  const items = usageFor(fabricId);
  const defaultIndex = Math.max(
    0,
    items.findIndex((item) => item.live),
  );
  const [selected, setSelected] = useState(items.length ? defaultIndex : -1);

  if (items.length === 0) {
    return (
      <div className="mt-4">
        <p className="ui-label">Look and feel this cloth</p>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          {fabricName} is not in the imported range. There is nothing on the
          floor to handle — a swatch has to come from the mill.
        </p>
      </div>
    );
  }

  const item = items[selected] ?? items[0];

  return (
    <div className="mt-4">
      <label className="ui-label" htmlFor={`feel-${fabricId}`}>
        Used on these styles — go look and feel
      </label>
      <select
        id={`feel-${fabricId}`}
        className="feel-select mt-2"
        value={String(selected)}
        onChange={(e) => setSelected(Number(e.target.value))}
      >
        {items.map((row, i) => (
          <option key={`${row.name}-${row.meta}`} value={i}>
            {usageHeadline(row)}
          </option>
        ))}
      </select>
      {item ? <FeelCard item={item} /> : null}
    </div>
  );
}

function FeelCard({ item }: { item: ClothHistoryItem }) {
  const colour = item.name.match(
    /Navy|White|Charcoal|Black|Sage|Stone|Cobalt|Burgundy|Forest|Grey/i,
  );
  const swatch = (colour?.[0] ?? "") as ColourName;

  return (
    <div className="mt-3 flex gap-3 border border-line bg-canvas p-3">
      {item.image ? (
        <PoloPhoto
          src={item.image}
          alt={item.name}
          className="size-[88px] shrink-0 sm:size-[108px]"
        />
      ) : (
        <span
          className="size-[88px] shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(47,44,42,.15)] sm:size-[108px]"
          style={{ background: COLOURS[swatch] ?? item.hex }}
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium leading-snug">{item.name}</p>
        <p className="mt-1 spec text-[12px] text-mute">{item.meta}</p>
        {item.live ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink">
            In shops
            {item.where ? ` — ${item.where}` : ""}. Handle this garment on the
            floor while the mill swatch is in transit.
          </p>
        ) : (
          <p className="mt-2 text-[12.5px] leading-relaxed text-mute">
            {item.tag}. Not on the floor now
            {item.where ? ` (${item.where})` : ""}. A mill swatch is the way to
            feel this quality unless another colourway is in shops.
          </p>
        )}
      </div>
    </div>
  );
}
