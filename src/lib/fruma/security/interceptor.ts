/** A query that stays inside the transaction-local search_path. */
export type SafeSchemaAccess = {
  isSafe: true;
};

/** The query names fruma_demo, fruma_test, or fruma_production with dot notation. */
export type CrossSchemaInjection = {
  isSafe: false;
  error: "CROSS_SCHEMA_INJECTION_VIOLATION";
};

export type SchemaAccess = SafeSchemaAccess | CrossSchemaInjection;

const PROTECTED_SCHEMA_DOT = ["fruma_production.", "fruma_test.", "fruma_demo."] as const;

/**
 * Reject SQL that qualifies a table with a protected tenant schema.
 * Lowercasing and removing whitespace reveals `fruma_demo.` hidden by spacing.
 */
export function interceptCrossSchemaAccess(queryText: string): SchemaAccess {
  const normalized = queryText.toLowerCase().replace(/\s+/g, "");
  for (const token of PROTECTED_SCHEMA_DOT) {
    if (normalized.includes(token)) {
      return { isSafe: false, error: "CROSS_SCHEMA_INJECTION_VIOLATION" };
    }
  }
  return { isSafe: true };
}
