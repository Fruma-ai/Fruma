import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/fruma/Wordmark";

export const metadata: Metadata = {
  title: "System",
  description: "Fruma type and colour.",
};

const TOKENS = [
  { name: "Black", hex: "#000000", note: "Public site and workshop" },
  { name: "Ink", hex: "#12141A", note: "Studio text" },
  { name: "Paper", hex: "#F4F2EC", note: "Studio ground" },
  { name: "Canvas", hex: "#FCFBF8", note: "Cloth and photo stage" },
  { name: "Chalk", hex: "#FFFFFF", note: "Public type" },
  { name: "Weld", hex: "#C9A227", note: "Rare mill signal" },
  { name: "Ok", hex: "#1F6B45", note: "Confirmed / live" },
  { name: "Madder", hex: "#9A3D38", note: "Error / blocked" },
];

export default function BrandPage() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="app-chrome">
        <div className="app-chrome-inner">
          <Link href="/" aria-label="Fruma home">
            <Wordmark size="sm" />
          </Link>
          <span className="chrome-rule" aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.22em] text-mute">System</span>
          <Link href="/app" className="ml-auto text-[11px] uppercase tracking-[0.18em] text-mute hover:text-ink">
            Platform
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-5 py-10">
        <h1 className="page-title">Type and colour</h1>
        <p className="page-lede mt-2">
          Archivo for the Fruma lockup and UI, matching the public site. Fraunces
          for cloth names. IBM Plex Mono for SKU, GSM, and price. Black on the
          landing and workshop; paper in the brand studio.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
          {TOKENS.map((d) => (
            <div key={d.hex} className="bg-canvas">
              <div className="h-14" style={{ background: d.hex }} />
              <div className="px-3 py-2.5">
                <p className="text-[13px] font-medium">{d.name}</p>
                <p className="spec text-[11px] text-mute">{d.hex}</p>
                <p className="mt-0.5 text-[12px] text-mute">{d.note}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 space-y-3">
          <p className="cloth-name text-[28px]">Q75 cotton mesh</p>
          <p className="text-[14px]">Search mill files. Put cloth on the desk.</p>
          <p className="spec text-[12px] text-mute">MPOL1026-BUAA · £140.00</p>
        </div>
      </main>
    </div>
  );
}
