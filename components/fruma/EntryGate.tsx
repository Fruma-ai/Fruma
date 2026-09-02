"use client";

import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { useFruma } from "./store";

export function EntryGate() {
  const { enter } = useFruma();
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="grid min-h-0 flex-1 md:grid-cols-2">
        <button
          type="button"
          onClick={() => enter("mill")}
          className="group flex min-h-[46dvh] flex-col justify-between bg-black px-7 py-8 text-left text-white transition-[opacity] duration-150 hover:opacity-90 md:min-h-0 md:px-10 md:py-10"
        >
          <div>
            <div className="flex items-center gap-3">
              <Wordmark />
              <span className="h-4 w-px bg-white/20" aria-hidden />
              <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                Factory
              </span>
            </div>
            <p className="manifest-stack mt-10 md:mt-16">
              <span>Workshop</span>
            </p>
            <span className="manifest-rule" />
            <p className="mill-name font-medium tracking-[-0.015em] text-white/72">
              Têxteis Vale do Ave, Lda
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
              Not a partner
            </p>
            <p className="mt-4 max-w-[40ch] text-[13.5px] leading-relaxed text-white/50">
              Claim the mill profile, drop the hanger list you already have, map
              it to the Fruma standard, then manage exceptions. The next file in
              that layout maps itself.
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/45">
              Profile · File · Map · Review · Catalogue
            </p>
          </div>
          <span className="manifest-cta mt-10">Enter workshop</span>
        </button>
        <button
          type="button"
          onClick={() => enter("brand")}
          className="group flex min-h-[46dvh] flex-col justify-between bg-paper px-7 py-8 text-left text-ink transition-[background-color] duration-150 hover:bg-canvas md:min-h-0 md:px-10 md:py-10"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Wordmark />
                <span className="chrome-rule" aria-hidden />
                <span className="text-[11px] uppercase tracking-[0.22em] text-mute">
                  Studio
                </span>
              </div>
              <span className="hidden text-[11px] uppercase tracking-[0.18em] text-mute sm:inline">
                Unaffiliated Sunspel reference
              </span>
            </div>
            <p className="manifest-stack mt-10 md:mt-16">
              <span>Brand studio</span>
            </p>
            <span className="manifest-rule" />
            <p className="font-medium tracking-[-0.015em]">Sunspel · demo account</p>
            <p className="mt-4 max-w-[42ch] text-[13.5px] leading-relaxed text-mute">
              Setup imports the range so fabrics match mill swatches immediately.
              Search with a brief and a sketch. Product drafts a packshot for a
              style that is not in shops yet.
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-mute">
              Design · Desk · Product · Listings · Suppliers
            </p>
          </div>
          <span className="mt-10 inline-flex h-9 items-center border-b border-ink text-[11px] font-medium uppercase tracking-[0.26em]">
            Enter studio
          </span>
        </button>
      </div>
      <Link
        href="/map"
        className="flex items-center justify-between gap-4 border-t border-line bg-paper px-7 py-3 text-[11px] uppercase tracking-[0.18em] text-mute hover:text-ink md:px-10"
      >
        <span>Where Fruma earns its keep — feature and factory-data map</span>
        <span className="shrink-0">Open map</span>
      </Link>
    </div>
  );
}
