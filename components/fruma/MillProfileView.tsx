"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { millFileState, millProfileState, VDA_NOT_PARTNER, workshopReady } from "@/lib/fruma/honesty";
import {
  EVIDENCE,
  MARKET_LABEL,
  SELL_MARKETS,
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
    millAdd,
    millFix,
    millClaim,
    millClaimed,
    millMarkets,
    millEvidence,
    millToggleMarket,
    millAddEvidence,
    setMillRoom,
    millFile,
    millMapConfirmed,
  } = useFruma();
  const claimed = millProfileState(millClaimed);
  const fileState = millFileState(millFile);
  const ready = workshopReady({
    claimed: millClaimed,
    file: millFile,
    mapped: millMapConfirmed,
  });

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[44rem]">
          <p className="ui-label">Step 1 of 5 · mill profile</p>
          <h1 className="page-title mill-name mt-2 md:text-[28px]">Têxteis Vale do Ave, Lda</h1>
          <p className="page-lede mt-3">
            {claimed}. Public records are not a claim. {VDA_NOT_PARTNER}{" "}
            Completeness is not a live catalogue — never complete a blank.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={millClaimed ? "ok" : "outline"}
            onClick={millClaim}
            disabled={millClaimed}
          >
            {claimed}
          </Button>
          <Button onClick={() => setMillRoom("upload")}>Continue to file</Button>
        </div>
      </div>

      <div className="banner mb-6">
        <span className="banner-bar" />
        <p>
          Profile {claimed}. File {fileState}.{" "}
          {ready
            ? "Claimed, on file, and mapped — Ready is allowed here."
            : "Ready is not a Workshop label until claimed, on file, and mapped."}
        </p>
      </div>

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
                      ? "Public record"
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
              missing={fileState === "Not on file"}
              done={millMapConfirmed}
              action={fileState}
              onClick={() => setMillRoom("upload")}
            />
          </ProfileCard>
        </div>

        <aside className="lg:sticky lg:top-[60px] space-y-4">
          <div>
            <p className="ui-label">How buyers see you</p>
            <p className="mt-1 text-[13px] text-mute">
              Studio search does not treat this working file as mill identities.
              Digital is not a hanger.
            </p>
            <div className="mt-4 mill-card p-5">
              <p className="mill-name text-[16px] font-semibold tracking-[-0.02em] text-chalk">
                Têxteis Vale do Ave, Lda
              </p>
              <p className="mt-1 spec text-[11px] text-mute">
                Famalicão, Portugal · public record · circular knit · not a partner
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="src-pill border border-line2 text-mute">{claimed}</span>
                <span
                  className={
                    fileState === "File received"
                      ? "src-pill border-weld text-weld"
                      : "src-pill border border-line2 text-mute"
                  }
                >
                  {fileState}
                </span>
                {millMapConfirmed ? (
                  <span className="src-pill border-weld text-weld">Mapped</span>
                ) : (
                  <span className="src-pill border border-line2 text-mute">Not mapped</span>
                )}
                {ready ? (
                  <span className="src-pill bg-ok/10 text-ok">Ready</span>
                ) : (
                  <span className="src-pill border border-line2 text-mute">
                    Ready is closed
                  </span>
                )}
                {millEvidence.gots ? (
                  <span className="src-pill border border-line2 text-mute">
                    GOTS mill programme — not a quality cert
                  </span>
                ) : null}
                {millEvidence["rs-oeko"] ? (
                  <span className="src-pill border border-line2 text-mute">
                    Restricted substances on file
                  </span>
                ) : null}
                {(Object.keys(CARD) as (keyof typeof CARD)[]).map((k) => {
                  if (k === "qualities") {
                    return (
                      <span key={k} className="src-pill border border-line2 text-mute">
                        Qualities · {fileState}
                      </span>
                    );
                  }
                  const on = Boolean(millAdded[k]);
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
              <p className="mt-4 border-t border-line2 pt-4 text-[13px] leading-relaxed text-mute">
                No Fruma score in Workshop. Live is not complete. A blank stays
                a blank until claimed, received, mapped and confirmed.
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
          done ? "text-ok" : "text-mute",
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
