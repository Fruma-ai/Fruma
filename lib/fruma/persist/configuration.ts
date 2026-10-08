/**
 * Raised when a ledger step needs Postgres configuration and must not open a local folder.
 */
export class MissingConfigurationException extends Error {
  constructor(message = "DATABASE_URL is required for the production ledger.") {
    super(message);
    this.name = "MissingConfigurationException";
  }
}

export function isMissingConfigurationException(err: unknown): err is MissingConfigurationException {
  return err instanceof MissingConfigurationException;
}

/** A file root that would stand in for the production schema. */
export function isProductionFileSpineRoot(root: string): boolean {
  const normalized = root.replace(/\\/g, "/").replace(/\/+$/, "");
  if (normalized.endsWith("/fruma-production")) return true;
  const dataDir = process.env.FRUMA_DATA_DIR?.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  return Boolean(dataDir) && normalized === `${dataDir}/production`;
}

export function assertFileSpineRootAllowed(root: string): void {
  if (process.env.DATABASE_URL?.trim()) return;
  if (!isProductionFileSpineRoot(root)) return;
  throw new MissingConfigurationException(
    "DATABASE_URL is required for the production ledger.",
  );
}

export function databaseUrlOrThrow(surface: string): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  if (surface === "production") {
    throw new MissingConfigurationException(
      "DATABASE_URL is required for the production ledger.",
    );
  }
  throw new MissingConfigurationException(
    `DATABASE_URL is required for the ${surface} Postgres ledger.`,
  );
}
