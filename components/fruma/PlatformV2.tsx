"use client";

import { useMemo, useState } from "react";

type Mode = "brand" | "mill";
type BrandArea = "range" | "products" | "suppliers";
type Stage = "intent" | "check" | "source" | "confirm" | "development" | "list" | "live";
type MillArea = "requests" | "book" | "data" | "evidence";

const stages: { id: Stage; label: string }[] = [
  { id: "intent", label: "Intent" },
  { id: "check", label: "Check" },
  { id: "source", label: "Source" },
  { id: "confirm", label: "Confirm" },
  { id: "development", label: "Development" },
  { id: "list", label: "List" },
  { id: "live", label: "Live" },
];

const requirements = [
  ["Material", "Extra-long staple cotton", "MUST", "Can check now"],
  ["Construction", "Warp-knit mesh", "MUST", "Can check now"],
  ["Colour", "Navy", "PREFER", "Needs mill confirmation"],
  ["Weight", "Open", "OPEN", "Not on file"],
  ["Handfeel", "Dry, breathable, clean", "PREFER", "Physical validation"],
  ["MOQ", "≤ 600m", "MUST", "Can check now"],
  ["Market", "UK + EU", "MUST", "Can check now"],
];

const candidates = [
  { id: "q75", quality: "Q75", mill: "Têxteis Vale do Ave, Lda", place: "Famalicão, Portugal", evidence: "9 of 10 requirements evidenced", notes: ["Relevant quality on file", "MOQ compatible", "EU/UK evidence current", "Price needs confirmation", "Delivery needs confirmation"] },
  { id: "m41", quality: "M41", mill: "Anonymous mill", place: "Northern Portugal", evidence: "8 of 10 requirements evidenced", notes: ["Construction evidenced", "Composition compatible", "MOQ compatible", "Finish differs from brief", "Price needs confirmation"] },
  { id: "p18", quality: "P18", mill: "Anonymous mill", place: "Portugal", evidence: "7 of 10 requirements evidenced", notes: ["Known brand relationship", "Quality active", "MOQ compatible", "Weight not on file", "Delivery needs confirmation"] },
];

function Wordmark() { return <div className="p2-wordmark">FRUMA</div>; }
function Tag({ children, tone = "plain" }: { children: React.ReactNode; tone?: string }) { return <span className={`p2-tag ${tone}`}>{children}</span>; }

function Lifecycle({ stage, setStage }: { stage: Stage; setStage: (s: Stage) => void }) {
  return <div className="p2-lifecycle">{stages.map((s, i) => <button key={s.id} onClick={() => setStage(s.id)} className={stage === s.id ? "active" : ""}><span>{String(i + 1).padStart(2, "0")}</span>{s.label}</button>)}</div>;
}

function Intent({ setStage }: { setStage: (s: Stage) => void }) {
  const [mode, setMode] = useState("new");
  return <div className="p2-page"><section className="p2-hero-copy"><p className="p2-kicker">Product / sourcing case</p><h1>Start with what is already known.</h1><p>Fruma should not make a team rebuild context it already has. Start from the closest truth, then resolve only what changed.</p></section><div className="p2-start-grid">{[
    ["existing", "Use existing style", "Carry forward a locked product record and source history."],
    ["repeat", "Repeat an order", "Revalidate current price, delivery and availability — not the whole product."],
    ["new", "Create new style", "Turn finished-product intent into a structured requirement contract."],
    ["import", "Import product information", "Bring an existing product record into Fruma without re-keying it."],
  ].map(([id, title, copy]) => <button key={id} onClick={() => setMode(id)} className={`p2-start-card ${mode === id ? "active" : ""}`}><span>{title}</span><p>{copy}</p></button>)}</div><div className="p2-intent-work"><div><p className="p2-kicker">New product intent</p><textarea defaultValue="A refined navy polo in breathable extra-long staple cotton. Structured enough to hold shape but not piqué. Premium dry handfeel, suitable for UK and EU retail, target MOQ under 600 metres." /><div className="p2-attachment">Optional sketch <span>Reference only · designer confirms extracted attributes</span></div></div><aside className="p2-panel"><p className="p2-kicker">What Fruma is doing</p><h3>Turning intent into a contract.</h3><p>Agents can structure what is written and compare it with source records. They do not invent missing weight, certification, trims or commercial terms.</p><button className="p2-primary" onClick={() => setStage("check")}>Build requirement contract →</button></aside></div></div>;
}

function Check({ setStage }: { setStage: (s: Stage) => void }) {
  return <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Check</p><h1>What Fruma can establish now.</h1></div><div className="p2-agent-summary"><b>7 requirements analysed</b><span>4 searchable now · 1 mill confirmation · 1 physical-only · 1 stays empty</span></div></div><div className="p2-contract"><div className="p2-contract-head"><span>Requirement</span><span>Value</span><span>Priority</span><span>Answerability</span></div>{requirements.map(([k,v,p,a]) => <div className="p2-contract-row" key={k}><b>{k}</b><span>{v}</span><Tag tone={p.toLowerCase()}>{p}</Tag><span className="p2-answer">{a}</span></div>)}</div><div className="p2-check-foot"><div><p className="p2-kicker">Source truth</p><p>Missing information remains missing. Physical validation remains physical. Commercial terms are only treated as current when a mill confirms them.</p></div><button className="p2-primary" onClick={() => setStage("source")}>Search eligible mill data →</button></div></div>;
}

function Source({ setStage }: { setStage: (s: Stage) => void }) {
  const [shortlisted, setShortlisted] = useState<string[]>(["q75"]);
  return <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Source</p><h1>Evidence first. Ranking second.</h1><p>Fruma shows why a quality is viable for this product instead of presenting a composite score as procurement truth.</p></div><div className="p2-agent-summary"><b>Comparing eligible mapped mill data</b><span>Asked product parts first · commercial + evidence constraints applied after</span></div></div><div className="p2-candidates">{candidates.map((c, i) => <article key={c.id} className="p2-candidate"><div className="p2-candidate-rank">0{i+1}</div><div className="p2-candidate-main"><div className="p2-candidate-title"><div><p className="p2-kicker">Mill quality</p><h2>{c.quality}</h2></div><Tag tone="good">Strong evidence match</Tag></div><p className="p2-evidence-count">{c.evidence}</p><div className="p2-proof-list">{c.notes.map(n => <span key={n}>{n}</span>)}</div><div className="p2-candidate-foot"><div><b>{c.mill}</b><span>{c.place}</span></div><button onClick={() => setShortlisted(s => s.includes(c.id) ? s.filter(x => x !== c.id) : [...s, c.id])} className={shortlisted.includes(c.id) ? "selected" : ""}>{shortlisted.includes(c.id) ? "Shortlisted" : "Shortlist"}</button></div></div></article>)}</div><div className="p2-sticky-action"><span>{shortlisted.length} qualities shortlisted</span><button className="p2-primary" disabled={!shortlisted.length} onClick={() => setStage("confirm")}>Request confirmation →</button></div></div>;
}

function Confirm({ setStage }: { setStage: (s: Stage) => void }) {
  const [sent, setSent] = useState(false); const [reply, setReply] = useState(false);
  return <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Confirm</p><h1>Turn a likely match into a current offer.</h1><p>The mill receives an anonymous sourcing request. The brand does not select a source until current commercial facts have been returned.</p></div></div><div className="p2-confirm-grid"><section className="p2-panel p2-request"><div className="p2-panel-top"><p className="p2-kicker">Anonymous request</p><Tag>{sent ? "Sent" : "Draft"}</Tag></div><h2>Refined navy cotton polo</h2><div className="p2-mini-table"><div><b>Relevant quality</b><span>Q75</span></div><div><b>Volume</b><span>450–600m</span></div><div><b>Colour</b><span>Navy</span></div><div><b>Timing</b><span>Delivery required in 8–10 weeks</span></div><div><b>Markets</b><span>UK + EU</span></div></div><p className="p2-muted">Brand identity is not included. The mill sees only the requirements needed to answer the sourcing request.</p><button className="p2-primary" onClick={() => setSent(true)}>{sent ? "Request sent" : "Send to mill →"}</button></section><section className={`p2-panel p2-response ${!sent ? "disabled" : ""}`}><div className="p2-panel-top"><p className="p2-kicker">Mill response</p><Tag tone={reply ? "good" : "plain"}>{reply ? "Confirmed" : "Awaiting"}</Tag></div>{!reply ? <><h2>Current terms are not confirmed yet.</h2><p>Price, MOQ, lead and sample timing stay provisional until the mill answers.</p><button disabled={!sent} onClick={() => setReply(true)} className="p2-secondary">Demo mill response</button></> : <><h2>Q75 can run.</h2><div className="p2-mini-table"><div><b>Price basis</b><span>£8.40 / m · ex works</span></div><div><b>MOQ</b><span>500m</span></div><div><b>Lead</b><span>7 weeks from colour approval</span></div><div><b>Sample material</b><span>Available · 4 days</span></div><div><b>Confirmed</b><span>Today · Vale do Ave</span></div></div><p className="p2-muted">Current confirmation is attached to this sourcing case and timestamped.</p></>}</section></div>{reply && <div className="p2-sticky-action"><span>Current mill response received · source can now be selected</span><button className="p2-primary" onClick={() => setStage("development")}>Select source & lock →</button></div>}</div>;
}

function Development({ setStage }: { setStage: (s: Stage) => void }) {
  return <div className="p2-boundary"><p className="p2-kicker">Development</p><h1>Physical development stays physical.</h1><p>Fruma has locked the sourcing record. Proto, fit, grading, sewing and bulk development happen outside Fruma. Return when the approved commercial product truth is ready to carry forward.</p><div className="p2-lock-record"><span>Source locked</span><b>Q75 · Têxteis Vale do Ave, Lda</b><span>Commercial terms confirmed · evidence attached · requirement contract preserved</span></div><button className="p2-primary" onClick={() => setStage("list")}>Product approved · continue to listing →</button></div>;
}

function ListStage({ setStage }: { setStage: (s: Stage) => void }) {
  return <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">List</p><h1>One locked product truth. Multiple destinations.</h1><p>Fruma maps confirmed product facts to retailer schemas without changing the underlying source record.</p></div></div><div className="p2-list-grid"><section className="p2-panel"><p className="p2-kicker">Locked record</p><h2>Textured navy polo</h2><div className="p2-mini-table"><div><b>Quality</b><span>Q75</span></div><div><b>Construction</b><span>Warp-knit mesh</span></div><div><b>Fibre</b><span>Extra-long staple cotton</span></div><div><b>Knit country</b><span>Portugal</span></div><div><b>Organic claim</b><span>Not on file</span></div></div></section><section className="p2-panel"><p className="p2-kicker">Destination mapping</p><div className="p2-dest"><b>Own site</b><span>Ready</span></div><div className="p2-dest"><b>Retailer A</b><span>1 category mapping</span></div><div className="p2-dest"><b>Retailer B</b><span>2 fields need review</span></div><p className="p2-muted">Publishing is not wired in this prototype. Fruma proposes and exports destination-ready records.</p></section></div><button className="p2-primary" onClick={() => setStage("live")}>Mark listing record ready →</button></div>;
}

function LiveStage() { return <div className="p2-boundary"><p className="p2-kicker">Live</p><h1>The product did not start again.</h1><p>Its intent, sourcing evidence, mill confirmation and retailer mappings remain connected. The next repeat or carryover can inherit this truth and focus only on what changed.</p><div className="p2-live-stats"><div><b>Inherited</b><span>product + source truth</span></div><div><b>Current</b><span>commercial confirmation</span></div><div><b>Reusable</b><span>retailer mappings</span></div></div></div>;
}

function BrandApp() {
  const [area, setArea] = useState<BrandArea>("products"); const [stage, setStage] = useState<Stage>("intent");
  return <><header className="p2-header"><Wordmark/><nav>{(["range","products","suppliers"] as BrandArea[]).map(a => <button key={a} onClick={() => setArea(a)} className={area===a?"active":""}>{a[0].toUpperCase()+a.slice(1)}</button>)}</nav><div className="p2-context"><span>Demo</span><b>Brand workspace</b></div></header>{area === "products" ? <><Lifecycle stage={stage} setStage={setStage}/><main>{stage==="intent"&&<Intent setStage={setStage}/>} {stage==="check"&&<Check setStage={setStage}/>} {stage==="source"&&<Source setStage={setStage}/>} {stage==="confirm"&&<Confirm setStage={setStage}/>} {stage==="development"&&<Development setStage={setStage}/>} {stage==="list"&&<ListStage setStage={setStage}/>} {stage==="live"&&<LiveStage/>}</main></> : area === "range" ? <main className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Range</p><h1>Your products are the starting context.</h1><p>Existing styles, repeats and carryovers should feed sourcing cases without being re-entered.</p></div></div><div className="p2-range-table"><div><b>MPOL1026-BUAA</b><span>Textured navy polo</span><Tag>Live</Tag><span>Source history available</span></div><div><b>MSWT2041-NA</b><span>Merino crew neck</span><Tag>Carryover</Tag><span>3 changes since last version</span></div><div><b>MJKT0402-ST</b><span>Unstructured wool jacket</span><Tag>Draft</Tag><span>No source selected</span></div></div></main> : <main className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Suppliers</p><h1>Relationship intelligence, not a directory.</h1><p>Keep the mills this brand has actually worked with, what was confirmed, when it was confirmed, and what needs revalidation.</p></div></div><div className="p2-supplier-card"><div><p className="p2-kicker">Established mill</p><h2>Têxteis Vale do Ave, Lda</h2><span>Famalicão, Portugal</span></div><div><b>3</b><span>qualities used</span></div><div><b>2</b><span>locked products</span></div><div><b>18d</b><span>since last confirmation</span></div></div></main>}</>;
}

function MillApp() {
  const [area, setArea] = useState<MillArea>("requests");
  const content = useMemo(() => ({
    requests: <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Requests</p><h1>Answer viable enquiries without exposing the brand.</h1><p>Fruma shows the relevant requirement and matched qualities from the mill’s own working data.</p></div></div><article className="p2-mill-request"><div><Tag tone="good">New request</Tag><p className="p2-kicker">Anonymous product ask</p><h2>Refined cotton polo · UK + EU</h2><p>450–600m · navy · delivery target 8–10 weeks</p></div><div><p className="p2-kicker">Matched from your book</p><b>Q75</b><span>Malha warp-knit · cotton · active</span></div><div className="p2-mill-actions"><button>Can run</button><button>Suggest alternative</button><button>Cannot run</button></div></article></div>,
    book: <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Book</p><h1>Your mapped working book.</h1><p>Mill language stays preserved in source rows. Fruma standard categories sit alongside it for search and matching.</p></div></div><div className="p2-book"><div className="head"><span>Artigo</span><span>Malha</span><span>Comp.</span><span>Gr/m2</span><span>Mapped status</span><span>Commercial</span></div><div><span>Q75</span><span>Warp knit</span><span>100 CO</span><span>—</span><Tag tone="good">Searchable</Tag><span>Needs refresh</span></div><div><span>Q81</span><span>Interlock</span><span>96 CO / 4 EA</span><span>210</span><Tag tone="good">Searchable</Tag><span>Current</span></div><div><span>Q91</span><span>Jersey</span><span>100 CO</span><span>165</span><Tag>Review</Tag><span>Hidden</span></div></div></div>,
    data: <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Data</p><h1>Ingest and mapping are maintenance, not the home screen.</h1><p>Preserve the original working file, map columns once, then reuse that knowledge on the next file.</p></div></div><div className="p2-data-steps"><div><b>01</b><h3>Source file preserved</h3><p>Hanger list.xlsx · 72 rows · uploaded today</p></div><div><b>02</b><h3>Columns mapped</h3><p>Artigo → Quality · Malha → Knit · Comp. → Fibre</p></div><div><b>03</b><h3>Exceptions reviewed</h3><p>4 rows need attention · 1 unmapped column stays mill-only</p></div><div><b>04</b><h3>Searchable book</h3><p>Only confirmed mappings enter brand search.</p></div></div></div>,
    evidence: <div className="p2-page"><div className="p2-heading"><div><p className="p2-kicker">Evidence</p><h1>Claims need scope, source and validity.</h1><p>Evidence is attached to the quality, site or entity it actually supports. Fruma does not turn traceable cotton into organic cotton.</p></div></div><div className="p2-evidence"><div><b>OEKO-TEX Standard 100</b><span>Site evidence</span><Tag tone="good">Current</Tag></div><div><b>Supima documentation</b><span>Fibre / quality evidence</span><Tag tone="good">Current</Tag></div><div><b>GOTS</b><span>Not on file</span><Tag>Empty</Tag></div></div></div>
  }), []);
  return <><header className="p2-header mill"><Wordmark/><nav>{(["requests","book","data","evidence"] as MillArea[]).map(a => <button key={a} onClick={()=>setArea(a)} className={area===a?"active":""}>{a[0].toUpperCase()+a.slice(1)}</button>)}</nav><div className="p2-context"><span>Demo mill</span><b>Vale do Ave</b></div></header><main>{content[area]}</main></>;
}

export function PlatformV2() {
  const [mode, setMode] = useState<Mode>("brand");
  return <div className={`platform-v2 ${mode}`}><div className="p2-mode-switch"><button className={mode==="brand"?"active":""} onClick={()=>setMode("brand")}>Brand</button><button className={mode==="mill"?"active":""} onClick={()=>setMode("mill")}>Mill</button></div>{mode === "brand" ? <BrandApp/> : <MillApp/>}</div>;
}
