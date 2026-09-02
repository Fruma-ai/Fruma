"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  COLOURS,
  formatGsm,
} from "@/lib/fruma/cloth";
import { DEMO_BRIEF, DRAFT_PRODUCT } from "@/lib/fruma/data";
import { searchClothKicker } from "@/lib/fruma/honesty";
import type { Fabric } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";
import { ClothPlane } from "./ClothPlane";
import { ClothUsage } from "./ClothUsage";
import { SurfaceState } from "./SurfaceState";
import { SwatchFacts } from "./SwatchFacts";
import { useFruma } from "./store";

export function DesignView() {
  const {
    brief,
    setBrief,
    parsed,
    searchStatus,
    results,
    rawFromMills,
    toggleRaw,
    runSearch,
    retrySearch,
    millIndexWarning,
    dismissMillWarning,
    deskIds,
    designImage,
    setDesignImage,
    visualRead,
  } = useFruma();
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (searchStatus !== "idle") return;
    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      runSearch(DEMO_BRIEF);
      return;
    }
    let i = brief.startsWith(DEMO_BRIEF) ? DEMO_BRIEF.length : 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      setBrief(DEMO_BRIEF.slice(0, i));
      if (i < DEMO_BRIEF.length) t = setTimeout(tick, 16);
      else t = setTimeout(() => {
        if (!cancelled) runSearch(DEMO_BRIEF);
      }, 200);
    };
    t = setTimeout(tick, 40);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [brief]);

  const mills = new Set(results.map((f) => f.mill)).size;
  const millHits = results.filter((f) => f.source === "mill-file").length;

  return (
    <div>
      <div className="composer">
        <div className="composer-row">
          <div className="min-w-0 flex-1">
            <p className="ui-label">The garment — used to be an email to mills</p>
            <Textarea
              ref={taRef}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  runSearch(e.currentTarget.value || DEMO_BRIEF);
                }
              }}
              rows={2}
              spellCheck={false}
              aria-label="Product brief"
              placeholder="Polo for summer, structured collar, navy…"
              className="composer-input mt-2 min-h-[72px] rounded-none border-0 px-0 py-0 shadow-none focus-visible:border-0"
            />
          </div>
          <div className="w-full shrink-0 sm:w-[280px]">
            <p className="ui-label">Sketch that used to go with the hanger request</p>
            {designImage ? (
              <div className="mt-2">
                <label
                  className="dropzone h-[188px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file || !file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) return;
                    const reader = new FileReader();
                    reader.onload = () => setDesignImage(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Replace design image"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) {
                        e.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setDesignImage(String(reader.result));
                      reader.readAsDataURL(file);
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={designImage} alt="Design reference" className="dropzone-thumb" />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setDesignImage(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="sample-sketch"
                  onClick={() => setDesignImage(DRAFT_PRODUCT.sketch)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={DRAFT_PRODUCT.sketch}
                    alt="Demo polo sketch — structured collar, mesh not piqué"
                  />
                  <span>Demo sketch · click to use</span>
                </button>
                <label
                  className="dropzone h-[188px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file || !file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) return;
                    const reader = new FileReader();
                    reader.onload = () => setDesignImage(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Upload a design image"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) {
                        e.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setDesignImage(String(reader.result));
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span>
                    Or upload yours
                    <span className="mt-1 block text-[11px] text-mute">PNG, JPG</span>
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-mute">
          This is stage 2 of the design process: match mill files before a
          hanger moves. Brief plus sketch used to be couriered to factories.
          Fruma reads both against the mill index. Digital is not a hanger.
          Seeded workshop rows are not mill identities. Sunspel is unaffiliated.
        </p>
        <div className="composer-meta">
          <span className="meta-chip">
            Reading <b>{parsed.reading}</b>
          </span>
          <span className="meta-chip">
            Weight <b>{parsed.weight}</b>
          </span>
          <span className="meta-chip">
            Colour <b>{parsed.colour}</b>
          </span>
          <span className="meta-chip">
            MOQ <b>{parsed.moq}</b>
          </span>
          {visualRead.source !== "none" ? (
            <span className="meta-chip">
              Look <b>{visualRead.look}</b>
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => runSearch(taRef.current?.value || brief || DEMO_BRIEF)}
          >
            Search
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {searchStatus === "idle" && (
          <SurfaceState
            tone="idle"
            kicker=""
            title="Waiting on the mill index."
            body="Type a brief and press Search — weight, construction, colour, MOQ."
          />
        )}
        {searchStatus === "loading" && (
          <div role="status" aria-label="Searching mill files">
            <p className="ui-label">Searching mill files</p>
            <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="skel h-[240px] md:h-[300px]" />
                  <div className="skel mt-4 h-5 w-2/3" />
                  <div className="skel mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        )}
        {searchStatus === "empty" && (
          <SurfaceState
            tone="empty"
            kicker=""
            title="Nothing in the base matches that brief."
            body="Try a construction, a colour, a mill — mesh, polo, navy, Portugal. Digital swatch cards show composition, care, origin and performance when the mill has digitised them."
            action={{
              label: "Restore navy polo brief",
              onClick: () => {
                setBrief(DEMO_BRIEF);
                runSearch(DEMO_BRIEF);
              },
            }}
          />
        )}
        {searchStatus === "error" && (
          <SurfaceState
            tone="error"
            kicker=""
            title="Couldn’t reach the mill index."
            body="Cloth is still at the mills. Retry, or describe the product again."
            action={{ label: "Retry mill index", onClick: retrySearch }}
          />
        )}
        {searchStatus === "ready" && (
          <>
            {millIndexWarning && (
              <div className="banner mb-6" data-tone="error" role="status">
                <span className="banner-bar" />
                <p className="min-w-0 flex-1">
                  <b>Ho Chi Minh Knit Co didn’t map cleanly.</b> Two files from
                  that mill may be incomplete. The rest of the base is here.
                </p>
                <Button size="sm" variant="ghost" onClick={dismissMillWarning}>
                  Dismiss
                </Button>
              </div>
            )}
            <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
                {results.length} qualities from {mills} mills
              </h2>
              <span className="ui-label">
                {rawFromMills
                  ? "As the mills sent it"
                  : millHits
                    ? `Normalised · ${millHits} on the standard`
                    : "Normalised · ranked on the brief"}
              </span>
              <button
                type="button"
                onClick={toggleRaw}
                className={cn(
                  "ml-auto text-[12px] font-medium tracking-[-0.01em]",
                  rawFromMills ? "text-madder" : "text-mute hover:text-ink",
                )}
              >
                {rawFromMills ? "Back to the Fruma standard" : "Show as the mills sent it"}
              </button>
            </div>
            {rawFromMills && (
              <p className="mb-6 text-[13px] leading-relaxed text-madder">
                Mixed weight units, mixed width units, mixed composition strings.
                Nobody can compare these.
              </p>
            )}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
              {results.map((f) => (
                <ClothCard key={f.id} fabric={f} raw={rawFromMills} onDesk={deskIds.includes(f.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ClothCard({
  fabric: f,
  raw,
  onDesk,
}: {
  fabric: Fabric;
  raw: boolean;
  onDesk: boolean;
}) {
  const { toggleDesk, setBrandRoom, previewById } = useFruma();
  const preview = previewById[f.id];
  const showGarment = onDesk && (preview?.status === "running" || preview?.status === "ready");
  return (
    <article className="swatch-in flex flex-col">
      {showGarment ? (
        <div className="stage relative overflow-hidden">
          {preview?.status === "ready" && preview.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.src}
              alt={`${f.name} on the navy polo brief`}
              className="aspect-[3/4] w-full object-cover sm:min-h-[280px] md:min-h-[340px]"
            />
          ) : (
            <div className="flex aspect-[3/4] flex-col justify-end gap-2 bg-canvas p-4 sm:min-h-[280px] md:min-h-[340px]" role="status">
              <div className="skel h-[70%] w-full" />
              <p className="text-[12.5px] text-mute">
                Rendering the brief in {f.name}…
              </p>
            </div>
          )}
          <p className="absolute bottom-2 left-2 bg-paper/90 px-1.5 py-0.5 text-[11px] font-medium text-ink/80">
            Brief in this cloth · not in shops
          </p>
        </div>
      ) : (
        <ClothPlane
          structure={f.structure}
          hex={f.baseHex}
          gsm={formatGsm(f, raw)}
          className="stage h-[240px] sm:h-[280px] md:h-[340px]"
        />
      )}
      <div className="mt-4 flex flex-1 flex-col">
        <p className="ui-label">
          {searchClothKicker(f.source)}
        </p>
        {f.source === "mill-file" ? (
          <p className="mill-name mt-0.5 spec text-[11px] text-mute">
            {f.mill} · {f.country} · mill file
          </p>
        ) : null}
        <h3 className="cloth-name mt-1 text-[24px] md:text-[26px]">{f.name}</h3>
        <p className={cn("mt-1.5 spec text-[12px]", raw ? "text-madder" : "text-ink")}>
          {raw ? f.raw.c : f.composition}
        </p>
        <SwatchFacts fabric={f} raw={raw} />
        {f.feel.length > 0 && (
          <p className="mt-2 text-[12px] text-mute">{f.feel.join(" · ")}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {f.ways.map((w) => (
            <div key={w} className="flex items-center gap-1.5">
              <span
                className="size-4 rounded-[2px] shadow-[inset_0_0_0_1px_rgba(18,20,26,.2)]"
                style={{ background: COLOURS[w] }}
                title={w}
              />
              <span className="text-[11px] text-ink">{w}</span>
            </div>
          ))}
        </div>
        <ClothUsage fabricId={f.id} compact />
        <div className="mt-5 flex gap-3">
          <Button variant={onDesk ? "ok" : "outline"} onClick={() => toggleDesk(f.id)}>
            {onDesk ? "On the desk" : "Select cloth"}
          </Button>
          {onDesk && (
            <Button variant="ghost" onClick={() => setBrandRoom("desk")}>
              Compare on Desk
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
