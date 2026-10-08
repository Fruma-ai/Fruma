import type { CellPointer, SourceCell, StandardField } from "./types";

/** Append-only map/confirm record. Replay builds the active cell. The source row stays as deposited. */
export type CellMutationAction = "map" | "confirm";

export type CellMutationEvent = {
  eventId: string;
  sourceCellId: string;
  operatorCookie: string;
  actionType: CellMutationAction;
  oldStandardValue: string | null;
  newStandardValue: string | null;
  /**
   * Field written by a map event.
   * A confirm that accepts a staged proposal names the field too.
   * Older confirms leave it null and keep the mapped field.
   */
  standardField: StandardField | null;
  occurredAt: string;
};

export function sourceCellId(depositId: string, pointer: CellPointer): string {
  return `cell:${depositId}:${pointer.row}:${pointer.column}:${encodeURIComponent(pointer.sheet)}`;
}

export function freezeSourceCell(cell: SourceCell): SourceCell {
  return Object.freeze({
    ...cell,
    pointer: Object.freeze({ ...cell.pointer }),
  });
}

/**
 * Active cell = immutable source row, then each mutation in time order.
 * Does not write back onto `cell`.
 */
export function resolveActiveCell(
  cell: SourceCell,
  events: readonly CellMutationEvent[],
): SourceCell {
  const ordered = events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const byTime = a.event.occurredAt.localeCompare(b.event.occurredAt);
      return byTime !== 0 ? byTime : a.index - b.index;
    });

  let standardField = cell.standardField;
  let standardValue = cell.standardValue;
  let confirmed = cell.confirmed === true;

  for (const { event } of ordered) {
    if (event.actionType === "map") {
      if (event.standardField) standardField = event.standardField;
      standardValue = event.newStandardValue ?? undefined;
    } else {
      if (event.standardField) standardField = event.standardField;
      if (event.newStandardValue != null) standardValue = event.newStandardValue;
      confirmed = true;
    }
  }

  return {
    pointer: { ...cell.pointer },
    sourceValue: cell.sourceValue,
    header: cell.header,
    ...(standardField ? { standardField } : {}),
    ...(standardValue !== undefined ? { standardValue } : {}),
    ...(cell.normalizedValue != null ? { normalizedValue: cell.normalizedValue } : {}),
    confirmed,
  };
}
