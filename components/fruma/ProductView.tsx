"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DRAFT_PRODUCT, workingDraft } from "@/lib/fruma/data";
import { formatCare, formatCerts, formatFibreOrigin, formatFinish, formatGsm, formatPerformance } from "@/lib/fruma/cloth";
import { cn } from "@/lib/utils";
import { PastStyleSelect } from "./PastStyleSelect";
import { PoloPhoto } from "./PoloPhoto";
import { SuggestField, LearnNote } from "./SuggestField";
import { SurfaceState } from "./SurfaceState";
import { useFruma } from "./store";

export function ProductView() {
  const {
    designImage,
    productImage,
    productImageStatus,
    generateProductImage,
    productFabric: fabric,
    chosenIndex,
    aiStatus,
    runAI,
    approveAI,
    learn,
    setBrandRoom,
    parsed,
    seedProduct,
    imageRecipe,
    visualRead,
    productComplete,
  } = useFruma();

  useEffect(() => {
    seedProduct();
  }, [seedProduct]);

  if (!fabric || chosenIndex < 0) {
    return (
      <SurfaceState
        tone="empty"
        kicker="Product"
        title="Pick a cloth on the Desk first."
        body="Design can put up to three mill qualities on the desk — each with its own generated garment. Analyse them there, then send one through. That working style is what Product finishes: listing image, locked mill facts, and Fruma copy."
        action={{ label: "Open Desk", onClick: () => setBrandRoom("desk") }}
      />
    );
  }

  const draft = workingDraft(chosenIndex);
  const colour = parsed.colour !== "—" ? parsed.colour : DRAFT_PRODUCT.colour;
  const heroSrc = productImage;
  const imageReady = Boolean(heroSrc) && productImageStatus !== "running";
  const generating = productImageStatus === "running";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ui-label">
            {DRAFT_PRODUCT.brand} · demo account · not in shops
          </p>
          <h1 className="cloth-name mt-1 text-[30px] md:text-[36px]">
            {DRAFT_PRODUCT.name}
          </h1>
          <p className="mt-2 text-[13px] text-mute">
            Working style <span className="spec text-[12px] text-ink">{draft.style}</span>
            <span className="mx-2">·</span>
            {fabric.name} · {colour}
          </p>
        </div>
        <span className={cn("text-[12px] font-medium", productComplete ? "text-ok" : "text-weld")}>
          {productComplete ? "Fruma standard · approved" : "Draft · not listed"}
        </span>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div>
          <div className="sticky top-[60px]">
            <div className="grid gap-3 sm:grid-cols-2">
              <figure className="stage">
                {designImage ? (
                  <PoloPhoto
                    src={designImage}
                    alt="Design reference"
                    className="aspect-[3/4] w-full"
                    label="Your design"
                  />
                ) : (
                  <div className="flex aspect-[3/4] flex-col justify-between bg-canvas p-4">
                    <p className="ui-label">Design reference</p>
                    <p className="text-[13px] leading-relaxed text-mute">
                      Attach the design on Search. Fruma uses it with the brief
                      and the mill file when it builds the listing image.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setBrandRoom("design")}>
                      Add a sketch
                    </Button>
                  </div>
                )}
              </figure>
              <figure className="stage">
                {generating ? (
                  <div className="flex aspect-[3/4] flex-col justify-center gap-2 bg-canvas p-4" role="status">
                    <div className="skel h-[70%] w-full" />
                    <p className="text-[12.5px] text-mute">
                      Optimising a listing image from the design, {fabric.name}, and the product record.
                    </p>
                  </div>
                ) : imageReady && heroSrc ? (
                  <PoloPhoto
                    src={heroSrc}
                    alt={`${DRAFT_PRODUCT.name} generated packshot`}
                    className="aspect-[3/4] w-full"
                    label="Listing image · generated"
                  />
                ) : (
                  <div className="flex aspect-[3/4] flex-col justify-between bg-canvas p-4">
                    <p className="ui-label">Listing image</p>
                    <p className="text-[13px] leading-relaxed text-mute">
                      Not in shops. Generate a content-optimised packshot from
                      the design, the signed cloth, and the product data.
                    </p>
                    <Button size="sm" onClick={generateProductImage}>
                      Generate listing image
                    </Button>
                  </div>
                )}
              </figure>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mute">
              Content-optimised from the design
              {visualRead.source !== "none" ? ` (${visualRead.construction})` : ""}
              , {fabric.name}, and the Fruma fields. Selfridges listed Q75 as
              cotton-piqué — this shot is built from the record so that doesn’t
              happen here.
            </p>
            {imageRecipe.length > 0 && (
              <ul className="mt-3 border-t border-line pt-3">
                {imageRecipe.map((row) => (
                  <li key={row} className="py-1 text-[12.5px] leading-relaxed text-mute">
                    {row}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={generating}
                onClick={generateProductImage}
              >
                {generating
                  ? "Generating…"
                  : imageReady
                    ? "Regenerate listing image"
                    : "Generate listing image"}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <PastStyleSelect key={fabric.id} fabricId={fabric.id} fabricName={fabric.name} />

          <Group
            title="Inherited from the fabric"
            note="Locked · mill file"
            tone="ok"
            rows={[
              ["Composition", fabric.composition, "Fabric"],
              ["Structure", fabric.structure, "Fabric"],
              ["Weight", formatGsm(fabric), "Fabric"],
              ["Finish", formatFinish(fabric), "Fabric"],
              ["Care", formatCare(fabric), "Fabric"],
              ["Fibre origin", formatFibreOrigin(fabric), "Fabric"],
              ["Performance", formatPerformance(fabric), "Fabric"],
              ["Certifications", formatCerts(fabric), "Fabric"],
              ["Origin", `${fabric.mill} · ${fabric.country}`, "Fabric"],
            ]}
          />
          <Group
            title="From the design"
            note="Brief + sketch"
            tone="ink"
            rows={[
              ["Garment", "Polo shirt, short sleeve", "Design"],
              [
                "Fit",
                "Slim · structured collar that holds under a jacket",
                "Design",
              ],
              ["Colourway", `${colour} — working ${draft.sku}`, "Design"],
              ["Trims", "Chest patch pocket · spread collar · button placket", "Design"],
              ["Season", DRAFT_PRODUCT.season, "Design"],
            ]}
          />

          <section className="mt-8">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-[13px] font-semibold tracking-[-0.02em]">
                Enriched by Fruma
              </h2>
              <span
                className={cn(
                  "ml-auto text-[12px]",
                  aiStatus === "approved" ? "text-ok" : "text-mute",
                )}
              >
                {aiStatus === "approved" ? "Approved" : "Suggested — pick or rewrite"}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-mute">
              Listing wording. Fibre, care, origin and certs stay locked from the mill file.
            </p>
            <SuggestField field="title" />
            <SuggestField field="desc" multiline />
            <SuggestField field="care" />
            <SuggestField field="attrs" multiline />
            <SuggestField field="cat" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="min-w-[180px] flex-1">
                <LearnNote learn={learn} />
              </div>
              <Button disabled={aiStatus === "running"} onClick={() => void runAI()}>
                {aiStatus === "running" ? "Redrafting…" : "Redraft"}
              </Button>
              <Button
                variant={aiStatus === "approved" ? "ok" : "outline"}
                disabled={aiStatus !== "draft"}
                onClick={approveAI}
              >
                {aiStatus === "approved" ? "Approved" : "Approve"}
              </Button>
            </div>
          </section>

          {productComplete ? (
            <div className="mt-8 border-t border-line pt-5">
              <p className="text-[13px] leading-relaxed text-mute">
                This record meets the Fruma content standard. Listings will map
                it onto each destination and show what the PDP could look like.
              </p>
              <Button className="mt-3" onClick={() => setBrandRoom("feeds")}>
                Map to listings
              </Button>
            </div>
          ) : (
            <p className="mt-8 text-[12.5px] leading-relaxed text-mute">
              Approve the Fruma fields
              {imageReady ? "" : " and generate the listing image"} to unlock
              destination mapping.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({
  title,
  note,
  tone,
  rows,
}: {
  title: string;
  note: string;
  tone: "ok" | "ink";
  rows: [string, string, string][];
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className={cn("text-[13px] font-semibold tracking-[-0.02em]", tone === "ok" && "text-ok")}>
          {title}
        </h2>
        <span className="ml-auto text-[12px] text-mute">{note}</span>
      </div>
      {rows.map(([k, v, src]) => (
        <Attr key={k} k={k} v={v} src={src} />
      ))}
    </section>
  );
}

function Attr({ k, v, src }: { k: string; v: string; src: string }) {
  const srcClass =
    src === "Fabric"
      ? "bg-ok/10 text-ok"
      : src === "Design"
        ? "bg-ink/6 text-ink"
        : "bg-weld/15 text-[#6b5410]";
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-line py-2.5">
      <span className="w-[132px] shrink-0 text-[12px] text-mute">{k}</span>
      <span className="min-w-0 flex-1 text-[13.5px]">{v}</span>
      <span className={cn("src-pill", srcClass)}>{src}</span>
    </div>
  );
}
