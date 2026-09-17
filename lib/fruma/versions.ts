/**
 * Fruma ships two product surfaces:
 * - demo  — customer-facing story (/app). Update only when test is accepted.
 * - test  — engineering / founder corpus (/app/test). Safe to break and reseeds.
 */
export type FrumaVersion = "demo" | "test";

export const FRUMA_VERSIONS = {
  demo: {
    id: "demo" as const,
    label: "Demo",
    path: "/app",
    description:
      "Customer demo. Stable story surface. Promote changes here only after the test corpus is accepted.",
  },
  test: {
    id: "test" as const,
    label: "Test",
    path: "/app/test",
    description:
      "Test corpus. Three dummy brands and fifty factories with private hanger files for ingest, mapping and retrieval experiments.",
  },
} as const;

export function isFrumaVersion(value: string | null | undefined): value is FrumaVersion {
  return value === "demo" || value === "test";
}
