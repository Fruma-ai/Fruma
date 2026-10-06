/**
 * Apparel stage gates for Fruma.
 *
 * A garment still moves concept → cloth → pattern → sample → cut → sew →
 * finish → inspect → ship. Fruma does not run that floor. It clears the
 * information gates from factory data already on file, and it carries the
 * record through the stages that stay physical.
 *
 * A physical gate must never come back "ready". Ready means the data exit
 * is met. It does not mean the garment exists.
 */

export type ApparelGateId =
  | "concept"
  | "materials"
  | "pattern"
  | "sample"
  | "cutting"
  | "assembly"
  | "finishing"
  | "inspection"
  | "dispatch";

export type GateOwns = "data" | "physical";
export type GateStatus = "waiting" | "ready" | "gap" | "physical";

export type CaseSignals = {
  hasBrief: boolean;
  /** Named colour is MUST. Open means the designer refused a default shade. */
  colour: "named" | "open" | "unset";
  clothCited: boolean;
  millAsked: boolean;
  millAnswered: boolean;
  /** Null until the mill answers. */
  clothAvailable: boolean | null;
  sourceLocked: boolean;
  compositionOnFile: boolean;
  constructionOnFile: boolean;
  weightOnFile: boolean;
  widthOnFile: boolean;
  /** Claim the record must not treat as proved. Does not block the cloth. */
  claimGap: string | null;
};

export type GateAssessment = {
  id: ApparelGateId;
  stage: number;
  title: string;
  owns: GateOwns;
  agent: string | null;
  status: GateStatus;
  detail: string;
};

type GateDef = {
  id: ApparelGateId;
  stage: number;
  title: string;
  owns: GateOwns;
  agent: string | null;
};

export const APPAREL_GATES: readonly GateDef[] = [
  { id: "concept", stage: 1, title: "Design and concept", owns: "data", agent: "brief" },
  { id: "materials", stage: 2, title: "Materials", owns: "data", agent: "retrieval" },
  { id: "pattern", stage: 3, title: "Pattern and grading", owns: "physical", agent: null },
  { id: "sample", stage: 4, title: "Sample", owns: "physical", agent: null },
  { id: "cutting", stage: 5, title: "Cutting", owns: "physical", agent: null },
  { id: "assembly", stage: 6, title: "Sewing and assembly", owns: "physical", agent: null },
  { id: "finishing", stage: 7, title: "Labels and finishing", owns: "data", agent: "destination" },
  { id: "inspection", stage: 8, title: "Inspection", owns: "physical", agent: "evidence" },
  { id: "dispatch", stage: 9, title: "Pack and ship", owns: "physical", agent: null },
] as const;

function clothConstraints(signals: CaseSignals): string {
  const onFile = [
    signals.constructionOnFile ? "construction" : null,
    signals.compositionOnFile ? "fibre" : null,
    signals.weightOnFile ? "weight" : null,
    signals.widthOnFile ? "width" : null,
  ].filter(Boolean);
  if (onFile.length === 0) return "Cloth constraints are not on file yet.";
  const missing = signals.widthOnFile ? "" : " Width is missing, so waste cannot be estimated from the file.";
  return `On file for this cloth: ${onFile.join(", ")}.${missing}`;
}

function assessOne(gate: GateDef, signals: CaseSignals): GateAssessment {
  const base = { id: gate.id, stage: gate.stage, title: gate.title, owns: gate.owns, agent: gate.agent };

  if (gate.id === "concept") {
    if (!signals.hasBrief || signals.colour === "unset") {
      return { ...base, status: "waiting", detail: "Write the product and say whether colour is a must or left open." };
    }
    const colour =
      signals.colour === "open"
        ? "Colour is open, so no shade is invented."
        : "Colour is a must.";
    return {
      ...base,
      status: "ready",
      detail: `The brief is the start of the tech pack. ${colour} Measurements, stitches, and grades are not filled in from a guess.`,
    };
  }

  if (gate.id === "materials") {
    if (!signals.clothCited) {
      return {
        ...base,
        status: "waiting",
        detail: "No mill cloth cited yet. Fruma searches fabric books, not garment catalogues.",
      };
    }
    if (!signals.millAnswered) {
      return {
        ...base,
        status: "gap",
        detail: signals.millAsked
          ? "The mill has been asked. MOQ and lead on the file stay historical until they answer."
          : "Cloth is cited. MOQ and lead on the file stay historical until the mill confirms them.",
      };
    }
    if (signals.clothAvailable === false) {
      return { ...base, status: "gap", detail: "The mill says this cloth is not available, so it cannot be the source." };
    }
    if (!signals.sourceLocked) {
      return {
        ...base,
        status: "gap",
        detail: "Current terms are in. Lock them onto the product before anyone cuts cloth.",
      };
    }
    const claim = signals.claimGap ? ` ${signals.claimGap}` : "";
    return {
      ...base,
      status: "ready",
      detail: `Source is locked to a mill quality with timestamped commercials.${claim}`,
    };
  }

  if (gate.id === "finishing") {
    if (!signals.sourceLocked) {
      return {
        ...base,
        status: "waiting",
        detail: "Fibre and origin for the label come from the locked mill quality. Care copy is not invented. Pressing stays at the factory.",
      };
    }
    if (!signals.compositionOnFile) {
      return {
        ...base,
        status: "gap",
        detail: "Composition is not on the locked record, so a content label cannot be written.",
      };
    }
    return {
      ...base,
      status: "ready",
      detail: "Fibre on the label can be taken from the mill file. Care instructions stay blank until someone supplies them. Pressing stays at the factory.",
    };
  }

  if (!signals.sourceLocked) {
    return {
      ...base,
      status: "waiting",
      detail: "This stays at the factory. It waits until the cloth source is locked, so the work is for a known quality.",
    };
  }

  if (gate.id === "pattern") {
    return {
      ...base,
      status: "physical",
      detail: `Grading stays in the pattern room. ${clothConstraints(signals)}`,
    };
  }
  if (gate.id === "sample") {
    return {
      ...base,
      status: "physical",
      detail: "The sample is cut from the locked article. Fit comments can come back onto the record. Fruma does not fit the garment.",
    };
  }
  if (gate.id === "cutting") {
    return {
      ...base,
      status: "physical",
      detail: `Marker making and cutting stay on the floor. ${clothConstraints(signals)} Fruma does not run the cutter.`,
    };
  }
  if (gate.id === "assembly") {
    return {
      ...base,
      status: "physical",
      detail: signals.constructionOnFile
        ? "Sewing stays on the line. Construction as written is context for that line, not a sew plan."
        : "Sewing stays on the line. Construction is not on file, so the line has no cloth context from Fruma.",
    };
  }
  if (gate.id === "inspection") {
    const evidenced = signals.compositionOnFile
      ? "Fibre on the record can be checked against the label."
      : "Fibre is not on the record, so that check is open.";
    const claim = signals.claimGap ? ` ${signals.claimGap}` : "";
    return {
      ...base,
      status: "physical",
      detail: `${evidenced}${claim} Seam strength, measurements, and wear are physical tests. A full record is not a QC pass.`,
    };
  }

  return {
    ...base,
    status: "physical",
    detail: signals.compositionOnFile
      ? "Shipping stays with the factory. Fibre on the record is what the carton has to declare, so it is not typed again."
      : "Shipping stays with the factory. Fibre is missing, so the content declaration is not ready.",
  };
}

export function assessApparelGates(signals: CaseSignals): GateAssessment[] {
  return APPAREL_GATES.map((gate) => assessOne(gate, signals));
}
