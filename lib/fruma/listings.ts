import { DRAFT_PRODUCT } from "./data";
import type { AiFields, Fabric, FeedRow, ParsedBrief } from "./types";

export type FrumaRecord = {
  title: string;
  desc: string;
  care: string;
  attrs: string;
  cat: string;
  colour: string;
  sku: string;
  style: string;
  composition: string;
  structure: string;
  origin: string;
  certs: string;
  fit: string;
  price: string;
  image: string | null;
  fabricName: string;
};

export type ProposedListing = {
  destId: string;
  listed: boolean;
  banner: string;
  note: string;
  title: string;
  colour: string;
  price: string;
  sku: string;
  composition: string;
  structure: string;
  fit: string;
  desc: string;
  care: string;
  image: string | null;
  availability: string;
  rows: FeedRow[];
};

function row(
  field: string,
  outgoing: string,
  source: string,
  rule: FeedRow["rule"],
  why: string,
): FeedRow {
  return {
    field,
    outgoing,
    was: outgoing === source ? undefined : source,
    rule,
    why,
  };
}

function dropMensAndColour(title: string, colour: string) {
  let t = title.replace(/^Men['’]s\s+/i, "").replace(/^Sunspel\s+/i, "");
  if (colour) {
    t = t.replace(new RegExp(`\\s+in\\s+${colour}\\b`, "i"), "");
    t = t.replace(new RegExp(`[,:—]?\\s*${colour}\\s*$`, "i"), "");
    t = t.replace(new RegExp(`\\s+${colour}\\b`, "i"), "");
  }
  return t.replace(/\s+/g, " ").replace(/[—–-]\s*$/, "").trim();
}

function cottonOnly(composition: string) {
  if (/cotton/i.test(composition)) return "100% Cotton";
  return composition;
}

function farfetchColour(colour: string) {
  if (/navy/i.test(colour)) return "Blue";
  return colour;
}

export function buildFrumaRecord(input: {
  ai: AiFields;
  fabric: Fabric;
  sku: string;
  style: string;
  colour: string;
  parsed: ParsedBrief;
  image: string | null;
}): FrumaRecord {
  const colour =
    input.colour && input.colour !== "—"
      ? input.colour
      : input.parsed.colour !== "—"
        ? input.parsed.colour
        : DRAFT_PRODUCT.colour;
  return {
    title: input.ai.title,
    desc: input.ai.desc,
    care: input.fabric.care || input.ai.care,
    attrs: input.ai.attrs,
    cat: input.ai.cat,
    colour,
    sku: input.sku,
    style: input.style,
    composition: input.fabric.composition,
    structure: input.fabric.structure,
    origin: `${input.fabric.mill} · ${input.fabric.country}`,
    certs: input.fabric.certs.length
      ? input.fabric.certs.join(" · ")
      : "None listed — not GOTS",
    fit: DRAFT_PRODUCT.fit,
    price: DRAFT_PRODUCT.price,
    image: input.image,
    fabricName: input.fabric.name,
  };
}

export function proposeListing(record: FrumaRecord, destId: string): ProposedListing {
  const base = {
    destId,
    image: record.image,
    desc: record.desc,
    care: record.care,
  };

  switch (destId) {
    case "own":
      return {
        ...base,
        listed: true,
        banner:
          "Source of truth. Fruma fields pass through to sunspel.com unchanged.",
        note: "Own-site PDP uses the approved record. Not live until you publish.",
        title: record.title,
        colour: record.colour,
        price: record.price,
        sku: record.sku,
        composition: record.composition,
        structure: `${record.fabricName} · ${record.structure}`,
        fit: record.fit,
        availability: "draft · not live",
        rows: [
          row("product title", record.title, record.title, null, "Own-site title = Fruma title."),
          row("colour", record.colour, record.colour, null, "Colourway as designed."),
          row("price", record.price, record.price, null, "Proposed RRP on this working SKU."),
          row("sku", record.sku, record.sku, null, "Working style plus colour code, hyphen kept."),
          row("fit", record.fit, record.fit, null, "From the design brief."),
          row("composition", record.composition, record.composition, null, "Locked from the mill file."),
          row(
            "structure",
            `${record.fabricName} · ${record.structure}`,
            record.structure,
            null,
            "Locked from the mill file — not rewritten as piqué.",
          ),
          row("care", record.care, record.care, null, "Mill care. Legal labelling, not marketing copy."),
          row("origin", record.origin, record.origin, null, "Country of manufacture from the mill file."),
          row("certs", record.certs, record.certs, null, "Empty on Q75 is correct — traceable Supima, not GOTS."),
          row("category", record.cat, record.cat, null, "Fruma category path."),
        ],
      };

    case "liberty": {
      const title = `Sunspel ${dropMensAndColour(record.title, record.colour)}`;
      const composition = cottonOnly(record.composition);
      const price = "From £135.00";
      return {
        ...base,
        listed: true,
        banner:
          "Liberty shortens the title, uses a from-price, lists Regular, and strips fibre to 100% Cotton.",
        note: "Mapped from how Liberty treats the Riviera today. Internal style ID is not assigned until they list it.",
        title,
        colour: `${record.colour} (sibling colourways on one PDP)`,
        price,
        sku: "Liberty style ID — not assigned",
        composition,
        structure: record.structure,
        fit: "Regular",
        availability: "proposed mapping",
        rows: [
          row(
            "product title",
            title,
            record.title,
            "trunc",
            "Drops Men's and the colour; prepends Sunspel. Live Riviera title also misspelt Rivieria.",
          ),
          row("price", price, record.price, "gap", "Liberty shows a from-price rather than the RRP."),
          row("fit", "Regular", record.fit, "map", "Liberty lists Regular. The Fruma record is Slim."),
          row(
            "composition",
            composition,
            record.composition,
            composition === record.composition ? null : "strip",
            "Drops Supima / extra-long staple / traceability when the mill file is cotton.",
          ),
          row(
            "sku",
            "Liberty style ID — not assigned",
            record.sku,
            "map",
            "They remap to an internal style / barcode. Nothing invented for an unpublished SKU.",
          ),
        ],
      };
    }

    case "end": {
      const short = dropMensAndColour(record.title, record.colour)
        .replace(/shirt/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      const title = `Sunspel ${short}`;
      const composition = "100% Cotton / 3 Button Placket / Ribbed Trims";
      return {
        ...base,
        listed: true,
        banner:
          "END. truncates the title and files cotton + trims — mesh, Supima and the mill story drop out.",
        note: "END. kept the Sunspel SKU on the Riviera URL. Proposed card keeps this working SKU.",
        title,
        colour: record.colour,
        price: record.price,
        sku: record.sku,
        composition,
        structure: record.structure,
        fit: record.fit,
        availability: "proposed mapping",
        rows: [
          row("product title", title, record.title, "trunc", "No Men's, no Shirt; colour only as a subtitle."),
          row("price", record.price, record.price, null, "RRP shown. END. often discounts later — not invented here."),
          row(
            "composition",
            composition,
            record.composition,
            "strip",
            "Drops mesh, Supima, Q75 and origin. Live copy also had a SuSupima typo.",
          ),
          row("sku", record.sku, record.sku, null, "END. preserved MPOL1026-BUAA in the Riviera URL."),
        ],
      };
    }

    case "selfridges": {
      const isMesh = /mesh/i.test(record.structure) || /mesh/i.test(record.fabricName);
      const title = isMesh
        ? `SUNSPEL ${dropMensAndColour(record.title, record.colour).replace(/mesh/gi, "cotton-piqué")}`
        : `SUNSPEL ${dropMensAndColour(record.title, record.colour)}`;
      const structure = isMesh ? "cotton-piqué" : record.structure;
      const colour = record.colour.toUpperCase();
      return {
        ...base,
        listed: true,
        banner: isMesh
          ? "The useful error: Selfridges filed Q75 mesh as cotton-piqué. This is what their PDP would likely say."
          : "Selfridges uppercases the brand, remaps the SKU, and files colour as ALL CAPS.",
        note: "Not a live Selfridges URL. Mapped from how they treated the Riviera on 25 August 2026.",
        title,
        colour,
        price: `${record.price}.00`,
        sku: "Selfridges reference — not assigned",
        composition: cottonOnly(record.composition),
        structure,
        fit: record.fit,
        availability: "proposed mapping",
        rows: [
          row(
            "product title",
            title,
            record.title,
            isMesh ? "gap" : "fmt",
            isMesh
              ? "Mesh sold as cotton-piqué. ALL-CAPS brand. The construction they rejected is the one they filed."
              : "ALL-CAPS brand + shortened name.",
          ),
          row("colour", colour, record.colour, "fmt", "Selfridges files colourways in ALL CAPS."),
          row(
            "structure",
            structure,
            record.structure,
            isMesh ? "map" : null,
            isMesh
              ? "Fabric mapped from mesh to piqué — the listing error Fruma is for."
              : "Structure passes through because this cloth is not mesh.",
          ),
          row(
            "sku",
            "Selfridges reference — not assigned",
            record.sku,
            "map",
            "They remap to an R-number. Nothing invented for an unpublished SKU.",
          ),
          row(
            "composition",
            cottonOnly(record.composition),
            record.composition,
            "strip",
            "Bullets say 100% cotton — drop Supima, traceability, mill quality name.",
          ),
        ],
      };
    }

    case "farfetch": {
      const title = `Sunspel ${dropMensAndColour(record.title, record.colour)}`;
      const colour = farfetchColour(record.colour);
      const sku = record.sku.replace(/-/g, "");
      const composition = /cotton/i.test(record.composition)
        ? "Cotton 100%"
        : record.composition;
      return {
        ...base,
        listed: true,
        banner:
          "Farfetch drops Men's and the colour from the H1, files Navy as Blue, and strips the hyphen from the SKU.",
        note: "Mapped from the live Riviera PDP. Farfetch CDN 429'd in capture — proposed card uses the generated packshot.",
        title,
        colour,
        price: record.price,
        sku,
        composition,
        structure: record.structure,
        fit: record.fit,
        availability: "proposed mapping",
        rows: [
          row("product title", title, record.title, "trunc", "Drops Men's and the colour from the H1."),
          row(
            "colour",
            colour,
            record.colour,
            colour === record.colour ? null : "map",
            colour === record.colour
              ? "Colourway name kept."
              : "Page title uses Blue; body copy would say navy blue.",
          ),
          row("sku", sku, record.sku, "fmt", "Hyphen dropped from the brand style ID."),
          row(
            "composition",
            composition,
            record.composition,
            composition === record.composition ? null : "strip",
            "Cotton 100% — drops Supima, mesh and Made in Portugal.",
          ),
        ],
      };
    }

    case "harrods": {
      const fibre = /supima/i.test(record.composition) ? "Supima Cotton " : "";
      const core = dropMensAndColour(record.title, record.colour);
      const title = `Sunspel ${fibre}${core}`.replace(/\s+/g, " ").trim();
      return {
        ...base,
        listed: true,
        banner:
          "Harrods inserts the fibre in the title and lists Regular against a Slim record.",
        note: "UK Navy Riviera PDP was out of stock when captured. This card is a mapping, not a live URL.",
        title,
        colour: record.colour,
        price: `${record.price}.00`,
        sku: "Harrods SKU — not assigned",
        composition: record.composition,
        structure: record.structure,
        fit: "Regular",
        availability: "proposed mapping",
        rows: [
          row(
            "product title",
            title,
            record.title,
            fibre ? "map" : "trunc",
            fibre
              ? "Inserts the fibre; H1 often omits the colour."
              : "Shortened title; colour stays on the variant.",
          ),
          row("fit", "Regular", record.fit, "map", "Harrods lists Regular. Own site / Fruma say Slim."),
          row(
            "sku",
            "Harrods SKU — not assigned",
            record.sku,
            "map",
            "They remap to a numeric SKU. Nothing invented for an unpublished style.",
          ),
        ],
      };
    }

    case "gravitypope": {
      const title = dropMensAndColour(record.title, record.colour);
      const price = "CA$230.00";
      const sku = "internal SKU — not assigned";
      return {
        ...base,
        listed: true,
        banner:
          "Canadian specialist: CAD price, internal SKU remap, colour as a variant not in the title.",
        note: "Mapped from gravitypope’s Riviera PDP (CA$230, SKU 11E3Q50). No fake internal code for this draft.",
        title,
        colour: record.colour,
        price,
        sku,
        composition: record.composition,
        structure: record.structure,
        fit: record.fit,
        availability: "proposed mapping",
        rows: [
          row("product title", title, record.title, "trunc", "Drops Men's and the colour (colour is a variant option)."),
          row("price", price, record.price, "fmt", "Canadian specialist; currency CAD not GBP."),
          row(
            "sku",
            sku,
            record.sku,
            "map",
            "They remap to an internal SKU. Style ID on page would follow MPOL####-NVY.",
          ),
        ],
      };
    }

    case "john-lewis":
      return {
        ...base,
        listed: false,
        banner:
          "Not listed. The John Lewis Sunspel brand page is empty — this is only what a card could look like if they took the style.",
        note: "Do not treat this as a live John Lewis listing. No SKU, no URL.",
        title: record.title,
        colour: record.colour,
        price: record.price,
        sku: record.sku,
        composition: record.composition,
        structure: `${record.fabricName} · ${record.structure}`,
        fit: record.fit,
        availability: "not listed",
        rows: [
          row(
            "listing",
            "Not on John Lewis",
            record.title,
            "blocked",
            "Empty brand page today. The PDP below is a potential card, not a publish.",
          ),
        ],
      };

    case "mr-porter":
      return {
        ...base,
        listed: false,
        banner:
          "Not listed — journal only. Editorial coverage is not a product URL. This is a potential card if they took the style.",
        note: "Do not mock a live Mr Porter listing from the journal URL.",
        title: record.title,
        colour: record.colour,
        price: record.price,
        sku: record.sku,
        composition: record.composition,
        structure: `${record.fabricName} · ${record.structure}`,
        fit: record.fit,
        availability: "not listed",
        rows: [
          row(
            "listing",
            "Journal only — no live product URL",
            record.title,
            "blocked",
            "Editorial is not a PDP. Nothing to map until they list the SKU.",
          ),
        ],
      };

    default:
      return {
        ...base,
        listed: false,
        banner: "No mapping rules for this destination.",
        note: "",
        title: record.title,
        colour: record.colour,
        price: record.price,
        sku: record.sku,
        composition: record.composition,
        structure: record.structure,
        fit: record.fit,
        availability: "unknown",
        rows: [],
      };
  }
}
