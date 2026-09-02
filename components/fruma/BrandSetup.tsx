"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { rangeMatches, rangeSummary } from "@/lib/fruma/range";
import { useFruma } from "./store";
import { SeedBanner } from "./SeedBanner";
import { Wordmark } from "./Wordmark";

export function BrandSetup() {
  const { setupPhase, setSetupPhase, completeSetup } = useFruma();
  const summary = useMemo(() => rangeSummary(), []);
  const matches = useMemo(() => rangeMatches().filter((m) => m.live).slice(0, 6), []);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    if (reduce) {
      timers.push(
        window.setTimeout(() => {
          setSetupPhase("matching");
          setVisible(matches.length);
        }, 0),
      );
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
    timers.push(window.setTimeout(() => setSetupPhase("reading"), 0));
    timers.push(window.setTimeout(() => setSetupPhase("matching"), 520));
    matches.forEach((_, i) => {
      timers.push(window.setTimeout(() => setVisible(i + 1), 720 + i * 160));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
    // run once when the setup screen mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchingDone = visible >= matches.length && setupPhase !== "reading";

  return (
    <div data-mode="brand" className="min-h-dvh bg-paper text-ink">
      <header className="app-chrome">
        <div className="app-chrome-inner">
          <Wordmark size="sm" />
          <span className="chrome-rule" aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.22em] text-mute">Sunspel · unaffiliated</span>
        </div>
      </header>
      <SeedBanner />
      <main className="mx-auto max-w-[720px] px-4 py-10 md:px-6 md:py-14">
        <p className="ui-label">Brand setup</p>
        <h1 className="page-title mt-2">Bring the range in first.</h1>
        <p className="page-lede mt-3">
          Fruma reads the products you already sell, picks the fabrics off those
          styles, and matches them to mill qualities. Search then has something
          to cross-reference — including which cloths you can handle in store
          instead of waiting on a swatch.
        </p>

        <div className="mt-8 border-t border-line pt-5">
          <p className="spec text-[12px] text-mute">{summary.file}</p>
          <p className="mt-2 text-[14px]">
            {setupPhase === "reading"
              ? "Reading the export…"
              : `${summary.styles} styles · ${summary.colourways} colourways · ${summary.fabrics} mill qualities matched`}
          </p>
          <p className="mt-1 text-[13px] text-mute">
            {summary.inShop} colourways in shops now. {summary.unmatched} mill
            qualities have no range history yet — those still need a mill swatch.
          </p>
        </div>

        <ul className="mt-6">
          {matches.slice(0, visible).map((m) => (
            <li
              key={`${m.fabricId}-${m.sku}`}
              className="swatch-in flex items-baseline justify-between gap-4 border-b border-line py-2.5"
            >
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium">{m.style}</span>
                <span className="mt-0.5 block spec text-[11px] text-mute">{m.sku}</span>
              </span>
              <span className="shrink-0 text-right text-[12.5px]">
                <span className="block">{m.fabricName}</span>
                <span className="mt-0.5 block text-ok">
                  {m.where ?? "In shops"}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button disabled={!matchingDone} onClick={completeSetup}>
            Continue to Design
          </Button>
          <p className="text-[12.5px] text-mute">
            {matchingDone
              ? "New styles still need a mill swatch. Existing ones can be felt on the floor."
              : "Matching mill files to the range…"}
          </p>
        </div>
      </main>
    </div>
  );
}
