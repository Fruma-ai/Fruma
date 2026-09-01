"use client";

import { Button } from "@/components/ui/button";
import { LISTING_RULE, SUPPLIERS } from "@/lib/fruma/data";
import { cn } from "@/lib/utils";
import { useFruma } from "./store";
import type { ReactNode } from "react";

const INSIGHTS: {
  id: string;
  color: string;
  h: string;
  p: ReactNode;
  acts: string[];
  go?: boolean;
  isRule?: boolean;
}[] = [
  {
    id: "pique",
    color: "var(--madder)",
    h: "Selfridges filed Q75 mesh as cotton-piqué",
    p: (
      <>
        The Riviera exists because they rejected dense piqué. Selfridges still
        sell it as a <b>cotton-piqué polo</b>, GREY MELANGE default, SKU{" "}
        <b>R03756503</b>. That is a mapping error, not a new product.
      </>
    ),
    acts: ["See listing", "Flag to retailer"],
  },
  {
    id: "certs",
    color: "var(--weld)",
    h: "The cert field is empty — and that is correct",
    p: (
      <>
        Retailer feeds still want a certificate. This cloth is{" "}
        <b>traceable California Supima, not GOTS</b>. Do not invent organic.
        Send an empty cert with a traceability note, not a fake GOTS date.
      </>
    ),
    acts: ["Review note"],
    go: true,
  },
  {
    id: "rule",
    color: "var(--ink)",
    h: "The same listing mistakes, every season",
    p: (
      <>
        Liberty misspells <b>Rivieria</b>. END. tags Charcoal as Grey. Farfetch
        maps Navy to Blue and drops the hyphen.{" "}
        <b>Those are rules, not twelve decisions.</b>
      </>
    ),
    acts: ["See the rule"],
    go: true,
    isRule: true,
  },
  {
    id: "empty",
    color: "var(--ok)",
    h: "John Lewis is empty. Leave it empty.",
    p: (
      <>
        The John Lewis Sunspel brand page has <b>no SKU</b>. Mr Porter is
        journal only. Fruma should not mock a ready-to-publish card for a
        destination that does not list the garment.
      </>
    ),
    acts: ["Open destination", "Dismiss"],
  },
];

export function SuppliersView() {
  const { insightDone, showRule, insightAct } = useFruma();

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Suppliers</h1>
        <p className="page-lede mt-2">
          Every figure here comes from your own order history — samples you
          waited for, lead times you were quoted against lead times you got. No
          mill can edit it.
        </p>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className="text-[13px] font-semibold tracking-[-0.02em]">What Fruma noticed</h2>
          <span className="text-[13px] text-mute">You didn&apos;t ask for these.</span>
          <span className="ml-auto spec text-[11px] text-mute">4 this week</span>
        </div>
        {INSIGHTS.map((ins) => (
          <div key={ins.id} className="border-b border-line last:border-0">
            <div className="flex flex-wrap gap-4 py-4">
              <span
                className="w-0.5 self-stretch"
                style={{ background: ins.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-snug tracking-[-0.015em]">{ins.h}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mute">{ins.p}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ins.acts.map((a) => {
                  const isRule = Boolean(ins.isRule);
                  const key = isRule ? "rule" : `${ins.id}:${a}`;
                  const done = insightDone[key];
                  const label = isRule
                    ? showRule
                      ? "Hide the rule"
                      : "See the rule"
                    : (done ?? a);
                  return (
                    <Button
                      key={a}
                      size="sm"
                      variant={
                        done ? "ok" : ins.go && !isRule ? "default" : "outline"
                      }
                      onClick={() =>
                        insightAct(
                          key,
                          a.includes("Dismiss") ? "Dismissed" : "Done",
                        )
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            {ins.isRule && showRule && (
              <pre className="mb-4 overflow-x-auto bg-ink px-4 py-3 font-mono text-[12px] leading-relaxed text-paper">
                <span className="text-[#9aa3b0]">
                  # Anyone here can read and change this. No engineer needed.
                </span>
                {"\n"}
                {LISTING_RULE}
              </pre>
            )}
          </div>
        ))}
      </section>

      <div className="mt-10 overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th>Mill</th>
              <th>Location</th>
              <th>Grade</th>
              <th>Metrics</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {SUPPLIERS.map((s) => (
              <tr key={s.name}>
                <td className="font-medium whitespace-nowrap">{s.name}</td>
                <td className="text-mute whitespace-nowrap">{s.loc}</td>
                <td>
                  <span
                    className={cn(
                      "spec text-[16px] font-medium",
                      s.gradeTone === "ok" ? "text-ok" : "text-weld",
                    )}
                  >
                    {s.grade}
                  </span>
                </td>
                <td>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {s.metrics.map((m) => (
                      <div key={m.k} className="whitespace-nowrap">
                        <span className="text-[11px] text-mute">{m.k}</span>{" "}
                        <span className="spec text-[12px]">{m.v}</span>{" "}
                        <span
                          className={cn(
                            "text-[11px]",
                            m.trend === "up" && "text-madder",
                            m.trend === "down" && "text-ok",
                            m.trend === "flat" && "text-mute",
                          )}
                        >
                          {m.note}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="max-w-[280px] text-[12.5px] leading-relaxed text-mute">
                  {s.foot}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid gap-6 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "64%",
            "of mill files now map with no questions asked — up from 12% in March",
          ],
          ["7", "corrections needed on your last 100 products — down from 41"],
          ["31", "new fabric terms learned from your mills and added to the standard"],
          ["2.1s", "average time to structure a line sheet — was 40 minutes by hand"],
        ].map(([n, l]) => (
          <div key={n}>
            <p className="spec text-[26px] font-medium leading-none tracking-[-0.03em]">{n}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-mute">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
