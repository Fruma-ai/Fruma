/** Greenlit starts strictly above this displayed percentage. */
export const GREENLIT_ABOVE = 90;

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
 * Certified rows divided by source cells.
 * An empty mill is 0.00. Confirm events on other fields do not move the ratio.
 * The displayed hundredths are the value compared with 90.00.
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
    greenlit: clamped > GREENLIT_ABOVE * 100,
    totalCells,
    confirmEvents,
    certifiedRows,
  };
}
