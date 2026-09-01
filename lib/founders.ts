export const FOUNDERS = ["owen", "chris", "sam"] as const;
export type Founder = (typeof FOUNDERS)[number];

export const FOUNDER_EMAILS: Record<Founder, string> = {
  owen: "owen@fruma.ai",
  chris: "chris@fruma.ai",
  sam: "sam@fruma.ai",
};

const LABELS: Record<Founder, string> = {
  owen: "Owen",
  chris: "Chris",
  sam: "Sam",
};

export function isFounder(value: string): value is Founder {
  return (FOUNDERS as readonly string[]).includes(value);
}

export function founderLabel(who: Founder) {
  return LABELS[who];
}

export function founderFromLogin(value: string): Founder | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (isFounder(raw)) return raw;
  for (const who of FOUNDERS) {
    if (FOUNDER_EMAILS[who] === raw) return who;
  }
  return null;
}
