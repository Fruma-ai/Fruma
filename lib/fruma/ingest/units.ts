import type { StandardField } from "./types";

/** oz/yd² → g/m². */
export const OUNCE_TO_GSM = 33.905747;

/** inch → centimetre. */
export const INCH_TO_CM = 2.54;

export function convertOunceToGsm(ounces: number): number {
  if (!Number.isFinite(ounces) || ounces < 0) {
    throw new Error("ounces must be a finite, non-negative number");
  }
  return ounces * OUNCE_TO_GSM;
}

export function convertInchToCm(inches: number): number {
  if (!Number.isFinite(inches) || inches < 0) {
    throw new Error("inches must be a finite, non-negative number");
  }
  return inches * INCH_TO_CM;
}

/** Stable decimal for normalized_value. Does not rewrite the mill's source text. */
export function formatConverted(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

const OUNCE_VALUE =
  /^\s*(\d+(?:\.\d+)?)\s*oz(?:\s*\/\s*(?:yd2|yd²|sq\.?\s*yd))?\.?\s*$/i;

const INCH_VALUE = /^\s*(\d+(?:\.\d+)?)\s*(?:"|″|''|in(?:ch(?:es)?)?)\.?\s*$/i;

/**
 * Uniform text for one accepted proposal.
 * Ounces and inches go through the conversion engine. Every other source stays
 * as the staged suggestion. The mill's source text is not rewritten.
 */
export function uniformValue(field: StandardField, sourceValue: string, suggestedValue: string): string {
  return normalizedValueFor(field, sourceValue) ?? suggestedValue.trim();
}

/**
 * Convert only when the standard field is weight or width and the source unit
 * is ounces or inches. Grams, gsm, and centimetres stay source-only.
 */
export function normalizedValueFor(
  field: StandardField | undefined,
  sourceValue: string,
): string | null {
  if (field === "weight") {
    const match = OUNCE_VALUE.exec(sourceValue);
    if (!match) return null;
    return formatConverted(convertOunceToGsm(Number(match[1])));
  }
  if (field === "width") {
    const match = INCH_VALUE.exec(sourceValue);
    if (!match) return null;
    return formatConverted(convertInchToCm(Number(match[1])));
  }
  return null;
}
