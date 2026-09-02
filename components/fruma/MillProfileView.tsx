"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  EVIDENCE,
  MARKET_LABEL,
  SELL_MARKETS,
  scoreMarket,
} from "@/lib/fruma/market-score";
import { cn } from "@/lib/utils";
import { useFruma } from "./store";

const FOUND = [
  {
    key: "name",
    title: "Têxteis Vale do Ave, Lda",
    sub: "Legal name · circular knit mill",
    locked: true,
  },
  {
    key: "place",
    title: "Famalicão, Portugal",
    sub: "From public supply-chain records",
    locked: true,
  },
  {
    key: "headcount",
    title: "983 people",
    sub: "Confirm if the number has moved",
    locked: false,
  },
  {
    key: "knit",
    title: "Circular knit",
    sub: "Single jersey, piqué, interlock, rib, french terry, waffle",
    locked: false,
  },
  {
    key: "brands",
    title: "Listed by 5 brands",
    sub: "From their published supplier lists — not a partnership claim",
    locked: false,
  },
  {
    key: "established",
    title: "Established 1987",
    sub: "Asked for on mill scorecards",
    add: true,
    action: "Add 1987",
    added: "1987",
  },
  {
    key: "contact",
    title: "Export contact",
    sub: "So a designer can request a hanger without leaving Fruma",
    add: true,
    action: "Add export desk",
    added: "export desk on file",
  },
] as const;

const PRODUCTION = [
  { key: "gauges", title: "Machine gauges", sub: "18–28gg circular", action: "Add 18–28gg", added: "18–28gg circular" },
  { key: "machines", title: "Machine park", sub: "So weight and width searches can rank you", action: "Add 86 circular", added: "86 circular machines" },
  { key: "fibres", title: "Fibres you run", sub: "Cotton, viscose, elastane, merino blends", action: "Add fibres", added: "CO · viscose · EA" },
  { key: "constructions", title: "Constructions on the floor", sub: "What a designer is actually searching", action: "Add knit list", added: "SJ · piqué · rib · terry" },
  { key: "dyes", title: "Dye and colour lab", sub: "Piece dye, garment dye, lab dips", action: "Add dye", added: "Piece + garment dye" },
  { key: "finishing", title: "Finishing", sub: "Bio wash, compact, peach, brush", action: "Add finishing", added: "Bio wash · compact" },
  { key: "colourfast", title: "Colourfastness", sub: "Hard to get — legally useful on listings", action: "Add ISO 105 4–5", added: "ISO 105 4–5" },
  { key: "shrinkage", title: "Shrinkage after compact", sub: "Asked for before a hanger is sent", action: "Add <5%", added: "<5% after compact" },
  { key: "stretch", title: "Stretch and recovery", sub: "Performance mills are least likely to have digitised", action: "Add recovery", added: "Stretch on file" },
] as const;

const COMMERCIAL = [
  { key: "moq", title: "Minimum order quantity", sub: "Asked for in 9 of 10 searches", action: "Add 150m", added: "MOQ 150m" },
  { key: "lead", title: "Lead time — stock and custom dye", sub: "Asked for in 8 of 10 searches", action: "Add 2 weeks", added: "Lead 2wk" },
  { key: "sampling", title: "Sampling lead", sub: "How fast a swatch pack can leave Famalicão", action: "Add 5 days", added: "Samples in 5 days" },
  { key: "labdips", title: "Lab dips", sub: "Whether colour development is in-house", action: "Add in-house", added: "In-house lab dips" },
  { key: "markets", title: "Export markets", sub: "Where you already ship", action: "Add EU / UK / US", added: "EU · UK · US" },
] as const;

const CARD: Record<string, { on: string; off: string }> = {
  moq: { on: "MOQ 150m", off: "MOQ —" },
  lead: { on: "Lead 2wk", off: "Lead —" },
  gauges: { on: "18–28gg circular", off: "Gauges —" },
  fibres: { on: "Cotton · viscose · EA", off: "Fibres —" },
  dyes: { on: "Piece + garment dye", off: "Dye —" },
  finishing: { on: "Bio wash · compact", off: "Finish —" },
  markets: { on: "EU · UK · US", off: "Markets —" },
  machines: { on: "86 circular", off: "Machines —" },
  sampling: { on: "Samples 5 days", off: "Sampling —" },
  labdips: { on: "In-house lab dips", off: "Lab dips —" },
  constructions: { on: "SJ · piqué · rib", off: "Knit list —" },
  colourfast: { on: "ISO 105 4–5", off: "Colourfast —" },
  shrinkage: { on: "Shrink <5%", off: "Shrink —" },
  stretch: { on: "Stretch on file", off: "Stretch —" },
  established: { on: "Est. 1987", off: "Est. —" },
  contact: { on: "Export desk", off: "Contact —" },
  qualities: { on: "Qualities on file", off: "0 qualities" },
};

export function MillProfileView() {
  const {
    millAdded,
    millFixed,
    millPct,
    millAdd,
    millFix,
    millMarkets,
    millEvidence,
    millToggleMarket,
    millAddEvidence,
    setMillRoom,
    millFile,
  } = useFruma();
  const markets = SELL_MARKETS.filter((m) => millMarkets[m]);
  const market = scoreMarket({
    markets,
    evidence: millEvidence,
    millPct,
    hasFile: Boolean(millFile),
  });
  const thin = millPct < 70;
  const lawGap = markets.length > 0 && !market.ready;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[44rem]">
          <p className="ui-label">Step 1 of 5 · mill profile</p>
          <h1 className="page-title mt-2 md:text-[28px]">Têxteis Vale do Ave, Lda</h1>
          <p className="page-lede mt-3">
            Claim the mill, tick where you sell, then put evidence on file for
            those markets. Completeness is what Design search filters on.
            Market evidence is what lets a brand see you as ready for EU or UK
            law — not an audit of the floor.
          </p>
        </div>
        <Button onClick={() => setMillRoom("upload")}>
          {lawGap
            ? "Continue — not ready for those markets yet"
            : thin
              ? "Continue with gaps"
              : "Continue — drop a mill file"}
        </Button>
      </div>

      {lawGap ? (
        <div className="banner mb-6" data-tone="weld">
          <span className="banner-bar" />
          <p>
            Fruma score {market.score}. {market.requiredDone} of{" "}
            {market.requiredTotal} required items on file for{" "}
            {markets.map((m) => MARKET_LABEL[m]).join(" · ")}. You can still
            drop a file — you will not show as ready for those buyers until the
            list is complete.
          </p>
        </div>
      ) : thin ? (
        <div className="banner mb-6" data-tone="weld">
          <span className="banner-bar" />
          <p>
            Profile is {millPct}% complete. MOQ, lead and gauges are what
            designers filter on. You can still drop a file — unfilled fields
            stay off search.
          </p>
        </div>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
        <div className="space-y-6">
          <ProfileCard title="Identity" note="Confirm or complete">
            {FOUND.map((row) => (
              <ProfileRow
                key={row.key}
                title={row.title}
                sub={row.sub}
                missing={"add" in row}
                done={
                  "add" in row
                    ? Boolean(millAdded[row.key])
                    : row.locked || Boolean(millFixed[row.key])
                }
                action={
                  "add" in row
                    ? millAdded[row.key]
                      ? row.added
                      : row.action
                    : row.locked
                      ? "On file"
                      : millFixed[row.key]
                        ? "Confirmed"
                        : "Confirm"
                }
                onClick={
                  "add" in row
                    ? () => millAdd(row.key)
                    : row.locked
                      ? undefined
                      : () => millFix(row.key)
                }
              />
            ))}
          </ProfileCard>

          <ProfileCard title="Markets & law" note="Evidence, not an audit">
            <div className="flex flex-wrap gap-2 border-b border-line py-3">
              {SELL_MARKETS.map((m) => {
                const on = millMarkets[m];
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => millToggleMarket(m)}
                    className={cn(
                      "h-8 border px-3 text-[11px] uppercase tracking-[0.18em]",
                      on
                        ? "border-chalk bg-chalk text-black"
                        : "border-line2 bg-transparent text-mute",
                    )}
                  >
                    {MARKET_LABEL[m]}
                  </button>
                );
              })}
            </div>
            {EVIDENCE.filter(
              (e) =>
                e.kind === "boost" ||
                e.markets.length === 0 ||
                e.markets.some((m) => millMarkets[m]),
            ).map((row) => (
              <ProfileRow
                key={row.id}
                title={row.title}
                sub={row.sub}
                missing={row.kind === "required"}
                done={Boolean(millEvidence[row.id])}
                action={millEvidence[row.id] ? row.added : row.action}
                onClick={
                  millEvidence[row.id] ? undefined : () => millAddEvidence(row.id)
                }
              />
            ))}
          </ProfileCard>

          <ProfileCard title="Production" note="What you actually knit">
            {PRODUCTION.map((row) => (
              <ProfileRow
                key={row.key}
                title={row.title}
                sub={row.sub}
                missing
                done={Boolean(millAdded[row.key])}
                action={millAdded[row.key] ? row.added : row.action}
                onClick={() => millAdd(row.key)}
              />
            ))}
          </ProfileCard>

          <ProfileCard title="Commercial" note="Buyers filter on this first">
            {COMMERCIAL.map((row) => (
              <ProfileRow
                key={row.key}
                title={row.title}
                sub={row.sub}
                missing
                done={Boolean(millAdded[row.key])}
                action={millAdded[row.key] ? row.added : row.action}
                onClick={() => millAdd(row.key)}
              />
            ))}
            <ProfileRow
              title="Fabric qualities"
              sub="Composition, weight, width, stock colours — from a mill file, not a form"
              missing
              done={Boolean(millAdded.qualities || millFile)}
              action={millAdded.qualities || millFile ? "On file" : "Drop a file"}
              onClick={() => setMillRoom("upload")}
            />
          </ProfileCard>
        </div>

        <aside className="lg:sticky lg:top-[60px] space-y-4">
          <div>
            <p className="ui-label">Fruma score</p>
            <p className="mt-1 text-[13px] text-mute">
              Market evidence for the countries you sell into. Not a floor
              audit. Not a substitute for a brand’s own due diligence.
            </p>
            <div className="mt-4 mill-card p-5">
              <div className="mb-2 flex justify-between text-[12px] text-mute">
                <span>{market.ready ? "Ready for those markets" : "Not ready yet"}</span>
                <b className="spec text-chalk">{market.score}</b>
              </div>
              <div className="mill-bar">
                <i style={{ width: `${market.score}%` }} />
              </div>
              <p className="mt-2 spec text-[11px] text-mute">
                {market.requiredDone}/{market.requiredTotal || "—"} required
                {markets.length
                  ? ` · ${markets.map((m) => MARKET_LABEL[m]).join(" · ")}`
                  : " · pick markets"}
              </p>
              {market.suggestions[0] ? (
                <p className="mt-4 border-t border-line2 pt-4 text-[13px] leading-relaxed text-mute">
                  <b className="font-medium text-weld">Next. </b>
                  {market.suggestions[0]}
                </p>
              ) : null}
              {market.suggestions.slice(1).map((s) => (
                <p key={s} className="mt-3 text-[13px] leading-relaxed text-mute">
                  {s}
                </p>
              ))}
            </div>
          </div>
          <div>
            <p className="ui-label">How buyers see you</p>
            <p className="mt-1 text-[13px] text-mute">
              Design search card. Completeness still decides if you appear.
            </p>
            <div className="mt-4 mill-card p-5">
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-chalk">
                Têxteis Vale do Ave, Lda
              </p>
              <p className="mt-1 spec text-[11px] text-mute">
                Famalicão, Portugal · 983 people · circular knit
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {market.ready ? (
                  <span className="src-pill bg-ok/10 text-ok">
                    Ready · {markets.map((m) => MARKET_LABEL[m]).join(" · ")}
                  </span>
                ) : (
                  <span className="src-pill border border-line2 text-mute">
                    Not ready for those markets
                  </span>
                )}
                {millEvidence.gots ? (
                  <span className="src-pill bg-ok/10 text-ok">GOTS mill programme</span>
                ) : null}
                {millEvidence["rs-oeko"] ? (
                  <span className="src-pill bg-ok/10 text-ok">OEKO-TEX</span>
                ) : null}
                {(Object.keys(CARD) as (keyof typeof CARD)[]).map((k) => {
                  const on = Boolean(millAdded[k]) || (k === "qualities" && millFile);
                  return (
                    <span
                      key={k}
                      className="src-pill border border-line2 text-mute"
                      style={{ opacity: on ? 1 : 0.4 }}
                    >
                      {on ? CARD[k].on : CARD[k].off}
                    </span>
                  );
                })}
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-[12px] text-mute">
                  <span>Search completeness</span>
                  <b className="spec text-chalk">{millPct}%</b>
                </div>
                <div className="mill-bar">
                  <i style={{ width: `${millPct}%` }} />
                </div>
              </div>
              <p className="mt-4 border-t border-line2 pt-4 text-[13px] leading-relaxed text-mute">
                Without MOQ, lead and construction you drop out of most designer
                searches. More mill files and listing outcomes make the next
                suggestion sharper.{" "}
                <b className="font-medium text-weld">The file comes next — this card is the mill.</b>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ProfileCard({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="mill-card">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-[13px] font-semibold tracking-[-0.02em]">{title}</h2>
        <span className="text-[12px] text-mute">{note}</span>
      </div>
      <div className="px-5">{children}</div>
    </section>
  );
}

function ProfileRow({
  title,
  sub,
  action,
  done,
  missing,
  onClick,
}: {
  title: string;
  sub: string;
  action: string;
  done?: boolean;
  missing?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-line py-3 last:border-0">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center spec text-[11px]",
          done ? "text-ok" : missing ? "text-weld" : "text-ok",
        )}
      >
        {done ? "✓" : missing ? "?" : "✓"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] text-chalk">{title}</p>
        <p className="mt-0.5 spec text-[11px] text-mute">{sub}</p>
      </div>
      <Button size="sm" variant={done ? "ok" : "outline"} onClick={onClick} disabled={!onClick && done}>
        {action}
      </Button>
    </div>
  );
}
