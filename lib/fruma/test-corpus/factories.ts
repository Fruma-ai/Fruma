import type { HangerDialect, TestFactory } from "./types";

const ROOTS = [
  "Vale do Ave",
  "Ribeira",
  "Serra",
  "Lima",
  "Tâmega",
  "Minho",
  "Arno",
  "Prato",
  "Biella",
  "Como",
  "Bursa",
  "Izmir",
  "Ege",
  "Denizli",
  "Lodz",
  "Braga",
  "Guimarães",
  "Famalicão",
  "Vicenza",
  "Treviso",
  "Porto",
  "Aveiro",
  "Coimbra",
  "Brescia",
  "Bergamo",
] as const;

const REGIONS = [
  ["Northern Portugal", "Portugal"],
  ["Tuscany", "Italy"],
  ["Piedmont", "Italy"],
  ["Aegean", "Türkiye"],
  ["Lower Silesia", "Poland"],
  ["Greater Manchester", "United Kingdom"],
] as const;

const SPECIALTY_SETS = [
  ["fine cotton", "jersey", "interlock"],
  ["merino", "wool blends", "double knit"],
  ["linen", "hemp blends", "summer weights"],
  ["warp knit", "mesh", "technical cotton"],
  ["brushed fleece", "sweat", "heavy jersey"],
  ["viscose", "modal", "cellulosics"],
  ["woven shirting", "poplin", "oxford"],
  ["outerwear", "wool coating", "compact twill"],
] as const;

const CERT_SETS = [
  ["OEKO-TEX Standard 100", "GRS"],
  ["GOTS", "OEKO-TEX Standard 100"],
  ["RWS", "ZDHC Supplier to Zero"],
  ["BCI chain-of-custody", "ISO 14001"],
  ["FSC", "OEKO-TEX Standard 100"],
  ["OEKO-TEX Standard 100"],
  [],
] as const;

const DIALECTS: HangerDialect[] = [
  "pt-standard",
  "it-shirting",
  "tr-knit",
  "uk-imperial",
  "pl-fleece",
  "messy-mixed",
];

const SUFFIX = ["Works", "Lab", "Mill", "Group", "Textiles", "Knit"] as const;

function slug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Fifty fixed factories for the test version. Deterministic IDs and dialects. */
export const TEST_FACTORIES: TestFactory[] = Array.from({ length: 50 }, (_, i) => {
  const root = ROOTS[i % ROOTS.length];
  const region = REGIONS[i % REGIONS.length];
  const name = `${root} ${SUFFIX[i % SUFFIX.length]}`;
  const dialect = DIALECTS[i % DIALECTS.length];
  const id = `factory-${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    name,
    region: region[0],
    country: region[1],
    specialties: [...SPECIALTY_SETS[i % SPECIALTY_SETS.length]],
    certifications: [...CERT_SETS[i % CERT_SETS.length]],
    markets:
      i % 5 === 0
        ? ["UK", "EU", "US"]
        : i % 3 === 0
          ? ["UK", "EU"]
          : i % 2 === 0
            ? ["EU"]
            : ["UK"],
    moqM: 200 + ((i * 55) % 1200),
    leadWeeks: 3 + (i % 10),
    dialect,
    rowCount: 16 + ((i * 3) % 25),
    filename: `${slug(name)}-hanger.csv`,
  };
});

export function factoryById(id: string) {
  return TEST_FACTORIES.find((f) => f.id === id);
}
