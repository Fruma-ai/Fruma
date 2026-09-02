import { FILE_RECEIVED_COPY } from "./honesty";

/**
 * Mill-deposit JSON DTO for Workshop / client. Do not import the Node ingest
 * engine from this file — the Route Handler maps deposit results onto this shape.
 */
export const MILL_DEPOSIT_VISIBILITY = "Private" as const;

export type MillDepositQuality = {
  baseQualityId: string;
  millArticleCode: string;
  colourwayIds: string[];
  visibility: typeof MILL_DEPOSIT_VISIBILITY;
};

export type MillDepositException = {
  code: string;
  message: string;
  sheet?: string;
  row?: number;
  column?: string;
};

export type MillDepositResponse = {
  depositId: string;
  filename: string;
  receivedAt: string;
  sha256: string;
  qualities: MillDepositQuality[];
  exceptions: MillDepositException[];
  fileStepSentence: typeof FILE_RECEIVED_COPY;
};

export type MillDepositMapperInput = {
  depositId: string;
  filename: string;
  receivedAt: string;
  sha256: string;
  qualities: Array<{
    baseQualityId: string;
    millArticleCode: string;
    colourwayIds: string[];
  }>;
  exceptions: Array<{
    code: string;
    message: string;
    sheet?: string;
    row?: number;
    column?: string;
  }>;
};

/** Stamps Private + FILE_RECEIVED_COPY. Never copies source bytes or brand payloads. */
export function toMillDepositResponse(input: MillDepositMapperInput): MillDepositResponse {
  return {
    depositId: input.depositId,
    filename: input.filename,
    receivedAt: input.receivedAt,
    sha256: input.sha256,
    qualities: input.qualities.map((q) => ({
      baseQualityId: q.baseQualityId,
      millArticleCode: q.millArticleCode,
      colourwayIds: [...q.colourwayIds],
      visibility: MILL_DEPOSIT_VISIBILITY,
    })),
    exceptions: input.exceptions.map((e) => {
      const item: MillDepositException = { code: e.code, message: e.message };
      if (e.sheet !== undefined) item.sheet = e.sheet;
      if (e.row !== undefined) item.row = e.row;
      if (e.column !== undefined) item.column = e.column;
      return item;
    }),
    fileStepSentence: FILE_RECEIVED_COPY,
  };
}

export const MILL_DEPOSITS_PATH = "/api/mill/deposits";

export type AsSentQualityRow = MillDepositQuality & {
  depositId: string;
  filename: string;
};

export type MillDepositFailure = MillDepositException;

export function fileSizeLabel(bytes: number): string {
  return bytes > 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`;
}

export function isMillDepositResponse(value: unknown): value is MillDepositResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as MillDepositResponse;
  return (
    typeof body.depositId === "string" &&
    typeof body.filename === "string" &&
    typeof body.receivedAt === "string" &&
    typeof body.sha256 === "string" &&
    Array.isArray(body.qualities) &&
    Array.isArray(body.exceptions) &&
    body.fileStepSentence === FILE_RECEIVED_COPY
  );
}

export function millDepositFailureFromBody(
  status: number,
  body: unknown,
): MillDepositFailure {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    if (typeof rec.code === "string" && typeof rec.message === "string") {
      const failure: MillDepositFailure = { code: rec.code, message: rec.message };
      if (typeof rec.sheet === "string") failure.sheet = rec.sheet;
      if (typeof rec.row === "number") failure.row = rec.row;
      if (typeof rec.column === "string") failure.column = rec.column;
      return failure;
    }
    if (typeof rec.error === "string") {
      return {
        code: status === 401 ? "unauthorized" : "deposit_failed",
        message: rec.error,
      };
    }
  }
  return { code: "deposit_failed", message: "Could not deposit that mill file." };
}

export function formatMillDepositException(e: MillDepositException): string {
  const pointer = [
    e.sheet,
    e.row !== undefined ? `row ${e.row}` : undefined,
    e.column !== undefined ? `column ${e.column}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  return pointer ? `${e.code} — ${e.message} (${pointer})` : `${e.code} — ${e.message}`;
}

/** Flatten deposit DTOs. Do not feed these through buildCatalog / catalogToFabric. */
export function asSentQualities(deposits: MillDepositResponse[]): AsSentQualityRow[] {
  return deposits.flatMap((deposit) =>
    deposit.qualities.map((quality) => ({
      ...quality,
      depositId: deposit.depositId,
      filename: deposit.filename,
    })),
  );
}

/**
 * Map's working set after File drop: that deposit's as-sent DTO qualities.
 * Never the seeded VDA catalogue. Latest drop is the working file.
 */
export function asSentMapWorkingSet(
  deposits: MillDepositResponse[],
): { deposit: MillDepositResponse; qualities: AsSentQualityRow[] } | null {
  const deposit = deposits[deposits.length - 1];
  if (!deposit) return null;
  return { deposit, qualities: asSentQualities([deposit]) };
}

/** Review / Catalogue title — same as-sent deposit name Map already uses. */
export function millWorkingFileName(
  deposits: MillDepositResponse[],
  millFile?: { name: string } | null,
): string | null {
  return asSentMapWorkingSet(deposits)?.deposit.filename ?? millFile?.name ?? null;
}

/** Article samples Map may show — millArticleCode as sent, not VDA-####. */
export function asSentArticleSamples(qualities: AsSentQualityRow[]): string {
  const articles = [
    ...new Set(qualities.map((q) => q.millArticleCode).filter(Boolean)),
  ];
  return articles.slice(0, 2).join(" · ") || "—";
}

/** Colourway counts from the DTO. No mill cell source values. */
export function asSentColourwaySamples(qualities: AsSentQualityRow[]): string {
  if (qualities.length === 0) return "—";
  const bits = [...new Set(qualities.map((q) => q.colourwayIds.length))]
    .slice(0, 2)
    .map((n) => `${n} colourway${n === 1 ? "" : "s"}`);
  return bits.join(" · ") || "—";
}

export function depositExceptions(
  deposits: MillDepositResponse[],
): Array<MillDepositException & { filename: string; depositId: string }> {
  return deposits.flatMap((deposit) =>
    deposit.exceptions.map((exception) => ({
      ...exception,
      filename: deposit.filename,
      depositId: deposit.depositId,
    })),
  );
}

/**
 * Workshop File drop. Cookie is the mill session (`fruma_demo`); credentials
 * must include it. Never import the ingest engine from this module.
 */
export async function postMillDeposit(
  file: File,
): Promise<
  { ok: true; deposit: MillDepositResponse } | { ok: false; failure: MillDepositFailure }
> {
  const form = new FormData();
  form.set("file", file);
  let res: Response;
  try {
    res = await fetch(MILL_DEPOSITS_PATH, {
      method: "POST",
      body: form,
      credentials: "include",
    });
  } catch {
    return {
      ok: false,
      failure: { code: "deposit_failed", message: "Could not deposit that mill file." },
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      failure: {
        code: "deposit_failed",
        message: "Could not read the mill deposit response.",
      },
    };
  }

  if (res.ok && isMillDepositResponse(body)) {
    return { ok: true, deposit: body };
  }
  return { ok: false, failure: millDepositFailureFromBody(res.status, body) };
}
