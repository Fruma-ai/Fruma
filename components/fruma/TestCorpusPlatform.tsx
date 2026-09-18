"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TEST_BRANDS,
  TEST_FACTORIES,
  hangerCsvFor,
  linksForBrand,
  productsForBrand,
  testCorpusSummary,
  type TestFactory,
} from "@/lib/fruma/test-corpus";
import { VersionBanner } from "@/components/fruma/VersionBanner";
import {
  STEWARD_PROMPT,
  blockedOnOwen,
  listStewardQueue,
  nextStewardPull,
} from "@/lib/fruma/agents/steward-queue";

type Tab = "overview" | "brands" | "factories" | "hangers" | "lab" | "agents";

const TABS: Tab[] = ["overview", "brands", "factories", "hangers", "lab", "agents"];
const AGENT_BRANDS = TEST_BRANDS;

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as string[]).includes(value);
}

function downloadCsv(factory: TestFactory) {
  const csv = hangerCsvFor(factory);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = factory.filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Overview() {
  const summary = testCorpusSummary();
  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Test environment</p>
        <h1>Three brands. Fifty factories. Private hanger files.</h1>
        <p>
          Build and break here. The customer demo on <code>/app</code> stays frozen until you
          explicitly promote. Full focus order: <code>docs/FOCUS_NOW.md</code>.
        </p>
      </header>
      <div className="tc-stats">
        <div><b>{summary.brands}</b><span>brands</span></div>
        <div><b>{summary.factories}</b><span>factories</span></div>
        <div><b>{summary.products}</b><span>products</span></div>
        <div><b>{summary.hangerRows}</b><span>hanger rows</span></div>
        <div><b>{summary.links}</b><span>brand↔factory links</span></div>
      </div>
      <ol className="tc-focus">
        <li>
          <b>Agents tab</b> — Harness → Mapping → Retrieval → Continuity → Evidence → All brands.
        </li>
        <li>
          <b>Steward</b> — queue on the Agents tab; weekday Automation so work continues when Owen is away.
        </li>
        <li>
          <b>Persist</b> — Postgres when Owen says so (blocked until then).
        </li>
        <li>
          <b>Promote</b> — only then copy accepted behaviour into Demo.
        </li>
        <li>
          <b>Never</b> — invent facts, leak private supplier memory, or broaden into MES/PLM.
        </li>
      </ol>
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
    </section>
  );
}

function BrandsPanel({
  brandId,
  setBrandId,
}: {
  brandId: string;
  setBrandId: (id: string) => void;
}) {
  const brand = TEST_BRANDS.find((b) => b.id === brandId) ?? TEST_BRANDS[0];
  const products = productsForBrand(brand.id);
  const links = linksForBrand(brand.id);
  const preferred = links.filter((l) => l.relationship === "preferred" || l.relationship === "proven");
  const excluded = links.filter((l) => l.relationship === "excluded");

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Brands</p>
        <h1>Tenant-private relationship memory</h1>
        <p>Each brand sees its own preferred / proven / excluded factory set. Nothing leaks across brands.</p>
      </header>
      <div className="tc-brand-tabs">
        {TEST_BRANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={b.id === brand.id ? "active" : ""}
            onClick={() => setBrandId(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>
      <div className="tc-grid two">
        <article className="tc-card">
          <p className="tc-kicker">{brand.id}</p>
          <h2>{brand.name}</h2>
          <p>{brand.summary}</p>
          <div className="tc-meta">
            <span>{preferred.length} preferred/proven</span>
            <span>{excluded.length} excluded</span>
            <span>{products.length} products</span>
          </div>
        </article>
        <article className="tc-card">
          <p className="tc-kicker">Products</p>
          <ul className="tc-list">
            {products.map((p) => (
              <li key={p.id}>
                <b>{p.sku}</b>
                <span>{p.name}</span>
                <em>{p.stage}</em>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <article className="tc-card">
        <p className="tc-kicker">Factory relationships · {brand.name}</p>
        <div className="tc-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Factory</th>
                <th>Relationship</th>
                <th>Granted articles</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {links
                .filter((l) => l.relationship !== "new")
                .slice(0, 24)
                .map((link) => {
                  const factory = TEST_FACTORIES.find((f) => f.id === link.factoryId)!;
                  return (
                    <tr key={`${link.brandId}-${link.factoryId}`}>
                      <td>{factory.name}</td>
                      <td>{link.relationship}</td>
                      <td>{link.grantedArticles.length || "—"}</td>
                      <td>{factory.country}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function FactoriesPanel({
  factoryId,
  setFactoryId,
}: {
  factoryId: string;
  setFactoryId: (id: string) => void;
}) {
  const factory = TEST_FACTORIES.find((f) => f.id === factoryId) ?? TEST_FACTORIES[0];
  const preview = useMemo(() => hangerCsvFor(factory).split("\n").slice(0, 8).join("\n"), [factory]);

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Factories</p>
        <h1>Fifty mills with their own data dialects</h1>
        <p>
          Each factory owns a private hanger CSV. Dialects vary (PT / IT / TR / UK imperial / PL / messy)
          so ingest and mapping can be tested against real variance.
        </p>
      </header>
      <div className="tc-grid factories">
        <aside className="tc-factory-list">
          {TEST_FACTORIES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={f.id === factory.id ? "active" : ""}
              onClick={() => setFactoryId(f.id)}
            >
              <b>{f.name}</b>
              <span>{f.country} · {f.rowCount} rows · {f.dialect}</span>
            </button>
          ))}
        </aside>
        <article className="tc-card">
          <p className="tc-kicker">{factory.id}</p>
          <h2>{factory.name}</h2>
          <p>
            {factory.region}, {factory.country}. MOQ {factory.moqM}m · lead {factory.leadWeeks} weeks.
          </p>
          <div className="tc-meta">
            <span>{factory.specialties.join(" · ")}</span>
            <span>{factory.certifications.join(" · ") || "No programme on file"}</span>
            <span>{factory.markets.join(" / ")}</span>
          </div>
          <div className="tc-actions">
            <button type="button" className="tc-primary" onClick={() => downloadCsv(factory)}>
              Download {factory.filename}
            </button>
            <a className="tc-secondary" href={`/api/test/factories/${factory.id}/hanger`}>
              API CSV
            </a>
          </div>
          <pre className="tc-preview">{preview}</pre>
        </article>
      </div>
    </section>
  );
}

function HangersPanel() {
  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Hanger index</p>
        <h1>All factory datasets</h1>
        <p>Download any hanger file, or open Lab to run Test-only ingest without touching Demo.</p>
      </header>
      <div className="tc-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Factory</th>
              <th>Dialect</th>
              <th>Rows</th>
              <th>File</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {TEST_FACTORIES.map((factory) => (
              <tr key={factory.id}>
                <td>{factory.name}</td>
                <td>{factory.dialect}</td>
                <td>{factory.rowCount}</td>
                <td><code>{factory.filename}</code></td>
                <td>
                  <button type="button" className="tc-link" onClick={() => downloadCsv(factory)}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type AgentRunView = {
  id: string;
  kind: string;
  status: string;
  summary: string;
  findings: { severity: string; code: string; message: string }[];
  output?: {
    factoriesTotal?: number;
    factoriesOk?: number;
    factoriesFailed?: number;
    qualitiesTotal?: number;
    exceptionsTotal?: number;
    unmappedHeaderCount?: number;
    byDialect?: Record<
      string,
      { factories: number; ok: number; qualities: number; exceptions: number; unmapped: string[] }
    >;
    proposals?: {
      header: string;
      proposedField: string | null;
      confidence: string;
      rationale: string;
      confirmed: boolean;
      alreadyMapped: boolean;
    }[];
    confirmed?: { header: string; field: string }[];
    brief?: {
      brandName: string;
      name: string;
      sku: string;
      intent: string;
      requirements: { id: string; kind: string; label: string }[];
    };
    shortlist?: {
      rank: number;
      factoryName: string;
      country: string;
      relationship: string;
      articleCode: string;
      construction: string;
      composition: string;
      colour: string;
      structuredScore: number;
      brandValueNote: string;
      evidence: { requirementId: string; result: string; explanation: string }[];
    }[];
    excludedFactoriesSkipped?: number;
    brandValue?: { headline: string; bullets: string[] };
    exceptions?: {
      scope: string;
      code: string;
      severity: string;
      message: string;
      before?: string;
      after?: string;
      brandName?: string;
    }[];
    unchanged?: { harnessDialectsStable: number; retrievalShortlistStable: number };
    baseline?: { established: boolean };
    scope?: string;
    brandId?: string;
    brandName?: string;
    slices?: {
      brandName: string;
      productName?: string;
      sku?: string;
      shortlistSize?: number;
      excludedSkipped?: number;
      preferredOrProven?: number;
      evidenceClaims?: number;
      evidenceNotBrandSafe?: number;
      fibreTraps?: number;
      topMills?: string[];
      established?: boolean;
      exceptionCount?: number;
      retrievalShortlistStable?: number;
    }[];
    tenantIsolation?: {
      checkedFactoryId?: string;
      leakDetected: boolean;
      note: string;
      relationshipsByBrand?: { brandName: string; relationship: string }[];
      brandsCompared?: number;
      crossBrandRetrievalDiffs?: number;
    };
    assessments?: {
      verdict: string;
      claimAsWritten: string;
      programme: string | null;
      claimKind: string;
      inferredScope: string;
      brandSafeToState: boolean;
      blockers: string[];
      factoryName: string;
      articleCode?: string;
    }[];
    summaryCounts?: Record<string, number>;
  };
};

function StewardQueueCard() {
  const next = nextStewardPull();
  const blocked = blockedOnOwen();
  const queue = listStewardQueue();

  return (
    <div className="tc-steward">
      <p className="tc-kicker">Build steward · continues when Owen is away</p>
      <p>
        Next unattended pull:{" "}
        {next ? (
          <>
            <b>{next.title}</b>
            <span> — {next.brandValue}</span>
          </>
        ) : (
          <b>Idle — nothing ready without an Owen decision</b>
        )}
      </p>
      <ol className="tc-steward-list">
        {queue.map((task) => (
          <li key={task.id} className={`tc-steward-task ${task.status}`}>
            <code>{task.status}</code>
            <span>{task.title}</span>
          </li>
        ))}
      </ol>
      {blocked.length > 0 ? (
        <p className="tc-steward-blocked">
          Waiting on Owen: {blocked.map((t) => t.title).join(" · ")}
        </p>
      ) : null}
      <details className="tc-steward-prompt">
        <summary>Standing prompt for a new Cloud Agent</summary>
        <pre>{STEWARD_PROMPT}</pre>
      </details>
    </div>
  );
}

function AgentsPanel() {
  const [busy, setBusy] = useState<
    "harness" | "mapping" | "retrieval" | "continuity" | "evidence" | "multi" | null
  >(null);
  const [agentBrandId, setAgentBrandId] = useState(AGENT_BRANDS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [harness, setHarness] = useState<AgentRunView | null>(null);
  const [mapping, setMapping] = useState<AgentRunView | null>(null);
  const [retrieval, setRetrieval] = useState<AgentRunView | null>(null);
  const [continuity, setContinuity] = useState<AgentRunView | null>(null);
  const [evidence, setEvidence] = useState<AgentRunView | null>(null);
  const [multi, setMulti] = useState<AgentRunView | null>(null);

  async function runHarness() {
    setBusy("harness");
    setError(null);
    try {
      const res = await fetch("/api/test/agents/harness", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Fruma-Version": "test" },
      });
      const json = (await res.json()) as { run?: AgentRunView; error?: string };
      if (!res.ok) {
        setError(json.error ?? `Harness failed (${res.status})`);
        return;
      }
      setHarness(json.run ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Harness failed");
    } finally {
      setBusy(null);
    }
  }

  async function runMapping() {
    setBusy("mapping");
    setError(null);
    try {
      const res = await fetch("/api/test/agents/mapping", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ action: "run", autoConfirmHighConfidence: true }),
      });
      const json = (await res.json()) as { run?: AgentRunView; error?: string };
      if (!res.ok) {
        setError(json.error ?? `Mapping failed (${res.status})`);
        return;
      }
      setMapping(json.run ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mapping failed");
    } finally {
      setBusy(null);
    }
  }

  async function runRetrieval() {
    if (agentBrandId === "__all__") {
      setError("Pick a single brand for Retrieval, or use 6. All brands.");
      return;
    }
    setBusy("retrieval");
    setError(null);
    try {
      const res = await fetch("/api/test/agents/retrieval", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ brandId: agentBrandId }),
      });
      const json = (await res.json()) as { run?: AgentRunView; error?: string };
      if (!res.ok) {
        setError(json.error ?? `Retrieval failed (${res.status})`);
        return;
      }
      setRetrieval(json.run ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrieval failed");
    } finally {
      setBusy(null);
    }
  }

  async function runContinuity() {
    setBusy("continuity");
    setError(null);
    try {
      const allBrands = agentBrandId === "__all__";
      const res = await fetch("/api/test/agents/continuity", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({
          refresh: true,
          allBrands,
          brandId: allBrands ? undefined : agentBrandId,
        }),
      });
      const json = (await res.json()) as { run?: AgentRunView; error?: string };
      if (!res.ok) {
        setError(json.error ?? `Continuity failed (${res.status})`);
        return;
      }
      setContinuity(json.run ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Continuity failed");
    } finally {
      setBusy(null);
    }
  }

  async function runEvidence() {
    if (agentBrandId === "__all__") {
      setError("Pick a single brand for Evidence, or use 6. All brands.");
      return;
    }
    setBusy("evidence");
    setError(null);
    try {
      const res = await fetch("/api/test/agents/evidence", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ brandId: agentBrandId, refreshRetrieval: true }),
      });
      const json = (await res.json()) as { run?: AgentRunView; error?: string };
      if (!res.ok) {
        setError(json.error ?? `Evidence failed (${res.status})`);
        return;
      }
      setEvidence(json.run ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evidence failed");
    } finally {
      setBusy(null);
    }
  }

  async function runMultiBrand() {
    setBusy("multi");
    setError(null);
    try {
      const res = await fetch("/api/test/agents/multi-brand", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Fruma-Version": "test" },
      });
      const json = (await res.json()) as { run?: AgentRunView; error?: string };
      if (!res.ok) {
        setError(json.error ?? `Multi-brand failed (${res.status})`);
        return;
      }
      setMulti(json.run ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Multi-brand failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirmHeader(header: string, field: string) {
    setError(null);
    const res = await fetch("/api/test/agents/mapping", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
      body: JSON.stringify({ action: "confirm", header, field }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Confirm failed");
      return;
    }
    await runMapping();
  }

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Agents · test only</p>
        <h1>Harness → Mapping → Retrieval → Continuity → Evidence → Multi-brand</h1>
        <p>
          Full Test loop for sourcing intelligence across tenants. Demo frozen. The steward queue
          below is what a Cloud Agent pulls when you are not here.
        </p>
      </header>

      <StewardQueueCard />

      <div className="tc-lab">
        <label className="tc-lab-pick">
          <span>Brand for steps 3–5 (Continuity supports All)</span>
          <select
            value={agentBrandId}
            onChange={(e) => setAgentBrandId(e.target.value)}
            disabled={busy !== null}
          >
            {AGENT_BRANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value="__all__">All brands (Continuity)</option>
          </select>
        </label>
      </div>

      <div className="tc-lab">
        <button
          type="button"
          className="tc-primary"
          disabled={busy !== null}
          onClick={() => void runHarness()}
        >
          {busy === "harness" ? "Harness…" : "1. Harness"}
        </button>
        <button
          type="button"
          className="tc-primary"
          disabled={busy !== null}
          onClick={() => void runMapping()}
        >
          {busy === "mapping" ? "Mapping…" : "2. Mapping"}
        </button>
        <button
          type="button"
          className="tc-primary"
          disabled={busy !== null}
          onClick={() => void runRetrieval()}
        >
          {busy === "retrieval" ? "Retrieving…" : "3. Retrieval"}
        </button>
        <button
          type="button"
          className="tc-primary"
          disabled={busy !== null}
          onClick={() => void runContinuity()}
        >
          {busy === "continuity" ? "Diffing…" : "4. Continuity"}
        </button>
        <button
          type="button"
          className="tc-primary"
          disabled={busy !== null}
          onClick={() => void runEvidence()}
        >
          {busy === "evidence" ? "Auditing…" : "5. Evidence"}
        </button>
        <button
          type="button"
          className="tc-primary"
          disabled={busy !== null}
          onClick={() => void runMultiBrand()}
        >
          {busy === "multi" ? "All brands…" : "6. All brands"}
        </button>
      </div>

      {error ? <p className="tc-error" role="alert">{error}</p> : null}

      {harness ? (
        <div className="tc-lab-result">
          <p className="tc-kicker">
            Corpus Harness · {harness.status}
          </p>
          <p>{harness.summary}</p>
          {harness.output?.byDialect ? (
            <div className="tc-table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Dialect</th>
                    <th>Ok</th>
                    <th>Qualities</th>
                    <th>Exceptions</th>
                    <th>Unmapped</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(harness.output.byDialect).map(([dialect, row]) => (
                    <tr key={dialect}>
                      <td>{dialect}</td>
                      <td>
                        {row.ok}/{row.factories}
                      </td>
                      <td>{row.qualities}</td>
                      <td>{row.exceptions}</td>
                      <td>{row.unmapped.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {harness.findings.length > 0 ? (
            <div className="tc-lab-exceptions">
              <p className="tc-kicker">Key findings</p>
              <ul>
                {harness.findings.slice(0, 10).map((f, i) => (
                  <li key={`${f.code}-${i}`}>
                    <code>{f.severity}</code> {f.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {mapping ? (
        <div className="tc-lab-result" style={{ marginTop: 16 }}>
          <p className="tc-kicker">Mapping agent · {mapping.status}</p>
          <p>{mapping.summary}</p>
          {mapping.output?.proposals?.length ? (
            <div className="tc-table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Header</th>
                    <th>Proposed</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {mapping.output.proposals.map((p) => (
                    <tr key={p.header}>
                      <td>
                        <code>{p.header}</code>
                      </td>
                      <td>{p.proposedField ?? "—"}</td>
                      <td>{p.confidence}</td>
                      <td>
                        {p.confirmed || p.alreadyMapped ? "live" : "needs review"}
                      </td>
                      <td>
                        {!p.confirmed && !p.alreadyMapped && p.proposedField ? (
                          <button
                            type="button"
                            className="tc-link"
                            onClick={() => void confirmHeader(p.header, p.proposedField!)}
                          >
                            Confirm
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p style={{ marginTop: 12, opacity: 0.8 }}>
            After confirming, run Corpus Harness again — recovered dialects prove the agent improved
            the system.
          </p>
        </div>
      ) : null}

      {retrieval ? (
        <div className="tc-lab-result" style={{ marginTop: 16 }}>
          <p className="tc-kicker">Retrieval · {retrieval.status}</p>
          <p>{retrieval.summary}</p>
          {retrieval.output?.brandValue ? (
            <div style={{ marginTop: 12 }}>
              <p>
                <strong>Brand value:</strong> {retrieval.output.brandValue.headline}
              </p>
              <ul>
                {retrieval.output.brandValue.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {retrieval.output?.brief ? (
            <p className="tc-kicker" style={{ marginTop: 12 }}>
              Brief · {retrieval.output.brief.brandName} · {retrieval.output.brief.name} ·{" "}
              {retrieval.output.brief.sku}
            </p>
          ) : null}
          {retrieval.output?.shortlist?.length ? (
            <div className="tc-table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mill</th>
                    <th>Rel.</th>
                    <th>Article</th>
                    <th>Construction</th>
                    <th>Colour</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {retrieval.output.shortlist.map((row) => (
                    <tr key={`${row.factoryName}-${row.articleCode}-${row.rank}`}>
                      <td>{row.rank}</td>
                      <td>
                        {row.factoryName}
                        <br />
                        <small>{row.country}</small>
                      </td>
                      <td>{row.relationship}</td>
                      <td>
                        <code>{row.articleCode}</code>
                      </td>
                      <td>{row.construction || "—"}</td>
                      <td>{row.colour || "—"}</td>
                      <td>{row.structuredScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {retrieval.output?.shortlist?.[0]?.evidence?.length ? (
            <div className="tc-lab-exceptions">
              <p className="tc-kicker">Evidence on #1 (source-linked)</p>
              <ul>
                {retrieval.output.shortlist[0].evidence.map((e) => (
                  <li key={e.requirementId}>
                    <code>{e.result}</code> {e.explanation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {continuity ? (
        <div className="tc-lab-result" style={{ marginTop: 16 }}>
          <p className="tc-kicker">
            Continuity · {continuity.status}
            {continuity.output?.scope === "all-test-brands"
              ? " · all brands"
              : continuity.output?.brandName
                ? ` · ${continuity.output.brandName}`
                : ""}
          </p>
          <p>{continuity.summary}</p>
          {continuity.output?.brandValue ? (
            <div style={{ marginTop: 12 }}>
              <p>
                <strong>Brand value:</strong> {continuity.output.brandValue.headline}
              </p>
              <ul>
                {continuity.output.brandValue.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {continuity.output?.tenantIsolation ? (
            <p style={{ marginTop: 12 }}>
              Isolation:{" "}
              {continuity.output.tenantIsolation.leakDetected
                ? "FAIL"
                : "ok"}{" "}
              · {continuity.output.tenantIsolation.note}
            </p>
          ) : null}
          {continuity.output?.slices?.length &&
          continuity.output.scope === "all-test-brands" ? (
            <div className="tc-table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Baseline</th>
                    <th>Exceptions</th>
                    <th>Shortlist stable</th>
                  </tr>
                </thead>
                <tbody>
                  {continuity.output.slices.map((s) => (
                    <tr key={s.brandName}>
                      <td>{s.brandName}</td>
                      <td>{s.established ? "paired" : "new"}</td>
                      <td>{s.exceptionCount ?? "—"}</td>
                      <td>{s.retrievalShortlistStable ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {continuity.output?.unchanged ? (
            <p style={{ marginTop: 12 }}>
              Stable: {continuity.output.unchanged.harnessDialectsStable} dialects ·{" "}
              {continuity.output.unchanged.retrievalShortlistStable} shortlist articles
            </p>
          ) : null}
          {continuity.output?.exceptions?.length ? (
            <div className="tc-table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Scope</th>
                    <th>Severity</th>
                    <th>Code</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {continuity.output.exceptions.slice(0, 24).map((e, i) => (
                    <tr key={`${e.code}-${i}`}>
                      <td>{e.brandName ?? "—"}</td>
                      <td>{e.scope}</td>
                      <td>{e.severity}</td>
                      <td>
                        <code>{e.code}</code>
                      </td>
                      <td>
                        {e.message}
                        {e.before || e.after ? (
                          <>
                            <br />
                            <small>
                              {e.before ?? "—"} → {e.after ?? "—"}
                            </small>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : continuity.output?.baseline?.established ? (
            <p style={{ marginTop: 12 }}>No exceptions — clean rebuy pass.</p>
          ) : (
            <p style={{ marginTop: 12 }}>Baseline set. Run Continuity again after Mapping to see diffs.</p>
          )}
        </div>
      ) : null}

      {evidence ? (
        <div className="tc-lab-result" style={{ marginTop: 16 }}>
          <p className="tc-kicker">Evidence · {evidence.status}</p>
          <p>{evidence.summary}</p>
          {evidence.output?.brandValue ? (
            <div style={{ marginTop: 12 }}>
              <p>
                <strong>Brand value:</strong> {evidence.output.brandValue.headline}
              </p>
              <ul>
                {evidence.output.brandValue.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {evidence.output?.summaryCounts ? (
            <p style={{ marginTop: 12 }}>
              Counts:{" "}
              {Object.entries(evidence.output.summaryCounts)
                .filter(([, n]) => n > 0)
                .map(([k, n]) => `${k}=${n}`)
                .join(" · ")}
            </p>
          ) : null}
          {evidence.output?.assessments?.length ? (
            <div className="tc-table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Verdict</th>
                    <th>Claim</th>
                    <th>Scope</th>
                    <th>Article</th>
                    <th>Blockers</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.output.assessments.slice(0, 16).map((a, i) => (
                    <tr key={`${a.factoryName}-${a.articleCode}-${a.verdict}-${i}`}>
                      <td>
                        <code>{a.verdict}</code>
                      </td>
                      <td>{a.claimAsWritten || "(none)"}</td>
                      <td>{a.inferredScope}</td>
                      <td>
                        <code>{a.articleCode ?? "—"}</code>
                      </td>
                      <td>
                        <small>{a.blockers[0]}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {multi ? (
        <div className="tc-lab-result" style={{ marginTop: 16 }}>
          <p className="tc-kicker">Multi-brand · {multi.status}</p>
          <p>{multi.summary}</p>
          {multi.output?.brandValue ? (
            <div style={{ marginTop: 12 }}>
              <p>
                <strong>Brand value:</strong> {multi.output.brandValue.headline}
              </p>
              <ul>
                {multi.output.brandValue.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {multi.output?.tenantIsolation ? (
            <p style={{ marginTop: 12 }}>
              Isolation probe{" "}
              <code>{multi.output.tenantIsolation.checkedFactoryId ?? "—"}</code>:{" "}
              {(multi.output.tenantIsolation.relationshipsByBrand ?? [])
                .map((r) => `${r.brandName}=${r.relationship}`)
                .join(" · ") || "n/a"}
              <br />
              <small>{multi.output.tenantIsolation.note}</small>
            </p>
          ) : null}
          {multi.output?.slices?.length ? (
            <div className="tc-table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Product</th>
                    <th>Shortlist</th>
                    <th>Excluded</th>
                    <th>Evidence</th>
                    <th>Top mills</th>
                  </tr>
                </thead>
                <tbody>
                  {multi.output.slices.map((s) => (
                    <tr key={s.brandName}>
                      <td>{s.brandName}</td>
                      <td>
                        {s.productName ?? "—"}
                        <br />
                        <code>{s.sku ?? "—"}</code>
                      </td>
                      <td>
                        {s.shortlistSize ?? "—"}{" "}
                        <small>({s.preferredOrProven ?? 0} preferred/proven)</small>
                      </td>
                      <td>{s.excludedSkipped ?? "—"}</td>
                      <td>
                        {s.evidenceNotBrandSafe ?? 0}/{s.evidenceClaims ?? 0} not safe
                        {s.fibreTraps ? ` · ${s.fibreTraps} fibre traps` : ""}
                      </td>
                      <td>
                        <small>{(s.topMills ?? []).join(", ")}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type LabResult = {
  surface: string;
  factoryId: string;
  factoryName: string;
  dialect: string;
  deposit: {
    depositId: string;
    filename: string;
    qualities: { baseQualityId: string; millArticleCode: string }[];
    exceptions: { code: string; message: string }[];
  };
};

type HarnessResult = {
  surface: string;
  harness: {
    factoriesTotal: number;
    factoriesOk: number;
    factoriesFailed: number;
    qualitiesTotal: number;
    exceptionsTotal: number;
    unmappedHeaderCount: number;
    byDialect: Record<
      string,
      { factories: number; ok: number; qualities: number; exceptions: number; unmapped: string[] }
    >;
  };
};

function LabPanel({
  factoryId,
  setFactoryId,
}: {
  factoryId: string;
  setFactoryId: (id: string) => void;
}) {
  const factory = useMemo(
    () => TEST_FACTORIES.find((f) => f.id === factoryId) ?? TEST_FACTORIES[0],
    [factoryId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabResult | null>(null);
  const [harness, setHarness] = useState<HarnessResult | null>(null);

  async function runIngest() {
    setBusy(true);
    setError(null);
    setHarness(null);
    try {
      const res = await fetch("/api/test/ingest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ factoryId: factory.id }),
      });
      const json = (await res.json()) as LabResult & { error?: string };
      if (!res.ok) {
        setResult(null);
        setError(json.error ?? `Ingest failed (${res.status})`);
        return;
      }
      setResult(json);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  }

  async function runAllHarness() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/test/ingest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Fruma-Version": "test" },
        body: JSON.stringify({ all: true }),
      });
      const json = (await res.json()) as HarnessResult & { error?: string };
      if (!res.ok) {
        setHarness(null);
        setError(json.error ?? `Harness failed (${res.status})`);
        return;
      }
      setHarness(json);
    } catch (err) {
      setHarness(null);
      setError(err instanceof Error ? err.message : "Harness failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tc-panel">
      <header className="tc-head">
        <p className="tc-kicker">Lab · test only</p>
        <h1>Harness factory data without touching Demo</h1>
        <p>
          Runs hangers through the <strong>Test</strong> ingest engine (
          <code>org_mill_test</code>). Demo memory stays separate.
        </p>
      </header>
      <div className="tc-lab">
        <label className="tc-lab-pick">
          <span>Factory</span>
          <select value={factory.id} onChange={(e) => setFactoryId(e.target.value)}>
            {TEST_FACTORIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {f.dialect} · {f.rowCount} rows
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="tc-primary" disabled={busy} onClick={() => void runIngest()}>
          {busy ? "Running…" : "Run Test ingest"}
        </button>
        <button type="button" className="tc-link" disabled={busy} onClick={() => void runAllHarness()}>
          Prove all 50 dialects
        </button>
      </div>
      {error ? <p className="tc-error" role="alert">{error}</p> : null}
      {harness ? (
        <div className="tc-lab-result">
          <p className="tc-kicker">
            {harness.surface} · corpus harness · {harness.harness.factoriesOk}/
            {harness.harness.factoriesTotal} factories ok
          </p>
          <p>
            {harness.harness.qualitiesTotal} qualities · {harness.harness.exceptionsTotal} exceptions
            · {harness.harness.unmappedHeaderCount} unmapped headers
          </p>
          <ul>
            {Object.entries(harness.harness.byDialect).map(([dialect, stats]) => (
              <li key={dialect}>
                <code>{dialect}</code> · {stats.ok}/{stats.factories} · {stats.qualities} qualities
                {stats.unmapped.length ? ` · unmapped: ${stats.unmapped.join(", ")}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result ? (
        <div className="tc-lab-result">
          <p className="tc-kicker">
            {result.surface} · {result.factoryName} · {result.dialect}
          </p>
          <p>
            Deposit <code>{result.deposit.depositId}</code> · {result.deposit.qualities.length}{" "}
            qualities · {result.deposit.exceptions.length} exceptions
          </p>
          <ul>
            {result.deposit.qualities.slice(0, 12).map((q) => (
              <li key={q.baseQualityId}>
                <code>{q.millArticleCode}</code> → {q.baseQualityId}
              </li>
            ))}
            {result.deposit.qualities.length > 12 ? (
              <li>+{result.deposit.qualities.length - 12} more</li>
            ) : null}
          </ul>
          {result.deposit.exceptions.length > 0 ? (
            <div className="tc-lab-exceptions">
              <p className="tc-kicker">Exceptions (mapping agent fuel)</p>
              <ul>
                {result.deposit.exceptions.slice(0, 8).map((e, i) => (
                  <li key={`${e.code}-${i}`}>
                    <code>{e.code}</code> {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No mapping exceptions on this pass — good baseline for this dialect.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function TestCorpusPlatform() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "overview";
  const [brandId, setBrandId] = useState(TEST_BRANDS[0].id);
  const [factoryId, setFactoryId] = useState(TEST_FACTORIES[0].id);

  const setTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="tc-shell">
      <VersionBanner version="test" />
      <header className="tc-top">
        <div>
          <p className="tc-kicker">Fruma · test</p>
          <strong>Test corpus workspace</strong>
        </div>
        <nav className="tc-nav" aria-label="Test corpus sections">
          {(
            [
              ["overview", "Overview"],
              ["brands", "Brands"],
              ["factories", "Factories"],
              ["hangers", "Hangers"],
              ["lab", "Lab"],
              ["agents", "Agents"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="tc-main">
        {tab === "overview" ? <Overview /> : null}
        {tab === "brands" ? <BrandsPanel brandId={brandId} setBrandId={setBrandId} /> : null}
        {tab === "factories" ? (
          <FactoriesPanel factoryId={factoryId} setFactoryId={setFactoryId} />
        ) : null}
        {tab === "hangers" ? <HangersPanel /> : null}
        {tab === "lab" ? <LabPanel factoryId={factoryId} setFactoryId={setFactoryId} /> : null}
        {tab === "agents" ? <AgentsPanel /> : null}
      </main>
    </div>
  );
}
