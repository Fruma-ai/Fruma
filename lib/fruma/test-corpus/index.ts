import { TEST_BRANDS } from "./brands";
import { TEST_FACTORIES, factoryById } from "./factories";
import { articleCodesFor, hangerBytesFor, hangerCsvFor, hangerRowsFor } from "./hanger";
import { TEST_LINKS, TEST_PRODUCTS, linksForBrand, productsForBrand } from "./products";
import type { TestCorpusSummary, TestFactory } from "./types";

/**
 * Client-safe barrel: brands / factories / hangers / products only.
 * Do not re-export harness here — it pulls IngestEngine → PrivateByteStore → node:fs
 * and would break `next build` for the Test Lab client page.
 * Server callers: `import { runCorpusHarness } from "@/lib/fruma/test-corpus/harness"`.
 */

export { TEST_BRANDS } from "./brands";
export { TEST_FACTORIES, factoryById } from "./factories";
export { hangerBytesFor, hangerCsvFor, hangerRowsFor, articleCodesFor } from "./hanger";
export { TEST_LINKS, TEST_PRODUCTS, linksForBrand, productsForBrand } from "./products";
export type {
  BrandFactoryLink,
  HangerDialect,
  TestBrand,
  TestCorpusSummary,
  TestFactory,
  TestProduct,
} from "./types";

export const TEST_CORPUS = {
  version: "test" as const,
  brands: TEST_BRANDS,
  factories: TEST_FACTORIES,
  products: TEST_PRODUCTS,
  links: TEST_LINKS,
};

export function testCorpusSummary(): TestCorpusSummary {
  const hangerRows = TEST_FACTORIES.reduce((sum, f) => sum + f.rowCount, 0);
  return {
    version: "test",
    brands: TEST_BRANDS.length,
    factories: TEST_FACTORIES.length,
    products: TEST_PRODUCTS.length,
    hangerRows,
    links: TEST_LINKS.length,
  };
}

/** Load every factory hanger into memory for ingest experiments. */
export function allHangerFiles(): { factory: TestFactory; filename: string; bytes: Uint8Array }[] {
  return TEST_FACTORIES.map((factory) => ({
    factory,
    filename: factory.filename,
    bytes: hangerBytesFor(factory),
  }));
}

export function grantedArticlesFor(brandId: string, factoryId: string) {
  return (
    TEST_LINKS.find((l) => l.brandId === brandId && l.factoryId === factoryId)?.grantedArticles ??
    []
  );
}
