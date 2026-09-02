import { type Founder, isFounder } from "./founders";

export {
  FOUNDERS,
  FOUNDER_EMAILS,
  isFounder,
  founderFromLogin,
  founderLabel,
  type Founder,
} from "./founders";

export const DEMO_COOKIE = "fruma_demo";

export function passwordFor(who: Founder) {
  const named = {
    owen: process.env.FRUMA_PASS_OWEN,
    chris: process.env.FRUMA_PASS_CHRIS,
    sam: process.env.FRUMA_PASS_SAM,
  }[who]?.trim();
  if (named) return named;
  return process.env.FRUMA_DEMO_PASSWORD?.trim() || "";
}

export async function sessionToken(who: Founder) {
  const data = new TextEncoder().encode(`fruma-gate:${who}:${passwordFor(who)}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return `${who}.${Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

export async function sessionFounder(cookie: string | undefined) {
  if (!cookie) return null;
  const who = cookie.split(".")[0];
  if (!isFounder(who)) return null;
  if (!passwordFor(who)) return null;
  return cookie === (await sessionToken(who)) ? who : null;
}
