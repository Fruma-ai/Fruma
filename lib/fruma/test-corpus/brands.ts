import type { TestBrand } from "./types";

/** Three fixed dummy brands for the test version. Not customer demo story brands. */
export const TEST_BRANDS: TestBrand[] = [
  {
    id: "brand-northline",
    name: "Northline Studio",
    market: "UK + EU",
    categoryFocus: ["Polo", "T-shirt", "Overshirt"],
    hq: "London",
    summary:
      "UK menswear brand. Prefers Portuguese fine cotton and warp-knit mesh. Tight MOQ discipline.",
  },
  {
    id: "brand-harbour",
    name: "Harbour Standard",
    market: "EU",
    categoryFocus: ["T-shirt", "Sweater", "Shirt"],
    hq: "Amsterdam",
    summary:
      "EU basics brand. Broader mill network, accepts jersey and fleece. Evidence freshness matters more than relationship history.",
  },
  {
    id: "brand-fieldform",
    name: "Field & Form",
    market: "UK",
    categoryFocus: ["Jacket", "Trouser", "Overshirt"],
    hq: "Manchester",
    summary:
      "Outerwear-led. Needs wool/coating and compact twills. Excludes mills without current evidence for UK markets.",
  },
];
