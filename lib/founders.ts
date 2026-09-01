export const FOUNDERS = ["owen", "chris", "sam"] as const;
export type Founder = (typeof FOUNDERS)[number];

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
