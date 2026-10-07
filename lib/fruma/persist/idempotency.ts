/** Raised when a write would replace an existing ledger row. Callers must not retry by overwriting. */

export type IdempotencyConflict =
  | "deposit_id"
  | "byte_hash"
  | "source_cell"
  | "named_grant"
  | "cell_mutation"
  | "product_truth_fact";

export class IdempotencyException extends Error {
  readonly conflict: IdempotencyConflict;
  readonly details: Record<string, unknown>;

  constructor(
    conflict: IdempotencyConflict,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "IdempotencyException";
    this.conflict = conflict;
    this.details = details;
  }
}

export function isIdempotencyException(err: unknown): err is IdempotencyException {
  return err instanceof IdempotencyException;
}

export function conflictingDeposit(
  existing: { id: string; byteHash: string }[],
  incoming: { id: string; byteHash: string },
): IdempotencyConflict | null {
  if (existing.some((row) => row.id === incoming.id)) return "deposit_id";
  if (existing.some((row) => row.byteHash === incoming.byteHash)) return "byte_hash";
  return null;
}

export function depositIdempotencyException(
  conflict: IdempotencyConflict,
  incoming: { id: string; byteHash: string },
): IdempotencyException {
  if (conflict === "byte_hash") {
    return new IdempotencyException(
      "byte_hash",
      `byte_hash ${incoming.byteHash} already exists. Raw bytes and pointers are immutable.`,
      { byteHash: incoming.byteHash, depositId: incoming.id },
    );
  }
  return new IdempotencyException(
    "deposit_id",
    `Deposit ${incoming.id} already exists. Raw bytes and pointers are immutable.`,
    { depositId: incoming.id, byteHash: incoming.byteHash },
  );
}

type PgErrorLike = {
  code?: string;
  constraint_name?: string;
  table_name?: string;
};

function pgError(err: unknown): PgErrorLike | null {
  if (typeof err !== "object" || err === null) return null;
  return err as PgErrorLike;
}

/** Map a Postgres unique_violation (23505) onto IdempotencyException. Returns null for other errors. */
export function idempotencyFromUniqueViolation(
  err: unknown,
  incoming?: { id: string; byteHash: string },
): IdempotencyException | null {
  const pg = pgError(err);
  if (pg?.code !== "23505") return null;
  const constraint = pg.constraint_name ?? "";
  const table = pg.table_name ?? "";
  if (constraint.includes("byte_hash") || (table === "fruma_deposits" && constraint.includes("byte_hash"))) {
    return depositIdempotencyException("byte_hash", incoming ?? { id: "", byteHash: "" });
  }
  if (table === "fruma_source_cells" || constraint.includes("source_cell")) {
    return new IdempotencyException(
      "source_cell",
      "Source cell already exists. Source values are immutable.",
      { constraint },
    );
  }
  if (table === "fruma_product_truth_facts" || constraint.includes("product_truth_fact")) {
    return new IdempotencyException(
      "product_truth_fact",
      "Product truth fact already exists. Provenance rows are not overwritten.",
      { constraint },
    );
  }
  if (table === "fruma_cell_mutation_events" || constraint.includes("cell_mutation")) {
    return new IdempotencyException(
      "cell_mutation",
      "Cell mutation event already exists. Mutations are append-only.",
      { constraint },
    );
  }
  if (table === "fruma_named_grants" || constraint.includes("named_grant")) {
    return new IdempotencyException(
      "named_grant",
      "Named grant already exists. Grants are immutable.",
      { constraint },
    );
  }
  if (table === "fruma_deposits" || constraint.includes("fruma_deposits")) {
    return depositIdempotencyException("deposit_id", incoming ?? { id: "", byteHash: "" });
  }
  return new IdempotencyException(
    "deposit_id",
    "Unique ledger key already exists. Rows are not overwritten.",
    { constraint, table },
  );
}
