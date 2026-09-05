"use client";

import { useMemo, useState } from "react";
import {
  dashboardStats,
  featuredProduct,
  mills,
  products,
  requests,
  type Mill,
  type Product,
  type Stage,
} from "@/lib/fruma/demo-data";

type Mode = "brand" | "mill";
type BrandArea = "range" | "products" | "suppliers";
type MillArea = "requests" | "book" | "data" | "evidence";

type LocalRequestState = "draft" | "sent" | "answered";

const stages: { id: Stage; label: string }[] = [
  { id: "intent", label: "Intent" },
  { id: "check", label: "Check" },
  { id: "source", label: "Source" },
  { id: "confirm", label: "Confirm" },
  { id: "development", label: "Development" },
  { id: "list", label: "List" },
  { id: "live", label: "Live" },
];

function Wordmark() {
  return <div className="p2-wordmark">FRUMA</div>;
}

function Tag({ children, tone = "plain" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`p2-tag ${tone}`}>{children}</span>;
}

function Lifecycle({ stage, setStage }: { stage: Stage; setStage: (stage: Stage) => void }) {
  return (
    <div className="p2-lifecycle">
      {stages.map((item, index) => (
        <button key={item.id} onClick={() => setStage(item.id)} className={stage === item.id ? "active" : ""}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function DataStrip() {
  return (
    <div className="p2-data-strip">
      <div><b>{dashboardStats.brands}</b><span>demo brands</span></div>
      <div><b>{dashboardStats.mills}</b><span>mapped mills</span></div>
      <div><b>{dashboardStats.products}</b><span>products</span></div>
      <div><b>{dashboardStats.requests}</b><span>sourcing requests</span></div>
      <div><b>{dashboardStats.answeredRequests}</b><span>answered requests</span></div>
      <div><b>{dashboardStats.liveProducts}</b><span>live products</span></div>
    </div>
  );
}

function ProductSelector({ product, setProduct }: { product: Product; setProduct: (product: Product) => void }) {
  const options = [featuredProduct, ...products.slice(0, 18)];
  return (
    <div className="p2-product-selector">
      <span>Working product</span>
      <select value={product.id} onChange={(event) => setProduct(options.find((item) => item.id === event.target.value) ?? featuredProduct)}>
        {options.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}
      </select>
    </div>
  );
}

function Intent({ product, setStage }: { product: Product; setStage: (stage: Stage) => void }) {
  const [sourceMode, setSourceMode] = useState("new");
  return (
    <div className="p2-page">
      <section className="p2-hero-copy">
        <p className="p2-kicker">Product / sourcing case</p>
        <h1>Start with what is already known.</h1>
        <p>Every demo product now carries its own intent, stage, requirements, shortlist and source history. Change the working product above and the sourcing case changes with it.</p>
      </section>
      <div className="p2-start-grid">
        {[
          ["existing", "Use existing style", "Carry forward a locked product record and source history."],
          ["repeat", "Repeat an order", "Revalidate current price, delivery and availability — not the whole product."],
          ["new", "Create new style", "Turn finished-product intent into a structured requirement contract."],
          ["import", "Import product information", "Bring an existing product record into Fruma without re-keying it."],
        ].map(([id, title, copy]) => (
          <button key={id} onClick={() => setSourceMode(id)} className={`p2-start-card ${sourceMode === id ? "active" : ""}`}>
            <span>{title}</span><p>{copy}</p>
          </button>
        ))}
      </div>
      <div className="p2-intent-work">
        <div>
          <p className="p2-kicker">{product.sku} · {product.season}</p>
          <textarea value={product.intent} readOnly />
          <div className="p2-attachment">Synthetic product record <span>{product.category} · current stage {product.stage}</span></div>
        </div>
        <aside className="p2-panel">
          <p className="p2-kicker">What Fruma is doing</p>
          <h3>Turning intent into a contract.</h3>
          <p>The seeded records deliberately contain missing, stale and confirmation-only facts. Fruma can show uncertainty without silently upgrading it to truth.</p>
          <button className="p2-primary" onClick={() => setStage("check")}>Build requirement contract →</button>
        </aside>
      </div>
    </div>
  );
}

function Check({ product, setStage }: { product: Product; setStage: (stage: Stage) => void }) {
  const searchable = product.requirements.filter((item) => item.answerability === "Can check now").length;
  return (
    <div className="p2-page">
      <div className="p2-heading">
        <div><p className="p2-kicker">Check</p><h1>What Fruma can establish now.</h1></div>
        <div className="p2-agent-summary"><b>{product.requirements.length} requirements analysed</b><span>{searchable} searchable now · unknowns and physical-only checks stay explicit</span></div>
      </div>
      <div className="p2-contract">
        <div className="p2-contract-head"><span>Requirement</span><span>Value</span><span>Priority</span><span>Answerability</span></div>
        {product.requirements.map((item) => (
          <div className="p2-contract-row" key={item.key}>
            <b>{item.key}</b><span>{item.value}</span><Tag tone={item.priority.toLowerCase()}>{item.priority}</Tag><span className="p2-answer">{item.answerability}</span>
          </div>
        ))}
      </div>
      <div className="p2-check-foot">
        <div><p className="p2-kicker">Source truth</p><p>Commercial values are not treated as current merely because a mill once supplied them. Evidence freshness and answerability are visible in the seeded records.</p></div>
        <button className="p2-primary" onClick={() => setStage("source")}>Search eligible mill data →</button>
      </div>
    </div>
  );
}

function candidateReason(mill: Mill, index: number) {
  return [
    `${mill.evidenceCoverage}% evidence coverage`,
    `${mill.moq}m recorded MOQ`,
    `${mill.leadWeeks} week recorded lead`,
    `${mill.currentEvidence} current evidence items`,
    mill.staleEvidence ? `${mill.staleEvidence} stale evidence item${mill.staleEvidence === 1 ? "" : "s"}` : "No stale evidence",
  ][index];
}

function Source({ product, selectedMillId, setSelectedMillId, setStage }: { product: Product; selectedMillId: string; setSelectedMillId: (id: string) => void; setStage: (stage: Stage) => void }) {
  const candidates = useMemo(() => product.shortlistMillIds.map((id) => mills.find((mill) => mill.id === id)).filter(Boolean) as Mill[], [product]);
  return (
    <div className="p2-page">
      <div className="p2-heading">
        <div><p className="p2-kicker">Source</p><h1>Evidence first. Ranking second.</h1><p>The shortlist is generated from this product’s seeded supplier relationships and mill records, not a single hard-coded polo example.</p></div>
        <div className="p2-agent-summary"><b>{mills.length} mills available to compare</b><span>relationship · MOQ · lead time · evidence coverage · certifications</span></div>
      </div>
      <div className="p2-candidates">
        {candidates.map((mill, index) => (
          <article key={mill.id} className="p2-candidate">
            <div className="p2-candidate-rank">{String(index + 1).padStart(2, "0")}</div>
            <div className="p2-candidate-main">
              <div className="p2-candidate-title">
                <div><p className="p2-kicker">{mill.relationship} relationship</p><h2>{mill.name}</h2></div>
                <Tag tone={mill.staleEvidence === 0 ? "good" : "plain"}>{mill.evidenceCoverage}% evidenced</Tag>
              </div>
              <p className="p2-evidence-count">{mill.region}, {mill.country} · {mill.qualities} mapped qualities · {mill.specialties.join(" · ")}</p>
              <div className="p2-proof-list">{Array.from({ length: 5 }, (_, proofIndex) => <span key={proofIndex}>{candidateReason(mill, proofIndex)}</span>)}</div>
              <div className="p2-candidate-foot">
                <div><b>{mill.certifications.join(" · ")}</b><span>Evidence belongs to the mill record; product applicability still needs checking.</span></div>
                <button onClick={() => setSelectedMillId(mill.id)} className={selectedMillId === mill.id ? "selected" : ""}>{selectedMillId === mill.id ? "Selected" : "Select"}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="p2-sticky-action"><span>{candidates.length} relevant mills loaded · {mills.length} total in demo network</span><button className="p2-primary" onClick={() => setStage("confirm")}>Request confirmation →</button></div>
    </div>
  );
}

function Confirm({ product, mill, state, setState, setStage }: { product: Product; mill: Mill; state: LocalRequestState; setState: (state: LocalRequestState) => void; setStage: (stage: Stage) => void }) {
  const existing = requests.find((request) => request.productId === product.id && request.millId === mill.id);
  const answered = state === "answered";
  const sent = state !== "draft";
  const price = existing?.quotedPrice ?? Number((7.1 + mill.moq / 500).toFixed(2));
  const currency = existing?.currency ?? "EUR";
  return (
    <div className="p2-page">
      <div className="p2-heading"><div><p className="p2-kicker">Confirm</p><h1>Turn a likely match into a current offer.</h1><p>The request uses the selected product and selected mill. The response writes a current commercial state into this demo session.</p></div></div>
      <div className="p2-confirm-grid">
        <section className="p2-panel p2-request">
          <div className="p2-panel-top"><p className="p2-kicker">Anonymous request</p><Tag>{sent ? "Sent" : "Draft"}</Tag></div>
          <h2>{product.name}</h2>
          <div className="p2-mini-table">
            <div><b>Product</b><span>{product.sku}</span></div>
            <div><b>Relevant mill</b><span>{mill.name}</span></div>
            <div><b>Recorded MOQ</b><span>{mill.moq}m</span></div>
            <div><b>Target markets</b><span>UK + EU</span></div>
            <div><b>Requested delivery</b><span>{existing?.requestedDelivery ?? "8–10 weeks"}</span></div>
          </div>
          <p className="p2-muted">The brand identity stays hidden from the mill-facing request view.</p>
          <button className="p2-primary" onClick={() => setState("sent")}>{sent ? "Request sent" : "Send to mill →"}</button>
        </section>
        <section className={`p2-panel p2-response ${!sent ? "disabled" : ""}`}>
          <div className="p2-panel-top"><p className="p2-kicker">Mill response</p><Tag tone={answered ? "good" : "plain"}>{answered ? "Confirmed" : "Awaiting"}</Tag></div>
          {!answered ? (
            <><h2>Current terms are not confirmed yet.</h2><p>The historical mill book can inform the request, but price, lead and sample timing stay provisional until the mill answers.</p><button disabled={!sent} onClick={() => setState("answered")} className="p2-secondary">Simulate mill response</button></>
          ) : (
            <><h2>{mill.name} can run.</h2><div className="p2-mini-table"><div><b>Price basis</b><span>{currency === "GBP" ? "£" : "€"}{price.toFixed(2)} / m</span></div><div><b>MOQ</b><span>{existing?.moq ?? mill.moq}m</span></div><div><b>Lead</b><span>{existing?.leadWeeks ?? mill.leadWeeks} weeks</span></div><div><b>Sample material</b><span>{existing?.sampleDays ?? 5} days</span></div><div><b>Evidence status</b><span>{mill.currentEvidence} current · {mill.staleEvidence} stale</span></div></div><p className="p2-muted">This confirmation is demo-session state; the source record underneath remains attributable to the selected mill.</p></>
          )}
        </section>
      </div>
      {answered && <div className="p2-sticky-action"><span>Current mill response received · source can now be selected</span><button className="p2-primary" onClick={() => setStage("development")}>Select source & lock →</button></div>}
    </div>
  );
}

function Development({ product, mill, setStage }: { product: Product; mill: Mill; setStage: (stage: Stage) => void }) {
  return <div className="p2-boundary"><p className="p2-kicker">Development</p><h1>Physical development stays physical.</h1><p>Fruma locks the sourcing record without pretending proto, fit, colour approval or bulk development happened digitally.</p><div className="p2-lock-record"><span>Source locked</span><b>{mill.name}</b><span>{product.sku} · commercial terms confirmed · evidence attached · requirement contract preserved</span></div><button className="p2-primary" onClick={() => setStage("list")}>Product approved · continue to listing →</button></div>;
}

function ListStage({ product, mill, setStage }: { product: Product; mill: Mill; setStage: (stage: Stage) => void }) {
  return <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">List</p><h1>One locked product truth. Multiple destinations.</h1><p>The seeded record can now be viewed as destination-ready fields without changing its source meaning.</p></div></div><div className="p2-list-grid"><section className="p2-panel"><p className="p2-kicker">Locked record</p><h2>{product.name}</h2><div className="p2-mini-table"><div><b>SKU</b><span>{product.sku}</span></div><div><b>Category</b><span>{product.category}</span></div><div><b>Source</b><span>{mill.name}</span></div><div><b>Source country</b><span>{mill.country}</span></div><div><b>Evidence</b><span>{mill.evidenceCoverage}% mapped</span></div></div></section><section className="p2-panel"><p className="p2-kicker">Destination mapping</p><div className="p2-dest"><b>Own site</b><span>Ready</span></div><div className="p2-dest"><b>Retailer A</b><span>1 category mapping</span></div><div className="p2-dest"><b>Retailer B</b><span>{mill.staleEvidence ? "2 evidence fields need review" : "Ready"}</span></div><p className="p2-muted">Publishing is intentionally not represented as completed in this demo.</p></section></div><button className="p2-primary" onClick={() => setStage("live")}>Mark listing record ready →</button></div>;
}

function LiveStage({ product, mill }: { product: Product; mill: Mill }) {
  return <div className="p2-boundary"><p className="p2-kicker">Live</p><h1>The product did not start again.</h1><p>{product.name} still carries its original intent, requirement contract, selected source, evidence state and destination mapping.</p><div className="p2-live-stats"><div><b>{product.sku}</b><span>product identity</span></div><div><b>{mill.name}</b><span>locked source</span></div><div><b>{mill.currentEvidence}</b><span>current evidence items</span></div></div></div>;
}

function RangeView({ setProduct, setStage, setArea }: { setProduct: (product: Product) => void; setStage: (stage: Stage) => void; setArea: (area: BrandArea) => void }) {
  return <main className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Range · {products.length} seeded records</p><h1>The range already has history.</h1><p>Products span every lifecycle stage so Fruma can be tested as an operating workspace, not an empty onboarding flow.</p></div></div><div className="p2-range-table p2-range-scroll">{products.slice(0, 24).map((product) => <button key={product.id} className="p2-range-row" onClick={() => { setProduct(product); setStage(product.stage); setArea("products"); }}><b>{product.sku}</b><span>{product.name}</span><Tag tone={product.stage === "live" ? "good" : "plain"}>{product.stage}</Tag><span>{product.season} · {product.shortlistMillIds.length} sourced candidates</span></button>)}</div></main>;
}

function SuppliersView({ setSelectedMillId }: { setSelectedMillId: (id: string) => void }) {
  return <main className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Suppliers · {mills.length} seeded mills</p><h1>Relationship intelligence, not a directory.</h1><p>The network includes preferred, proven, previous, new and excluded suppliers with deliberately uneven evidence freshness.</p></div></div><div className="p2-supplier-list">{mills.slice(0, 18).map((mill) => <button key={mill.id} className="p2-supplier-card" onClick={() => setSelectedMillId(mill.id)}><div><p className="p2-kicker">{mill.relationship}</p><h2>{mill.name}</h2><span>{mill.region}, {mill.country} · {mill.specialties.join(" · ")}</span></div><div><b>{mill.qualities}</b><span>qualities</span></div><div><b>{mill.moq}m</b><span>MOQ</span></div><div><b>{mill.evidenceCoverage}%</b><span>evidence</span></div></button>)}</div></main>;
}

function BrandApp() {
  const [area, setArea] = useState<BrandArea>("products");
  const [product, setProduct] = useState<Product>(featuredProduct);
  const [stage, setStage] = useState<Stage>(featuredProduct.stage);
  const [selectedMillId, setSelectedMillId] = useState(featuredProduct.shortlistMillIds[0]);
  const [requestState, setRequestState] = useState<LocalRequestState>("draft");
  const mill = mills.find((item) => item.id === selectedMillId) ?? mills[0];

  function chooseProduct(next: Product) {
    setProduct(next);
    setStage(next.stage);
    setSelectedMillId(next.selectedMillId ?? next.shortlistMillIds[0] ?? mills[0].id);
    setRequestState("draft");
  }

  return <><header className="p2-header"><Wordmark/><nav>{(["range", "products", "suppliers"] as BrandArea[]).map((item) => <button key={item} onClick={() => setArea(item)} className={area === item ? "active" : ""}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className="p2-context"><span>Synthetic network</span><b>Brand workspace</b></div></header><DataStrip/>{area === "products" ? <><ProductSelector product={product} setProduct={chooseProduct}/><Lifecycle stage={stage} setStage={setStage}/><main>{stage === "intent" && <Intent product={product} setStage={setStage}/>} {stage === "check" && <Check product={product} setStage={setStage}/>} {stage === "source" && <Source product={product} selectedMillId={selectedMillId} setSelectedMillId={(id) => { setSelectedMillId(id); setRequestState("draft"); }} setStage={setStage}/>} {stage === "confirm" && <Confirm product={product} mill={mill} state={requestState} setState={setRequestState} setStage={setStage}/>} {stage === "development" && <Development product={product} mill={mill} setStage={setStage}/>} {stage === "list" && <ListStage product={product} mill={mill} setStage={setStage}/>} {stage === "live" && <LiveStage product={product} mill={mill}/>}</main></> : area === "range" ? <RangeView setProduct={chooseProduct} setStage={setStage} setArea={setArea}/> : <SuppliersView setSelectedMillId={setSelectedMillId}/>}</>;
}

function MillApp() {
  const [area, setArea] = useState<MillArea>("requests");
  const activeMill = mills[3];
  const inbound = requests.filter((request) => request.millId === activeMill.id).slice(0, 14);
  const productFor = (id: string) => products.find((product) => product.id === id) ?? featuredProduct;
  return <><header className="p2-header mill"><Wordmark/><nav>{(["requests", "book", "data", "evidence"] as MillArea[]).map((item) => <button key={item} onClick={() => setArea(item)} className={area === item ? "active" : ""}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className="p2-context"><span>Mill workspace</span><b>{activeMill.name}</b></div></header><DataStrip/><main className="p2-page">{area === "requests" && <><div className="p2-heading"><div><p className="p2-kicker">Requests · {inbound.length} visible to this demo mill</p><h1>Real request variety, still anonymous.</h1><p>The mill side is now driven from the same sourcing-request dataset as the brand side.</p></div></div><div className="p2-request-list">{inbound.map((request) => { const product = productFor(request.productId); return <article className="p2-mill-request" key={request.id}><div><p className="p2-kicker">{request.id} · {request.status}</p><h2>{product.category} sourcing request</h2><p>{product.intent}</p></div><div><span>Volume</span><b>{request.volume}</b><span>{request.requestedDelivery}</span></div><div className="p2-mill-actions"><Tag tone={request.status === "answered" ? "good" : "plain"}>{request.status}</Tag>{request.quotedPrice ? <span>{request.currency === "GBP" ? "£" : "€"}{request.quotedPrice.toFixed(2)} / m · {request.leadWeeks} weeks</span> : <span>Current terms still required</span>}<button>Open request →</button></div></article>; })}</div></>}{area === "book" && <><div className="p2-heading"><div><p className="p2-kicker">Book</p><h1>{activeMill.qualities} mapped qualities.</h1><p>Representative mill-book rows use the same commercial and evidence profile that sourcing cases see.</p></div></div><div className="p2-book"><div className="head"><span>Quality</span><span>Construction</span><span>Composition</span><span>MOQ</span><span>Lead</span><span>Evidence</span></div>{Array.from({ length: 16 }, (_, index) => <div key={index}><b>{activeMill.id.toUpperCase()}-{String(index + 1).padStart(2, "0")}</b><span>{activeMill.specialties[index % activeMill.specialties.length]}</span><span>{index % 3 === 0 ? "100% cotton" : index % 3 === 1 ? "wool blend" : "cellulosic blend"}</span><span>{activeMill.moq + index * 25}m</span><span>{activeMill.leadWeeks + (index % 3)} weeks</span><span>{Math.max(55, activeMill.evidenceCoverage - index)}%</span></div>)}</div></>}{area === "data" && <><div className="p2-heading"><div><p className="p2-kicker">Data</p><h1>Map mill language without losing its source.</h1></div></div><div className="p2-data-steps"><div><b>01</b><h3>Ingest</h3><p>Receive a workbook, system export or structured update from the mill.</p></div><div><b>02</b><h3>Map</h3><p>Translate the mill’s field language into Fruma concepts while preserving source field and value.</p></div><div><b>03</b><h3>Review</h3><p>Separate inferred mapping from confirmed facts and surface fields that still need mill attention.</p></div><div><b>04</b><h3>Publish internally</h3><p>Make mapped facts usable for matching while commercial freshness continues to expire independently.</p></div></div></>}{area === "evidence" && <><div className="p2-heading"><div><p className="p2-kicker">Evidence</p><h1>Scope matters more than the badge.</h1><p>{activeMill.currentEvidence} current items and {activeMill.staleEvidence} stale items are represented for this mill.</p></div></div><div className="p2-evidence">{activeMill.certifications.map((cert, index) => <div key={cert}><b>{cert}</b><span>{index % 2 === 0 ? "Facility scope · current" : "Quality-family scope · current"}</span><Tag tone="good">Current</Tag></div>)}{Array.from({ length: activeMill.staleEvidence }, (_, index) => <div key={`stale-${index}`}><b>Historical test report {index + 1}</b><span>Quality scope · validity elapsed</span><Tag>Stale</Tag></div>)}</div></>}</main></>;
}

export function PlatformV2() {
  const [mode, setMode] = useState<Mode>("brand");
  return <div className={`platform-v2 ${mode === "mill" ? "mill" : ""}`}>{mode === "brand" ? <BrandApp/> : <MillApp/>}<div className="p2-mode-switch"><button className={mode === "brand" ? "active" : ""} onClick={() => setMode("brand")}>Brand</button><button className={mode === "mill" ? "active" : ""} onClick={() => setMode("mill")}>Mill</button></div></div>;
}
