"use client";

import { useState } from "react";
import type { PilotSliceResult } from "@/lib/fruma/pilot";

export function TestPilotPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PilotSliceResult | null>(null);

  async function runSlice(reset = true) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/test/pilot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ reset }),
      });
      const json = (await res.json()) as PilotSliceResult & { error?: string };
      if (!res.ok || json.error) {
        setResult(null);
        setError(json.error ?? `Pilot failed (${res.status})`);
        return;
      }
      setResult(json);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Pilot failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Pilot · sellability slice · test only</p>
        <h1>Workbook → confirmed map → cited shortlist.</h1>
        <p>
          One realistic mill XLSX through the real ingest engine. Headers stay unmapped until
          confirmed. Matching fabrics cite the mill cell — sheet, column, row, header, value as
          written. Demo stays frozen.
        </p>
      </header>

      <div className="tc-lab">
        <button type="button" className="tc-primary" disabled={busy} onClick={() => void runSlice(true)}>
          {busy ? "Running slice…" : "Run pilot slice"}
        </button>
      </div>

      {error ? (
        <p className="tc-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <p className="tc-continuity">{result.honesty}</p>

          <div className="tc-stats tc-stats-six">
            <div>
              <b>{result.workbook.qualitiesBeforeConfirm}</b>
              <span>qualities before map</span>
            </div>
            <div>
              <b>{result.workbook.qualitiesAfterConfirm}</b>
              <span>qualities after confirm</span>
            </div>
            <div>
              <b>{result.shortlist.matchingFabricCount}</b>
              <span>navy polo fabrics</span>
            </div>
            <div>
              <b>{result.mapping.proposals.filter((p) => p.proposedField && !p.alreadyMapped).length}</b>
              <span>headers confirmed</span>
            </div>
            <div>
              <b>{result.shortlist.evidence.filter((e) => e.severity === "block").length}</b>
              <span>evidence blocks</span>
            </div>
            <div>
              <b>{result.shortlist.commercials.freshness}</b>
              <span>commercial freshness</span>
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
              Before confirm the article header <code>Art.</code> is unknown — {result.workbook.qualitiesBeforeConfirm}{" "}
              searchable qualities. After confirm: {result.workbook.qualitiesAfterConfirm}.
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
                MOQ {result.shortlist.commercials.moqAsWritten} · {result.shortlist.commercials.freshness} — not
                current supply terms.
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
        </>
      ) : (
        <p className="tc-muted">
          Run the slice to deposit the pilot XLSX, confirm dialect headers, and shortlist navy polo cloth with
          citations.
        </p>
      )}
    </section>
  );
}
