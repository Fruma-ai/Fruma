import type { Metadata } from "next";
import Link from "next/link";
import { HeroCloth } from "@/components/fruma/HeroCloth";
import { InterestForm } from "@/components/fruma/InterestForm";
import { PublicBar } from "@/components/fruma/PublicBar";

export const metadata: Metadata = {
  title: "Fruma",
  description:
    "The mill’s catalogue, as sent, on a standard buyers can use.",
};

export default function Home() {
  return (
    <div className="min-h-dvh bg-black text-white" data-mode="mill">
      <PublicBar />
      <main>
        <section className="manifest-hero">
          <HeroCloth />
          <div className="manifest-scrim" aria-hidden />
          <div className="manifest-copy">
            <h1 className="manifest-stack">
              <span>The mill’s catalogue,</span>
              <span>as sent,</span>
              <span>on a standard</span>
              <span>buyers can use.</span>
            </h1>
            <span className="manifest-rule" />
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <a href="#apply" className="manifest-cta">
                Apply
              </a>
              <Link href="/origin" className="manifest-cta border-white/30">
                Origin
              </Link>
              <Link href="/app" className="manifest-cta border-white/30">
                Platform
              </Link>
            </div>
          </div>
        </section>

        <section
          id="apply"
          className="border-t border-white/10 bg-black px-5 py-16 md:px-10 md:py-24"
        >
          <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-end">
            <div>
              <p className="manifest-stack">
                <Link href="/mills">
                  <span>Mills</span>
                </Link>
                <Link href="/brands">
                  <span>Brands</span>
                </Link>
                <Link href="/retailers">
                  <span>Retailers</span>
                </Link>
              </p>
              <p className="mt-6 max-w-[36ch] text-[14px] leading-relaxed text-white/50">
                Keep mill catalogues at source, and give every quality an
                identity that can travel.
              </p>
            </div>
            <InterestForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
            Fruma
          </p>
          <Link
            href="/app"
            className="text-[11px] uppercase tracking-[0.18em] text-white/35 hover:text-white"
          >
            Platform
          </Link>
        </div>
      </footer>
    </div>
  );
}
