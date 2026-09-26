"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import type { WedgeSliceResult } from "@/lib/fruma/wedge";

type BrandStep = "source" | "confirm" | "standardise" | "development" | "ready";

type RunPhase =
  | "idle"
  | "deposit"
  | "mapping"
  | "shortlist"
  | "confirming"
  | "locking"
  | "done"
  | "error";

const RUN_STEPS: { id: RunPhase; label: string; agent: string }[] = [
  { id: "deposit", label: "Depositing mill workbook", agent: "Ingest" },
  { id: "mapping", label: "Confirming dialect headers", agent: "Mapping" },
  { id: "shortlist", label: "Citing cloth that can become the product", agent: "Retrieval" },
  { id: "confirming", label: "Anonymous mill confirmation", agent: "Commercial" },
  { id: "locking", label: "Locking product-truth record", agent: "Product truth" },
];

function phaseState(
  current: RunPhase,
  id: RunPhase,
): "done" | "active" | "queued" {
  const order = RUN_STEPS.map((s) => s.id);
  if (current === "done") return "done";
  if (current === "idle" || current === "error") return "queued";
  const ci = order.indexOf(current);
  const ii = order.indexOf(id);
  if (ii < ci) return "done";
  if (ii === ci) return "active";
  return "queued";
}

/**
 * Promoted Demo spine — staged like Test Pilot:
 * deposit → map → cited shortlist → anon confirm → locked truth.
 */
export function DemoPromotedSpine({
  step,
  go,
  result,
  setResult,
}: {
  step: "source" | "confirm" | "standardise";
  go: (s: BrandStep) => void;
  result: WedgeSliceResult | null;
  setResult: (r: WedgeSliceResult | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<RunPhase>(result ? "done" : "idle");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  useEffect(() => {
    if (result) setPhase("done");
  }, [result]);

  async function runWedge() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setBusy(true);
    setError(null);
    setPhase("deposit");
    timers.current.push(window.setTimeout(() => setPhase("mapping"), 400));
    timers.current.push(window.setTimeout(() => setPhase("shortlist"), 900));
    timers.current.push(window.setTimeout(() => setPhase("confirming"), 1400));
    timers.current.push(window.setTimeout(() => setPhase("locking"), 1900));

    try {
      const res = await fetch("/api/demo/wedge", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "demo" },
        body: JSON.stringify({ reset: true }),
      });
      const json = (await res.json()) as WedgeSliceResult & { error?: string };
      if (!res.ok || json.error) {
        setResult(null);
        setPhase("error");
        setError(json.error ?? `Wedge failed (${res.status})`);
        return;
      }
      setResult(json);
      setPhase("done");
    } catch (err) {
      setResult(null);
      setPhase("error");
      setError(err instanceof Error ? err.message : "Wedge failed");
    } finally {
      setBusy(false);
    }
  }

  const pilot = result?.pilot;

  if (step === "source") {
    return (
      <main className="cd-main">
        <div className="cd-page-head">
          <div>
            <p>04 · Source · promoted spine</p>
            <h1>Find cloth that can become this product.</h1>
            <span>
              Real mill XLSX → confirmed header map → cited shortlist. Mills file fabrics, not garment
              SKUs. Run the wedge before Confirm.
            </span>
          </div>
        </div>

        <div className="cd-progress" aria-label="Spine progress">
          {["Deposit", "Map", "Shortlist", "Confirm", "Lock"].map((label, i) => {
            const active =
              (phase === "deposit" && i === 0) ||
              (phase === "mapping" && i === 1) ||
              (phase === "shortlist" && i === 2) ||
              (phase === "confirming" && i === 3) ||
              (phase === "locking" && i === 4) ||
              (phase === "done" && i <= 2);
            const done = phase === "done" || (busy && RUN_STEPS.findIndex((s) => s.id === phase) > i);
            return (
              <span key={label} className={done || active ? "active" : ""}>
                {label}
              </span>
            );
          })}
        </div>

        <div className="cd-actions">
          <button type="button" className="cd-primary" disabled={busy} onClick={() => void runWedge()}>
            {busy ? (
              <>
                <LoaderCircle size={14} className="cd-spin" /> Running spine…
              </>
            ) : result ? (
              <>
                <Sparkles size={14} /> Re-run source wedge
              </>
            ) : (
              <>
                <Sparkles size={14} /> Run source wedge
              </>
            )}
          </button>
        </div>

        {busy || phase === "error" ? (
          <section className="cd-card cd-network-search" style={{ marginTop: "1rem" }}>
            <div className="v3-activity">
              <div className="v3-activity-head">
                <span className="v3-spinner">
                  <LoaderCircle size={22} className={busy ? "cd-spin" : undefined} />
                </span>
                <div>
                  <b>{phase === "error" ? "Wedge stopped" : "Running product intelligence at source"}</b>
                  <small>Deposit → map → cite → confirm → lock — not a search theatre</small>
                </div>
              </div>
              <div className="v3-activity-list">
                {RUN_STEPS.map((s) => {
                  const state = phaseState(phase, s.id);
                  return (
                    <div key={s.id} className={`v3-activity-row ${state}`}>
                      <span>
                        {state === "done" ? (
                          <Check size={13} />
                        ) : state === "active" ? (
                          <LoaderCircle size={13} className="cd-spin" />
                        ) : (
                          <span className="v3-dot" />
                        )}
                      </span>
                      <div>
                        <b>{s.label}</b>
                        <small>{s.agent}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="v3-warning">
            <CircleAlert size={14} /> {error}
          </div>
        ) : null}

        {!result && !busy ? (
          <section className="cd-card">
            <div className="cd-empty">
              <Sparkles size={24} />
              <p>
                Step checklist: (1) deposit workbook · (2) confirm headers · (3) cite polo-capable
                cloth · then continue to Confirm. Banner Next stays gated until this runs.
              </p>
            </div>
          </section>
        ) : null}

        {result && pilot ? (
          <>
            <p className="cd-success">
              <Check size={14} /> {result.honesty}
            </p>

            <article className="cd-card">
              <p className="cd-eyebrow">1 · Deposit</p>
              <h2>{pilot.workbook.millName}</h2>
              <p className="cd-muted">
                <code>{pilot.workbook.filename}</code> · deposit{" "}
                <code>{pilot.workbook.depositId.slice(0, 8)}</code> · sha{" "}
                <code>{pilot.workbook.sha256.slice(0, 12)}</code>
              </p>
              <p className="cd-muted">
                Before map confirm: {pilot.workbook.qualitiesBeforeConfirm} searchable qualities.
                After: {pilot.workbook.qualitiesAfterConfirm}.
              </p>
            </article>

            <article className="cd-card">
              <p className="cd-eyebrow">2 · Confirm map</p>
              <h2>Proposals only — source values stay as written.</h2>
              <div className="cd-table-head map">
                <span>Factory field</span>
                <span>Sample</span>
                <span>Fruma field</span>
                <span>Confidence</span>
                <span>Status</span>
              </div>
              {pilot.mapping.proposals.map((p) => (
                <div className="cd-table-row map" key={p.header} data-label={p.header}>
                  <b data-label="Factory field">{p.header}</b>
                  <span data-label="Sample">{p.sampleValues[0] ?? "—"}</span>
                  <code data-label="Fruma field">{p.proposedField ?? "unmapped"}</code>
                  <span data-label="Confidence">{p.confidence}</span>
                  <small data-label="Status">{p.proposedField ? "Mapped" : "Exception"}</small>
                </div>
              ))}
            </article>

            <article className="cd-card">
              <p className="cd-eyebrow">3 · Brief · {pilot.brief.sku}</p>
              <h2>{pilot.brief.productName}</h2>
              <p>{pilot.brief.intent}</p>
              <ul className="v3-req-list">
                {pilot.brief.requirements.map((req) => (
                  <div className="v3-req captured" key={req.id}>
                    <div className="v3-req-main">
                      <div>
                        <b>{req.label}</b>
                        <small>{req.kind}</small>
                      </div>
                    </div>
                    <div className="v3-req-value">
                      <span>{req.value}</span>
                      <em>{req.kind}</em>
                    </div>
                  </div>
                ))}
              </ul>
            </article>

            <article className="cd-card">
              <p className="cd-eyebrow">4 · Cited shortlist</p>
              <h2>
                {pilot.shortlist.matchingFabricCount} fabrics can become this polo
              </h2>
              <p className="cd-muted">
                MOQ {pilot.shortlist.commercials.moqAsWritten} ·{" "}
                <strong>historical</strong> until mill reconfirms — not current supply terms.
              </p>
              <div className="cd-supplier-grid">
                {pilot.shortlist.hits.map((hit) => (
                  <article className="cd-card supplier selected" key={hit.articleCode}>
                    <div className="cd-supplier-top">
                      <span>{hit.articleCode}</span>
                      <small>cited</small>
                    </div>
                    <h2>
                      {hit.constructionAsWritten} · {hit.compositionAsWritten}
                    </h2>
                    <p>
                      {hit.weightAsWritten}
                      {hit.colourAsWritten ? ` · ${hit.colourAsWritten}` : ""}
                    </p>
                    <div className="cd-recommendation-reasons">
                      {hit.citationLines.slice(0, 5).map((line) => (
                        <span key={line}>
                          <Check size={12} />
                          {line}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <div className="v3-req-list" style={{ marginTop: "1rem" }}>
                {pilot.shortlist.answerability.map((row) => (
                  <div className="v3-req captured" key={row.requirementId}>
                    <div className="v3-req-main">
                      <div>
                        <b>{row.requirementId}</b>
                        <small>{row.result}</small>
                      </div>
                      <span className="v3-captured">
                        <Check size={12} /> {row.result}
                      </span>
                    </div>
                    <p className="cd-muted">{row.note}</p>
                  </div>
                ))}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
                {pilot.shortlist.evidence.map((flag) => (
                  <li
                    key={flag.code}
                    className={flag.severity === "block" ? "v3-warning" : "cd-success"}
                    style={{ marginBottom: "0.5rem" }}
                  >
                    <b>{flag.title}</b> — {flag.detail}
                  </li>
                ))}
              </ul>
            </article>

            <div className="cd-actions end">
              <button type="button" className="cd-primary" onClick={() => go("confirm")}>
                Continue to mill confirmation <ArrowRight size={14} />
              </button>
            </div>
          </>
        ) : null}
      </main>
    );
  }

  if (step === "confirm") {
    return (
      <main className="cd-main">
        <div className="cd-page-head">
          <div>
            <p>05 · Confirm · promoted spine</p>
            <h1>Anonymous mill response with timestamped commercials.</h1>
            <span>
              Brand identity stays off the mill view. Fabric-book MOQ is historical until the mill
              reconfirms.
            </span>
          </div>
        </div>

        <div className="cd-progress" aria-label="Spine progress">
          {["Deposit", "Map", "Shortlist", "Confirm", "Lock"].map((label, i) => (
            <span key={label} className={i <= 3 && result ? "active" : i < 3 ? "active" : ""}>
              {label}
            </span>
          ))}
        </div>

        {!result ? (
          <section className="cd-card">
            <div className="cd-empty">
              <CircleAlert size={24} />
              <p>Source wedge has not run yet. Complete Source before Confirm.</p>
              <button type="button" className="cd-primary" onClick={() => go("source")}>
                Back to Source
              </button>
            </div>
          </section>
        ) : (
          <div className="cd-grid two">
            <section className="cd-card">
              <p className="cd-eyebrow">Brand side</p>
              <h2>{pilot!.brief.productName}</h2>
              <div className="cd-line">
                <b>Request</b>
                <span>{result.request.brandSide.id.slice(0, 14)}…</span>
              </div>
              <div className="cd-line">
                <b>Brand</b>
                <span>{result.request.brandSide.brandId}</span>
              </div>
              <div className="cd-line">
                <b>Quality</b>
                <span>{result.confirmation.qualityArticle}</span>
              </div>
              <div className="cd-success">
                <Check size={14} /> Mill confirmed MOQ {result.commercials.moqM}m · lead{" "}
                {result.commercials.leadWeeks}w
              </div>
              <p className="cd-muted">
                Freshness {result.commercials.before} → {result.commercials.after}
              </p>
            </section>
            <section className="cd-card">
              <p className="cd-eyebrow">Mill view · brand hidden</p>
              <h2>Anonymous sourcing request</h2>
              <div className="cd-line">
                <b>Category</b>
                <span>{result.request.millVisible.millVisible.category}</span>
              </div>
              <div className="cd-line">
                <b>Colour</b>
                <span>{result.request.millVisible.millVisible.colour ?? "—"}</span>
              </div>
              <div className="cd-line">
                <b>Region</b>
                <span>{result.request.millVisible.millVisible.deliveryRegion}</span>
              </div>
              <div className="cd-line">
                <b>Confirmed at</b>
                <span>{result.commercials.confirmedAt}</span>
              </div>
              <p className="cd-muted">Brand id is not on this view.</p>
            </section>
            <div className="cd-actions end" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="cd-primary" onClick={() => go("standardise")}>
                Lock product truth <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="cd-main">
      <div className="cd-page-head">
        <div>
          <p>06 · Standardise · promoted spine</p>
          <h1>Source locked on a versioned product-truth record.</h1>
          <span>
            Commercials are mill-response / confirmed — not fabric-book history. Physical development
            comes after the lock.
          </span>
        </div>
      </div>

      <div className="cd-progress" aria-label="Spine progress">
        {["Deposit", "Map", "Shortlist", "Confirm", "Lock"].map((label) => (
          <span key={label} className={result ? "active" : ""}>
            {label}
          </span>
        ))}
      </div>

      {!result ? (
        <section className="cd-card">
          <div className="cd-empty">
            <CircleAlert size={24} />
            <p>No locked record yet. Run Source → Confirm first.</p>
            <button type="button" className="cd-primary" onClick={() => go("source")}>
              Back to Source
            </button>
          </div>
        </section>
      ) : (
        <section className="cd-card">
          <div className="cd-success">
            <Check size={14} /> Locked · <code>{result.locked.lockedSourceId}</code> · v
            {result.locked.version}
          </div>
          <h2>{pilot!.brief.productName}</h2>
          {result.locked.facts
            .filter((f) =>
              ["mill_article", "construction", "composition", "colour", "moq_m", "lead_weeks"].includes(
                f.field,
              ),
            )
            .map((f) => (
              <div className="cd-line" key={f.id}>
                <b>{f.field}</b>
                <span>{String(f.value)}</span>
                <small>
                  {f.status} · {f.sourceType}
                </small>
              </div>
            ))}
          <div className="cd-actions end">
            <button type="button" className="cd-secondary" onClick={() => go("development")}>
              Physical development (story)
            </button>
            <button type="button" className="cd-primary" onClick={() => go("ready")}>
              Channel-ready destinations <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

/** Factory-side promoted setup — same Demo wedge, real map table. */
export function DemoPromotedFactorySetup({
  onComplete,
  onResult,
  result,
}: {
  onComplete: () => void;
  onResult: (r: WedgeSliceResult) => void;
  result: WedgeSliceResult | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<RunPhase>(result ? "done" : "idle");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  async function run() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setBusy(true);
    setError(null);
    setPhase("deposit");
    timers.current.push(window.setTimeout(() => setPhase("mapping"), 400));
    timers.current.push(window.setTimeout(() => setPhase("shortlist"), 1000));
    try {
      const res = await fetch("/api/demo/wedge", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "demo" },
        body: JSON.stringify({ reset: true }),
      });
      const json = (await res.json()) as WedgeSliceResult & { error?: string };
      if (!res.ok || json.error) {
        setPhase("error");
        setError(json.error ?? `Setup failed (${res.status})`);
        return;
      }
      onResult(json);
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cd-main dark">
      <div className="cd-page-head">
        <div>
          <p>Factory setup · promoted</p>
          <h1>Keep your systems. Fruma maps the book you already have.</h1>
          <span>
            Real XLSX deposit and dialect header confirm. No invented catalogue scale.
          </span>
        </div>
      </div>

      <div className="cd-actions">
        <button type="button" className="cd-primary" disabled={busy} onClick={() => void run()}>
          {busy ? (
            <>
              <LoaderCircle size={14} className="cd-spin" /> Mapping pilot workbook…
            </>
          ) : (
            <>Upload & map pilot quality book</>
          )}
        </button>
      </div>

      {busy ? (
        <section className="cd-card dark" style={{ marginTop: "1rem" }}>
          <div className="v3-activity-list">
            {RUN_STEPS.slice(0, 3).map((s) => {
              const state = phaseState(phase === "done" ? "shortlist" : phase, s.id);
              return (
                <div key={s.id} className={`v3-activity-row ${state}`}>
                  <span>
                    {state === "done" ? <Check size={13} /> : <LoaderCircle size={13} className="cd-spin" />}
                  </span>
                  <div>
                    <b>{s.label}</b>
                    <small>{s.agent}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="v3-warning">
          <CircleAlert size={14} /> {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="v3-stat-grid">
            <div>
              <b>{result.pilot.workbook.qualitiesBeforeConfirm}</b>
              <span>Before map confirm</span>
            </div>
            <div>
              <b>{result.pilot.workbook.qualitiesAfterConfirm}</b>
              <span>Searchable qualities</span>
            </div>
            <div>
              <b>{result.pilot.mapping.proposals.length}</b>
              <span>Headers reviewed</span>
            </div>
            <div>
              <b>{result.pilot.shortlist.matchingFabricCount}</b>
              <span>Polo-capable fabrics</span>
            </div>
          </div>
          <section className="cd-card dark">
            <p className="cd-eyebrow">Confirmed map</p>
            <h2>{result.pilot.workbook.millName}</h2>
            <p className="cd-muted">
              <code>{result.pilot.workbook.filename}</code> · deposit{" "}
              <code>{result.pilot.workbook.depositId.slice(0, 8)}</code>
            </p>
            <div className="cd-table-head map">
              <span>Factory field</span>
              <span>Sample</span>
              <span>Fruma field</span>
              <span>Confidence</span>
              <span>Status</span>
            </div>
            {result.pilot.mapping.proposals.map((p) => (
              <div className="cd-table-row map" key={p.header}>
                <b data-label="Factory field">{p.header}</b>
                <span data-label="Sample">{p.sampleValues[0] ?? "—"}</span>
                <code data-label="Fruma field">{p.proposedField ?? "unmapped"}</code>
                <span data-label="Confidence">{p.confidence}</span>
                <small data-label="Status">{p.proposedField ? "Mapped" : "Exception"}</small>
              </div>
            ))}
            <div className="cd-actions end">
              <button type="button" className="cd-primary" onClick={onComplete}>
                Factory workspace ready <Check size={14} />
              </button>
            </div>
          </section>
        </>
      ) : !busy ? (
        <section className="cd-card dark">
          <div className="cd-empty">
            <p>Drop the mill workbook you already use. Fruma confirms header maps — it does not invent rows.</p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
