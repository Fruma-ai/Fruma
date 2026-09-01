import type { Fabric, FabricStructure } from "./types";

const BY_STRUCTURE: Partial<Record<FabricStructure, string>> = {
  mesh: "/products/draft-navy-q75-polo.png",
  pique: "/products/preview-pique-navy-polo.png",
  "single jersey": "/products/preview-jersey-navy-polo.png",
  "slub jersey": "/products/preview-jersey-navy-polo.png",
  interlock: "/products/preview-jersey-navy-polo.png",
  waffle: "/products/preview-waffle-navy-polo.png",
  "rib 1x1": "/products/preview-rib-navy-polo.png",
  "rib 2x2": "/products/preview-rib-navy-polo.png",
  "french terry": "/products/preview-waffle-navy-polo.png",
  loopback: "/products/preview-waffle-navy-polo.png",
  twill: "/products/preview-pique-navy-polo.png",
  corduroy: "/products/preview-pique-navy-polo.png",
};

export function garmentPreviewSrc(fabric: Fabric) {
  return BY_STRUCTURE[fabric.structure] ?? "/products/preview-jersey-navy-polo.png";
}
