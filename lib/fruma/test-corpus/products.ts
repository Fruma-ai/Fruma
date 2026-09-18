import type { Relationship } from "../demo-data";
import { TEST_BRANDS } from "./brands";
import { TEST_FACTORIES } from "./factories";
import { articleCodesFor } from "./hanger";
import type { BrandFactoryLink, TestProduct } from "./types";

/**
 * Brand↔factory relationship memory is tenant-private.
 * Deterministic so retrieval tests stay stable.
 */
export const TEST_LINKS: BrandFactoryLink[] = (() => {
  const links: BrandFactoryLink[] = [];
  for (const brand of TEST_BRANDS) {
    for (let i = 0; i < TEST_FACTORIES.length; i++) {
      const factory = TEST_FACTORIES[i];
      const relationship: Relationship =
        i % 17 === brand.id.length % 5
          ? "excluded"
          : i % 9 === brand.id.length % 4
            ? "preferred"
            : i % 5 === brand.id.length % 3
              ? "proven"
              : i % 3 === 0
                ? "previous"
                : "new";

      const articles = articleCodesFor(factory);
      const grantedArticles =
        relationship === "excluded"
          ? []
          : relationship === "preferred" || relationship === "proven"
            ? articles.slice(0, Math.min(6, articles.length))
            : relationship === "previous"
              ? articles.slice(0, Math.min(2, articles.length))
              : [];

      links.push({
        brandId: brand.id,
        factoryId: factory.id,
        relationship,
        grantedArticles,
      });
    }
  }
  return links;
})();

const CATEGORIES = ["Polo", "Sweater", "Shirt", "Jacket", "T-shirt", "Trouser", "Dress", "Overshirt"] as const;
const STAGES = ["intent", "check", "source", "confirm", "development", "list", "live"] as const;
const COLOURS = ["navy", "stone", "forest", "black", "cream", "clay"] as const;

export const TEST_PRODUCTS: TestProduct[] = (() => {
  const products: TestProduct[] = [];
  let n = 0;
  for (const brand of TEST_BRANDS) {
    for (let i = 0; i < 12; i++) {
      const category =
        brand.categoryFocus[i % brand.categoryFocus.length] ??
        CATEGORIES[i % CATEGORIES.length];
      const stage = STAGES[(i + brand.id.length) % STAGES.length];
      const preferred = TEST_LINKS.filter(
        (l) =>
          l.brandId === brand.id &&
          (l.relationship === "preferred" || l.relationship === "proven"),
      );
      const shortlist = preferred.slice(i % Math.max(preferred.length, 1), (i % Math.max(preferred.length, 1)) + 3);
      const shortlistFactoryIds =
        shortlist.length >= 3
          ? shortlist.map((l) => l.factoryId)
          : [
              TEST_FACTORIES[(i * 3) % 50].id,
              TEST_FACTORIES[(i * 3 + 7) % 50].id,
              TEST_FACTORIES[(i * 3 + 13) % 50].id,
            ];
      n += 1;
      products.push({
        id: `test-product-${String(n).padStart(3, "0")}`,
        brandId: brand.id,
        sku: `TST-${brand.id.slice(-4).toUpperCase()}-${String(1000 + i)}`,
        name: `${i % 2 === 0 ? "Refined" : "Relaxed"} ${COLOURS[i % COLOURS.length]} ${category.toLowerCase()}`,
        category,
        stage,
        season: i % 2 === 0 ? "SS27" : "AW27",
        intent: `${brand.name} ${category.toLowerCase()} for ${brand.market}. Credible evidence, realistic MOQ, no invented certifications.`,
        shortlistFactoryIds,
        selectedFactoryId: ["development", "list", "live"].includes(stage)
          ? shortlistFactoryIds[0]
          : undefined,
      });
    }
  }
  return products;
})();

export function linksForBrand(brandId: string) {
  return TEST_LINKS.filter((l) => l.brandId === brandId);
}

export function productsForBrand(brandId: string) {
  return TEST_PRODUCTS.filter((p) => p.brandId === brandId);
}
