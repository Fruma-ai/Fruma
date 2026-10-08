/**
 * Runtime contexts. Each one owns a PostgreSQL schema (`fruma_${version}`).
 * - demo       — customer-facing story (/app). Update only when test is accepted.
 * - test       — engineering / founder corpus (/app/test). Safe to break and reseeds.
 * - production — live ledger. Not a customer page.
 */
export const FRUMA_VERSION_IDS = ["demo", "test", "production"] as const;
export type FrumaVersion = (typeof FRUMA_VERSION_IDS)[number];

export const FRUMA_VERSIONS = {
  demo: {
    id: "demo" as const,
    label: "Demo",
    path: "/app",
    description:
      "Customer demo with promoted spine — real workbook map, cited shortlist, mill confirm, locked product truth.",
  },
  test: {
    id: "test" as const,
    label: "Test",
    path: "/app/test",
    description:
      "Test environment. Dummy brands, fifty factories, and Lab ingest — safe to break.",
  },
} as const;

export function isFrumaVersion(value: string | null | undefined): value is FrumaVersion {
  return value != null && (FRUMA_VERSION_IDS as readonly string[]).includes(value);
}
