import { IngestException } from "./exceptions";
import {
  FIELD_CLASS_OF,
  GRANT_STATUS_GRANTED,
  VISIBILITY_GRANTED,
  type BaseQuality,
  type BrandVisibleField,
  type BrandVisibleQuality,
  type Colourway,
  type GrantActor,
  type NamedGrant,
  type SourceCell,
  type StandardField,
} from "./types";

const CONFIDENCE_AUTO_THRESHOLD = 86;

export function assertNamedGrantActor(actor: GrantActor, millOrgId: string): void {
  if (actor.kind === "operator_cookie") {
    throw new IngestException(
      "grant_denied",
      "Operator cookie cannot create Granted visibility.",
    );
  }
  if (actor.kind === "approve_all") {
    throw new IngestException(
      "grant_denied",
      "Approve-all cannot create Granted visibility.",
    );
  }
  if (actor.kind === "confidence") {
    throw new IngestException(
      "grant_denied",
      actor.value >= CONFIDENCE_AUTO_THRESHOLD
        ? `Confidence ${actor.value} cannot create Granted visibility.`
        : "Confidence scoring cannot create Granted visibility.",
    );
  }
  if (actor.kind !== "named_grant" || actor.millOrgId !== millOrgId) {
    throw new IngestException(
      "grant_denied",
      "Grant must be a named mill org → named brand org grant.",
    );
  }
}

export function isCurrentGrant(grant: NamedGrant): boolean {
  return grant.status === GRANT_STATUS_GRANTED;
}

function namedColourways(grant: NamedGrant, quality: BaseQuality): Colourway[] {
  return quality.colourways.filter((c) => grant.objectIds.includes(c.id));
}

/** Quality-scoped grant covers every child. Colourway-scoped grant covers only those children. */
export function grantScope(
  grant: NamedGrant,
  quality: BaseQuality,
): { covers: boolean; colourways: Colourway[] | "all" } {
  if (grant.millOrgId !== quality.supplierOrgId) return { covers: false, colourways: [] };
  if (grant.objectIds.includes(quality.id)) return { covers: true, colourways: "all" };
  const colourways = namedColourways(grant, quality);
  return { covers: colourways.length > 0, colourways };
}

function rowKey(cell: SourceCell): string {
  return `${cell.pointer.sheet}:${cell.pointer.row}`;
}

function cellsInScope(quality: BaseQuality, colourways: Colourway[] | "all"): SourceCell[] {
  if (colourways === "all") return quality.cells;
  const rows = new Set(colourways.map((c) => rowKey(c.sourceCell)));
  return quality.cells.filter((c) => rows.has(rowKey(c)));
}

function asBrandField(cell: SourceCell, quality: BaseQuality): BrandVisibleField | null {
  if (!cell.confirmed) return null;
  const field = cell.standardField as StandardField | undefined;
  if (!field) return null;
  const fieldClass = FIELD_CLASS_OF[field];
  if (fieldClass === "certification") {
    const millConfirmed = quality.certs.some(
      (c) => c.valueAsWritten === cell.sourceValue && c.millConfirmed,
    );
    if (!millConfirmed) return null;
  }
  return {
    field,
    fieldClass,
    standardValue: cell.standardValue ?? cell.sourceValue,
    sourceValue: cell.sourceValue,
    pointer: cell.pointer,
    confirmed: true,
  };
}

export function brandView(
  brandOrgId: string,
  qualities: BaseQuality[],
  grants: NamedGrant[],
): BrandVisibleQuality[] {
  const mine = grants.filter((g) => g.brandOrgId === brandOrgId && isCurrentGrant(g));
  if (!mine.length) return [];

  const visible: BrandVisibleQuality[] = [];
  for (const quality of qualities) {
    const fields: BrandVisibleField[] = [];
    const seen = new Set<string>();
    const colourwayById = new Map<string, { id: string; colourAsWritten: string }>();

    for (const grant of mine) {
      const scope = grantScope(grant, quality);
      if (!scope.covers) continue;
      const scopedColourways =
        scope.colourways === "all" ? quality.colourways : scope.colourways;
      for (const cw of scopedColourways) {
        colourwayById.set(cw.id, { id: cw.id, colourAsWritten: cw.colourAsWritten });
      }
      for (const cell of cellsInScope(quality, scope.colourways)) {
        if (cell.standardField && FIELD_CLASS_OF[cell.standardField] !== grant.fieldClass) {
          continue;
        }
        const field = asBrandField(cell, quality);
        if (!field) continue;
        const key = `${field.field}:${field.pointer.sheet}:${field.pointer.row}:${field.pointer.column}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fields.push(field);
      }
    }

    const covered = mine.some((g) => grantScope(g, quality).covers);
    if (!covered) continue;

    visible.push({
      baseQualityId: quality.id,
      visibility: VISIBILITY_GRANTED,
      fields,
      colourways: [...colourwayById.values()],
      source: { exists: true },
    });
  }
  return visible;
}
