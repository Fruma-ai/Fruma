export type MapNow = "demo" | "partial" | "next";

export type MapStage = {
  id: string;
  stage: string;
  leverage: string;
  now: MapNow;
  features: { text: string; now: MapNow }[];
  data: string[];
};

export const MAP_STAGES: MapStage[] = [
  {
    id: "source",
    stage: "1–2. Research & sourcing",
    leverage: "Highest leverage",
    now: "demo",
    features: [
      {
        text: "Natural-language fabric matching: a designer describes weight, hand-feel, performance; matching mill qualities surface before a hanger moves.",
        now: "demo",
      },
      {
        text: "Digital swatch cards hold composition, GSM, width, finish, performance, certs and origin as data — most reject / re-request happens on screen.",
        now: "demo",
      },
      {
        text: "Requirement-to-factory routing: mill files that mapped onto the Fruma standard are what Design searches — a mill that didn’t map stays out.",
        now: "demo",
      },
    ],
    data: [
      "Composition & fibre %",
      "Weight / GSM, width",
      "Construction (knit / weave, gauge)",
      "Finish & treatment",
      "Performance: stretch, shrinkage, colourfastness, pilling",
      "Price, fabric MOQ, lead, stock",
    ],
  },
  {
    id: "materials",
    stage: "B. Materials stream",
    leverage: "High leverage",
    now: "partial",
    features: [
      {
        text: "Digital lab-dip and Pantone history per mill, so a matched colour is reused, not re-dipped.",
        now: "next",
      },
      {
        text: "Trims and hardware library per mill (zips, snaps, labels, drawcords).",
        now: "next",
      },
      {
        text: "Print capability so artwork goes to a mill that can render it first time.",
        now: "next",
      },
      {
        text: "Certifications and in-house dye / lab-dip claimed on the mill profile, then inherited by qualities.",
        now: "partial",
      },
    ],
    data: [
      "Lab-dip / Pantone history",
      "Available colour range",
      "Print methods, max colours, registration",
      "Trims & hardware catalogue",
      "OEKO-TEX, GOTS, GRS — only if the mill file has them",
    ],
  },
  {
    id: "tech",
    stage: "4. Technical design",
    leverage: "Medium-high",
    now: "next",
    features: [
      {
        text: "Auto-scaffold a tech pack from the selected fabric and mill record — composition, care, finish, trims pre-populate.",
        now: "next",
      },
      {
        text: "Standard measurement and construction templates per mill to cut fit ambiguity.",
        now: "next",
      },
    ],
    data: [
      "Care & washing instructions",
      "Measurement & grading specs",
      "Construction templates",
      "Wash / finish options",
    ],
  },
  {
    id: "proto",
    stage: "5–8. Proto to bulk",
    leverage: "Assists, physical",
    now: "partial",
    features: [
      {
        text: "Swatch lifecycle on the desk (ordered → in hand → signed off). Not a proto round.",
        now: "partial",
      },
      {
        text: "Factory performance signals at selection time: sample turnaround, lead vs quoted, spec accuracy.",
        now: "partial",
      },
      {
        text: "Structured proto comments as data per iteration — style history queryable, not buried in email.",
        now: "next",
      },
    ],
    data: [
      "Sampling & bulk lead times",
      "MOQ per style, capacity",
      "Historical defect & on-time delivery",
      "Audit / compliance (Sedex, BSCI, WRAP)",
    ],
  },
  {
    id: "sales",
    stage: "9. Brand & sales",
    leverage: "Second big win",
    now: "demo",
    features: [
      {
        text: "Build once, sell everywhere: one Fruma record mapped onto each retailer PDP (title rules, colour maps, construction they get wrong).",
        now: "demo",
      },
      {
        text: "Compliance-ready listings: fibre, care and country of origin locked from the mill file, not rewritten as marketing copy.",
        now: "demo",
      },
    ],
    data: [
      "Composition & care for legal labelling",
      "Fibre origin & country of manufacture",
      "Substantiated sustainability claims — empty when untrue",
      "Pack shots captured at source",
    ],
  },
  {
    id: "repeat",
    stage: "11. Review & repeat",
    leverage: "Compounding moat",
    now: "next",
    features: [
      {
        text: "Feed returns and best/worst-seller data back against fabric and mill records.",
        now: "next",
      },
      {
        text: "Link what was made to how it sold and returned — data that gets more valuable over time.",
        now: "next",
      },
    ],
    data: [
      "Return reasons linked to fabric / mill",
      "Sell-through by product",
      "Quality complaints mapped to source",
    ],
  },
];

export const MAP_NOW_LABEL: Record<MapNow, string> = {
  demo: "In this demo",
  partial: "Started",
  next: "Next",
};

/** AI hops that carry mill data through the design process. */
export const DATA_HOPS: {
  n: number;
  title: string;
  ai: string;
  today: string;
  stage: string;
  room: string;
}[] = [
  {
    n: 1,
    title: "Mill file",
    ai: "Fruma reads the hanger list the mill already has — columns, mixed units, mill fibre strings.",
    today: "Designer emails a sketch and waits for physical hangers.",
    stage: "2 · Initial sourcing",
    room: "Workshop · File / Map",
  },
  {
    n: 2,
    title: "Fruma standard",
    ai: "AI maps mill columns to composition, GSM, construction, MOQ. Exceptions stay out of search.",
    today: "Each mill file is a different layout. Nobody can compare them.",
    stage: "B · Materials / fabrics",
    room: "Workshop · Review / Catalogue",
  },
  {
    n: 3,
    title: "Brief + sketch",
    ai: "The drawing that used to go to five factories is read against mill files. Matching qualities surface before a courier moves.",
    today: "Send reference imagery → wait → reject → re-request. Weeks.",
    stage: "1–2 · Research & sourcing / A · Design",
    room: "Studio · Design",
  },
  {
    n: 4,
    title: "Locked product record",
    ai: "Chosen cloth inherits mill care, fibre, origin, certs. Listing copy can be rewritten; legal fields cannot.",
    today: "Tech pack and PDP are retyped from emails and hangers.",
    stage: "4 · Technical · 9 · Content",
    room: "Studio · Product",
  },
  {
    n: 5,
    title: "Retailer shape",
    ai: "One record, destination rules. Mesh stays mesh unless a retailer historically filed it as piqué — and that error is visible.",
    today: "Each channel rebuilds fibre, care and construction from scratch.",
    stage: "9 · Brand / sales",
    room: "Studio · Listings",
  },
];

