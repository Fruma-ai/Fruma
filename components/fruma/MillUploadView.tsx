"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_MILL_FILE } from "@/lib/fruma/mill-ingest";
import { useFruma } from "./store";

export function MillUploadView() {
  const { millFile, attachMillFile, setMillRoom } = useFruma();
  const inputRef = useRef<HTMLInputElement>(null);

  const takeFile = (file: File) => {
    attachMillFile({
      name: file.name,
      size: file.size > 1024 ? `${Math.round(file.size / 1024)} KB` : `${file.size} B`,
      rows: DEMO_MILL_FILE.rows,
      source: "upload",
    });
  };

  return (
    <div>
      <div className="mb-8 max-w-[44rem]">
        <p className="ui-label">Step 2 of 5 · mill file</p>
        <h1 className="page-title mt-2 md:text-[28px]">Drop the file you already have.</h1>
        <p className="page-lede mt-3">
          Hanger list, line sheet, spec spreadsheet, or a photograph of a card.
          Fruma maps it to the standard catalogue — you do not retype qualities.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json,.pdf,image/*"
        className="sr-only"
        aria-label="Choose mill file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          takeFile(file);
          e.target.value = "";
        }}
      />

      {millFile ? (
        <div className="space-y-6">
          <section className="mill-card p-5">
            <p className="ui-label">Your uploaded file</p>
            <div className="mill-file mt-3">
              <div>
                <p className="text-[15px] font-medium text-chalk">{millFile.name}</p>
                <p className="mt-1 spec text-[12px] text-mute">
                  {millFile.size} · {millFile.rows} qualities ·{" "}
                  {millFile.source === "demo" ? "demo hanger list" : "uploaded"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setMillRoom("profile")}>
              Back
            </Button>
            <Button onClick={() => setMillRoom("map")}>Continue to mapping</Button>
            <p className="text-[12.5px] text-mute">
              Next: match mill columns to the Fruma standard. The file is not
              rewritten.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <button
              type="button"
              className="mill-drop w-full"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                takeFile(file);
              }}
            >
              <Upload size={22} strokeWidth={1.6} className="text-weld" aria-hidden />
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-chalk">
                Drag and drop your mill file, or click to browse
              </p>
              <p className="spec text-[12px] text-mute">
                .csv · .xlsx · .json · .pdf · photo of a hanger card
              </p>
              <span className="mt-1 inline-flex h-9 items-center bg-weld px-4 text-[13px] font-medium text-[#1a1400]">
                Choose file
              </span>
            </button>

            <button
              type="button"
              className="mt-3 w-full mill-card px-4 py-3 text-left hover:border-weld"
              onClick={() => attachMillFile()}
            >
              <p className="text-[13.5px] font-medium text-chalk">
                Demo file · {DEMO_MILL_FILE.name}
              </p>
              <p className="mt-0.5 spec text-[12px] text-mute">
                {DEMO_MILL_FILE.size} · {DEMO_MILL_FILE.rows} qualities · Vale do
                Ave hanger list — click to use
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
