"use client";

import { Button } from "@/components/ui/button";
import { FRUMA_MILL_FIELDS, IGNORE } from "@/lib/fruma/mill-ingest";
import {
  millCatalogueState,
  millFileState,
  millMapState,
  millProfileState,
  millReviewState,
  weldForStep,
} from "@/lib/fruma/honesty";
import type { MillRoom } from "@/lib/fruma/types";
import { cn } from "@/lib/utils";
import { ModeSwitch } from "./ModeSwitch";
import { Wordmark } from "./Wordmark";
import { useFruma } from "./store";

const STEPS: { id: MillRoom; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "upload", label: "File" },
  { id: "map", label: "Map" },
  { id: "review", label: "Review" },
  { id: "catalog", label: "Catalogue" },
];

export function MillShell({ children }: { children: React.ReactNode }) {
  const {
    millRoom,
    setMillRoom,
    millFile,
    millMapConfirmed,
    millApplyStatus,
    millColumnMap,
    millRowApproved,
    millClaimed,
    catalog,
    confirmMillMap,
    ingestPublish,
    setMillException,
    enter,
  } = useFruma();
  const wide = millRoom === "catalog" || millRoom === "review";

  const requiredMissing = FRUMA_MILL_FIELDS.some(
    (f) => f.required && (millColumnMap[f.key] === IGNORE || !millColumnMap[f.key]),
  );
  const unapproved = catalog.filter(
    (r) =>
      (r.status === "review" || r.status === "ready" || r.status === "gap") &&
      !millRowApproved[r.id],
  );
  const confirmed = catalog.filter((r) => r.status === "confirmed").length;
  const unknownRemains = catalog.filter((r) => r.status === "gap").length;
  const mapped = millMapConfirmed || millApplyStatus === "ready";
  const onStandard = catalog.filter((r) =>
    millClaimed && millFile?.source === "upload" && mapped && r.status === "confirmed",
  ).length;

  const stepState: Record<MillRoom, string> = {
    profile: millProfileState(millClaimed),
    upload: millFileState(millFile),
    map: millMapState(millFile, mapped),
    review: millReviewState({
      mapped,
      confirmed,
      unconfirmed: unapproved.length,
      unknownRemains,
    }),
    catalog: millCatalogueState(onStandard),
  };

  const next = millNext({
    millRoom,
    millFile: Boolean(millFile),
    millMapConfirmed,
    millApplyStatus,
    requiredMissing,
    unapproved: unapproved.length,
    setMillRoom,
    confirmMillMap,
    ingestPublish,
    setMillException,
    enter,
  });

  return (
    <div data-mode="mill" className="min-h-dvh bg-black text-white">
      <header className="mill-wizard">
        <div className="mill-wizard-top">
          <button
            type="button"
            className="shrink-0"
            aria-label="Fruma workshop"
            onClick={() => setMillRoom("profile")}
          >
            <Wordmark size="sm" />
          </button>
          <span className="chrome-rule" aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">
            Workshop
          </span>
          <div className="ml-auto flex items-center gap-3">
            <p className="mill-wizard-status" aria-live="polite">
              {stepState[millRoom]}
            </p>
            <ModeSwitch />
          </div>
        </div>
        <div className="mill-wizard-track">
          <nav className="mill-step" aria-label="Factory ingest">
            {STEPS.map((s, i) => {
              const stateLabel = stepState[s.id];
              const weld = weldForStep(stateLabel);
              return (
                <span key={s.id} className="mill-step-item">
                  {i > 0 ? (
                    <span
                      className="mill-step-sep"
                      data-on={weld ? "true" : undefined}
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setMillRoom(s.id)}
                    aria-current={millRoom === s.id ? "page" : undefined}
                    data-weld={weld ? "true" : undefined}
                    title={stateLabel}
                  >
                    <span className="mill-dot">{i + 1}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                </span>
              );
            })}
          </nav>
          <Button disabled={next.disabled} onClick={next.run}>
            {next.label}
          </Button>
        </div>
      </header>
      <main
        className={cn(
          "room-fade mx-auto px-4 pb-20 pt-8 md:px-6 md:pt-10",
          wide ? "max-w-[1440px]" : "max-w-[1080px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}

function millNext({
  millRoom,
  millFile,
  millMapConfirmed,
  millApplyStatus,
  requiredMissing,
  unapproved,
  setMillRoom,
  confirmMillMap,
  ingestPublish,
  setMillException,
  enter,
}: {
  millRoom: MillRoom;
  millFile: boolean;
  millMapConfirmed: boolean;
  millApplyStatus: string;
  requiredMissing: boolean;
  unapproved: number;
  setMillRoom: (room: MillRoom) => void;
  confirmMillMap: () => void;
  ingestPublish: () => void;
  setMillException: (open: boolean) => void;
  enter: (mode: "brand" | "mill") => void;
}) {
  if (millRoom === "profile") {
    return { label: "Continue", disabled: false, run: () => setMillRoom("upload") };
  }
  if (millRoom === "upload") {
    return {
      label: "Continue to mapping",
      disabled: !millFile,
      run: () => setMillRoom("map"),
    };
  }
  if (millRoom === "map") {
    if (millApplyStatus === "running") {
      return { label: "Mapping…", disabled: true, run: () => undefined };
    }
    if (millMapConfirmed || millApplyStatus === "ready") {
      return {
        label: "Continue to review",
        disabled: false,
        run: () => setMillRoom("review"),
      };
    }
    return {
      label: "Apply mapping",
      disabled: requiredMissing,
      run: confirmMillMap,
    };
  }
  if (millRoom === "review") {
    return {
      label: "Continue to catalogue",
      disabled: false,
      run: () => (unapproved > 0 ? setMillException(true) : ingestPublish()),
    };
  }
  return {
    label: "Open studio",
    disabled: false,
    run: () => enter("brand"),
  };
}
