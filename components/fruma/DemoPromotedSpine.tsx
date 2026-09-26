"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import type { WedgeSliceResult } from "@/lib/fruma/wedge";

type BrandStep = "source" | "confirm" | "standardise" | "development" | "ready";

/**
 * Promoted Demo spine UI — real workbook → map → cited shortlist →
 * anonymous mill confirm → locked product truth. Demo CSS classes only.
 * Keep mounted across source/confirm/standardise so wedge state survives.
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

  async function runWedge() {
    setBusy(true);
    setError(null);
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
        setError(json.error ?? `Wedge failed (${res.status})`);
        return;
      }
      setResult(json);
    } catch (err) {
      setResult(null);
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
            <p>04 · Network intelligence · promoted</p>
            <h1>Find cloth that can become this product.</h1>
            <span>
              Promoted from Test: real mill XLSX → confirmed header map → cited shortlist. Mills file
              fabrics, not garment SKUs. Fake catalogue scale is gone.
            </span>
          </div>
        </div>

        <div className="cd-actions" style={{ marginBottom: "1rem" }}>
          <button type="button" className="cd-primary" disabled={busy} onClick={() => void runWedge()}>
            {busy ? (
              <>
                <LoaderCircle size={14} className="cd-spin" /> Running promoted wedge…
              </>
            ) : (
              <>
                <Sparkles size={14} /> Run promoted source wedge
              </>
            )}
          </button>
        </div>

        {error ? (
          <div className="v3-warning">
            <CircleAlert size={14} /> {error}
          </div>
        ) : null}

        {!result ? (
          <section className="cd-card">
            <div className="cd-empty">
              <Sparkles size={24} />
              <p>
                Run the promoted wedge to deposit the pilot fabric book, confirm dialect headers, and
                shortlist navy polo cloth with cell citations.
              </p>
            </div>
          </section>
        ) : (
          <>
            <p className="cd-success" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Check size={14} /> {result.honesty}
            </p>
            <div className="v3-stat-grid">
              <div>
                <b>{pilot!.workbook.qualitiesAfterConfirm}</b>
                <span>Searchable qualities</span>
              </div>
              <div>
                <b>{pilot!.shortlist.matchingFabricCount}</b>
                <span>Navy polo fabrics</span>
              </div>
              <div>
                <b>{pilot!.shortlist.commercials.freshness}</b>
                <span>Commercial freshness</span>
              </div>
              <div>
                <b>{result.persistence.backend}</b>
                <span>Spine backend</span>
              </div>
            </div>
            <div className="cd-supplier-grid">
              {pilot!.shortlist.hits.map((hit) => (
                <article className="cd-card supplier selected" key={hit.articleCode}>
                  <div className="cd-supplier-top">
                    <span>{hit.articleCode}</span>
                    <small>cited</small>
                  </div>
                  <h2>{pilot!.workbook.millName}</h2>
                  <p>
                    {hit.constructionAsWritten} · {hit.compositionAsWritten} · {hit.weightAsWritten}
                    {hit.colourAsWritten ? ` · ${hit.colourAsWritten}` : ""}
                  </p>
                  <div className="cd-recommendation-reasons">
                    {hit.citationLines.slice(0, 4).map((line) => (
                      <span key={line}>
                        <Check size={12} />
                        {line}
                      </span>
                    ))}
                  </div>
                  <ul className="cd-kpis" style={{ listStyle: "none", padding: 0 }}>
                    {pilot!.shortlist.evidence
                      .filter((e) => e.severity === "block")
                      .map((e) => (
                        <li key={e.code} className="v3-warning" style={{ marginTop: "0.5rem" }}>
                          <CircleAlert size={12} /> {e.title}
                        </li>
                      ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="cd-actions end">
              <button type="button" className="cd-primary" onClick={() => go("confirm")}>
                Continue to mill confirmation <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  if (step === "confirm") {
    return (
      <main className="cd-main">
        <div className="cd-page-head">
          <div>
            <p>05 · Current confirmation · promoted</p>
            <h1>Anonymous mill response with timestamped commercials.</h1>
            <span>
              Brand identity stays off the mill view. Fabric-book MOQ is historical until the mill
              reconfirms.
            </span>
          </div>
        </div>

        {!result ? (
          <section className="cd-card">
            <div className="cd-empty">
              <p>Run the source wedge first, then return here.</p>
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
              <p className="cd-eyebrow" style={{ marginTop: "1rem" }}>
                Freshness {result.commercials.before} → {result.commercials.after}
              </p>
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

  // standardise → locked product truth
  return (
    <main className="cd-main">
      <div className="cd-page-head">
        <div>
          <p>07 · Fruma Standard · promoted</p>
          <h1>Source locked on a versioned product-truth record.</h1>
          <span>
            Commercials are mill-response / confirmed — not fabric-book history. Source values stay as
            written.
          </span>
        </div>
      </div>

      {!result ? (
        <section className="cd-card">
          <div className="cd-empty">
            <p>Run the source wedge and confirmation first.</p>
            <button type="button" className="cd-primary" onClick={() => go("source")}>
              Back to Source
            </button>
          </div>
        </section>
      ) : (
        <>
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
        </>
      )}
    </main>
  );
}

/** Factory-side promoted setup — runs the same Demo wedge instead of fake 412/1842 stats. */
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

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/wedge", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "demo" },
        body: JSON.stringify({ reset: true }),
      });
      const json = (await res.json()) as WedgeSliceResult & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? `Setup failed (${res.status})`);
        return;
      }
      onResult(json);
    } catch (err) {
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
            Promoted from Test: real XLSX deposit, dialect header confirm, searchable qualities.
            No invented catalogue scale.
          </span>
        </div>
      </div>

      <div className="cd-actions" style={{ marginBottom: "1rem" }}>
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
            <p>
              <code>{result.pilot.workbook.filename}</code> · deposit{" "}
              <code>{result.pilot.workbook.depositId.slice(0, 8)}</code>
            </p>
            <div className="cd-table-head map">
              <span>Factory field</span>
              <span>Fruma field</span>
              <span>Confidence</span>
              <span>Status</span>
            </div>
            {result.pilot.mapping.proposals.map((p) => (
              <div className="cd-table-row map" key={p.header}>
                <b>{p.header}</b>
                <code>{p.proposedField ?? "unmapped"}</code>
                <span>{p.confidence}</span>
                <small>{p.proposedField ? "Mapped" : "Exception"}</small>
              </div>
            ))}
            <div className="cd-actions end">
              <button type="button" className="cd-primary" onClick={onComplete}>
                Factory workspace ready <Check size={14} />
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="cd-card dark">
          <div className="cd-empty">
            <p>Drop the mill workbook you already use. Fruma confirms header maps — it does not invent rows.</p>
          </div>
        </section>
      )}
    </main>
  );
}
