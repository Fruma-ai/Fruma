/** 0-based index → spreadsheet column letter as sent (A, B, …, AA). */
export function columnLetter(index0: number): string {
  if (index0 < 0 || !Number.isInteger(index0)) {
    throw new Error("column index");
  }
  let n = index0;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Spreadsheet column letter → 1-based index (A → 1, Z → 26, AA → 27). */
export function columnNumber(letter: string): number {
  const s = letter.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(s)) throw new Error("column letter");
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export function parseCellRef(ref: string): { column: string; row: number } {
  const m = ref.trim().match(/^([A-Z]+)(\d+)$/i);
  if (!m) throw new Error(`cell ref ${ref}`);
  return { column: m[1]!.toUpperCase(), row: Number(m[2]) };
}
