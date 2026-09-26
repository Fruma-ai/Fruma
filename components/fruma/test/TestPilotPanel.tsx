"use client";

import { useState } from "react";
import type { PilotSliceResult } from "@/lib/fruma/pilot";
import type { WedgeSliceResult } from "@/lib/fruma/wedge";

type Mode = "pilot" | "wedge";

export function TestPilotPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pilot, setPilot] = useState<PilotSliceResult | null>(null);
  const [wedge, setWedge] = useState<WedgeSliceResult | null>(null);

  async function run(mode: Mode) {
    setBusy(true);
    setError(null);
    try {
      const path = mode === "wedge" ? "/api/test/wedge" : "/api/test/pilot";
      const res = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ reset: true }),
      });
      const json = (await res.json()) as (PilotSliceResult | WedgeSliceResult) & { error?: string };
      if (!res.ok || json.error) {
        setPilot(null);
        setWedge(null);
        setError(json.error ?? `Run failed (${res.status})`);
        return;
      }
      if (mode === "wedge") {
        const full = json as WedgeSliceResult;
        setWedge(full);
        setPilot(full.pilot);
      } else {
        setWedge(null);
        setPilot(json as PilotSliceResult);
      }
    } catch (err) {
      setPilot(null);
      setWedge(null);
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  const result = pilot;

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Pilot · full wedge · test only</p>
        <h1>Workbook → map → confirm → locked truth.</h1>
        <p>
          One realistic mill XLSX through the real ingest engine, then an anonymous mill
          confirmation and a versioned product-truth lock. Maps and deposits persist on the Test
          spine. Demo stays frozen.
        </p>
      </header>

      <div className="tc-lab" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="button" className="tc-primary" disabled={busy} onClick={() => void run("pilot")}>
          {busy ? "Running…" : "Run pilot shortlist"}
        </button>
        <button type="button" className="tc-primary" disabled={busy} onClick={() => void run("wedge")}>
          {busy ? "Running…" : "Run full wedge"}
        </button>
      </div>

      {error ? (
        <p className="tc-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <p className="tc-continuity">{wedge?.honesty ?? result.honesty}</p>

          <div className="tc-stats tc-stats-six">
            <div>
              <b>{result.workbook.qualitiesAfterConfirm}</b>
              <span>qualities after map</span>
            </div>
            <div>
              <b>{result.shortlist.matchingFabricCount}</b>
              <span>navy polo fabrics</span>
            </div>
            <div>
              <b>{result.shortlist.commercials.freshness}</b>
              <span>commercial freshness</span>
            </div>
            <div>
              <b>{wedge ? "confirmed" : "—"}</b>
              <span>mill response</span>
            </div>
            <div>
              <b>{wedge?.locked.lockedSourceId ? "locked" : "—"}</b>
              <span>product truth</span>
            </div>
            <div>
              <b>{wedge?.persistence.backend ?? "—"}</b>
              <span>spine backend</span>
            </div>
          </div>

          <article className="tc-card">
            <p className="tc-kicker">1 · Deposit</p>
            <h2>{result.workbook.millName}</h2>
            <p>
              <code>{result.workbook.filename}</code> · deposit{" "}
              <code>{result.workbook.depositId.slice(0, 8)}</code> · sha{" "}
              <code>{result.workbook.sha256.slice(0, 12)}</code>
            </p>
            <p className="tc-muted">
              Before confirm the article header <code>Art.</code> is unknown —{" "}
              {result.workbook.qualitiesBeforeConfirm} searchable qualities. After confirm:{" "}
              {result.workbook.qualitiesAfterConfirm}.
            </p>
          </article>

          <article className="tc-card">
            <p className="tc-kicker">2 · Confirm map</p>
            <h2>Proposals only — source values stay as written.</h2>
            <ul className="tc-map-list">
              {result.mapping.proposals.map((p) => (
                <li key={p.header}>
                  <code>{p.header}</code>
                  <span>→ {p.proposedField ?? "unmapped"}</span>
                  <em>{p.confidence}</em>
                </li>
              ))}
            </ul>
          </article>

          <article className="tc-card">
            <p className="tc-kicker">3 · Brief · {result.brief.sku}</p>
            <h2>{result.brief.productName}</h2>
            <p>{result.brief.intent}</p>
            <ul className="tc-req">
              {result.brief.requirements.map((req) => (
                <li key={req.id}>
                  <em>{req.kind}</em>
                  <b>{req.label}</b>
                  <span>{req.value}</span>
                </li>
              ))}
            </ul>
          </article>

          <div className="tc-grid source-cards">
            <article className="tc-card tc-source-card">
              <p className="tc-kicker">Cited shortlist · {result.workbook.millName}</p>
              <h2>{result.shortlist.matchingFabricCount} fabrics can become this polo</h2>
              <p className="tc-muted">
                MOQ {result.shortlist.commercials.moqAsWritten} · {result.shortlist.commercials.freshness}
                {result.shortlist.commercials.freshness === "historical"
                  ? " — not current supply terms."
                  : " — mill-timestamped."}
              </p>
              <ul className="tc-fabric">
                {result.shortlist.hits.map((hit) => (
                  <li key={hit.articleCode}>
                    <code>{hit.articleCode}</code>
                    <span>
                      {hit.constructionAsWritten} · {hit.compositionAsWritten} · {hit.weightAsWritten}
                      {hit.colourAsWritten ? ` · ${hit.colourAsWritten}` : ""}
                    </span>
                    <em>can become {hit.possibleEndProducts.join(" · ")}</em>
                    <ul className="tc-cite">
                      {hit.citationLines.map((line) => (
                        <li key={line}>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <ul className="tc-answer">
                {result.shortlist.answerability.map((row) => (
                  <li key={row.requirementId}>
                    <em>{row.result}</em>
                    <span>
                      {row.note}
                      {row.citations.length > 0 ? (
                        <ul className="tc-cite">
                          {row.citations.slice(0, 4).map((c) => (
                            <li key={`${c.field}-${c.row}-${c.column}`}>
                              {c.sheet}!{c.column}
                              {c.row} · “{c.header}” = {c.sourceValue}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              <ul className="tc-evidence">
                {result.shortlist.evidence.map((flag) => (
                  <li key={flag.code} className={flag.severity}>
                    <b>{flag.title}</b>
                    <span>{flag.detail}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          {wedge ? (
            <>
              <article className="tc-card">
                <p className="tc-kicker">4 · Anonymous mill confirmation</p>
                <h2>Brand stays off the mill view.</h2>
                <p className="tc-muted">
                  Mill sees request <code>{wedge.request.millVisible.id.slice(0, 12)}</code> for{" "}
                  {wedge.request.millVisible.millVisible.category}
                  {wedge.request.millVisible.millVisible.colour
                    ? ` · ${wedge.request.millVisible.millVisible.colour}`
                    : ""}{" "}
                  — no brand name.
                </p>
                <p>
                  Confirmed MOQ <b>{wedge.commercials.moqM}m</b> · lead{" "}
                  <b>{wedge.commercials.leadWeeks}w</b> at{" "}
                  <code>{wedge.commercials.confirmedAt}</code>. Freshness moved{" "}
                  {wedge.commercials.before} → {wedge.commercials.after}.
                </p>
              </article>

              <article className="tc-card">
                <p className="tc-kicker">5 · Locked product truth · v{wedge.locked.version}</p>
                <h2>
                  Source locked · <code>{wedge.locked.lockedSourceId}</code>
                </h2>
                <p className="tc-muted">
                  {wedge.locked.facts.length} facts on the versioned record. Commercials are{" "}
                  <code>mill-response</code> / confirmed — not fabric-book history. Spine backend:{" "}
                  <code>{wedge.persistence.backend}</code>.
                </p>
                <ul className="tc-req">
                  {wedge.locked.facts
                    .filter((f) =>
                      ["mill_article", "composition", "moq_m", "lead_weeks", "colour"].includes(f.field),
                    )
                    .map((f) => (
                      <li key={f.id}>
                        <em>{f.status}</em>
                        <b>{f.field}</b>
                        <span>
                          {String(f.value)} · {f.sourceType}
                        </span>
                      </li>
                    ))}
                </ul>
              </article>
            </>
          ) : null}
        </>
      ) : (
        <p className="tc-muted">
          Run the shortlist or the full wedge to deposit the pilot XLSX, confirm dialect headers,
          shortlist navy polo cloth with citations, then optionally confirm and lock.
        </p>
      )}
    </section>
  );
}
