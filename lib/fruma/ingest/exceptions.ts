/** Fail-closed ingest errors. Never used to fabricate a successful catalogue. */

export type IngestExceptionCode =
  | "unparsed_bytes"
  | "uncertain_bytes"
  | "empty_article"
  | "grant_denied"
  | "unknown_deposit"
  | "unknown_grant"
  | "source_bytes_denied";

export class IngestException extends Error {
  readonly code: IngestExceptionCode;
  readonly details: Record<string, unknown>;

  constructor(
    code: IngestExceptionCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "IngestException";
    this.code = code;
    this.details = details;
  }
}

export function isIngestException(err: unknown): err is IngestException {
  return err instanceof IngestException;
}
