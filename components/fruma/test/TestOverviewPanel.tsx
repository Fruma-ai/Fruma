"use client";

import type { CorpusCoverage } from "@/lib/fruma/intelligence/coverage";
import { DIALECT_PLAYBOOKS, playbookReady } from "@/lib/fruma/intelligence/playbooks";
import { TEST_BRANDS } from "@/lib/fruma/test-corpus";
import type { StandardField } from "@/lib/fruma/ingest/types";
import type { HangerDialect } from "@/lib/fruma/test-corpus/types";

export function TestOverviewPanel({
  coverage,
  overlays,
  busy,
  error,
  onConfirmDialect,
  onOpenSource,
  onOpenLab,
}: {
  coverage: CorpusCoverage;
  overlays: Record<string, StandardField>;
  busy: boolean;
  error: string | null;
  onConfirmDialect: (dialect: HangerDialect) => void;
  onOpenSource: () => void;
  onOpenLab: () => void;
}) {
  const overlayCount = Object.keys(overlays).length;
  const darkFactories = coverage.factories.filter((f) => f.status === "dark");

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Test environment · live corpus health</p>
        <h1>Mill fabric files are not a product catalogue.</h1>
        <p>
          Mills send fabrics and materials — a mass of qualities, not hangers of finished goods.
          Mapping that cloth is what tells a brand which end products can actually be made.{" "}
          {coverage.dark
            ? `${coverage.dark} mill books are still dark because unknown columns stay silent.`
            : `${coverage.partial} mill books are partial — rows exist, but some mill vocabulary is still unmapped.`}{" "}
          Demo on <code>/app</code> stays frozen.
        </p>
      </header>
      <div className="tc-stats tc-stats-six">
        <div><b>{coverage.factoriesTotal}</b><span>mill books</span></div>
        <div><b>{coverage.searchable}</b><span>searchable</span></div>
        <div><b>{coverage.partial}</b><span>partial map</span></div>
        <div><b>{coverage.dark}</b><span>dark mills</span></div>
        <div><b>{coverage.qualitiesTotal}</b><span>fabric qualities</span></div>
        <div><b>{coverage.unmappedHeaderCount}</b><span>silent headers</span></div>
      </div>

      {error ? <p className="tc-error" role="alert">{error}</p> : null}

      <div className="tc-grid two">
        <article className="tc-card">
          <p className="tc-kicker">Dialect health</p>
          <h2>Where dummy data actually breaks</h2>
          <div className="tc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dialect</th>
                  <th>Searchable</th>
                  <th>Partial</th>
                  <th>Dark</th>
                  <th>Qualities</th>
                </tr>
              </thead>
              <tbody>
                {coverage.byDialect.map((row) => (
                  <tr key={row.dialect}>
                    <td><code>{row.dialect}</code></td>
                    <td>{row.searchable}</td>
                    <td>{row.partial}</td>
                    <td>{row.dark}</td>
                    <td>{row.qualities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="tc-card">
          <p className="tc-kicker">Dark mill queue</p>
          <h2>{darkFactories.length} mills with zero qualities</h2>
          {darkFactories.length === 0 ? (
            <p>No dark mills. Article identity is mapped for every fabric book.</p>
          ) : (
            <ul className="tc-list stacked">
              {darkFactories.slice(0, 8).map((factory) => (
                <li key={factory.factoryId}>
                  <b>{factory.factoryName}</b>
                  <span>{factory.blocker}</span>
                  <em>{factory.dialect}</em>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="tc-card">
        <p className="tc-kicker">Dialect playbooks · mapping without invention</p>
        <h2>Confirm once. Recover every mill that shares the file shape.</h2>
        <p>
          {overlayCount
            ? `${overlayCount} confirmed header overlay${overlayCount === 1 ? "" : "s"} on this Test process.`
            : "No overlays confirmed yet. Builtin English aliases only."}
        </p>
        <div className="tc-grid playbooks">
          {DIALECT_PLAYBOOKS.map((book) => {
            const dialect = coverage.byDialect.find((d) => d.dialect === book.dialect);
            const ready = playbookReady(coverage, book.dialect);
            const done = dialect && dialect.unmappedHeaders.length === 0;
            return (
              <div key={book.dialect} className="tc-playbook">
                <p className="tc-kicker">{book.dialect}</p>
                <h3>{book.title}</h3>
                <p>{book.why}</p>
                {dialect?.unmappedHeaders.length ? (
                  <small>Silent: {dialect.unmappedHeaders.join(" · ")}</small>
                ) : (
                  <small>All columns on the Fruma standard.</small>
                )}
                <button
                  type="button"
                  className="tc-primary"
                  disabled={busy || !ready || Boolean(done)}
                  onClick={() => onConfirmDialect(book.dialect)}
                >
                  {done ? "Playbook applied" : busy ? "Confirming…" : "Confirm playbook"}
                </button>
              </div>
            );
          })}
        </div>
      </article>

      <article className="tc-card">
        <p className="tc-kicker">Silent headers (mapping fuel)</p>
        <h2>Unknown columns are work. Blank articles are exceptions. Do not mix them.</h2>
        {coverage.mappingQueue.length === 0 ? (
          <p>Every mill header is on the standard.</p>
        ) : (
          <div className="tc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>As sent</th>
                  <th>Proposed field</th>
                  <th>Samples</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {coverage.mappingQueue.map((item) => (
                  <tr key={item.header}>
                    <td><code>{item.header}</code></td>
                    <td>{item.proposedField ?? "— needs review"}</td>
                    <td>{item.sampleValues.join(" · ") || "—"}</td>
                    <td>{item.alreadyMapped ? "mapped" : item.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <div className="tc-grid three">
        {TEST_BRANDS.map((brand) => (
          <article key={brand.id} className="tc-card">
            <p className="tc-kicker">{brand.hq} · {brand.market}</p>
            <h2>{brand.name}</h2>
            <p>{brand.summary}</p>
            <small>{brand.categoryFocus.join(" · ")}</small>
          </article>
        ))}
      </div>

      <div className="tc-actions">
        <button type="button" className="tc-primary" onClick={onOpenSource}>
          Open cloth matching
        </button>
        <button type="button" className="tc-secondary" onClick={onOpenLab}>
          Open Lab ingest
        </button>
      </div>
    </section>
  );
}
