"use client";

import { useState } from "react";
import {
  FactoryIngestWorkbench,
  type LedgerSchemaName,
} from "@/components/fruma/FactoryIngestWorkbench";
import { WorkspaceShell } from "@/components/fruma/WorkspaceShell";
import {
  formatMillDepositException,
  isMillDepositResponse,
} from "@/lib/fruma/mill-deposit";

type DepositReceipt = {
  depositId: string;
  filename: string;
  sha256: string;
  receivedAt: string;
  qualityCount: number;
  exceptions: string[];
  sentence: string;
};

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    /* The status line is enough when the body is not JSON. */
  }
  return fallback;
}

export default function DepositsWorkspacePage() {
  const [activeSchema, setActiveSchema] = useState<LedgerSchemaName>("demo");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DepositReceipt | null>(null);

  function selectSchema(next: LedgerSchemaName) {
    setActiveSchema(next);
    setStatus(null);
    setReceipt(null);
  }

  async function handleFileProcess(file: File) {
    setIsProcessing(true);
    setStatus(null);
    setReceipt(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/mill/deposits", {
        method: "POST",
        headers: { "x-fruma-version": activeSchema },
        body,
      });
      if (!response.ok) {
        setStatus(await errorMessage(response, "The workbook was not appended."));
        return;
      }
      const data: unknown = await response.json();
      if (!isMillDepositResponse(data)) {
        setStatus("The ledger accepted the file, but the receipt was incomplete.");
        return;
      }
      setReceipt({
        depositId: data.depositId,
        filename: data.filename,
        sha256: data.sha256,
        receivedAt: data.receivedAt,
        qualityCount: data.qualities.length,
        exceptions: data.exceptions.map(formatMillDepositException),
        sentence: data.fileStepSentence,
      });
      setStatus(`${data.filename} appended to fruma_${activeSchema}.`);
    } catch (err) {
      console.error("Mill deposit failed:", err);
      setStatus("The workbook was not appended.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <WorkspaceShell activeVersion={activeSchema} activeOntology="Retail/Apparel">
      <div className="space-y-6">
        <div className="flex gap-1" role="group" aria-label="Active schema">
          {(["demo", "test", "production"] as const).map((schema) => (
            <button
              key={schema}
              type="button"
              aria-pressed={activeSchema === schema}
              onClick={() => selectSchema(schema)}
              className={
                activeSchema === schema
                  ? "rounded-sm border border-[#3B82F6] px-3 py-1.5 font-mono text-[10px] uppercase text-[#F5F5F7]"
                  : "rounded-sm border border-[#1F1F23] px-3 py-1.5 font-mono text-[10px] uppercase text-[#6E7E91]"
              }
            >
              {schema}
            </button>
          ))}
        </div>

        <FactoryIngestWorkbench
          activeSchema={activeSchema}
          isProcessing={isProcessing}
          onFileProcess={(file) => {
            void handleFileProcess(file);
          }}
        />

        {status ? <p className="font-mono text-[11px] text-[#F5F5F7]">{status}</p> : null}

        {receipt ? (
          <div className="space-y-2 rounded-sm border border-[#1F1F23] bg-[#121214] p-4 font-mono text-[11px]">
            <p className="text-[#F5F5F7]">{receipt.sentence}</p>
            <p className="text-[#6E7E91]">
              Deposit <span className="text-[#3B82F6]">{receipt.depositId}</span> · {receipt.qualityCount}{" "}
              {receipt.qualityCount === 1 ? "quality" : "qualities"}
            </p>
            <p className="break-all text-[#6E7E91]">SHA-256 {receipt.sha256}</p>
            {receipt.exceptions.map((message, index) => (
              <p key={`${index}-${message}`} className="text-amber-400">
                {message}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}
