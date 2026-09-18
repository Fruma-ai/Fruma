import type { Relationship, Stage } from "../demo-data";

export type TestBrand = {
  id: string;
  name: string;
  market: string;
  categoryFocus: string[];
  hq: string;
  summary: string;
};

export type TestFactory = {
  id: string;
  name: string;
  region: string;
  country: string;
  specialties: string[];
  certifications: string[];
  markets: ("UK" | "EU" | "US")[];
  moqM: number;
  leadWeeks: number;
  /** Dialect of their native mill fabric/material file — drives column headers + units. */
  dialect: HangerDialect;
  rowCount: number;
  filename: string;
};

export type HangerDialect =
  | "pt-standard"
  | "it-shirting"
  | "tr-knit"
  | "uk-imperial"
  | "pl-fleece"
  | "messy-mixed";

export type BrandFactoryLink = {
  brandId: string;
  factoryId: string;
  relationship: Relationship;
  /** Qualities from this factory granted to the brand (by article code). Empty = none yet. */
  grantedArticles: string[];
};

export type TestProduct = {
  id: string;
  brandId: string;
  sku: string;
  name: string;
  category: string;
  stage: Stage;
  season: string;
  intent: string;
  shortlistFactoryIds: string[];
  selectedFactoryId?: string;
};

export type TestCorpusSummary = {
  version: "test";
  brands: number;
  factories: number;
  products: number;
  hangerRows: number;
  links: number;
};
