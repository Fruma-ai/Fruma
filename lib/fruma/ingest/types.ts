/** Isolated SPEC 6 ingest types. Not the Workshop catalogue reducer. */

export const VISIBILITY_PRIVATE = "Private" as const;
export const VISIBILITY_GRANTED = "Granted" as const;
export const VISIBILITY_REVOKED = "Revoked" as const;
export type Visibility =
  | typeof VISIBILITY_PRIVATE
  | typeof VISIBILITY_GRANTED
  | typeof VISIBILITY_REVOKED;

export const GRANT_STATUS_GRANTED = VISIBILITY_GRANTED;
export const GRANT_STATUS_REVOKED = VISIBILITY_REVOKED;
export type GrantStatus = typeof GRANT_STATUS_GRANTED | typeof GRANT_STATUS_REVOKED;

export const FIELD_CLASSES = [
  "identity",
  "technical",
  "commercial",
  "customer_specific",
  "certification",
] as const;
export type FieldClass = (typeof FIELD_CLASSES)[number];

/** Commercial and customer-specific start denied unless a grant names that class. */
export const DEFAULT_DENY_FIELD_CLASSES: readonly FieldClass[] = [
  "commercial",
  "customer_specific",
];

export type StandardField =
  | "article"
  | "construction"
  | "composition"
  | "weight"
  | "width"
  | "colour"
  | "moq"
  | "customer"
  | "cert";

export const FIELD_CLASS_OF: Record<StandardField, FieldClass> = {
  article: "identity",
  construction: "technical",
  composition: "technical",
  weight: "technical",
  width: "technical",
  colour: "technical",
  moq: "commercial",
  customer: "customer_specific",
  cert: "certification",
};

export type CellPointer = {
  /** Workbook sheet name as written; for CSV, the filename as sent. */
  sheet: string;
  /** 1-based row as in the file. */
  row: number;
  /** Spreadsheet column letter as sent (A, B, …). */
  column: string;
};

export type SourceCell = {
  pointer: CellPointer;
  /** Immutable mill value. Standard mapping never writes here. */
  sourceValue: string;
  header: string;
  standardField?: StandardField;
  /** Derived / mapped value. Must not replace sourceValue. */
  standardValue?: string;
  confirmed?: boolean;
};

export type DepositMeta = {
  depositId: string;
  supplierOrgId: string;
  filename: string;
  receivedAt: string;
  sha256: string;
  byteLength: number;
  visibility: Visibility;
};

export type Colourway = {
  id: string;
  baseQualityId: string;
  /** Colour as written on the mill row. Child of BaseQuality, not identity. */
  colourAsWritten: string;
  sourceCell: SourceCell;
};

export type WidthAttribute = {
  /** Width is an attribute, not BaseQuality identity. */
  valueAsWritten: string;
  sourceCell: SourceCell;
};

export type MillConfirmedCert = {
  valueAsWritten: string;
  sourceCell: SourceCell;
  millConfirmed: true;
};

export type BaseQuality = {
  id: string;
  /** Identity D1: (supplier_org_id, mill_article_code as written). */
  supplierOrgId: string;
  millArticleCode: string;
  visibility: Visibility;
  depositId: string;
  colourways: Colourway[];
  widths: WidthAttribute[];
  cells: SourceCell[];
  /** Only mill-confirmed certs. Never inferred from fibre / "organic". */
  certs: MillConfirmedCert[];
};

export type RowException = {
  code: IngestExceptionCode;
  message: string;
  pointer?: CellPointer;
};

export type DepositResult = {
  deposit: DepositMeta;
  parsed: true;
  cells: SourceCell[];
  qualities: BaseQuality[];
  exceptions: RowException[];
};

export type NamedGrant = {
  grantId: string;
  millOrgId: string;
  brandOrgId: string;
  objectIds: string[];
  fieldClass: FieldClass;
  status: GrantStatus;
};

export type GrantActor =
  | { kind: "named_grant"; millOrgId: string }
  | { kind: "operator_cookie" }
  | { kind: "confidence"; value: number }
  | { kind: "approve_all" };

export type SourceExistsPointer = {
  exists: true;
};

export type BrandVisibleField = {
  field: StandardField;
  fieldClass: FieldClass;
  standardValue: string;
  sourceValue: string;
  pointer: CellPointer;
  /** Brand payload is mill-confirmed only. Unconfirmed cells are omitted. */
  confirmed: true;
};

export type BrandVisibleQuality = {
  baseQualityId: string;
  visibility: typeof VISIBILITY_GRANTED;
  fields: BrandVisibleField[];
  colourways: { id: string; colourAsWritten: string }[];
  /** Brand may know a source file exists. Never the private bytes. */
  source: SourceExistsPointer;
};

export type PrivateBytes = {
  bytes: Uint8Array;
  sha256: string;
  filename: string;
  receivedAt: string;
};
