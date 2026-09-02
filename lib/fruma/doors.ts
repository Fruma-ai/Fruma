import type { Metadata } from "next";

export type DoorRole = "mills" | "brands" | "retailers";
export type DoorKind = "mill" | "brand" | "retailer";

export const DOOR_COPY = {
  mills:
    "The catalogue you already have. Fruma maps the files you already keep. You do not replace your systems. You keep the file. You confirm the map. Unknown stays unknown. Qualities become findable once on the standard — not when a file is dropped.",
  brands:
    "One way to read many mill catalogues. Comparable records, source still on the record. Search is for qualities on the standard, not seed, and not until claimed + mapped + confirmed as sent.",
  retailers:
    "Facts stay with the mill that sent them. Destination may reformat. It does not rewrite the file.",
} as const;

export const DOORS: Record<
  DoorRole,
  {
    stack: string;
    kind: DoorKind;
    title: string;
    description: string;
    copy: (typeof DOOR_COPY)[DoorRole];
    path: `/${DoorRole}`;
  }
> = {
  mills: {
    stack: "Mills",
    kind: "mill",
    title: "Mills",
    description: DOOR_COPY.mills,
    copy: DOOR_COPY.mills,
    path: "/mills",
  },
  brands: {
    stack: "Brands",
    kind: "brand",
    title: "Brands",
    description: DOOR_COPY.brands,
    copy: DOOR_COPY.brands,
    path: "/brands",
  },
  retailers: {
    stack: "Retailers",
    kind: "retailer",
    title: "Retailers",
    description: DOOR_COPY.retailers,
    copy: DOOR_COPY.retailers,
    path: "/retailers",
  },
};

export function doorMetadata(role: DoorRole): Metadata {
  const door = DOORS[role];
  return {
    title: door.title,
    description: door.description,
  };
}
