import type { DepositResult } from "./types";
import { sourceCellId } from "./cell-mutations";
import { columnNumber } from "./columns";
import type { PersistedDepositPointer, PersistedSourceCell } from "../persist";

export function depositPointerFrom(result: DepositResult): PersistedDepositPointer {
  return {
    depositId: result.deposit.depositId,
    supplierOrgId: result.deposit.supplierOrgId,
    filename: result.deposit.filename,
    sha256: result.deposit.sha256,
    byteLength: result.deposit.byteLength,
    receivedAt: result.deposit.receivedAt,
    objectKey: `${result.deposit.depositId}.bin`,
  };
}

/** Parsed cells for the ledger. sourceValue is the mill text; normalizedValue is separate. */
export function sourceCellsFrom(result: DepositResult): PersistedSourceCell[] {
  return result.cells.map((cell) => ({
    id: sourceCellId(result.deposit.depositId, cell.pointer),
    depositId: result.deposit.depositId,
    sheetName: cell.pointer.sheet,
    rowIndex: cell.pointer.row,
    colIndex: columnNumber(cell.pointer.column),
    rawHeader: cell.header,
    sourceValue: cell.sourceValue,
    normalizedValue: cell.normalizedValue ?? null,
  }));
}
