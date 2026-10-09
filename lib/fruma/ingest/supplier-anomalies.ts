/** A cell still unmapped, or mapped and still unconfirmed. Presentation only. */
export type SupplierParsingAnomaly = {
  id: string;
  reason: "unmapped" | "unconfirmed";
  header: string;
  sourceValue: string;
  standardField: string | null;
  sheet: string;
  row: number;
  column: string;
};
