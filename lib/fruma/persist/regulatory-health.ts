/** Review replaces Greenlit when the displayed ratio is below this percentage. */
export const GREENLIT_MINIMUM = 90;

export type RegulatoryHealthCounts = {
  totalCells: number;
  confirmEvents: number;
  certifiedRows: number;
};

export type RegulatoryHealthScore = {
  /** Display percentage from 0.00 to 100.00. */
  score: string;
  percent: number;
  greenlit: boolean;
  totalCells: number;
  confirmEvents: number;
  certifiedRows: number;
};

function finiteCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

/**
 * Current certificate rows divided by source cells.
 * The read query already drops EXPIRED certificates from `certifiedRows`.
 * An empty mill is 0.00. Confirm events on other fields do not move the ratio.
 * Greenlit holds at 90.00. A displayed ratio below 90.00 is Review.
 */
export function regulatoryHealthScore(counts: RegulatoryHealthCounts): RegulatoryHealthScore {
  const totalCells = finiteCount(counts.totalCells);
  const confirmEvents = finiteCount(counts.confirmEvents);
  const certifiedRows = finiteCount(counts.certifiedRows);
  const basisPoints =
    totalCells === 0 ? 0 : Math.round((Math.min(certifiedRows, totalCells) * 10000) / totalCells);
  const clamped = Math.min(10000, Math.max(0, basisPoints));
  const score = (clamped / 100).toFixed(2);
  return {
    score,
    percent: clamped / 100,
    greenlit: Number(score) >= GREENLIT_MINIMUM,
    totalCells,
    confirmEvents,
    certifiedRows,
  };
}
