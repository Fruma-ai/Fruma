import { QualityWorkspace } from "@/components/fruma/QualityWorkspace";
import { qualityRowsFromCells, type QualityRow } from "@/lib/fruma/catalog/quality-rows";
import {
  catalogFieldResolver,
  standardGapsFromCells,
  type StandardGap,
} from "@/lib/fruma/catalog/standard-gaps";
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
  const resolve = catalogFieldResolver(overlays);
  const qualities: QualityRow[] = [];
  const gaps: StandardGap[] = [];
  const unread: string[] = [];

  for (const deposit of snap.deposits) {
    const bytes = await store.getDepositBytes(deposit.depositId);
    if (!bytes) {
      unread.push(`${deposit.filename}: bytes missing`);
      continue;
    }
    try {
      const parsed = parseMillBytes(deposit.filename, bytes, overlays);
      qualities.push(...qualityRowsFromCells(deposit.depositId, parsed.cells, resolve));
      gaps.push(...standardGapsFromCells(deposit.depositId, parsed.cells, resolve));
    } catch (error) {
      const message = isIngestException(error) ? error.message : "Could not read this deposit.";
      unread.push(`${deposit.filename}: ${message}`);
    }
  }

  return <QualityWorkspace rows={qualities} gaps={gaps} unread={unread} />;
}
