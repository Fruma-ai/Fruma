/** A composition string whose percentage parts add to 100, or that states no percentages. */
export type ValidFibreIntegrity = {
  isValid: true;
  total: 100;
};

/** Percentage parts were found and their sum is not 100. */
export type InvalidFibreIntegrity = {
  isValid: false;
  total: number;
  error: "COMPOSITION_INTEGRITY_MISMATCH";
};

export type FibreIntegrity = ValidFibreIntegrity | InvalidFibreIntegrity;

const PERCENTAGE_INTEGER = /(?:^|[^\d.])(\d+)\s*%/g;

/**
 * Sum the integer percentages in a spreadsheet composition cell.
 * "80% Cotton / 20% Nylon" contributes 80 and 20.
 * A cell with no percentage integers passes. Any other sum is a supplier mismatch.
 */
export function validateFibreIntegrity(composition: string): FibreIntegrity {
  PERCENTAGE_INTEGER.lastIndex = 0;
  let total = 0;
  let found = false;
  for (const match of composition.matchAll(PERCENTAGE_INTEGER)) {
    found = true;
    total += Number(match[1]);
  }
  if (!found || total === 100) {
    return { isValid: true, total: 100 };
  }
  return { isValid: false, total, error: "COMPOSITION_INTEGRITY_MISMATCH" };
}
