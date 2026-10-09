/** A cell still unmapped, or mapped and still unconfirmed. */
export type SupplierParsingAnomaly = {
  id: string;
  reason: "unmapped" | "unconfirmed";
  header: string;
  sourceValue: string;
  standardField: string | null;
  /** Source cell id when this row can be confirmed. */
  cellId?: string;
  sheet: string;
  row: number;
  column: string;
};
