import type {
  ClothHistoryItem,
  Colourway,
  Destination,
  Fabric,
  ProductDest,
  Supplier,
  ViewId,
} from "./types";

export const DEMO_BRIEF =
  "Polo for summer, structured collar, navy. Something that holds under a jacket.";

export const HERO_PRODUCT = {
  brand: "Sunspel",
  name: "Riviera Polo Shirt",
  colour: "Navy",
  sku: "MPOL1026-BUAA",
  style: "MPOL1026",
  price: "£140",
  fit: "Slim",
  madeIn: "Portugal",
  composition: "100% extra-long staple Supima cotton, traceable to a single farm in California",
  structure: "In-house Q75 cotton warp-knit mesh (not piqué)",
  care: "Gentle wash at 30°C with similar colours. Do not tumble dry. Dry cleanable.",
} as const;

/** New style on Product — not listed anywhere yet. */
export const DRAFT_PRODUCT = {
  brand: "Sunspel",
  name: "Navy polo — SS27 working",
  colour: "Navy",
  sku: "MPOL2701-NVY",
  style: "MPOL2701",
  season: "SS27",
  price: "£140",
  fit: "Slim",
  image: "/products/draft-navy-q75-polo.png",
  sketch: "/design/polo-sketch.png",
} as const;

/** One working SKU per cloth on the desk. Index 0 is MPOL2701. */
export function workingDraft(index: number) {
  const n = 2701 + index;
  return {
    name: DRAFT_PRODUCT.name,
    colour: DRAFT_PRODUCT.colour,
    season: DRAFT_PRODUCT.season,
    price: DRAFT_PRODUCT.price,
    fit: DRAFT_PRODUCT.fit,
    style: `MPOL${n}`,
    sku: `MPOL${n}-NVY`,
  };
}

export function usageHeadline(item: ClothHistoryItem) {
  const feel =
    item.live && item.where
      ? ` · feel at ${item.where}`
      : item.live
        ? " · in shops"
        : ` · ${item.tag}`;
  return `${item.name} · ${item.meta}${feel}`;
}

export const RANGE_FILE = "Sunspel_range_export.csv";

export const FABRICS: Fabric[] = [
  {
    id: "q75-mesh-pt",
    name: "Q75 cotton mesh",
    mill: "Knitted in Portugal",
    country: "PORTUGAL",
    structure: "mesh",
    gsm: 0,
    widthCm: 0,
    composition: "100% extra-long staple Supima cotton",
    moqM: 0,
    leadWeeks: 0,
    priceGbp: 0,
    certs: [],
    feel: ["holds a collar", "airy", "not dense piqué"],
    ways: ["Navy", "Charcoal", "White", "Grey Melange", "Black"],
    baseHex: "#27364F",
    finish: "unpublished",
    care: "Gentle wash at 30°C with similar colours. Do not tumble dry. Dry cleanable.",
    fibreOrigin: "California Supima · knitted Portugal",
    performance: {
      stretch: "unpublished",
      shrinkage: "unpublished",
      colourfastness: "unpublished",
      pilling: "unpublished",
    },
    raw: {
      g: "GSM UNPUBLISHED",
      w: "—",
      c: "100% SUPIMA COTTON",
      m: "IN-HOUSE Q75 · PORTUGAL",
    },
  },
  {
    id: "q82-jersey-le",
    name: "Q82 two-fold jersey",
    mill: "Handmade in Long Eaton",
    country: "ENGLAND",
    structure: "single jersey",
    gsm: 0,
    widthCm: 0,
    composition: "100% extra-long staple two-fold Supima cotton",
    moqM: 0,
    leadWeeks: 0,
    priceGbp: 0,
    certs: [],
    feel: ["classic tee", "england"],
    ways: ["White", "Navy", "Black"],
    baseHex: "#EFEDE7",
    finish: "unpublished",
    care: "Cool wash 30°C. Do not tumble dry.",
    fibreOrigin: "California Supima · knitted England",
    performance: {
      stretch: "unpublished",
      shrinkage: "unpublished",
      colourfastness: "unpublished",
      pilling: "unpublished",
    },
    raw: {
      g: "GSM UNPUBLISHED",
      w: "—",
      c: "TWO-FOLD SUPIMA",
      m: "Q82 · LONG EATON",
    },
  },
  {
    id: "k4471t",
    name: "Piqué 278",
    mill: "Malhas Guimarães SA",
    country: "PORTUGAL",
    structure: "pique",
    gsm: 278,
    widthCm: 165,
    composition: "70% organic cotton · 30% cotton",
    moqM: 200,
    leadWeeks: 2,
    priceGbp: 11.03,
    certs: ["GOTS 2027", "OEKO-TEX"],
    feel: ["holds a collar", "structured"],
    ways: ["Navy", "Ecru", "Forest", "Black", "Sand"],
    baseHex: "#27364F",
    finish: "Compact · piece dye",
    care: "Wash 30°C. Do not tumble dry.",
    fibreOrigin: "Portugal",
    performance: {
      stretch: "low",
      shrinkage: "<5% after compact",
      colourfastness: "4–5 (OEKO-TEX)",
      pilling: "4",
    },
    raw: { g: "285 GSM", w: "42 INCH", c: "COTTON /SPN", m: "MIN 200MTR" },
  },
  {
    id: "fam-p261",
    name: "Piqué 261",
    mill: "Famalicão Knit Works",
    country: "PORTUGAL",
    structure: "pique",
    gsm: 261,
    widthCm: 150,
    composition: "70% cotton · 30% polyester",
    moqM: 500,
    leadWeeks: 4,
    priceGbp: 7.9,
    certs: ["OEKO-TEX"],
    feel: ["holds a collar", "athleisure"],
    ways: ["Cobalt", "Ecru", "White", "Sky"],
    baseHex: "#2D4C86",
    finish: "Piece dye",
    care: "Wash 40°C. Do not tumble dry.",
    fibreOrigin: "Portugal",
    performance: {
      stretch: "moderate (PES blend)",
      shrinkage: "on file with mill",
      colourfastness: "4 (OEKO-TEX)",
      pilling: "3–4",
    },
    raw: { g: "7.7 oz/yd²", w: '59"', c: "CO70/PES30", m: "500 mts" },
  },
  {
    id: "bar-i232",
    name: "Interlock 232",
    mill: "Barcelos Têxtil SA",
    country: "PORTUGAL",
    structure: "interlock",
    gsm: 232,
    widthCm: 160,
    composition: "92% modal · 8% elastane",
    moqM: 300,
    leadWeeks: 3,
    priceGbp: 9.4,
    certs: ["OEKO-TEX"],
    feel: ["drapes well", "base layer"],
    ways: ["Charcoal", "Stone", "Black", "Sage"],
    baseHex: "#3A3D42",
    raw: { g: "232", w: "160", c: "MODAL 92 SPX 8", m: "300M" },
  },
  {
    id: "vda-r268",
    name: "Rib 1x1 268",
    mill: "Têxteis Vale do Ave Lda",
    country: "PORTUGAL",
    structure: "rib 1x1",
    gsm: 268,
    widthCm: 160,
    composition: "95% organic cotton · 5% elastane",
    moqM: 150,
    leadWeeks: 2,
    priceGbp: 10.2,
    certs: ["GOTS 2028", "OEKO-TEX"],
    feel: ["structured", "holds a collar"],
    ways: ["Burgundy", "Black", "Ecru", "Olive", "Navy", "Sand"],
    baseHex: "#5E2733",
    finish: "Bio wash",
    care: "Gentle wash 30°C. Reshape while damp.",
    fibreOrigin: "Portugal · organic cotton",
    performance: {
      stretch: "5% elastane recovery",
      shrinkage: "<4%",
      colourfastness: "4–5",
      pilling: "4",
    },
    raw: { g: "268 g", w: "63 in", c: "ORG.CTN/EL", m: "min 150" },
  },
  {
    id: "viz-w285",
    name: "Waffle 285",
    mill: "Vizela Malhas & Acabamentos",
    country: "PORTUGAL",
    structure: "waffle",
    gsm: 285,
    widthCm: 175,
    composition: "100% organic cotton",
    moqM: 300,
    leadWeeks: 3,
    priceGbp: 12.8,
    certs: ["GOTS 2027"],
    feel: ["winter weight", "structured"],
    ways: ["Sage", "Ecru", "Charcoal"],
    baseHex: "#93A08A",
    finish: "Peach · compact",
    care: "Wash 30°C. Do not tumble dry.",
    fibreOrigin: "Portugal · organic cotton",
    performance: {
      stretch: "low",
      shrinkage: "<5%",
      colourfastness: "4",
      pilling: "3–4",
    },
    raw: { g: "8.4 oz", w: "69 INCH", c: "100 ORG CO", m: "300" },
  },
  {
    id: "vda-sj185",
    name: "Single Jersey 185",
    mill: "Têxteis Vale do Ave Lda",
    country: "PORTUGAL",
    structure: "single jersey",
    gsm: 185,
    widthCm: 180,
    composition: "100% organic cotton",
    moqM: 200,
    leadWeeks: 1,
    priceGbp: 6.78,
    certs: ["GOTS 2027", "OEKO-TEX"],
    feel: ["good for print", "summer weight"],
    ways: ["White", "Black", "Navy", "Sky", "Sand", "Olive", "Ecru"],
    baseHex: "#EFEDE7",
    finish: "Bio wash · compact",
    care: "Wash 30°C. Suitable for pigment print after compact.",
    fibreOrigin: "Portugal · organic cotton",
    performance: {
      stretch: "low",
      shrinkage: "<4% after compact",
      colourfastness: "4–5",
      pilling: "4",
    },
    raw: { g: "185GSM", w: '71"', c: "ORGANIC COTTON", m: "MOQ200" },
  },
  {
    id: "tek-ft340",
    name: "French Terry 340",
    mill: "Tekirdağ Örme Sanayi AŞ",
    country: "TÜRKIYE",
    structure: "french terry",
    gsm: 340,
    widthCm: 180,
    composition: "80% cotton · 20% polyester",
    moqM: 800,
    leadWeeks: 3,
    priceGbp: 4.15,
    certs: ["OEKO-TEX"],
    feel: ["heavyweight tee", "athleisure"],
    ways: ["Grey Marl", "Black", "Navy", "Forest"],
    baseHex: "#8A8D8F",
    raw: { g: "10.0 oz/yd", w: "71 inch", c: "CO 80 / PES 20", m: "800 mtrs" },
  },
  {
    id: "tos-sl168",
    name: "Slub Jersey 168",
    mill: "Maglificio Toscano Srl",
    country: "ITALY",
    structure: "slub jersey",
    gsm: 168,
    widthCm: 150,
    composition: "100% merino wool",
    moqM: 100,
    leadWeeks: 4,
    priceGbp: 24.6,
    certs: ["OEKO-TEX"],
    feel: ["drapes well", "base layer"],
    ways: ["Stone", "Charcoal", "Rust", "Forest"],
    baseHex: "#B3ABA0",
    raw: { g: "168 gr", w: "150 cm", c: "100% WO", m: "100" },
  },
  {
    id: "hcm-lb312",
    name: "Loopback 312",
    mill: "Ho Chi Minh Knit Co",
    country: "VIETNAM",
    structure: "loopback",
    gsm: 312,
    widthCm: 180,
    composition: "100% cotton",
    moqM: 1000,
    leadWeeks: 3,
    priceGbp: 3.22,
    certs: [],
    feel: ["heavyweight tee", "winter weight"],
    ways: ["Black", "Grey Marl", "Ecru"],
    baseHex: "#23252A",
    raw: { g: "9.2 oz", w: "71", c: "COTTON 100", m: "1000M" },
  },
  {
    id: "bur-tw265",
    name: "Twill 265",
    mill: "Bursa Kumaş Endüstri",
    country: "TÜRKIYE",
    structure: "twill",
    gsm: 265,
    widthCm: 150,
    composition: "98% cotton · 2% elastane",
    moqM: 800,
    leadWeeks: 4,
    priceGbp: 5.6,
    certs: ["OEKO-TEX"],
    feel: ["structured"],
    ways: ["Navy", "Olive", "Sand", "Charcoal"],
    baseHex: "#5E6142",
    raw: { g: "7.8 oz/sq yd", w: "59 in", c: "CTN98/SP2", m: "800" },
  },
  {
    id: "mg-r290",
    name: "Rib 2x2 290",
    mill: "Malhas Guimarães SA",
    country: "PORTUGAL",
    structure: "rib 2x2",
    gsm: 290,
    widthCm: 160,
    composition: "100% organic cotton",
    moqM: 200,
    leadWeeks: 2,
    priceGbp: 11.9,
    certs: ["GOTS 2027", "OEKO-TEX"],
    feel: ["structured", "winter weight"],
    ways: ["Forest", "Black", "Burgundy", "Ecru"],
    baseHex: "#2E4034",
    raw: { g: "290", w: '63"', c: "ORG COTTON", m: "MIN200" },
  },
  {
    id: "den-cd320",
    name: "Corduroy 320",
    mill: "Denizli Dokuma AŞ",
    country: "TÜRKIYE",
    structure: "corduroy",
    gsm: 320,
    widthCm: 150,
    composition: "100% cotton",
    moqM: 500,
    leadWeeks: 5,
    priceGbp: 6.9,
    certs: [],
    feel: ["winter weight", "structured"],
    ways: ["Rust", "Olive", "Sand", "Charcoal"],
    baseHex: "#9A4F30",
    raw: { g: "9.4 oz", w: "59 INCH", c: "%100 PAMUK", m: "500 MT" },
  },
];

export function rankForBrief(fabrics: Fabric[]) {
  return [...fabrics].sort((a, b) => score(b) - score(a));
}

function score(f: Fabric) {
  let s = 0;
  if (f.structure === "mesh") s += 40;
  else if (f.feel.includes("holds a collar") || f.feel.includes("structured"))
    s += 18;
  if (f.structure === "mesh" || f.gsm === 0) s += 20;
  else if (f.gsm > 0 && f.gsm < 200) s += 12;
  if (f.ways.includes("Navy")) s += 16;
  if (/supima/i.test(f.composition)) s += 12;
  if (f.country === "PORTUGAL") s += 8;
  return s;
}

export const PARSED_BRIEF = {
  reading: "polo, mesh, knit",
  weight: "lightweight",
  colour: "navy",
  moq: "—",
};

export const TOUR: {
  view: ViewId;
  title: string;
  body: string;
  coach: { sel: string; text: string; pos: "up" | "down"; align?: "right" };
}[] = [
  {
    view: "designer",
    title: "A designer asks in plain language.",
    body: "No filters, no dropdowns. They describe the product the way they’d say it out loud — and Fruma returns real fabrics from real mills, ranked on fit. <b>Weight, composition, colour, MOQ, and how it actually feels.</b>",
    coach: {
      sel: ".brief",
      text: "The brief is read live — watch what Fruma understands",
      pos: "down",
      align: "right",
    },
  },
  {
    view: "designer",
    title: "Every result is a real, orderable swatch.",
    body: "Each card carries the mill, the spec, the certifications with dates, and the hand-feel that lives nowhere else. Put a few <b>on the desk</b> and order swatches — the moment an idea becomes something you can hold.",
    coach: {
      sel: ".grid",
      text: "Texture is drawn per construction — mesh, piqué, rib, waffle all differ",
      pos: "up",
    },
  },
  {
    view: "ingest",
    title: "None of it exists until a mill sends a file.",
    body: "And we never send a form. The mill sends whatever they already have — a line sheet, a spec PDF, a photo of a card. Fruma reads it once, and asks only about the parts it isn’t sure of. <b>Next time, the same format maps itself.</b>",
    coach: {
      sel: ".ing-cols",
      text: "Only the uncertain rows need a human — the rest is already matched",
      pos: "up",
    },
  },
  {
    view: "product",
    title: "And this is what it was all for.",
    body: "Fabric chosen, design sent, product born. It inherits everything factual from the fabric — composition, certifications, origin — then Fruma drafts the rest and scores it against every destination. <b>It sits in your catalogue until you choose to publish.</b>",
    coach: {
      sel: ".dests",
      text: "Scored per destination — months before the goods land",
      pos: "up",
    },
  },
  {
    view: "mill",
    title: "And the mill sees why it’s worth doing.",
    body: "Their profile is half-built from public records before they arrive. They confirm what’s right, add what buyers actually filter on, and watch their completeness — and their visibility — climb. <b>Free to claim, free to keep.</b>",
    coach: {
      sel: ".preview",
      text: "Adding data moves the buyer-facing card in real time",
      pos: "up",
    },
  },
];

export const AI_COPY = {
  title: "Men's Riviera Polo Shirt in Navy",
  desc: "Slim polo in Q75 cotton mesh, knitted in Portugal. Extra-long staple California Supima, traceable to one farm. Collar holds under a jacket. Not GOTS.",
  care: "Gentle wash at 30°C with similar colours. Do not tumble dry. Dry cleanable.",
  attrs:
    "sleeve: short · neckline: polo collar · closure: button placket · fit: slim · pocket: chest patch · season: spring/summer · construction: Q75 mesh · origin: Portugal",
  cat: "Menswear › Tops › Polo Shirts",
};

const P = "/products";

export const COLOURWAYS: Colourway[] = [
  {
    n: "Navy",
    t: "MPOL1026-BUAA",
    hex: "#27364F",
    sku: "MPOL1026-BUAA",
    image: `${P}/sunspel-riviera-polo-navy-own-01-packshot.jpg`,
    gallery: [
      `${P}/sunspel-riviera-polo-navy-own-01-packshot.jpg`,
      `${P}/sunspel-riviera-polo-navy-own-02-front.jpg`,
      `${P}/sunspel-riviera-polo-navy-own-04-collar-detail.jpg`,
      `${P}/sunspel-riviera-polo-navy-own-03-back.jpg`,
      `${P}/sunspel-riviera-polo-navy-own-05-side.jpg`,
      `${P}/sunspel-riviera-polo-navy-own-06-pocket.jpg`,
    ],
  },
  {
    n: "Charcoal",
    t: "MPOL1026-GYAB",
    hex: "#3A3D42",
    sku: "MPOL1026-GYAB",
    image: `${P}/sunspel-riviera-polo-charcoal-own-01-packshot.jpg`,
    gallery: [
      `${P}/sunspel-riviera-polo-charcoal-own-01-packshot.jpg`,
      `${P}/sunspel-riviera-polo-charcoal-own-02-front.jpg`,
      `${P}/sunspel-riviera-polo-charcoal-own-04-collar-detail.jpg`,
    ],
  },
  {
    n: "White",
    t: "MPOL1026-WHAA",
    hex: "#EFEDE7",
    sku: "MPOL1026-WHAA",
    image: `${P}/sunspel-riviera-polo-white-own-01-packshot.jpg`,
    gallery: [
      `${P}/sunspel-riviera-polo-white-own-01-packshot.jpg`,
      `${P}/sunspel-riviera-polo-white-own-02-front.jpg`,
    ],
  },
  {
    n: "Grey Melange",
    t: "MPOL1026-GYAA",
    hex: "#9A9B99",
    sku: "MPOL1026-GYAA",
    image: `${P}/sunspel-riviera-polo-grey-melange-own-01-packshot.jpg`,
    gallery: [`${P}/sunspel-riviera-polo-grey-melange-own-01-packshot.jpg`],
  },
];

export const DESTINATIONS: Destination[] = [
  {
    id: "own",
    label: "SUNSPEL.COM",
    short: "Own site",
    status: "ok",
    href: "https://www.sunspel.com/products/mens-cotton-riviera-polo-shirt-navy-mpol1026",
    image: `${P}/sunspel-riviera-polo-navy-own-01-packshot.jpg`,
    price: "£140",
    colour: "Navy",
    sku: "MPOL1026-BUAA",
    availability: "in-stock",
    banner:
      "<b>Source of truth · live on own site.</b> Men's Riviera Polo Shirt in Navy, £140, slim fit, Q75 mesh, knitted in Portugal from traceable Supima. Every other destination is a translation of this record.",
    note: "Captured 25 August 2026 from sunspel.com. Reference only, unaffiliated. Own-site photography is the packshot used where retailer CDNs 429'd.",
    rows: [
      {
        field: "product title",
        outgoing: "Men's Riviera Polo Shirt in Navy",
        rule: null,
        why: "Own-site title. On-page heading is Riviera Polo Shirt.",
      },
      {
        field: "colour",
        outgoing: "Navy",
        rule: null,
        why: "Colourway name as designed — not Blue, not Grey.",
      },
      {
        field: "price",
        outgoing: "£140",
        rule: null,
        why: "RRP on the Navy SKU MPOL1026-BUAA.",
      },
      {
        field: "sku",
        outgoing: "MPOL1026-BUAA",
        rule: null,
        why: "Style MPOL1026 plus colour code BUAA, hyphen kept.",
      },
      {
        field: "fit",
        outgoing: "Slim",
        rule: null,
        why: "Own site says slim. Liberty and Harrods list Regular.",
      },
      {
        field: "composition",
        outgoing: "100% extra-long staple Supima cotton",
        rule: null,
        why: "Traceable to a single California farm. Not GOTS organic.",
      },
      {
        field: "structure",
        outgoing: "Q75 cotton warp-knit mesh",
        rule: null,
        why: "In-house mesh — the construction they chose instead of dense piqué.",
      },
      {
        field: "origin",
        outgoing: "Knitted in Portugal",
        rule: null,
        why: "Mill name unpublished. Do not invent one.",
      },
    ],
  },
  {
    id: "liberty",
    label: "LIBERTY",
    short: "Liberty",
    status: "warn",
    href: "https://www.libertylondon.com/uk/rivieria-mesh-polo-shirt-000705405.html",
    image: `${P}/sunspel-riviera-polo-navy-liberty-01.jpg`,
    price: "From £135.00",
    colour: "White (default); Navy also on the same PDP",
    sku: "000705405",
    availability: "in-stock",
    banner:
      "<b>Live — with mapping gaps.</b> Title misspells Riviera as <b>Rivieria</b>. From £135 vs £140. Fit listed Regular; own site says Slim. Same PDP carries White and Navy.",
    note: "Liberty style 000705405 / barcode 5059419387146, not MPOL1026-WHAA. Composition shown as 100% Cotton — drops Supima and California traceability.",
    rows: [
      {
        field: "product title",
        outgoing: "Sunspel Rivieria Mesh Polo Shirt",
        was: "Men's Riviera Polo Shirt in Navy",
        rule: "gap",
        why: "<b>Rivieria</b> is a live typo. Drops Men's and the colour; uses Mesh Polo Shirt instead.",
      },
      {
        field: "price",
        outgoing: "From £135.00",
        was: "£140",
        rule: "gap",
        why: "From-price vs own-site RRP.",
      },
      {
        field: "fit",
        outgoing: "Regular",
        was: "Slim",
        rule: "map",
        why: "Liberty lists Regular. Own site says Slim.",
      },
      {
        field: "colour",
        outgoing: "White (default); Navy sibling on the same PDP",
        was: "Navy (own-site URL per colour)",
        rule: "map",
        why: "One product page carries White and Navy rather than a per-colour URL.",
      },
      {
        field: "composition",
        outgoing: "100% Cotton",
        was: "100% extra-long staple Supima cotton",
        rule: "strip",
        why: "Drops Supima / extra-long staple / California traceability.",
      },
      {
        field: "sku",
        outgoing: "000705405",
        was: "MPOL1026-BUAA",
        rule: "map",
        why: "Remapped to Liberty style / barcode, not the Sunspel SKU.",
      },
    ],
  },
  {
    id: "end",
    label: "END.",
    short: "END.",
    status: "warn",
    href: "https://www.endclothing.com/gb/sunspel-riviera-polo-mpol1026-buaa.html",
    image: `${P}/sunspel-riviera-polo-navy-end-01.jpg`,
    price: "£75",
    colour: "Navy",
    sku: "MPOL1026-BUAA",
    availability: "sold-out",
    banner:
      "<b>Live PDP, sold out.</b> Title truncated to Sunspel Riviera Polo. Navy on sale at <b>£75</b> (was £125 in meta; own-site RRP £140). Charcoal sibling is £69, also sold out, and tagged <b>Grey</b> internally.",
    note: "SKU MPOL1026-BUAA is preserved in the URL. Copy says 100% Cotton / 3 Button Placket / Ribbed Trims — drops mesh, Supima, Q75. Long description has a SuSupima typo. Charcoal listing: https://www.endclothing.com/gb/sunspel-riviera-polo-mpol1026-gyab.html",
    rows: [
      {
        field: "product title",
        outgoing: "Sunspel Riviera Polo",
        was: "Men's Riviera Polo Shirt in Navy",
        rule: "trunc",
        why: "Truncated — no Men's, no Shirt; colour only in subtitle / OG title.",
      },
      {
        field: "price",
        outgoing: "£75",
        was: "£140",
        rule: "gap",
        why: "Sale price. Meta still lists £125 as product:price:amount.",
      },
      {
        field: "availability",
        outgoing: "sold-out",
        was: "in-stock on own site",
        rule: "gap",
        why: "Listing is sold out but the PDP is still live.",
      },
      {
        field: "related colour",
        outgoing: "Charcoal £69 · internal color: Grey",
        was: "Charcoal",
        rule: "map",
        why: "END. Charcoal (MPOL1026-GYAB) is tagged Grey in schema while the customer-facing colour is Charcoal.",
      },
      {
        field: "composition",
        outgoing: "100% Cotton / 3 Button Placket / Ribbed Trims",
        was: "Q75 mesh · Supima · Portugal",
        rule: "strip",
        why: "Drops mesh, Supima, Q75 and the Bond / Riviera mill story. Copy typo: SuSupima.",
      },
    ],
  },
  {
    id: "selfridges",
    label: "SELFRIDGES",
    short: "Selfridges",
    status: "warn",
    href: "https://www.selfridges.com/GB/en/product/sunspel-riviera-cotton-piqu-polo-shirt_R03756503/",
    image: `${P}/sunspel-riviera-polo-grey-melange-own-01-packshot.jpg`,
    imagesNote:
      "Selfridges CDN assets were not captured (bot-gated). Own-site Grey Melange / Navy packshots used as stand-ins.",
    price: "£140.00",
    colour: "GREY MELANGE (default); NAVY also on the same PDP",
    sku: "R03756503",
    availability: "live listing",
    banner:
      "<b>The useful error.</b> Q75 mesh is sold as <b>cotton-piqué</b> in the title and bullets. Hero colour on this URL is GREY MELANGE, with NAVY as a sibling — not a separate URL. SKU remapped to R03756503.",
    note: "URL slug loses the é (piqu). Bullets say 100% cotton, lightweight, stretchy — drop Supima, traceability, Q75 mesh, Bond story. Retailer photos were not stored; previews use own-site files.",
    rows: [
      {
        field: "product title",
        outgoing: "SUNSPEL Riviera cotton-piqué polo shirt",
        was: "Men's Riviera Polo Shirt in Navy",
        rule: "gap",
        why: "<b>Mesh sold as cotton-piqué.</b> ALL-CAPS brand + truncated name. The construction they rejected is the one Selfridges filed.",
      },
      {
        field: "colour",
        outgoing: "GREY MELANGE / NAVY",
        was: "Navy (own-site hero URL)",
        rule: "map",
        why: "Default colour on this URL is Grey Melange (MPOL1026-GYAA). Navy is a sibling swatch, not its own PDP.",
      },
      {
        field: "sku",
        outgoing: "R03756503",
        was: "MPOL1026-BUAA",
        rule: "map",
        why: "Selfridges reference, not the Sunspel style/colour SKU.",
      },
      {
        field: "structure",
        outgoing: "cotton-piqué",
        was: "Q75 warp-knit mesh",
        rule: "map",
        why: "Fabric mapped from mesh to piqué — the listing error Fruma is for.",
      },
      {
        field: "images",
        outgoing: "Own-site Grey Melange / Navy stand-ins",
        rule: "gap",
        why: "Selfridges HTML is bot-gated in this environment. Do not hotlink their CDN.",
      },
    ],
  },
  {
    id: "farfetch",
    label: "FARFETCH",
    short: "Farfetch",
    status: "warn",
    href: "https://www.farfetch.com/uk/shopping/men/sunspel-riviera-polo-shirt-item-14143983.aspx",
    image: `${P}/sunspel-riviera-polo-navy-own-01-packshot.jpg`,
    imagesNote:
      "Farfetch CDN returned HTTP 429. Navy own-site packshot used as stand-in.",
    price: "£140",
    colour: "Blue (page title); navy blue in body copy",
    sku: "14143983",
    availability: "in-stock",
    banner:
      "<b>Live.</b> Colour shown as <b>Blue</b> in the title, navy blue in the description. Brand style ID drops the hyphen: <b>MPOL1026BUAA</b> vs MPOL1026-BUAA. Copy says two-button placket.",
    note: "Composition Cotton 100% — drops Supima / mesh / Made in Portugal. Tone of copy is jokey Bond pastiche, not the mill story.",
    rows: [
      {
        field: "product title",
        outgoing: "Sunspel Riviera polo shirt",
        was: "Men's Riviera Polo Shirt in Navy",
        rule: "trunc",
        why: "Drops Men's and the colour from the H1.",
      },
      {
        field: "colour",
        outgoing: "Blue",
        was: "Navy",
        rule: "map",
        why: "Page title uses Blue; body copy says navy blue.",
      },
      {
        field: "brand style ID",
        outgoing: "MPOL1026BUAA",
        was: "MPOL1026-BUAA",
        rule: "fmt",
        why: "Hyphen dropped. Farfetch item id 14143983.",
      },
      {
        field: "placket",
        outgoing: "two button",
        rule: "gap",
        why: "Farfetch and gravitypope say two buttons; END. lists 3 Button Placket; own site does not specify a count.",
      },
      {
        field: "images",
        outgoing: "Own-site Navy packshot (stand-in)",
        rule: "gap",
        why: "Farfetch CDN 429'd. Source URLs recorded in brand-ref/listings.json — not hotlinked.",
      },
    ],
  },
  {
    id: "harrods",
    label: "HARRODS",
    short: "Harrods",
    status: "warn",
    href: "https://www.harrods.com/en-gb/p/sunspel-supima-cotton-riviera-polo-shirt-000000000006834050",
    image: `${P}/sunspel-riviera-polo-navy-own-01-packshot.jpg`,
    imagesNote:
      "Harrods GB PDP blocked image scrape (403). Navy own-site packshot used. Dark Clay photos from the UA storefront are stored separately.",
    price: "£140.00",
    colour: "Navy",
    sku: "000000000006834050",
    availability: "out-of-stock on this PDP",
    banner:
      "<b>UK Navy PDP is out of stock, still indexed.</b> Title inserts Supima Cotton and drops Men's. Fit listed Regular vs Slim. Copy says Italian heat; own site / journal say French Riviera. Does mention cotton mesh and a family-owned Portuguese jersey specialist.",
    note: "UA storefront lists Dark Clay at £135 — editor copy calls it a unique mesh-like texture in a modern upgrade to traditional piqué. https://www.harrods.com/en-ua/p/sunspel-riviera-polo-shirt-000000000007715157",
    rows: [
      {
        field: "product title",
        outgoing: "Sunspel Supima Cotton Riviera Polo Shirt",
        was: "Men's Riviera Polo Shirt in Navy",
        rule: "map",
        why: "Inserts Supima Cotton; H1 omits the colour. HTML title is Navy.",
      },
      {
        field: "fit",
        outgoing: "Regular",
        was: "Slim",
        rule: "map",
        why: "Harrods lists Regular. Own site says Slim.",
      },
      {
        field: "availability",
        outgoing: "out-of-stock on this PDP",
        rule: "gap",
        why: "Still indexed on the Harrods UK Sunspel polo listing. No fake in-stock card.",
      },
      {
        field: "related colour",
        outgoing: "DARK CLAY · £135 · UA storefront",
        rule: "gap",
        why: "Seasonal colour, not a core own-site colourway captured here. Copy: upgrade to traditional piqué.",
      },
      {
        field: "origin story",
        outgoing: "designed to combat the Italian heat",
        was: "French Riviera, 1955",
        rule: "gap",
        why: "Own site and journal say French Riviera.",
      },
    ],
  },
  {
    id: "gravitypope",
    label: "GRAVITYPOPE",
    short: "gravitypope",
    status: "warn",
    href: "https://www.gravitypope.com/products/sunspel-mpol1026-nvy",
    image: `${P}/sunspel-riviera-polo-navy-gravitypope-01.jpg`,
    price: "CA$230.00",
    colour: "Navy",
    sku: "11E3Q50",
    availability: "in-stock (M / L / XL)",
    banner:
      "<b>Live in CAD.</b> Internal SKU remapped to <b>11E3Q50</b>; style ID on page is MPOL1026-NVY vs own-site MPOL1026-BUAA. Title drops Men's and the colour. Uses brand long-copy (Bond / Supima / mesh) more faithfully than the department stores.",
    note: "Canadian specialist retailer. Copy says two button placket. Colour is a variant option, not in the title.",
    rows: [
      {
        field: "product title",
        outgoing: "Riviera Polo Shirt",
        was: "Men's Riviera Polo Shirt in Navy",
        rule: "trunc",
        why: "Drops Men's and the colour (colour is a variant option).",
      },
      {
        field: "price",
        outgoing: "CA$230.00",
        was: "£140",
        rule: "fmt",
        why: "Canadian specialist; currency CAD not GBP.",
      },
      {
        field: "sku",
        outgoing: "11E3Q50",
        was: "MPOL1026-BUAA",
        rule: "map",
        why: "Internal SKU remapped. Style ID on page: MPOL1026-NVY.",
      },
    ],
  },
  {
    id: "john-lewis",
    label: "JOHN LEWIS",
    short: "John Lewis",
    status: "empty",
    href: "https://www.johnlewis.com/brand/sunspel/_/N-1z13qc8",
    availability: "not-listed",
    banner:
      "<b>Not listed.</b> The John Lewis Sunspel brand page is live but empty — “It might be temporarily out of stock.” No Riviera polo, and no Sunspel SKU, was found on johnlewis.com on 25 August 2026.",
    note: "Do not mock a John Lewis listing from the brand URL. There is no product to preview. Fruma’s job here is to show the empty destination honestly.",
    rows: [
      {
        field: "listing",
        outgoing: "Not on John Lewis",
        was: "Men's Riviera Polo Shirt in Navy",
        rule: "blocked",
        why: "Empty brand page. No SKU, no title, no price — do not invent a ready-to-publish card.",
      },
    ],
  },
  {
    id: "mr-porter",
    label: "MR PORTER",
    short: "Mr Porter",
    status: "empty",
    href: "https://www.mrporter.com/en-gb/journal/fashion/partnership-sunspel-british-classic-10746508",
    availability: "not-listed",
    banner:
      "<b>Not listed — journal only.</b> No live Mr Porter product URL for the Riviera polo (MPOL1026) was found on 25 August 2026. Editorial coverage is not a SKU listing.",
    note: "Mr Porter previously ran a Sunspel capsule. That is not a current product card. Do not mock a listing from the journal URL.",
    rows: [
      {
        field: "listing",
        outgoing: "Journal only — no live product URL",
        rule: "blocked",
        why: "Editorial is not a PDP. Nothing to map, nothing to publish.",
      },
    ],
  },
];

export const FABRIC_BY_ID = Object.fromEntries(
  FABRICS.map((f) => [f.id, f]),
) as Record<string, Fabric>;

/** Max product options on the desk — pick one for Product. */
export const MAX_DESK = 3;

export const RULE_CHIP: Record<string, string> = {
  trunc: "TRIMMED",
  map: "MAPPED",
  strip: "REMOVED",
  fmt: "REFORMATTED",
  blocked: "NOT LISTED",
  gap: "LIVE DIFF",
};

export const PRODUCT_DESTS: ProductDest[] = [
  {
    id: "own",
    name: "Sunspel.com",
    pct: 100,
    tone: "ok",
    gap: "live · source of truth · £140 · MPOL1026-BUAA",
    action: "SEE LISTING",
    ready: true,
  },
  {
    id: "liberty",
    name: "Liberty",
    pct: 72,
    tone: "weld",
    gap: "Rivieria typo · From £135 · Regular vs Slim",
    action: "SEE LISTING",
    ready: true,
  },
  {
    id: "end",
    name: "END.",
    pct: 64,
    tone: "weld",
    gap: "truncated title · Navy £75 sold-out · Charcoal tagged Grey",
    action: "SEE LISTING",
    ready: true,
  },
  {
    id: "selfridges",
    name: "Selfridges",
    pct: 58,
    tone: "madder",
    gap: "mesh sold as cotton-piqué · GREY MELANGE default",
    action: "SEE LISTING",
    ready: true,
  },
  {
    id: "farfetch",
    name: "Farfetch",
    pct: 70,
    tone: "weld",
    gap: "colour Blue · style ID loses hyphen",
    action: "SEE LISTING",
    ready: true,
  },
  {
    id: "harrods",
    name: "Harrods",
    pct: 68,
    tone: "weld",
    gap: "Regular vs Slim · UK Navy OOS · Dark Clay £135",
    action: "SEE LISTING",
    ready: true,
  },
  {
    id: "gravitypope",
    name: "gravitypope",
    pct: 78,
    tone: "ok",
    gap: "CA$230 · SKU remapped 11E3Q50",
    action: "SEE LISTING",
    ready: true,
  },
  {
    id: "john-lewis",
    name: "John Lewis",
    pct: 0,
    tone: "madder",
    gap: "not listed — empty brand page",
    action: "NOT LISTED",
    ready: true,
  },
  {
    id: "mr-porter",
    name: "Mr Porter",
    pct: 0,
    tone: "madder",
    gap: "not listed — journal only",
    action: "NOT LISTED",
    ready: true,
  },
];

/** Every mill quality has a profile of range styles that already use it. */
export const FABRIC_USAGE: Record<string, ClothHistoryItem[]> = {
  "q75-mesh-pt": [
    {
      name: "Riviera Polo Shirt",
      meta: "Navy · MPOL1026-BUAA · £140",
      hex: "#27364F",
      tag: "In shops",
      live: true,
      where: "sunspel.com and 12 stores",
      image: `${P}/sunspel-riviera-polo-navy-own-01-packshot.jpg`,
    },
    {
      name: "Riviera Polo Shirt",
      meta: "Charcoal · MPOL1026-GYAB",
      hex: "#3A3D42",
      tag: "In shops",
      live: true,
      where: "Regent Street, Marylebone",
      image: `${P}/sunspel-riviera-polo-charcoal-own-01-packshot.jpg`,
    },
    {
      name: "Riviera Polo Shirt",
      meta: "White · MPOL1026-WHAA",
      hex: "#EFEDE7",
      tag: "In shops",
      live: true,
      where: "sunspel.com",
      image: `${P}/sunspel-riviera-polo-white-own-01-packshot.jpg`,
    },
    {
      name: "Riviera Polo — long sleeve",
      meta: "Navy · AW25",
      hex: "#23252A",
      tag: "Sold through",
      live: false,
    },
  ],
  "q82-jersey-le": [
    {
      name: "Classic T-shirt",
      meta: "White · MTSH0001-WHAA · £95",
      hex: "#EFEDE7",
      tag: "In shops",
      live: true,
      where: "sunspel.com and Long Eaton outlet",
      image: `${P}/sunspel-classic-tee-white-own-01-packshot.jpg`,
    },
    {
      name: "Classic T-shirt",
      meta: "Navy · MTSH0001-BUAA",
      hex: "#27364F",
      tag: "In shops",
      live: true,
      where: "12 stores",
    },
    {
      name: "Women's Classic T-shirt",
      meta: "White · SS26",
      hex: "#EFEDE7",
      tag: "In shops",
      live: true,
      where: "sunspel.com",
    },
  ],
  k4471t: [
    {
      name: "Heavyweight Piqué Polo",
      meta: "Navy · GP-2601 · AW26",
      hex: "#27364F",
      tag: "In shops",
      live: true,
      where: "3 stores — handle before you sign off",
    },
    {
      name: "Piqué Polo — long sleeve",
      meta: "Black · GP-2508 · AW25",
      hex: "#23252A",
      tag: "Archived",
      live: false,
    },
  ],
  "fam-p261": [
    {
      name: "Training Polo",
      meta: "Cobalt · SS25",
      hex: "#2D4C86",
      tag: "Sold through",
      live: false,
    },
  ],
  "bar-i232": [
    {
      name: "Modal base layer",
      meta: "Charcoal · AW25",
      hex: "#3A3D42",
      tag: "In shops",
      live: true,
      where: "2 stores",
    },
    {
      name: "Travel tee",
      meta: "Sage · SS26",
      hex: "#93A08A",
      tag: "In shops",
      live: true,
      where: "sunspel.com",
    },
  ],
  "vda-r268": [
    {
      name: "Rib henley",
      meta: "Burgundy · AW26",
      hex: "#5E2733",
      tag: "In shops",
      live: true,
      where: "Marylebone",
    },
    {
      name: "Collar rib (trim)",
      meta: "Used on Riviera samples · not a garment",
      hex: "#DED6C4",
      tag: "Trim",
      live: false,
    },
  ],
  "viz-w285": [
    {
      name: "Waffle lounge polo",
      meta: "Sage · AW25",
      hex: "#93A08A",
      tag: "Sold through",
      live: false,
    },
  ],
  "vda-sj185": [
    {
      name: "Printed summer tee",
      meta: "White · SS26",
      hex: "#EFEDE7",
      tag: "In shops",
      live: true,
      where: "12 stores",
    },
    {
      name: "Pocket tee",
      meta: "Navy · SS25",
      hex: "#27364F",
      tag: "Sold through",
      live: false,
    },
  ],
  "tek-ft340": [
    {
      name: "Loopback sweat",
      meta: "Grey Marl · AW25",
      hex: "#8A8D8F",
      tag: "In shops",
      live: true,
      where: "Outlet only",
    },
  ],
  "tos-sl168": [
    {
      name: "Merino crew",
      meta: "Stone · AW26",
      hex: "#B3ABA0",
      tag: "In shops",
      live: true,
      where: "Regent Street",
    },
  ],
  "hcm-lb312": [],
  "bur-tw265": [
    {
      name: "Travel chinos (trial)",
      meta: "Navy · SS24",
      hex: "#5E6142",
      tag: "Archived",
      live: false,
    },
  ],
  "mg-r290": [
    {
      name: "Heavy rib polo",
      meta: "Forest · AW25",
      hex: "#2E4034",
      tag: "Sold through",
      live: false,
    },
  ],
  "den-cd320": [],
};

export function usageFor(id: string): ClothHistoryItem[] {
  return FABRIC_USAGE[id] ?? [];
}

export function inShopCount(id: string) {
  return usageFor(id).filter((u) => u.live).length;
}

export const CLOTH_HISTORY: ClothHistoryItem[] = FABRIC_USAGE["q75-mesh-pt"] ?? [];

export const SUPPLIERS: Supplier[] = [
  {
    name: "Portuguese knit (unpublished mill)",
    loc: "PORTUGAL · RIVIERA POLO · Q75 MESH",
    grade: "A",
    gradeTone: "ok",
    metrics: [
      { k: "CONSTRUCTION", v: "Q75 mesh", note: "not dense piqué", trend: "flat" },
      { k: "FIBRE", v: "Supima", note: "ELS California", trend: "down" },
      { k: "CERTIFICATIONS", v: "none listed", note: "not GOTS", trend: "up" },
      { k: "GSM", v: "unpublished", note: "shipping 150g", trend: "flat" },
    ],
    foot: "Sunspel knits the Riviera in Portugal. The mill name is unpublished in this demo — do not invent one. Traceable Supima, not certified organic. Retailer feeds still have a cert field; it is empty on purpose.",
  },
  {
    name: "Malhas Guimarães SA",
    loc: "GUIMARÃES, PORTUGAL · MILL CATALOGUE",
    grade: "B+",
    gradeTone: "weld",
    metrics: [
      { k: "SAMPLE TURNAROUND", v: "14 days", note: "▲ from 9", trend: "up" },
      { k: "LEAD TIME vs QUOTED", v: "+3 days", note: "▲ slipping", trend: "up" },
      { k: "CERTIFICATIONS", v: "GOTS · OEKO-TEX", note: "both current", trend: "flat" },
      { k: "SPEC ACCURACY", v: "98%", note: "▲ good", trend: "down" },
    ],
    foot: "Portuguese knitter in the mill layer — comparable piqués and ribs, not the Riviera Q75. GOTS on their cloth is theirs, not Sunspel’s. Turnaround trend is the thing to watch.",
  },
  {
    name: "Têxteis Vale do Ave, Lda",
    loc: "FAMALICÃO, PORTUGAL · 11 PRODUCTS SINCE 2023",
    grade: "A",
    gradeTone: "ok",
    metrics: [
      { k: "SAMPLE TURNAROUND", v: "7 days", note: "▼ from 9", trend: "down" },
      { k: "LEAD TIME vs QUOTED", v: "on time", note: "▼ 11 of 11", trend: "down" },
      { k: "CERTIFICATIONS", v: "GOTS · OEKO-TEX", note: "to 2028", trend: "flat" },
      { k: "SPEC ACCURACY", v: "100%", note: "▲ no deviations", trend: "down" },
    ],
    foot: "Most reliable mill in the catalogue layer. Lowest MOQ of the Portuguese suppliers at 150m. Their GOTS jersey is a different cloth to the Riviera mesh.",
  },
  {
    name: "Tekirdağ Örme Sanayi AŞ",
    loc: "TEKIRDAĞ, TÜRKIYE · 4 PRODUCTS SINCE 2025",
    grade: "A−",
    gradeTone: "ok",
    metrics: [
      { k: "SAMPLE TURNAROUND", v: "11 days", note: "— steady", trend: "flat" },
      { k: "LEAD TIME vs QUOTED", v: "on time", note: "▼ 4 of 4", trend: "down" },
      { k: "CERTIFICATIONS", v: "OEKO-TEX", note: "no GOTS", trend: "up" },
      { k: "SPEC ACCURACY", v: "96%", note: "1 weight deviation", trend: "flat" },
    ],
    foot: "Best price per metre in the mill base. No GOTS — which matches this brand’s cloth: traceable Supima, not certified organic. The gap to watch is an empty cert field on retailer feeds, not a missing organic story.",
  },
];

export const LISTING_RULE = `when destination is "Selfridges"
  and construction is Q75 mesh
then keep structure as mesh
never map mesh to cotton-piqué
when destination is "Liberty"
  and title contains "Rivieria"
then restore "Riviera"
never drop Slim when the source fit is Slim
when destination is "John Lewis"
  and brand page has no SKU
then leave the destination empty
never invent a listing`;

