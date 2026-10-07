/**
 * SPEC 6 first ingest slice — Node-only engine behind the Workshop UX.
 * Do not import this module from client components or the catalogue reducer.
 */
export { IngestEngine } from "./engine";
export { resolveActiveCell, sourceCellId } from "./cell-mutations";
export type { CellMutationEvent } from "./cell-mutations";
export { IngestException, isIngestException } from "./exceptions";
export { handleMillDepositRequest, handleMillDepositsAuditRequest, SYNTHETIC_MILL_ORG_ID, millIngestEngineFor, resetMillIngestEnginesForTests } from "./deposits-http";
export { handleMillQualitiesRequest, replayActiveCell } from "./qualities-http";
export type { ActiveMaterialQuality, MillQualitiesHttpResult } from "./qualities-http";
export type { MillDepositHttpResult } from "./deposits-http";
export { baseQualityId, colourwayId, articleAsWritten, unknownHeaderExceptions } from "./identity";
export { parseMillBytes, detectMillFormat } from "./parse";
export { resolveHeaderField, BUILTIN_HEADER_ALIASES } from "./header-map";
export { convertInchToCm, convertOunceToGsm, normalizedValueFor } from "./units";
export { buildXlsx } from "./parse-xlsx";
export { PrivateByteStore } from "./store";
export { sha256Hex } from "./hash";
export {
  VISIBILITY_PRIVATE,
  VISIBILITY_GRANTED,
  VISIBILITY_REVOKED,
  GRANT_STATUS_GRANTED,
  GRANT_STATUS_REVOKED,
  DEFAULT_DENY_FIELD_CLASSES,
  FIELD_CLASS_OF,
  STANDARD_FIELDS,
  isStandardField,
} from "./types";
export type {
  BaseQuality,
  BrandVisibleQuality,
  CellPointer,
  DepositResult,
  FieldClass,
  StandardField,
  GrantActor,
  NamedGrant,
  SourceCell,
  Visibility,
} from "./types";
