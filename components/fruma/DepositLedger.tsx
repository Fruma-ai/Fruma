"use client";

import { useState } from "react";
import { DepositRowCard } from "./DepositRowCard";

export type LedgerDeposit = {
  depositId: string;
  filename: string;
  sha256: string;
  supplierOrgId: string;
  receivedAt: string;
};

export function DepositLedger({ deposits }: { deposits: LedgerDeposit[] }) {
  const [inspectedId, setInspectedId] = useState<string | null>(null);

  if (deposits.length === 0) {
    return (
      <p className="font-mono text-xs text-[#6E7E91]">No file deposits on fruma_demo.</p>
    );
  }

  return (
    <div className="space-y-3">
      {deposits.map((deposit) => {
        const open = inspectedId === deposit.depositId;
        return (
          <div key={deposit.depositId} className="space-y-2">
            <DepositRowCard
              filename={deposit.filename}
              byteHash={deposit.sha256}
              supplierOrgId={deposit.supplierOrgId}
              receivedAt={deposit.receivedAt}
              onInspect={() => setInspectedId(open ? null : deposit.depositId)}
            />
            {open ? (
              <p className="cell-text-mono break-all px-1" role="status">
                Provenance{" "}
                <span className="text-[#F5F5F7]">{deposit.sha256}</span>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
