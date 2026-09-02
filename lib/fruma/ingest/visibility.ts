import { IngestException } from "./exceptions";
import {
  FIELD_CLASS_OF,
  VISIBILITY_GRANTED,
  type BaseQuality,
  type BrandVisibleQuality,
  type FieldClass,
  type GrantActor,
  type NamedGrant,
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

export function grantCovers(
  grant: NamedGrant,
  quality: BaseQuality,
  fieldClass: FieldClass,
): boolean {
  if (grant.millOrgId !== quality.supplierOrgId) return false;
  if (grant.fieldClass !== fieldClass) return false;
  const named = new Set(grant.objectIds);
  if (named.has(quality.id)) return true;
  return quality.colourways.some((c) => named.has(c.id));
}

function visibleFields(quality: BaseQuality, classes: Set<FieldClass>) {
  const out: BrandVisibleQuality["fields"] = [];
  const seen = new Set<string>();
  for (const cell of quality.cells) {
    const field = cell.standardField as StandardField | undefined;
    if (!field) continue;
    const fieldClass = FIELD_CLASS_OF[field];
    if (!classes.has(fieldClass)) continue;
    if (fieldClass === "certification") {
      const confirmed = quality.certs.some(
        (c) => c.valueAsWritten === cell.sourceValue && c.millConfirmed,
      );
      if (!confirmed) continue;
    }
    const key = `${field}:${cell.pointer.sheet}:${cell.pointer.row}:${cell.pointer.column}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      field,
      fieldClass,
      standardValue: cell.standardValue ?? cell.sourceValue,
      sourceValue: cell.sourceValue,
      pointer: cell.pointer,
    });
  }
  return out;
}

export function brandView(
  brandOrgId: string,
  qualities: BaseQuality[],
  grants: NamedGrant[],
): BrandVisibleQuality[] {
  const mine = grants.filter((g) => g.brandOrgId === brandOrgId);
  if (!mine.length) return [];

  const visible: BrandVisibleQuality[] = [];
  for (const quality of qualities) {
    const classes = new Set<FieldClass>();
    for (const grant of mine) {
      for (const fieldClass of Object.values(FIELD_CLASS_OF)) {
        if (grantCovers(grant, quality, fieldClass)) classes.add(fieldClass);
      }
    }
    if (!classes.size) continue;
    const colourways = quality.colourways
      .filter((c) =>
        mine.some(
          (g) =>
            g.objectIds.includes(quality.id) || g.objectIds.includes(c.id),
        ),
      )
      .map((c) => ({ id: c.id, colourAsWritten: c.colourAsWritten }));
    visible.push({
      baseQualityId: quality.id,
      visibility: VISIBILITY_GRANTED,
      fields: visibleFields(quality, classes),
      colourways,
      source: { exists: true },
    });
  }
  return visible;
}
