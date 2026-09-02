"use client";

import { Button } from "@/components/ui/button";
import {
  COLOURS,
  formatGsm,
} from "@/lib/fruma/cloth";
import { workingDraft } from "@/lib/fruma/data";
import type { Fabric, SwatchStage } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";
import { ClothPlane } from "./ClothPlane";
import { PastStyleSelect } from "./PastStyleSelect";
import { PoloPhoto } from "./PoloPhoto";
import { SurfaceState } from "./SurfaceState";
import { SwatchFacts } from "./SwatchFacts";
import { useFruma } from "./store";

export function DeskView() {
  const {
    desk,
    deskIds,
    swatchStage,
    orderSwatches,
    deskError,
    retryDesk,
    setBrandRoom,
    rawFromMills,
    chosenId,
  } = useFruma();

  if (deskError) {
    return (
      <SurfaceState
        tone="error"
        kicker=""
        title="A mill file dropped while laying this out."
        body="Famalicão Knit Works withdrew a quality mid-compare. The rest of the desk is intact — retry the layout."
        action={{ label: "Retry layout", onClick: retryDesk }}
      />
    );
  }

  if (deskIds.length === 0) {
    return (
      <SurfaceState
        tone="empty"
        kicker=""
        title="The desk is clear."
        body="Select two or three mill qualities on Design. Each one becomes a product option — generated image, mill facts, and where that cloth already sits in the range. Then pick one for Product."
        action={{ label: "Back to Design", onClick: () => setBrandRoom("design") }}
      />
    );
  }

  const canOrder = desk.some((f) => swatchStage[f.id] === "desk");

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Desk</h1>
          <p className="mt-2 max-w-[54ch] text-[14.5px] leading-relaxed text-mute">
            {desk.length} product option{desk.length === 1 ? "" : "s"}. Compare
            the generated garments. Digital is not a hanger — requesting a
            hanger does not invent a courier.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canOrder} variant="outline" onClick={orderSwatches}>
            {canOrder ? "Request hanger" : "Hanger requested"}
          </Button>
        </div>
      </div>

      {!chosenId && (
        <div className="banner mb-6">
          <span className="banner-bar" />
          <p>
            None of these is the working style yet. Pick one to send through to
            Product for the listing image and Fruma copy.
          </p>
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-8",
          desk.length === 2 && "md:grid-cols-2",
          desk.length >= 3 && "md:grid-cols-3",
        )}
      >
        {desk.map((f, i) => (
          <DeskOption
            key={f.id}
            fabric={f}
            index={i}
            stage={swatchStage[f.id] ?? "desk"}
            raw={rawFromMills}
            chosen={chosenId === f.id}
          />
        ))}
      </div>
    </div>
  );
}

function DeskOption({
  fabric: f,
  index,
  stage,
  raw,
  chosen,
}: {
  fabric: Fabric;
  index: number;
  stage: SwatchStage;
  raw: boolean;
  chosen: boolean;
}) {
  const { pickProduct, previewById } = useFruma();
  const draft = workingDraft(index);
  const preview = previewById[f.id];
  const generating = preview?.status === "running";
  const src = preview?.status === "ready" ? preview.src : null;

  return (
    <article className="desk-option flex min-w-0 flex-col" data-chosen={chosen}>
      <figure className="stage relative overflow-hidden">
        {generating ? (
          <div
            className="flex aspect-[3/4] flex-col justify-end gap-2 bg-canvas p-4"
            role="status"
          >
            <div className="skel h-[70%] w-full" />
            <p className="text-[12.5px] text-mute">Rendering the brief in {f.name}…</p>
          </div>
        ) : src ? (
          <PoloPhoto
            src={src}
            alt={`${draft.style} in ${f.name}`}
            className="aspect-[3/4] w-full"
            label="Brief in this cloth · not in shops"
          />
        ) : (
          <ClothPlane
            structure={f.structure}
            hex={f.baseHex}
            gsm={formatGsm(f, raw)}
            className="aspect-[3/4] w-full"
          />
        )}
      </figure>

      <p className="ui-label mt-4">
        Option {index + 1} · {draft.style} · not in shops
      </p>
      <p className="ui-label mt-1">
        {f.mill} · {f.country}
      </p>
      <h2 className="cloth-name mt-1 text-[22px]">{f.name}</h2>
      <p className={cn("mt-1 spec text-[12px]", raw ? "text-madder" : "text-ink")}>
        {raw ? f.raw.c : f.composition}
      </p>

      <SwatchFacts fabric={f} raw={raw} />
      {f.feel.length > 0 && (
        <p className="mt-2 text-[12px] text-mute">{f.feel.join(" · ")}</p>
      )}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {f.ways.map((w) => (
          <span key={w} className="flex items-center gap-1">
            <span
              className="size-3.5 rounded-[2px] shadow-[inset_0_0_0_1px_rgba(18,20,26,.2)]"
              style={{ background: COLOURS[w] }}
            />
            <span className="text-[11px]">{w}</span>
          </span>
        ))}
      </div>

      {stage === "ordered" ? (
        <p className="mt-3 text-[12px] text-mute">Hanger requested. Digital is not a hanger.</p>
      ) : null}
      <PastStyleSelect key={f.id} fabricId={f.id} fabricName={f.name} />
      <DeskActions id={f.id} chosen={chosen} onPick={() => pickProduct(f.id)} />
    </article>
  );
}

function DeskActions({
  id,
  chosen,
  onPick,
}: {
  id: string;
  chosen: boolean;
  onPick: () => void;
}) {
  const { toggleDesk, setBrandRoom } = useFruma();
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {chosen ? (
        <Button variant="ok" onClick={() => setBrandRoom("product")}>
          Chosen · open Product
        </Button>
      ) : (
        <Button onClick={onPick}>Take this to Product</Button>
      )}
      <Button variant="ghost" onClick={() => toggleDesk(id)}>
        Remove
      </Button>
    </div>
  );
}
