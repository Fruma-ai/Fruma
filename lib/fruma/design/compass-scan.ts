import type { TenantVersion } from "@/lib/fruma/persist/confirm-pending-overrides";

export type CompassDimensions = {
  gsm: number;
  width: number;
};

/** Pull a GSM and a centimetre width out of a design brief. */
export function dimensionsFromPrompt(prompt: string): CompassDimensions | null {
  const gsm = prompt.match(/(\d+)\s*gsm\b/i);
  const width = prompt.match(/(\d+)\s*cm\b/i);
  if (!gsm || !width) return null;
  const gsmValue = Number(gsm[1]);
  const widthValue = Number(width[1]);
  if (!Number.isInteger(gsmValue) || !Number.isInteger(widthValue)) return null;
  if (gsmValue <= 0 || widthValue <= 0) return null;
  return { gsm: gsmValue, width: widthValue };
}

/** Ledger weight and width are stored as text, so the scan sends those strings. */
export function compassScanBody(gsm: number, width: number, tenantVersion: TenantVersion) {
  return {
    targetGsm: `${gsm} GSM`,
    targetWidth: `${width} cm`,
    tenantVersion,
  };
}

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

export function swatchHex(value: string): string | null {
  return HEX_COLOR.test(value) ? value : null;
}
