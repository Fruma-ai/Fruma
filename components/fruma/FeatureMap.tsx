import Link from "next/link";
import { DATA_HOPS, MAP_NOW_LABEL, MAP_STAGES, type MapNow } from "@/lib/fruma/feature-map";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";

export function FeatureMap() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="app-chrome">
        <div className="app-chrome-inner">
          <Link href="/" aria-label="Fruma home">
            <Wordmark size="sm" />
          </Link>
          <span className="chrome-rule" aria-hidden />
          <span className="text-[12px] font-medium text-mute">Feature & data map</span>
          <Link href="/" className="ml-auto text-[12px] font-medium text-mute hover:text-ink">
            Open the demo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-4 pb-24 pt-8 md:px-6 md:pt-10">
        <p className="ui-label">For Sam · and a technical hire</p>
        <h1 className="page-title mt-2 md:text-[28px]">
          Where Fruma earns its keep.
        </h1>
        <p className="page-lede mt-3 max-w-[62ch]">
          The design process is a data process. Factories already have hanger
          lists; designers already have briefs and sketches. Fruma’s AI is the
          pipe between them — so mill truth is still mill truth when a retailer
          writes the PDP. Two bookends, not “everywhere”: sourcing at the top,
          content at the bottom. Proto and bulk stay physical.
        </p>

        <figure className="mt-8 border border-line bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/process/fashion-design-development.jpg"
            alt="Fashion design and development process from idea to customer — research, sourcing, parallel design materials and commercial streams, technical design, proto, pre-production, bulk, brand and sales, then review."
            className="w-full"
          />
          <figcaption className="border-t border-line px-5 py-3 text-[12.5px] leading-relaxed text-mute">
            The working chart. Fruma sits on white (research &amp; hangers) and
            pink (brand / sales). Green fabric hangers become a structured
            catalogue instead of a courier loop. Grey proto rounds stay at the
            factory.
          </figcaption>
        </figure>

        <h2 className="page-title mt-10 text-[20px] md:text-[22px]">
          What the AI actually does
        </h2>
        <p className="page-lede mt-2">
          Five hops. Each one is mill data in, mill data out — formatted, not
          invented.
        </p>
        <ol className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {DATA_HOPS.map((h) => (
            <li key={h.n} className="border border-line bg-canvas px-4 py-4">
              <p className="spec text-[11px] text-weld">
                {String(h.n).padStart(2, "0")} · {h.stage}
              </p>
              <p className="mt-2 text-[14px] font-semibold tracking-[-0.02em]">{h.title}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed">{h.ai}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-mute">Today: {h.today}</p>
              <p className="mt-3 spec text-[11px] text-mute">{h.room}</p>
            </li>
          ))}
        </ol>

        <h2 className="page-title mt-12 text-[20px] md:text-[22px]">
          Stage by stage against the chart
        </h2>
        <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {MAP_STAGES.map((s) => (
            <li
              key={s.id}
              className={cn(
                "border border-line px-3 py-3",
                s.now === "demo" ? "bg-canvas" : "bg-transparent",
              )}
            >
              <p className="spec text-[11px] text-mute">{s.leverage}</p>
              <p className="mt-1 text-[13px] font-medium tracking-[-0.02em]">{s.stage}</p>
              <NowTag now={s.now} />
            </li>
          ))}
        </ol>

        <div className="mt-10 space-y-4">
          {MAP_STAGES.map((s) => (
            <section key={s.id} className="border border-line bg-canvas">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{s.stage}</h2>
                <p className="text-[12px] text-mute">
                  {s.leverage} · {MAP_NOW_LABEL[s.now]}
                </p>
              </div>
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-b border-line px-5 py-4 lg:border-b-0 lg:border-r">
                  <p className="ui-label">Platform</p>
                  <ul className="mt-3 space-y-3">
                    {s.features.map((f) => (
                      <li key={f.text} className="flex gap-3 text-[13.5px] leading-relaxed">
                        <NowTag now={f.now} />
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-5 py-4">
                  <p className="ui-label">Factory data that powers it</p>
                  <ul className="mt-3 space-y-1.5">
                    {s.data.map((d) => (
                      <li key={d} className="spec text-[12.5px] text-mute">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 border border-line px-5 py-5">
          <p className="ui-label">The moat</p>
          <p className="mt-3 max-w-[62ch] text-[14.5px] leading-relaxed">
            The most defensible data points are the ones both hard to get and
            legally essential downstream — composition, care, performance specs,
            and country of origin. Factories are least likely to have digitised
            these. That is why mill relationships unlock the model, and why the
            workshop ingest exists: mills send the files they already have.
            Empty is allowed. Invented GOTS on Q75 is not.
          </p>
          <p className="mt-4 max-w-[62ch] text-[13.5px] leading-relaxed text-mute">
            This demo concentrates on stages 1–2 (Design search, mill catalogue,
            digital swatch) and stage 9 (Product record → destination listings).
            Lab dips, trims libraries, tech packs, proto comments and returns
            feedback are named so we do not claim them yet.
          </p>
        </section>
      </main>
    </div>
  );
}

function NowTag({ now }: { now: MapNow }) {
  return (
    <span
      className={cn(
        "src-pill shrink-0 self-start",
        now === "demo" && "bg-ok/10 text-ok",
        now === "partial" && "bg-weld/15 text-[#6b5410]",
        now === "next" && "bg-ink/6 text-mute",
      )}
    >
      {MAP_NOW_LABEL[now]}
    </span>
  );
}
