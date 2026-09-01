"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DESTINATIONS, RULE_CHIP, workingDraft } from "@/lib/fruma/data";
import { buildFrumaRecord, proposeListing, type ProposedListing } from "@/lib/fruma/listings";
import type { Destination, FeedRow } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";
import { PoloPhoto } from "./PoloPhoto";
import { SurfaceState } from "./SurfaceState";
import { useFruma } from "./store";

function plain(html: string) {
  return html.replace(/<\/?b>/g, "");
}

function statusLabel(status: Destination["status"]) {
  if (status === "ok") return "Live";
  if (status === "warn") return "Diff";
  return "Empty";
}

export function FeedsView() {
  const {
    feedDest,
    setFeedDest,
    productComplete,
    productFabric,
    chosenIndex,
    ai,
    parsed,
    productImage,
    setBrandRoom,
  } = useFruma();
  const [mode, setMode] = useState<"product" | "range">("product");
  const dest = DESTINATIONS.find((d) => d.id === feedDest) ?? DESTINATIONS[0];

  const record = useMemo(() => {
    if (!productFabric || chosenIndex < 0) return null;
    const draft = workingDraft(chosenIndex);
    return buildFrumaRecord({
      ai,
      fabric: productFabric,
      sku: draft.sku,
      style: draft.style,
      colour: parsed.colour !== "—" ? parsed.colour : draft.colour,
      parsed,
      image: productImage,
    });
  }, [ai, chosenIndex, parsed, productFabric, productImage]);

  const proposed = record ? proposeListing(record, dest.id) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Listings</h1>
          <p className="page-lede mt-2">
            Map the approved Fruma record onto each destination, and see what
            the PDP could look like. Range in shops is the live Riviera capture
            — not this working style.
          </p>
        </div>
        <div className="listing-seg" role="group" aria-label="Listing source">
          <button
            type="button"
            aria-pressed={mode === "product"}
            onClick={() => setMode("product")}
          >
            This product
          </button>
          <button
            type="button"
            aria-pressed={mode === "range"}
            onClick={() => setMode("range")}
          >
            Range in shops
          </button>
        </div>
      </div>

      {mode === "product" && !productComplete && (
        <div className="banner mb-6" data-tone="weld">
          <span className="banner-bar" />
          <p>
            Finish Product to the Fruma content standard first — listing image
            plus approved copy. Then this room maps those fields onto each
            retailer.{" "}
            <button
              type="button"
              className="font-medium text-ink underline decoration-line underline-offset-2"
              onClick={() => setBrandRoom("product")}
            >
              Open Product
            </button>
          </p>
        </div>
      )}

      {mode === "range" && (
        <p className="mb-6 text-[13px] leading-relaxed text-mute">
          Live captures of the imported Riviera Polo (MPOL1026-BUAA), 25 August
          2026. John Lewis and Mr Porter are empty, not mocked.
        </p>
      )}

      {mode === "product" && !productComplete ? (
        <SurfaceState
          tone="empty"
          kicker="Fruma standard"
          title="Nothing to map yet."
          body="Pick a cloth on the Desk, generate the listing image, and approve the Fruma fields. Listings then translates that record into each destination’s PDP."
          action={{ label: "Open Product", onClick: () => setBrandRoom("product") }}
        />
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav
            className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
            aria-label="Destinations"
          >
            {DESTINATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setFeedDest(d.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 px-2 py-2 text-left text-[13px] tracking-[-0.015em] lg:w-full",
                  d.id === feedDest ? "bg-ink text-paper" : "text-mute hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    mode === "product"
                      ? d.status === "empty"
                        ? "bg-madder"
                        : "bg-ok"
                      : d.status === "ok"
                        ? "bg-ok"
                        : d.status === "warn"
                          ? "bg-weld"
                          : "bg-madder",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{d.label}</span>
                <span className="ml-auto hidden spec text-[10px] opacity-80 lg:inline">
                  {mode === "product"
                    ? d.status === "empty"
                      ? "Potential"
                      : "Mapped"
                    : statusLabel(d.status)}
                </span>
              </button>
            ))}
          </nav>

          <div>
            {mode === "product" && proposed ? (
              <>
                <p className="text-[13.5px] leading-relaxed text-mute">{proposed.banner}</p>
                <Tabs defaultValue="pdp" key={`p-${dest.id}`} className="mt-5">
                  <TabsList variant="line">
                    <TabsTrigger value="pdp">PDP</TabsTrigger>
                    <TabsTrigger value="map">Field map</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pdp">
                    <ProposedPdp listing={proposed} dest={dest} />
                  </TabsContent>
                  <TabsContent value="map">
                    <ProposedMap listing={proposed} />
                  </TabsContent>
                </Tabs>
                <p className="mt-6 text-[12.5px] leading-relaxed text-mute">{proposed.note}</p>
              </>
            ) : (
              <>
                <p className="text-[13.5px] leading-relaxed text-mute">{plain(dest.banner)}</p>
                <Tabs defaultValue="listing" key={`r-${dest.id}`} className="mt-5">
                  <TabsList variant="line">
                    <TabsTrigger value="listing">Listing</TabsTrigger>
                    <TabsTrigger value="map">Field map</TabsTrigger>
                  </TabsList>
                  <TabsContent value="listing">
                    <ListingPreview dest={dest} />
                  </TabsContent>
                  <TabsContent value="map">
                    <FieldMap dest={dest} />
                  </TabsContent>
                </Tabs>
                <p className="mt-6 text-[12.5px] leading-relaxed text-mute">{dest.note}</p>
                {dest.href && (
                  <p className="mt-3 text-[13px]">
                    <a
                      href={dest.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-ink underline decoration-line underline-offset-2"
                    >
                      Open the live URL
                    </a>
                    <span className="text-mute"> — captured 25 August 2026.</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProposedPdp({ listing, dest }: { listing: ProposedListing; dest: Destination }) {
  return (
    <article className="pdp mx-auto max-w-[480px]">
      <div className="relative bg-[#E8E4D8]">
        {listing.image ? (
          <PoloPhoto
            src={listing.image}
            alt={`${dest.short ?? dest.label} proposed PDP`}
            className="aspect-[4/5] w-full"
            label={listing.listed ? "Proposed PDP · not live" : "Not listed · potential card"}
          />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center text-[12px] text-mute">
            Generate the listing image on Product
          </div>
        )}
      </div>
      <div className="space-y-4 px-5 py-5">
        <p className="ui-label">
          {dest.short ?? dest.label}
          {listing.availability ? ` · ${listing.availability}` : ""}
        </p>
        <div>
          <p className="ui-label">Title</p>
          <p className="cloth-name mt-1 text-[22px] leading-snug">{listing.title}</p>
        </div>
        <div>
          <p className="ui-label">Price</p>
          <p className="spec mt-1 text-[18px]">{listing.price}</p>
        </div>
        <div>
          <p className="ui-label">Colour</p>
          <p className="mt-1 text-[15px] font-medium">{listing.colour}</p>
        </div>
        <div>
          <p className="ui-label">Composition</p>
          <p className="mt-1 text-[15px] font-medium">{listing.composition}</p>
        </div>
        <div>
          <p className="ui-label">Structure</p>
          <p className="mt-1 text-[15px] font-medium">{listing.structure}</p>
        </div>
        <div>
          <p className="ui-label">SKU</p>
          <p className="spec mt-1 text-[12px] text-mute">{listing.sku}</p>
        </div>
        <p className="line-clamp-4 text-[13px] leading-relaxed text-mute">{listing.desc}</p>
        <p className="pt-1 text-center text-[12px] text-mute">
          {listing.listed
            ? "Mapped from the Fruma standard — not a live publish"
            : "Destination is empty today — potential card only"}
        </p>
      </div>
    </article>
  );
}

function ProposedMap({ listing }: { listing: ProposedListing }) {
  if (listing.rows.length === 0) {
    return (
      <SurfaceState
        tone="empty"
        kicker=""
        title="No mapping rows for this destination."
        body="Nothing to translate from the Fruma record."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-[150px]">Fruma field</th>
            <th>As this destination would show it</th>
            <th className="w-[240px]">What the mapping does</th>
          </tr>
        </thead>
        <tbody>
          {listing.rows.map((row) => (
            <tr key={row.field} className={cn(row.rule === "blocked" && "bg-madder/6")}>
              <td className="ui-label !text-[12px]">{row.field}</td>
              <td
                className={cn(
                  row.rule === "blocked"
                    ? "text-madder"
                    : row.rule
                      ? "text-[#8A7018]"
                      : "text-ink",
                )}
              >
                {row.rule && row.rule !== "blocked" && (
                  <span className="mr-2 spec text-[10px]">{RULE_CHIP[row.rule]}</span>
                )}
                {plain(row.outgoing)}
                {row.was && (
                  <span className="mt-1 block spec text-[12px] text-mute line-through">
                    {row.was}
                  </span>
                )}
              </td>
              <td className="text-mute">{plain(row.why)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingPreview({ dest }: { dest: Destination }) {
  if (dest.status === "empty") {
    return (
      <SurfaceState
        tone="empty"
        kicker={dest.short ?? dest.label}
        title={
          dest.id === "john-lewis"
            ? "Not on John Lewis."
            : "Not listed on Mr Porter."
        }
        body={
          dest.id === "john-lewis"
            ? "The Sunspel brand page is live but empty. No Riviera polo — and no Sunspel SKU — to preview. Fruma leaves the destination blank rather than inventing a card."
            : "Mr Porter has journal coverage of Sunspel. That is not a product URL for MPOL1026. Editorial is not a listing."
        }
      />
    );
  }

  const title = field(dest, "product title");
  const colour = field(dest, "colour") ?? colourFromDest(dest);
  const price = field(dest, "price") ?? priceFromDest(dest);
  const composition =
    field(dest, "composition") ?? field(dest, "structure") ?? field(dest, "sku");

  return (
    <article className="pdp mx-auto max-w-[480px]">
      <div className="relative bg-[#E8E4D8]">
        {dest.image ? (
          <PoloPhoto
            src={dest.image}
            alt={`${dest.short ?? dest.label} listing of the Riviera polo`}
            className="aspect-[4/5] w-full"
            label={dest.imagesNote ? "Own-site stand-in" : dest.short}
          />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center text-[12px] text-mute">
            No photograph stored
          </div>
        )}
      </div>
      <div className="space-y-4 px-5 py-5">
        <p className="ui-label">
          {dest.short ?? dest.label}
          {dest.availability ? ` · ${dest.availability}` : ""}
        </p>
        {title && <ListingField row={title} label="Title" />}
        {dest.price && !price && <p className="spec text-[18px]">{dest.price}</p>}
        {price && <ListingField row={price} label="Price" />}
        {colour && <ListingField row={colour} label="Colour" />}
        {composition && (
          <ListingField
            row={composition}
            label={composition.field === "sku" ? "SKU" : composition.field}
          />
        )}
        {dest.sku && (
          <p className="spec text-[12px] text-mute">Retailer SKU {dest.sku}</p>
        )}
        {dest.imagesNote && (
          <p className="text-[12px] leading-relaxed text-mute">{dest.imagesNote}</p>
        )}
        <p className="pt-1 text-center text-[12px] text-mute">
          Live capture — not a Fruma publish
        </p>
      </div>
    </article>
  );
}

function colourFromDest(dest: Destination): FeedRow | undefined {
  if (!dest.colour) return undefined;
  return { field: "colour", outgoing: dest.colour, rule: null, why: "" };
}

function priceFromDest(dest: Destination): FeedRow | undefined {
  if (!dest.price) return undefined;
  return { field: "price", outgoing: dest.price, rule: null, why: "" };
}

function ListingField({ row, label }: { row: FeedRow; label: string }) {
  const isTitle = row.field === "product title";
  const isPrice = row.field === "price";
  return (
    <div>
      <p className="ui-label">{label}</p>
      <p
        className={cn(
          "mt-1 leading-snug",
          isTitle && "cloth-name text-[22px]",
          isPrice && "spec text-[18px]",
          !isTitle && !isPrice && "text-[15px] font-medium",
          row.rule === "blocked" && "text-madder",
        )}
      >
        {plain(row.outgoing)}
      </p>
      {row.was && (
        <p className="mt-1 spec text-[12px] text-mute line-through">{row.was}</p>
      )}
      {row.rule && (
        <p className="mt-2 text-[12px] leading-relaxed text-mute">
          <span
            className={cn(
              "mr-1.5 font-medium",
              row.rule === "blocked"
                ? "text-madder"
                : row.rule === "trunc" || row.rule === "gap"
                  ? "text-[#8A7018]"
                  : "text-ink",
            )}
          >
            {RULE_CHIP[row.rule]}
          </span>
          {plain(row.why)}
        </p>
      )}
    </div>
  );
}

function FieldMap({ dest }: { dest: Destination }) {
  if (dest.rows.length === 0) {
    return (
      <SurfaceState
        tone="empty"
        kicker=""
        title="No mapping rows for this destination."
        body="The destination is empty. There is no product to map."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-[170px]">Own-site field</th>
            <th>As the retailer shows it</th>
            <th className="w-[240px]">What actually happened</th>
          </tr>
        </thead>
        <tbody>
          {dest.rows.map((row) => (
            <tr key={row.field} className={cn(row.rule === "blocked" && "bg-madder/6")}>
              <td className="ui-label !text-[12px]">{row.field}</td>
              <td
                className={cn(
                  row.rule === "blocked"
                    ? "text-madder"
                    : row.rule
                      ? "text-[#8A7018]"
                      : "text-ink",
                )}
              >
                {row.rule && row.rule !== "blocked" && (
                  <span className="mr-2 spec text-[10px]">{RULE_CHIP[row.rule]}</span>
                )}
                {plain(row.outgoing)}
                {row.was && (
                  <span className="mt-1 block spec text-[12px] text-mute line-through">
                    {row.was}
                  </span>
                )}
              </td>
              <td className="text-mute">{plain(row.why)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function field(dest: Destination, name: string) {
  return dest.rows.find((r) => r.field === name);
}
