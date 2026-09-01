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
        className="group flex min-h-[46dvh] flex-col justify-between bg-[#0c0d10] px-7 py-8 text-left text-[#eceae4] transition-[background-color] duration-150 hover:bg-[#12141a] md:min-h-0 md:px-10 md:py-10"
      >
        <div>
          <div className="flex items-center gap-3">
            <Wordmark size="sm" />
            <span className="h-4 w-px bg-[#343a46]" aria-hidden />
            <span className="text-[12px] font-medium tracking-[-0.01em] text-weld">
              Factory
            </span>
          </div>
          <h1 className="page-title mt-10 text-[#eceae4] md:mt-16 md:text-[28px]">
            Workshop
          </h1>
          <p className="mt-2 font-medium text-[#c4c0b6]">Têxteis Vale do Ave, Lda</p>
          <p className="mt-4 max-w-[40ch] text-[13.5px] leading-relaxed text-[#9aa1ad]">
            Claim the mill profile, drop the hanger list you already have, map
            it to the Fruma standard, then manage exceptions. The next file in
            that layout maps itself.
          </p>
          <p className="mt-6 text-[12px] text-[#9aa1ad]">
            Profile · File · Map · Review · Catalogue
          </p>
        </div>
        <span className="mt-10 text-[13px] font-medium tracking-[-0.015em] text-[#eceae4]">
          Enter workshop
        </span>
      </button>
      <button
        type="button"
        onClick={() => enter("brand")}
        className="group flex min-h-[46dvh] flex-col justify-between bg-paper px-7 py-8 text-left text-ink transition-[background-color] duration-150 hover:bg-canvas md:min-h-0 md:px-10 md:py-10"
      >
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Wordmark size="sm" />
              <span className="chrome-rule" aria-hidden />
              <span className="text-[12px] font-medium tracking-[-0.01em] text-mute">
                Studio
              </span>
            </div>
            <span className="hidden text-[12px] text-mute sm:inline">
              Unaffiliated Sunspel reference
            </span>
          </div>
          <h1 className="page-title mt-10 md:mt-16 md:text-[28px]">Brand studio</h1>
          <p className="mt-2 font-medium">Sunspel · demo account</p>
          <p className="mt-4 max-w-[42ch] text-[13.5px] leading-relaxed text-mute">
            Setup imports the range so fabrics match mill swatches immediately.
            Search with a brief and a sketch. Product drafts a packshot for a
            style that is not in shops yet.
          </p>
          <p className="mt-6 text-[12px] text-mute">
            Design · Desk · Product · Listings · Suppliers
          </p>
        </div>
        <span className="mt-10 text-[13px] font-medium tracking-[-0.015em]">
          Enter studio
        </span>
      </button>
      </div>
      <Link
        href="/map"
        className="flex items-center justify-between gap-4 border-t border-line bg-paper px-7 py-3 text-[12.5px] text-mute hover:text-ink md:px-10"
      >
        <span>Where Fruma earns its keep — feature and factory-data map</span>
        <span className="shrink-0 font-medium tracking-[-0.015em]">Open map</span>
      </Link>
    </div>
  );
}
