import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

/** Mock vectors match the HNSW column width on fruma_material_embeddings. */
export const EMBEDDING_DIMENSIONS = 1536;

const CHUNK_SIZE = 4;
const RECEIVED_AT = "2026-09-01T00:00:00.000Z";
const CONFIRMED_AT = "2026-09-15T00:00:00.000Z";
const CERTIFICATE_EXPIRY_DATE = "2028-12-31T00:00:00.000Z";
const PERCENTAGE_INTEGER = /(?:^|[^\d.])(\d+)\s*%/g;

export const PITCH_COLOURS = ["Navy", "Charcoal", "Ecru"] as const;

export type PitchColour = (typeof PITCH_COLOURS)[number];

export type PitchMaterial = {
  slug: string;
  name: string;
  composition: string;
  /** Fabric weight in grams per square metre. */
  weightGsm: number;
  colour: PitchColour;
  millOrgId: string;
  facilityName: string;
  country: string;
  loomCount: number;
  certificate: string;
};

/** Premium cloth for the fruma_demo investor catalog. Every composition sums to 100. */
export const PITCH_MATERIALS: readonly PitchMaterial[] = [
  {
    slug: "japanese-indigo-selvedge-denim",
    name: "Japanese Indigo Selvedge Denim",
    composition: "100% Cotton",
    weightGsm: 475,
    colour: "Navy",
    millOrgId: "pitch_kuroki_indigo",
    facilityName: "Kuroki Selvedge Mill",
    country: "JP",
    loomCount: 36,
    certificate: "GOTS",
  },
  {
    slug: "italian-recycled-cashmere-flannel",
    name: "Italian Recycled Cashmere Flannel",
    composition: "100% Cashmere",
    weightGsm: 280,
    colour: "Charcoal",
    millOrgId: "pitch_biella_cashmere",
    facilityName: "Filatura di Biella",
    country: "IT",
    loomCount: 18,
    certificate: "RWS",
  },
  {
    slug: "portuguese-organic-cotton-mesh",
    name: "Portuguese Organic Cotton Mesh",
    composition: "98% Cotton / 2% Elastane",
    weightGsm: 145,
    colour: "Ecru",
    millOrgId: "pitch_vale_do_ave_mesh",
    facilityName: "Malhas do Vale do Ave",
    country: "PT",
    loomCount: 48,
    certificate: "GOTS",
  },
  {
    slug: "technical-waterproof-ripstop-nylon",
    name: "Technical Waterproof Ripstop Nylon",
    composition: "100% Nylon",
    weightGsm: 70,
    colour: "Navy",
    millOrgId: "pitch_fukui_ripstop",
    facilityName: "Fukui Ripstop Mill",
    country: "JP",
    loomCount: 24,
    certificate: "bluesign",
  },
  {
    slug: "swiss-cotton-voile",
    name: "Swiss Cotton Voile",
    composition: "100% Cotton",
    weightGsm: 65,
    colour: "Ecru",
    millOrgId: "pitch_st_gallen_voile",
    facilityName: "Weberei St. Gallen",
    country: "CH",
    loomCount: 22,
    certificate: "Oeko-Tex Standard 100",
  },
  {
    slug: "scottish-estate-tweed",
    name: "Scottish Estate Tweed",
    composition: "100% Wool",
    weightGsm: 420,
    colour: "Charcoal",
    millOrgId: "pitch_hawick_tweed",
    facilityName: "Hawick Estate Tweeds",
    country: "GB",
    loomCount: 14,
    certificate: "RWS",
  },
  {
    slug: "french-linen-canvas",
    name: "French Linen Canvas",
    composition: "100% Linen",
    weightGsm: 265,
    colour: "Ecru",
    millOrgId: "pitch_lisieux_linen",
    facilityName: "Toiles de Lisieux",
    country: "FR",
    loomCount: 20,
    certificate: "European Flax",
  },
  {
    slug: "japanese-high-twist-oxford",
    name: "Japanese High-Twist Oxford",
    composition: "100% Cotton",
    weightGsm: 120,
    colour: "Navy",
    millOrgId: "pitch_fukuyama_oxford",
    facilityName: "Fukuyama Shirtings",
    country: "JP",
    loomCount: 40,
    certificate: "Oeko-Tex Standard 100",
  },
  {
    slug: "italian-silk-twill",
    name: "Italian Silk Twill",
    composition: "100% Silk",
    weightGsm: 85,
    colour: "Ecru",
    millOrgId: "pitch_como_silk",
    facilityName: "Tessitura di Como",
    country: "IT",
    loomCount: 12,
    certificate: "Oeko-Tex Standard 100",
  },
  {
    slug: "portuguese-wool-jersey",
    name: "Portuguese Wool Jersey",
    composition: "98% Wool / 2% Elastane",
    weightGsm: 240,
    colour: "Charcoal",
    millOrgId: "pitch_famalicao_jersey",
    facilityName: "Malhas de Famalicão",
    country: "PT",
    loomCount: 32,
    certificate: "RWS",
  },
  {
    slug: "turkish-long-staple-poplin",
    name: "Turkish Long-Staple Poplin",
    composition: "100% Cotton",
    weightGsm: 110,
    colour: "Ecru",
    millOrgId: "pitch_bursa_poplin",
    facilityName: "Bursa Long-Staple Weaving",
    country: "TR",
    loomCount: 54,
    certificate: "GOTS",
  },
  {
    slug: "peruvian-pima-jersey",
    name: "Peruvian Pima Jersey",
    composition: "95% Cotton / 5% Elastane",
    weightGsm: 160,
    colour: "Navy",
    millOrgId: "pitch_lima_pima",
    facilityName: "Hilandería de Lima",
    country: "PE",
    loomCount: 28,
    certificate: "GOTS",
  },
  {
    slug: "english-fine-corduroy",
    name: "English Fine Corduroy",
    composition: "100% Cotton",
    weightGsm: 320,
    colour: "Charcoal",
    millOrgId: "pitch_rochdale_cord",
    facilityName: "Rochdale Corduroy Works",
    country: "GB",
    loomCount: 16,
    certificate: "Oeko-Tex Standard 100",
  },
];

export type PitchSeedSummary = {
  materials: number;
  depositsInserted: number;
  sourceCellsInserted: number;
  embeddingsInserted: number;
  factoryProfilesInserted: number;
  certificateConfirmsInserted: number;
};

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error("chunk size must be at least 1");
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

/** Integer percentages in a composition cell. A missing % mark contributes nothing. */
export function compositionPercentageTotal(composition: string): { found: boolean; total: number } {
  PERCENTAGE_INTEGER.lastIndex = 0;
  let total = 0;
  let found = false;
  for (const match of composition.matchAll(PERCENTAGE_INTEGER)) {
    found = true;
    total += Number(match[1]);
  }
  return { found, total };
}

/** Pitch rows must state percentage integers that add to exactly 100, plus a real weight and colour. */
export function assertPitchCompositions(materials: readonly PitchMaterial[]): void {
  for (const material of materials) {
    const parsed = compositionPercentageTotal(material.composition);
    if (!parsed.found || parsed.total !== 100) {
      throw new Error(`COMPOSITION_INTEGRITY_MISMATCH: ${material.composition}`);
    }
    if (!Number.isInteger(material.weightGsm) || material.weightGsm <= 0) {
      throw new Error(`COMPOSITION_INTEGRITY_MISMATCH: ${material.name} weight`);
    }
    if (!PITCH_COLOURS.includes(material.colour)) {
      throw new Error(`COMPOSITION_INTEGRITY_MISMATCH: ${material.name} colour`);
    }
  }
}

type CatalogCell = {
  id: string;
  depositId: string;
  colIndex: number;
  rawHeader: string;
  sourceValue: string;
  normalizedValue: string;
  eventId: string;
  certificate: string;
};

/** Composition, weight, and colour cells for one cloth. The composition id stays stable across reseeds. */
export function catalogCells(material: PitchMaterial): CatalogCell[] {
  const depositId = `pitch-deposit-${material.slug}`;
  const rows = [
    {
      suffix: "",
      colIndex: 1,
      rawHeader: "composition",
      sourceValue: material.composition,
      normalizedValue: material.name,
    },
    {
      suffix: "-weight",
      colIndex: 2,
      rawHeader: "weight",
      sourceValue: `${material.weightGsm} GSM`,
      normalizedValue: `${material.weightGsm} GSM`,
    },
    {
      suffix: "-colour",
      colIndex: 3,
      rawHeader: "colour",
      sourceValue: material.colour,
      normalizedValue: material.colour,
    },
  ];
  return rows.map((row) => ({
    id: `pitch-cell-${material.slug}${row.suffix}`,
    depositId,
    colIndex: row.colIndex,
    rawHeader: row.rawHeader,
    sourceValue: row.sourceValue,
    normalizedValue: row.normalizedValue,
    eventId: `pitch-cert-${material.slug}${row.suffix}`,
    certificate: material.certificate,
  }));
}

/** Unit-length deterministic stand-in for a hosted embedding model. */
export function mockEmbedding(seed: string): string {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  const values = new Array<number>(EMBEDDING_DIMENSIONS);
  for (let index = 0; index < EMBEDDING_DIMENSIONS; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    values[index] = state / 4294967295 * 2 - 1;
  }
  let norm = 0;
  for (const value of values) norm += value * value;
  const scale = Math.sqrt(norm) || 1;
  return `[${values.map((value) => (value / scale).toFixed(6)).join(",")}]`;
}

function byteHash(material: PitchMaterial): string {
  return createHash("sha256").update(`pitch:${material.slug}:${material.composition}`).digest("hex");
}

async function insertChunk(
  tx: postgres.TransactionSql,
  page: readonly PitchMaterial[],
): Promise<Omit<PitchSeedSummary, "materials">> {
  await tx`SET LOCAL search_path TO fruma_demo, public`;

  const deposits = await tx`
    INSERT INTO fruma_deposits ${tx(
      page.map((material) => ({
        id: `pitch-deposit-${material.slug}`,
        byte_hash: byteHash(material),
        filename: `${material.slug}.csv`,
        received_at: RECEIVED_AT,
        supplier_org_id: material.millOrgId,
        bytes: Buffer.from(
          `${material.name}\n${material.composition}\n${material.weightGsm} GSM\n${material.colour}\n`,
        ),
      })),
      "id",
      "byte_hash",
      "filename",
      "received_at",
      "supplier_org_id",
      "bytes",
    )}
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;

  const cellRows = page.flatMap((material) => catalogCells(material));
  const cells = await tx`
    INSERT INTO fruma_source_cells ${tx(
      cellRows.map((cell) => ({
        id: cell.id,
        deposit_id: cell.depositId,
        sheet_name: "Pitch book",
        row_index: 1,
        col_index: cell.colIndex,
        raw_header: cell.rawHeader,
        source_value: cell.sourceValue,
        normalized_value: cell.normalizedValue,
      })),
      "id",
      "deposit_id",
      "sheet_name",
      "row_index",
      "col_index",
      "raw_header",
      "source_value",
      "normalized_value",
    )}
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;

  const embeddings = await tx.unsafe<{ source_cell_id: string }[]>(
    `INSERT INTO fruma_material_embeddings (source_cell_id, embedding, updated_at)
     SELECT incoming.cell_id, incoming.embedding::public.vector(1536), $3::timestamptz
     FROM unnest($1::text[], $2::text[]) AS incoming(cell_id, embedding)
     WHERE NOT EXISTS (
       SELECT 1
       FROM fruma_material_embeddings existing
       WHERE existing.source_cell_id = incoming.cell_id
     )
     RETURNING source_cell_id`,
    [
      page.map((material) => `pitch-cell-${material.slug}`),
      page.map((material) =>
        mockEmbedding(`${material.name}\n${material.composition}\n${material.weightGsm} GSM\n${material.colour}`),
      ),
      CONFIRMED_AT,
    ],
  );

  const profiles = await tx`
    INSERT INTO fruma_factory_profiles ${tx(
      page.map((material) => ({
        mill_org_id: material.millOrgId,
        facility_name: material.facilityName,
        country_location: material.country,
        active_loom_count: material.loomCount,
        version: 1,
        certificate_expiry_date: CERTIFICATE_EXPIRY_DATE,
      })),
      "mill_org_id",
      "facility_name",
      "country_location",
      "active_loom_count",
      "version",
      "certificate_expiry_date",
    )}
    ON CONFLICT (mill_org_id, version) DO NOTHING
    RETURNING mill_org_id
  `;

  // The health numerator is cells whose latest event is a current cert confirm.
  // Each composition, weight, and colour cell gets one so the mill stays Greenlit.
  const confirms = await tx`
    INSERT INTO fruma_cell_mutation_events ${tx(
      cellRows.map((cell) => ({
        event_id: cell.eventId,
        source_cell_id: cell.id,
        operator_cookie: "pitch-catalog",
        action_type: "confirm",
        old_standard_value: null,
        new_standard_value: cell.certificate,
        standard_field: "cert",
        occurred_at: CONFIRMED_AT,
      })),
      "event_id",
      "source_cell_id",
      "operator_cookie",
      "action_type",
      "old_standard_value",
      "new_standard_value",
      "standard_field",
      "occurred_at",
    )}
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;

  return {
    depositsInserted: deposits.length,
    sourceCellsInserted: cells.length,
    embeddingsInserted: embeddings.length,
    factoryProfilesInserted: profiles.length,
    certificateConfirmsInserted: confirms.length,
  };
}

export async function seedPitchCatalog(): Promise<PitchSeedSummary> {
  assertPitchCompositions(PITCH_MATERIALS);
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required to seed the pitch catalog.");

  const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 5, prepare: false });
  const summary: PitchSeedSummary = {
    materials: PITCH_MATERIALS.length,
    depositsInserted: 0,
    sourceCellsInserted: 0,
    embeddingsInserted: 0,
    factoryProfilesInserted: 0,
    certificateConfirmsInserted: 0,
  };

  try {
    for (const page of chunk(PITCH_MATERIALS, CHUNK_SIZE)) {
      const inserted = await sql.begin((tx) => insertChunk(tx, page));
      summary.depositsInserted += inserted.depositsInserted;
      summary.sourceCellsInserted += inserted.sourceCellsInserted;
      summary.embeddingsInserted += inserted.embeddingsInserted;
      summary.factoryProfilesInserted += inserted.factoryProfilesInserted;
      summary.certificateConfirmsInserted += inserted.certificateConfirmsInserted;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  console.log("[pitch-catalog] schema fruma_demo");
  console.log(`[pitch-catalog] materials ${summary.materials}`);
  console.log(`[pitch-catalog] deposits inserted ${summary.depositsInserted}`);
  console.log(`[pitch-catalog] source cells inserted ${summary.sourceCellsInserted}`);
  console.log(`[pitch-catalog] embeddings inserted ${summary.embeddingsInserted}`);
  console.log(`[pitch-catalog] factory profiles inserted ${summary.factoryProfilesInserted}`);
  console.log(`[pitch-catalog] certificate confirms inserted ${summary.certificateConfirmsInserted}`);
  console.log("[pitch-catalog] composition checks passed at 100");
  console.log("[pitch-catalog] fields composition, weight GSM, colour Navy|Charcoal|Ecru");
  return summary;
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  seedPitchCatalog().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "pitch catalog seed failed";
    console.error(message);
    process.exitCode = 1;
  });
}
