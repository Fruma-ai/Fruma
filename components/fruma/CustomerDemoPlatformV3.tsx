"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { CaseSignals } from "@/lib/fruma/gates";
import type { DemoCaseView } from "@/lib/fruma/wedge/case";
import { ProductionGates } from "@/components/fruma/ProductionGates";

type Mode = "brand" | "factory";
type BrandStep = "brief" | "cloth" | "ask" | "lock";
type FactoryStep = "book" | "request";

const BRAND_STEPS: { id: BrandStep; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "cloth", label: "Cloth" },
  { id: "ask", label: "Ask mill" },
  { id: "lock", label: "Lock" },
];

const FACTORY_STEPS: { id: FactoryStep; label: string }[] = [
  { id: "book", label: "Book" },
  { id: "request", label: "Request" },
];

const COLOURS = ["Navy", "Ecru", "White", "Charcoal", "open"] as const;

async function postCase(body: Record<string, unknown>): Promise<{ case: DemoCaseView; error?: string }> {
  const res = await fetch("/api/demo/wedge", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Fruma-Version": "demo" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { case?: DemoCaseView; error?: string };
  if (!res.ok || json.error || !json.case) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }
  return { case: json.case };
}

function caseSignals(
  intent: string,
  colour: (typeof COLOURS)[number],
  caseView: DemoCaseView | null,
  selectedArticle: string | null,
): CaseSignals {
  const article = caseView?.locked
    ? caseView.selectedArticle
    : (selectedArticle ?? caseView?.selectedArticle ?? null);
  const hit = caseView?.pilot?.shortlist.hits.find((row) => row.articleCode === article);
  const lockedValue = (field: string) => caseView?.locked?.facts.find((fact) => fact.field === field)?.value ?? "";
  const cited = (field: string) => Boolean(hit?.citations.some((citation) => citation.field === field && citation.sourceValue));
  const composition = lockedValue("composition") || hit?.compositionAsWritten || "";
  const phase = caseView?.phase ?? "empty";
  return {
    hasBrief: intent.trim().length > 0,
    colour: colour === "open" ? "open" : "named",
    clothCited: phase !== "empty",
    millAsked: phase === "asked" || phase === "answered" || phase === "locked",
    millAnswered: phase === "answered" || phase === "locked",
    clothAvailable: caseView?.confirmation ? caseView.confirmation.available : null,
    sourceLocked: phase === "locked",
    compositionOnFile: composition.trim().length > 0,
    constructionOnFile: Boolean(lockedValue("construction") || hit?.constructionAsWritten),
    weightOnFile: Boolean(lockedValue("weight") || hit?.weightAsWritten || cited("weight")),
    widthOnFile: cited("width"),
    claimGap: /organic/i.test(composition) ? "Organic fibre on the file is not a GOTS claim." : null,
  };
}

function fileMoq(caseView: DemoCaseView, article: string | undefined): string {
  const hit = caseView.pilot?.shortlist.hits.find((row) => row.articleCode === article);
  return hit?.citations.find((citation) => citation.field === "moq")?.sourceValue ?? "";
}

export function CustomerDemoPlatformV3() {
  const [mode, setMode] = useState<Mode>("brand");
  const [brandStep, setBrandStep] = useState<BrandStep>("brief");
  const [factoryStep, setFactoryStep] = useState<FactoryStep>("book");
  const [productName, setProductName] = useState("Textured navy polo");
  const [intent, setIntent] = useState(
    "A refined navy polo in extra-long staple cotton. Structured mesh, not piqué. For UK and EU.",
  );
  const [colour, setColour] = useState<(typeof COLOURS)[number]>("Navy");
  const [caseView, setCaseView] = useState<DemoCaseView | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [moq, setMoq] = useState("");
  const [lead, setLead] = useState("");
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phase = caseView?.phase ?? "empty";
  const askedArticle = caseView?.mill?.qualityArticle ?? caseView?.selectedArticle ?? selectedArticle;

  async function run(body: Record<string, unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      const { case: next } = await postCase(body);
      setCaseView(next);
      if (next.selectedArticle) setSelectedArticle(next.selectedArticle);
      after?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function findCloth() {
    void run(
      {
        action: "source",
        productName,
        intent,
        colour: colour === "open" ? null : colour,
      },
      () => setBrandStep("cloth"),
    );
  }

  function ask() {
    if (!selectedArticle) {
      setError("Choose a cloth first.");
      return;
    }
    void run({ action: "ask", articleCode: selectedArticle }, () => {
      setBrandStep("ask");
      setFactoryStep("request");
    });
  }

  function answer() {
    const moqM = Number(moq);
    const leadWeeks = Number(lead);
    if (!Number.isFinite(moqM) || moqM <= 0 || !Number.isFinite(leadWeeks) || leadWeeks < 0) {
      setError("Enter the current MOQ in metres and the lead time in weeks.");
      return;
    }
    void run({ action: "answer", moqM, leadWeeks, available }, () => setFactoryStep("request"));
  }

  function lock() {
    void run({ action: "lock" }, () => setBrandStep("lock"));
  }

  function reset() {
    void run({ action: "reset" }, () => {
      setBrandStep("brief");
      setFactoryStep("book");
      setSelectedArticle(null);
      setMoq("");
      setLead("");
      setAvailable(true);
    });
  }

  const onFile = fileMoq(caseView ?? ({ phase: "empty" } as DemoCaseView), askedArticle ?? undefined);
  const signals = caseSignals(intent, colour, caseView, selectedArticle);

  return (
    <div className={`cd-shell ${mode === "factory" ? "mill" : ""}`}>
      <header className={`cd-topbar ${mode === "factory" ? "mill" : ""}`}>
        <button type="button" className="cd-wordmark" onClick={() => setMode("brand")}>
          FRUMA
        </button>
        <div className="cd-workspace">
          <span>
            {mode === "brand"
              ? (caseView?.pilot?.brief.brandName ?? "Northline Studio")
              : (caseView?.millName ?? "Têxteis Vale do Ave")}
          </span>
        </div>
        <div className="cd-mode-switch">
          <button type="button" className={mode === "brand" ? "active" : ""} onClick={() => setMode("brand")}>
            Brand
          </button>
          <button type="button" className={mode === "factory" ? "active" : ""} onClick={() => setMode("factory")}>
            Factory
          </button>
        </div>
        <div className="cd-top-actions">
          <button type="button" onClick={reset} disabled={busy}>
            New case
          </button>
        </div>
      </header>

      {mode === "brand" ? (
        <nav className="cd-lifecycle" aria-label="Product case">
          {BRAND_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={brandStep === step.id ? "active" : ""}
              onClick={() => setBrandStep(step.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step.label}
            </button>
          ))}
        </nav>
      ) : (
        <nav className="cd-subnav" aria-label="Mill case">
          {FACTORY_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              className={factoryStep === step.id ? "active" : ""}
              onClick={() => setFactoryStep(step.id)}
            >
              {step.label}
            </button>
          ))}
        </nav>
      )}

      <div className="cd-demo-banner">
        <div>
          <span>{mode === "brand" ? "Brand case" : "Mill case"}</span>
          <b>
            {phase === "empty"
              ? "Not started"
              : phase === "cloth"
                ? "Cloth found"
                : phase === "asked"
                  ? "Waiting on the mill"
                  : phase === "answered"
                    ? "Mill has answered"
                    : "Source locked"}
          </b>
          <small>
            Brief, then cloth from the mill file, then an anonymous ask, then lock only what the mill confirmed.
          </small>
        </div>
      </div>

      {error ? (
        <div className="cd-main" style={{ paddingBottom: 0 }}>
          <div className="v3-warning">
            <CircleAlert size={14} /> {error}
          </div>
        </div>
      ) : null}

      {mode === "brand" && brandStep === "brief" ? (
        <main className="cd-main">
          <div className="cd-page-head">
            <div>
              <p>01 · Brief</p>
              <h1>What are you making?</h1>
              <span>
                This becomes the product case. A named colour is a must. Leave colour open and Fruma will not invent a shade.
              </span>
            </div>
          </div>
          <div className="v3-intent-grid">
            <section className="cd-card">
              <label>
                Product name
                <input value={productName} onChange={(event) => setProductName(event.target.value)} />
              </label>
              <label>
                Brief
                <textarea value={intent} onChange={(event) => setIntent(event.target.value)} rows={5} />
              </label>
              <label>
                Colour
                <select value={colour} onChange={(event) => setColour(event.target.value as (typeof COLOURS)[number])}>
                  {COLOURS.map((option) => (
                    <option key={option} value={option}>
                      {option === "open" ? "Leave open" : option}
                    </option>
                  ))}
                </select>
              </label>
              <p className="cd-muted">
                The demo searches one Portuguese fabric book (polo-capable cloth). Fleece in that book will not appear as a polo.
              </p>
              <div className="cd-actions">
                <button type="button" className="cd-primary" data-testid="find-cloth" disabled={busy} onClick={findCloth}>
                  {busy ? <LoaderCircle size={14} className="cd-spin" /> : null}
                  Find cloth <ArrowRight size={14} />
                </button>
              </div>
            </section>
            <section className="cd-card">
              <p className="cd-eyebrow">What Fruma will search</p>
              <h2>Requirements</h2>
              <div className="v3-req-list">
                <Requirement label="End product" value="Polo — from mill cloth, not a garment SKU" kind="MUST" />
                <Requirement
                  label="Colour"
                  value={colour === "open" ? "Open — no shade invented" : colour}
                  kind={colour === "open" ? "OPEN" : "MUST"}
                />
                <Requirement label="Handfeel" value="Judged on a physical swatch" kind="PREFER" />
                <Requirement label="Market" value="UK + EU" kind="PREFER" />
              </div>
            </section>
          </div>
        </main>
      ) : null}

      {mode === "brand" && brandStep === "cloth" ? (
        <ClothStep
          caseView={caseView}
          busy={busy}
          selectedArticle={selectedArticle}
          onSelect={setSelectedArticle}
          onAsk={ask}
          onBack={() => setBrandStep("brief")}
        />
      ) : null}

      {mode === "brand" && brandStep === "ask" ? (
        <AskStep caseView={caseView} onFactory={() => { setMode("factory"); setFactoryStep("request"); }} onLock={() => setBrandStep("lock")} />
      ) : null}

      {mode === "brand" && brandStep === "lock" ? (
        <LockStep caseView={caseView} busy={busy} onLock={lock} />
      ) : null}

      {mode === "factory" && factoryStep === "book" ? (
        <BookStep
          caseView={caseView}
          busy={busy}
          onFile={() =>
            void run({ action: "source", colour: null, productName: "Mill fabric book", intent: "Pilot workbook on file." }, () =>
              setFactoryStep("book"),
            )
          }
        />
      ) : null}

      {mode === "brand" ? (
        <div className="cd-main cd-gates-wrap">
          <ProductionGates signals={signals} />
        </div>
      ) : null}

      {mode === "factory" && factoryStep === "request" ? (
        <RequestStep
          caseView={caseView}
          busy={busy}
          moq={moq}
          lead={lead}
          available={available}
          fileMoq={onFile}
          setMoq={setMoq}
          setLead={setLead}
          setAvailable={setAvailable}
          onAnswer={answer}
          onBrand={() => { setMode("brand"); setBrandStep("lock"); }}
        />
      ) : null}
    </div>
  );
}

function Requirement({ label, value, kind }: { label: string; value: string; kind: string }) {
  return (
    <div className="v3-req captured">
      <div className="v3-req-main">
        <b>{label}</b>
        <span className="v3-captured">{kind}</span>
      </div>
      <div className="v3-req-value">
        <span>{value}</span>
      </div>
    </div>
  );
}

function ClothStep({
  caseView,
  busy,
  selectedArticle,
  onSelect,
  onAsk,
  onBack,
}: {
  caseView: DemoCaseView | null;
  busy: boolean;
  selectedArticle: string | null;
  onSelect: (article: string) => void;
  onAsk: () => void;
  onBack: () => void;
}) {
  const pilot = caseView?.pilot;
  if (!pilot || caseView.phase === "empty") {
    return (
      <main className="cd-main">
        <div className="cd-page-head">
          <div>
            <p>02 · Cloth</p>
            <h1>No mill book searched yet.</h1>
            <span>Start from the brief. Fruma cites cloth that can become the product.</span>
          </div>
        </div>
        <button type="button" className="cd-primary" onClick={onBack}>
          Back to brief
        </button>
      </main>
    );
  }

  return (
    <main className="cd-main">
      <div className="cd-page-head">
        <div>
          <p>02 · Cloth</p>
          <h1>{pilot.shortlist.matchingFabricCount} fabrics can become this polo.</h1>
          <span>
            {pilot.workbook.millName}. MOQ on the file is historical until the mill answers.{" "}
            {pilot.workbook.qualitiesBeforeConfirm} qualities were searchable before the header map;{" "}
            {pilot.workbook.qualitiesAfterConfirm} after.
          </span>
        </div>
      </div>
      <div className="cd-supplier-grid">
        {pilot.shortlist.hits.map((hit) => {
          const on = selectedArticle === hit.articleCode;
          return (
            <button
              type="button"
              key={hit.articleCode}
              data-testid={`fabric-${hit.articleCode}`}
              className={`cd-card supplier cd-fabric ${on ? "selected" : ""}`}
              onClick={() => onSelect(hit.articleCode)}
            >
              <div className="cd-supplier-top">
                <span>{hit.articleCode}</span>
                <small>{on ? "Selected" : "Select"}</small>
              </div>
              <h2>
                {hit.constructionAsWritten} · {hit.compositionAsWritten}
              </h2>
              <p>
                {hit.weightAsWritten} gsm
                {hit.colourAsWritten ? ` · ${hit.colourAsWritten}` : ""}
              </p>
            </button>
          );
        })}
      </div>
      <ul className="cd-flag-list">
        {pilot.shortlist.evidence.map((flag) => (
          <li key={flag.code} className={flag.severity === "block" ? "v3-warning" : "cd-muted"}>
            <b>{flag.title}.</b> {flag.detail}
          </li>
        ))}
      </ul>
      <details className="cd-card">
        <summary>Header map · {pilot.workbook.filename}</summary>
        <div className="cd-table-head map">
          <span>Factory field</span>
          <span>Sample</span>
          <span>Fruma field</span>
          <span>Status</span>
        </div>
        {pilot.mapping.proposals.map((proposal) => (
          <div className="cd-table-row map" key={proposal.header}>
            <b>{proposal.header}</b>
            <span>{proposal.sampleValues[0] ?? "—"}</span>
            <code>{proposal.proposedField ?? "unmapped"}</code>
            <small>{proposal.proposedField ? "Mapped" : "Exception"}</small>
          </div>
        ))}
      </details>
      <div className="cd-actions end">
        <button type="button" className="cd-secondary" onClick={onBack}>
          Edit brief
        </button>
        <button type="button" className="cd-primary" data-testid="ask-mill" disabled={busy || !selectedArticle} onClick={onAsk}>
          {busy ? <LoaderCircle size={14} className="cd-spin" /> : null}
          Ask the mill about this cloth <ArrowRight size={14} />
        </button>
      </div>
    </main>
  );
}

function AskStep({
  caseView,
  onFactory,
  onLock,
}: {
  caseView: DemoCaseView | null;
  onFactory: () => void;
  onLock: () => void;
}) {
  if (!caseView?.brand || !caseView.mill) {
    return (
      <main className="cd-main">
        <div className="cd-page-head">
          <div>
            <p>03 · Ask mill</p>
            <h1>No request yet.</h1>
            <span>Select a cloth first. The mill will not see the brand name.</span>
          </div>
        </div>
      </main>
    );
  }

  const answered = caseView.phase === "answered" || caseView.phase === "locked";

  return (
    <main className="cd-main">
      <div className="cd-page-head">
        <div>
          <p>03 · Ask mill</p>
          <h1>{answered ? "The mill has answered." : "Waiting for current terms."}</h1>
          <span>
            {caseView.brand.brandName} asked about {caseView.brand.qualityArticle}. The mill screen does not show that name.
          </span>
        </div>
      </div>
      <div className="cd-grid two">
        <section className="cd-card">
          <p className="cd-eyebrow">Sent to the mill</p>
          <div className="cd-line">
            <b>Cloth</b>
            <span>{caseView.mill.qualityArticle}</span>
          </div>
          <div className="cd-line">
            <b>Category</b>
            <span>{caseView.mill.category}</span>
          </div>
          <div className="cd-line">
            <b>Colour</b>
            <span>{caseView.mill.colour ?? "—"}</span>
          </div>
          <div className="cd-line">
            <b>Region</b>
            <span>{caseView.mill.deliveryRegion}</span>
          </div>
          <p className="cd-muted">{caseView.mill.requestedMoqHint}</p>
        </section>
        <section className="cd-card">
          <p className="cd-eyebrow">Commercials</p>
          {caseView.confirmation ? (
            <>
              <div className="cd-success">
                <Check size={14} /> Confirmed {caseView.confirmation.moqM}m · {caseView.confirmation.leadWeeks} weeks
              </div>
              <p className="cd-muted">Timestamp {caseView.confirmation.confirmedAt}</p>
              <p className="cd-muted">
                {caseView.confirmation.available ? "Mill says this cloth is available." : "Mill says this cloth is not available."}
              </p>
              <button type="button" className="cd-primary" onClick={onLock}>
                Review the lock <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <p>File MOQ is still historical. Switch to the factory and reply as the mill.</p>
              <button type="button" className="cd-primary" data-testid="open-factory" onClick={onFactory}>
                Reply as the mill <ArrowRight size={14} />
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function LockStep({
  caseView,
  busy,
  onLock,
}: {
  caseView: DemoCaseView | null;
  busy: boolean;
  onLock: () => void;
}) {
  if (!caseView?.confirmation) {
    return (
      <main className="cd-main">
        <div className="cd-page-head">
          <div>
            <p>04 · Lock</p>
            <h1>Nothing to lock yet.</h1>
            <span>Product truth locks after the mill confirms current MOQ and lead time.</span>
          </div>
        </div>
      </main>
    );
  }

  if (!caseView.locked) {
    return (
      <main className="cd-main">
        <div className="cd-page-head">
          <div>
            <p>04 · Lock</p>
            <h1>Lock the mill’s answer onto this product.</h1>
            <span>Commercials come from the mill response. The fabric-book figure stays historical underneath.</span>
          </div>
        </div>
        <section className="cd-card">
          <div className="cd-line">
            <b>MOQ</b>
            <span>{caseView.confirmation.moqM}m · confirmed</span>
          </div>
          <div className="cd-line">
            <b>Lead</b>
            <span>{caseView.confirmation.leadWeeks} weeks · confirmed</span>
          </div>
          <div className="cd-line">
            <b>Available</b>
            <span>{caseView.confirmation.available ? "Yes" : "No"}</span>
          </div>
          <button
            type="button"
            className="cd-primary"
            data-testid="lock-record"
            disabled={busy || !caseView.confirmation.available}
            onClick={onLock}
          >
            {busy ? <LoaderCircle size={14} className="cd-spin" /> : null}
            Lock product truth
          </button>
          {!caseView.confirmation.available ? (
            <p className="cd-muted">Unavailable cloth cannot be locked.</p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="cd-main">
      <div className="cd-page-head">
        <div>
          <p>04 · Lock</p>
          <h1>This product now has a source.</h1>
          <span>
            Locked {caseView.locked.lockedSourceId} · version {caseView.locked.version}. Samples and fit stay outside Fruma.
            Shops and passports read this record later — they do not change it.
          </span>
        </div>
      </div>
      <section className="cd-card">
        <div className="cd-success">
          <Check size={14} /> Source locked
        </div>
        {caseView.locked.facts.map((fact) => (
          <div className="cd-line" key={fact.field}>
            <b>{fact.field}</b>
            <span>{fact.value}</span>
            <small>
              {fact.status} · {fact.sourceType}
            </small>
          </div>
        ))}
      </section>
    </main>
  );
}

function BookStep({
  caseView,
  busy,
  onFile,
}: {
  caseView: DemoCaseView | null;
  busy: boolean;
  onFile: () => void;
}) {
  const pilot = caseView?.pilot;
  return (
    <main className="cd-main dark">
      <div className="cd-page-head">
        <div>
          <p>Mill · book</p>
          <h1>The file you already keep.</h1>
          <span>Fruma maps your columns. It does not retype the book, and it does not treat file MOQ as a current quote.</span>
        </div>
      </div>
      {!pilot ? (
        <section className="cd-card dark">
          <p>No fabric book is on this case yet. File the pilot workbook, or wait for the brand to search it.</p>
          <button type="button" className="cd-primary" data-testid="file-book" disabled={busy} onClick={onFile}>
            {busy ? <LoaderCircle size={14} className="cd-spin" /> : null}
            File the pilot workbook
          </button>
        </section>
      ) : (
        <>
          <div className="v3-stat-grid">
            <div>
              <b>{pilot.workbook.qualitiesBeforeConfirm}</b>
              <span>Before map</span>
            </div>
            <div>
              <b>{pilot.workbook.qualitiesAfterConfirm}</b>
              <span>Searchable qualities</span>
            </div>
            <div>
              <b>{pilot.mapping.proposals.length}</b>
              <span>Headers</span>
            </div>
            <div>
              <b>Historical</b>
              <span>File MOQ</span>
            </div>
          </div>
          <section className="cd-card dark">
            <h2>{pilot.workbook.millName}</h2>
            <p className="cd-muted">{pilot.workbook.filename}</p>
            {pilot.mapping.proposals.map((proposal) => (
              <div className="cd-line" key={proposal.header}>
                <b>{proposal.header}</b>
                <span>{proposal.sampleValues[0] ?? "—"}</span>
                <code>{proposal.proposedField ?? "unmapped"}</code>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function RequestStep({
  caseView,
  busy,
  moq,
  lead,
  available,
  fileMoq,
  setMoq,
  setLead,
  setAvailable,
  onAnswer,
  onBrand,
}: {
  caseView: DemoCaseView | null;
  busy: boolean;
  moq: string;
  lead: string;
  available: boolean;
  fileMoq: string;
  setMoq: (value: string) => void;
  setLead: (value: string) => void;
  setAvailable: (value: boolean) => void;
  onAnswer: () => void;
  onBrand: () => void;
}) {
  if (!caseView?.mill) {
    return (
      <main className="cd-main dark">
        <div className="cd-page-head">
          <div>
            <p>Mill · request</p>
            <h1>Nothing to answer.</h1>
            <span>When a brand asks about a cloth, the request lands here without their name.</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cd-main dark">
      <div className="cd-page-head">
        <div>
          <p>Mill · request</p>
          <h1>Anonymous request · {caseView.mill.qualityArticle}</h1>
          <span>Reply with current terms. The brand name is not on this request.</span>
        </div>
      </div>
      <section className="cd-card dark">
        <div className="cd-line">
          <b>Category</b>
          <span>{caseView.mill.category}</span>
        </div>
        <div className="cd-line">
          <b>Colour</b>
          <span>{caseView.mill.colour ?? "—"}</span>
        </div>
        <div className="cd-line">
          <b>Region</b>
          <span>{caseView.mill.deliveryRegion}</span>
        </div>
        {caseView.confirmation ? (
          <>
            <div className="cd-success">
              <Check size={14} /> Sent {caseView.confirmation.moqM}m · {caseView.confirmation.leadWeeks} weeks
            </div>
            <p className="cd-muted">{caseView.confirmation.confirmedAt}</p>
            <button type="button" className="cd-secondary" onClick={onBrand}>
              Back to the brand lock
            </button>
          </>
        ) : (
          <div className="v3-profile-grid">
            <label>
              Current MOQ (metres)
              <input
                data-testid="mill-moq"
                inputMode="decimal"
                value={moq}
                placeholder={fileMoq ? `File says ${fileMoq}` : "Metres"}
                onChange={(event) => setMoq(event.target.value)}
              />
            </label>
            <label>
              Lead time (weeks)
              <input
                data-testid="mill-lead"
                inputMode="decimal"
                value={lead}
                placeholder="Weeks"
                onChange={(event) => setLead(event.target.value)}
              />
            </label>
            <label>
              <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /> Available
              now
            </label>
            <p className="cd-muted">
              {fileMoq
                ? `The fabric book says ${fileMoq}m. That figure is historical until you send current terms.`
                : "Enter current terms. The fabric book is not a quote."}
            </p>
            <button type="button" className="cd-primary" data-testid="mill-answer" disabled={busy} onClick={onAnswer}>
              {busy ? <LoaderCircle size={14} className="cd-spin" /> : null}
              Send current terms
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
