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
