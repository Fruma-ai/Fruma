import { DepositLedger, type LedgerDeposit } from "@/components/fruma/DepositLedger";
import { getSpineStore } from "@/lib/fruma/persist";
import { DEMO_SURFACE } from "@/lib/fruma/surfaces";

export const metadata = {
  title: "File Deposits",
};

export const dynamic = "force-dynamic";

export default async function DepositsPage() {
  const snap = await getSpineStore(DEMO_SURFACE).load();
  const deposits: LedgerDeposit[] = [...snap.deposits]
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .map((deposit) => ({
      depositId: deposit.depositId,
      filename: deposit.filename,
      sha256: deposit.sha256,
      supplierOrgId: deposit.supplierOrgId,
      receivedAt: deposit.receivedAt,
    }));

  return <DepositLedger deposits={deposits} />;
}
