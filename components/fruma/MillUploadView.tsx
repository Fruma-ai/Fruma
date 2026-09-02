"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FILE_RECEIVED_COPY,
  SEEDED_FILE_COPY,
  millFileState,
} from "@/lib/fruma/honesty";
import { formatMillDepositException } from "@/lib/fruma/mill-deposit";
import { DEMO_MILL_FILE } from "@/lib/fruma/mill-ingest";
import { AsSentList } from "./AsSentList";
import { useFruma } from "./store";

export function MillUploadView() {
  const {
    millFile,
    millDeposits,
    millDepositError,
    millDepositPosting,
    attachMillFile,
    depositMillFile,
    setMillRoom,
    catalog,
  } = useFruma();
  const inputRef = useRef<HTMLInputElement>(null);

  const takeFile = (file: File) => {
    void depositMillFile(file);
  };

  const fileState = millFileState(millFile);
  const latest = millDeposits[millDeposits.length - 1];
  const receivedCopy =
    millFile?.source === "upload"
      ? (latest?.fileStepSentence ?? FILE_RECEIVED_COPY)
      : SEEDED_FILE_COPY;

  return (
    <div>
      <div className="mb-8 max-w-[44rem]">
        <p className="ui-label">Step 2 of 5 · mill file</p>
        <h1 className="page-title mt-2 md:text-[28px]">Drop the file you already have.</h1>
        <p className="page-lede mt-3">
          Hanger list, line sheet, spec spreadsheet, or a photograph of a card.
          A drop is receipt only — not a mapping, and not a live catalogue.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json,.pdf,image/*"
        className="sr-only"
        aria-label="Choose mill file"
        disabled={millDepositPosting}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          takeFile(file);
          e.target.value = "";
        }}
      />

      {millDepositError ? (
        <section className="mill-card mb-6 p-5" role="alert">
          <p className="ui-label">{millDepositError.code}</p>
          <p className="mt-3 text-[15px] font-medium text-chalk">
            {formatMillDepositException(millDepositError)}
          </p>
          <p className="mt-2 text-[13px] text-mute">
            Not mapped. Not in the live catalogue. No rows invented.
          </p>
        </section>
      ) : null}

      {millDepositPosting ? (
        <section className="mill-card mb-6 p-5" role="status">
          <p className="ui-label">File</p>
          <p className="mt-3 text-[15px] font-medium text-chalk">
            Sending the mill file…
          </p>
        </section>
      ) : null}

      {millFile ? (
        <div className="space-y-6">
          <section className="mill-card p-5" role="status">
            <p className="ui-label">{fileState}</p>
            <p className="mt-3 text-[15px] font-medium text-chalk">{receivedCopy}</p>
            <div className="mill-file mt-4">
              <div>
                <p className="text-[15px] font-medium text-chalk">{millFile.name}</p>
                <p className="mt-1 spec text-[12px] text-mute">
                  {millFile.size}
                  {millFile.source === "demo"
                    ? ` · ${catalog.length} qualities · ${fileState}`
                    : ` · ${fileState} · Unknown row count`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={millDepositPosting}
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
            </div>
          </section>
          {millFile.source === "upload" ? <AsSentList deposits={millDeposits} /> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setMillRoom("profile")}>
              Back
            </Button>
            <Button disabled={millDepositPosting} onClick={() => setMillRoom("map")}>
              Continue to mapping
            </Button>
            <p className="text-[12.5px] text-mute">
              Next: match mill columns to the Fruma standard. The catalogue does
              not change until a quality is claimed, received, mapped and confirmed.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <button
              type="button"
              className="mill-drop w-full"
              disabled={millDepositPosting}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (!file || millDepositPosting) return;
                takeFile(file);
              }}
            >
              <Upload size={22} strokeWidth={1.6} className="text-mute" aria-hidden />
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-chalk">
                Drag and drop your mill file, or click to browse
              </p>
              <p className="spec text-[12px] text-mute">
                .csv · .xlsx · .json · .pdf · photo of a hanger card
              </p>
              <span className="mt-1 inline-flex h-9 items-center border border-line2 px-4 text-[13px] font-medium text-chalk">
                Choose file
              </span>
            </button>

            <button
              type="button"
              className="mt-3 w-full mill-card px-4 py-3 text-left hover:border-line"
              disabled={millDepositPosting}
              onClick={() => attachMillFile()}
            >
              <p className="text-[13.5px] font-medium text-chalk">
                Seeded · {DEMO_MILL_FILE.name}
              </p>
              <p className="mt-0.5 spec text-[12px] text-mute">
                {DEMO_MILL_FILE.size} · {catalog.length} qualities · Seeded — not
                as sent
              </p>
            </button>
          </div>

          <aside>
            <p className="ui-label">Quick tips</p>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-mute">
              <li>An article or fabric number, plus construction, is enough to start.</li>
              <li>
                Include composition, weight, width, MOQ and stock colours if you
                have them.
              </li>
              <li>
                Don&apos;t tidy the file. Mixed inches and centimetres is expected —
                Fruma maps the units on the next step.
              </li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
