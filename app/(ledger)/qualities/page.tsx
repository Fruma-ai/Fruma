import { QualityDataTable } from "@/components/fruma/QualityDataTable";
import { qualityRowsFromCells, type QualityRow } from "@/lib/fruma/catalog/quality-rows";
import { isIngestException } from "@/lib/fruma/ingest/exceptions";
import { parseMillBytes } from "@/lib/fruma/ingest/parse";
import { confirmedHeaderOverlays } from "@/lib/fruma/intelligence/overlays";
import { getSpineStore } from "@/lib/fruma/persist";
import { DEMO_SURFACE } from "@/lib/fruma/surfaces";

export const metadata = {
  title: "Material Catalog",
};

export const dynamic = "force-dynamic";

export default async function QualitiesPage() {
  const store = getSpineStore(DEMO_SURFACE);
  const snap = await store.load();
  const overlays = confirmedHeaderOverlays(DEMO_SURFACE);
  const qualities: QualityRow[] = [];
  const unread: string[] = [];

  for (const deposit of snap.deposits) {
    const bytes = await store.getDepositBytes(deposit.depositId);
    if (!bytes) {
      unread.push(`${deposit.filename}: bytes missing`);
      continue;
    }
    try {
      const parsed = parseMillBytes(deposit.filename, bytes, overlays);
      qualities.push(...qualityRowsFromCells(deposit.depositId, parsed.cells));
    } catch (error) {
      const message = isIngestException(error) ? error.message : "Could not read this deposit.";
      unread.push(`${deposit.filename}: ${message}`);
    }
  }

  return (
    <div className="space-y-3">
      {qualities.length === 0 ? (
        <p className="font-mono text-xs text-[#6E7E91]">No material cells on fruma_demo.</p>
      ) : (
        <QualityDataTable qualities={qualities} />
      )}
      {unread.map((line) => (
        <p key={line} className="font-mono text-xs text-[#6E7E91]" role="status">
          {line}
        </p>
      ))}
    </div>
  );
}
