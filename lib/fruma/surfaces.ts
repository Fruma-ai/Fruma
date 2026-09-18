import type { FrumaVersion } from "./versions";

/**
 * Hard rules for keeping Demo / production story intact while Test evolves.
 * Import these helpers instead of hard-coding "demo" / "test" strings in APIs.
 */

export const DEMO_SURFACE: FrumaVersion = "demo";
export const TEST_SURFACE: FrumaVersion = "test";

/** Browser storage must never share keys across surfaces. */
export function surfaceStorageKey(surface: FrumaVersion, name: string): string {
  return `fruma:${surface}:${name}`;
}

/** Synthetic mill org for Workshop deposits — partitioned by surface. */
export function surfaceMillOrgId(surface: FrumaVersion): string {
  return surface === "test" ? "org_mill_test" : "org_mill_synthetic";
}

export function parseFrumaSurface(
  value: string | null | undefined,
): FrumaVersion | null {
  if (value === "demo" || value === "test") return value;
  return null;
}

/** Default for legacy mill deposit route: demo, so Test experiments stay off Demo. */
export function surfaceFromRequest(
  request: Request,
  formValue?: FormDataEntryValue | null,
): FrumaVersion {
  const header = parseFrumaSurface(request.headers.get("x-fruma-version"));
  if (header) return header;
  if (typeof formValue === "string") {
    const fromForm = parseFrumaSurface(formValue);
    if (fromForm) return fromForm;
  }
  return DEMO_SURFACE;
}
