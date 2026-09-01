"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_FIELD_LABEL,
  rankOptions,
  type LearnState,
} from "@/lib/fruma/suggest";
import type { AiFieldKey } from "@/lib/fruma/types";
import { useFruma } from "./store";

export function SuggestField({
  field,
  multiline = false,
}: {
  field: AiFieldKey;
  multiline?: boolean;
}) {
  const { ai, aiCustom, pickAi, learn, productFabric } = useFruma();
  const ranked = rankOptions(field, learn, productFabric);
  const value = ai[field];
  const custom = aiCustom[field];
  const [writing, setWriting] = useState(custom && !ranked.includes(value));

  const selectValue =
    writing || (custom && !ranked.includes(value)) ? "__custom__" : value;

  return (
    <div className="border-b border-line py-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="w-[132px] shrink-0 text-[12px] text-mute">
          {AI_FIELD_LABEL[field]}
        </span>
        <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
          {writing ? (
            <Textarea
              value={value === "—" ? "" : value}
              rows={multiline ? 4 : 2}
              aria-label={AI_FIELD_LABEL[field]}
              className="min-h-[52px] text-[13.5px]"
              onChange={(e) => pickAi(field, e.target.value, true)}
            />
          ) : (
            value || "—"
          )}
        </span>
        <span className="src-pill bg-weld/15 text-[#6b5410]">Fruma</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-0 sm:pl-[144px]">
        <label className="sr-only" htmlFor={`suggest-${field}`}>
          Other suggestions for {AI_FIELD_LABEL[field]}
        </label>
        <select
          id={`suggest-${field}`}
          className="suggest-select"
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              setWriting(true);
              pickAi(field, value === "—" ? "" : value, true);
              return;
            }
            setWriting(false);
            pickAi(field, e.target.value, false);
          }}
        >
          {ranked.map((opt, i) => (
            <option key={opt} value={opt}>
              {i === 0 ? `Suggested — ${short(opt)}` : short(opt)}
            </option>
          ))}
          <option value="__custom__">Write my own</option>
        </select>
      </div>
    </div>
  );
}

function short(s: string) {
  return s.length > 64 ? `${s.slice(0, 61)}…` : s;
}

export function LearnNote({ learn }: { learn: LearnState }) {
  if (learn.picks === 0) {
    return (
      <p className="text-[12.5px] text-mute">
        Every pick trains the next draft. First-suggestion accuracy starts unmeasured.
      </p>
    );
  }
  const pct = Math.round((learn.firstHits / learn.picks) * 100);
  return (
    <p className="text-[12.5px] text-mute">
      First suggestion kept {learn.firstHits} of {learn.picks} times
      <span className="spec text-ink"> · {pct}%</span>
      {pct >= 70 ? " — ranking is tightening." : " — alternates you pick move up."}
    </p>
  );
}
