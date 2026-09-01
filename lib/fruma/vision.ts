export type VisualRead = {
  source: "none" | "sample" | "upload";
  look: string;
  colour: string;
  construction: string;
  notes: string[];
};

export const EMPTY_VISUAL: VisualRead = {
  source: "none",
  look: "—",
  colour: "—",
  construction: "—",
  notes: [],
};

export function readDesignImage(src: string | null): VisualRead {
  if (!src) return EMPTY_VISUAL;
  const sample = /polo-sketch|design-ref-polo|\/design\//.test(src);
  if (sample) {
    return {
      source: "sample",
      look: "structured collar, chest pocket, short sleeve",
      colour: "navy",
      construction: "mesh, not piqué",
      notes: [
        "Structured collar annotated on the sketch",
        "Mesh not piqué written on the body",
        "Navy wash and the colour chip",
      ],
    };
  }
  return {
    source: "upload",
    look: "silhouette, collar, colour block",
    colour: "from image",
    construction: "from image",
    notes: [
      "Silhouette taken from the upload",
      "Collar and pocket read from the drawing",
      "Colour block sampled for the listing shot",
    ],
  };
}

export function visualQuery(v: VisualRead) {
  if (v.source === "none") return "";
  return [v.look, v.colour, v.construction].filter((x) => x && x !== "—").join(" ");
}

export function listingRecipe(input: {
  visual: VisualRead;
  fabricName: string;
  structure: string;
  composition: string;
  colour: string;
  title: string;
}) {
  const rows: string[] = [];
  if (input.visual.source === "none") {
    rows.push("No design upload — silhouette taken from the brief");
  } else {
    rows.push(`Look from the design: ${input.visual.look}`);
    rows.push(`Read from the drawing: ${input.visual.construction}`);
  }
  rows.push(`Cloth: ${input.fabricName} · ${input.structure}`);
  rows.push(input.composition);
  rows.push(`Colourway: ${input.colour}`);
  if (input.title && input.title !== "—") {
    rows.push(`Listing title: ${input.title}`);
  }
  rows.push("3:4 packshot crop · no lifestyle · this SKU is not in shops yet");
  return rows;
}
