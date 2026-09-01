import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InterestForm } from "@/components/fruma/InterestForm";
import { PublicBar } from "@/components/fruma/PublicBar";

export const metadata: Metadata = {
  title: "Fruma",
  description:
    "Brands and retailers live from origin. Redefining the industry. Ethical, sustainable factories that meet EU and UK sourcing law.",
};

export default function Home() {
  return (
    <div className="min-h-dvh bg-black text-white" data-mode="mill">
      <PublicBar />
      <main>
        <section className="manifest-hero">
          <Image
            src="/splash/black-cloth.jpg"
            alt=""
            fill
            preload
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="manifest-scrim" aria-hidden />
          <div className="manifest-copy">
            <h1 className="manifest-stack">
              <span>Brands</span>
              <span>and retailers</span>
              <span>live from</span>
              <span>origin</span>
            </h1>
            <span className="manifest-rule" />
            <p className="manifest-stack manifest-stack-sub">
              <span>Redefining</span>
              <span>the industry</span>
            </p>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.32em] text-white/55">
              Agentic sourcing optimisation
            </p>
            <p className="mt-5 max-w-[26ch] text-[13px] leading-snug tracking-[0.03em] text-white/55">
              From factories that are ethical, sustainable, and meet EU and UK
              sourcing law.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <a href="#apply" className="manifest-cta">
                Apply
              </a>
              <Link href="/origin" className="manifest-cta border-white/30">
                The factories
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
                <span>Brands</span>
                <span>retailers</span>
                <span>factories</span>
              </p>
              <p className="mt-6 max-w-[36ch] text-[14px] leading-relaxed text-white/50">
                Apply. We walk you through.
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
