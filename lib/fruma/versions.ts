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
      "One product case: brief, cloth from the mill file, an anonymous ask, then lock only what the mill confirmed.",
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
  return value === "demo" || value === "test";
}
