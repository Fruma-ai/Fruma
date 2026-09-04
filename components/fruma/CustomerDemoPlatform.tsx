"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleAlert,
  FileCheck2,
  Filter,
  Inbox,
  MapPinned,
  MessageSquare,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { demoBrands, featuredProduct, mills, products, type Mill } from "@/lib/fruma/demo-data";
import { ProductConceptLab } from "@/components/fruma/ProductConceptLab";

type Mode = "brand" | "mill";
type BrandStep = "intent" | "concept" | "check" | "source" | "confirm" | "development" | "standardise" | "ready";
type MillStep = "requests" | "data" | "evidence" | "samples" | "messages";
type RequestState = "draft" | "sent" | "answered" | "selected";
type SampleState = "not_requested" | "requested" | "in_progress" | "received" | "approved";

const brandSteps: { id: BrandStep; label: string }[] = [
  { id: "intent", label: "Intent" },
  { id: "concept", label: "Concept" },
  { id: "check", label: "Check" },
  { id: "source", label: "Source" },
  { id: "confirm", label: "Confirm" },
  { id: "development", label: "Development" },
  { id: "standardise", label: "Standardise" },
  { id: "ready", label: "Channel ready" },
];

const millSteps: { id: MillStep; label: string }[] = [
  { id: "requests", label: "Requests" },
  { id: "data", label: "Data" },
  { id: "evidence", label: "Evidence" },
  { id: "samples", label: "Samples" },
  { id: "messages", label: "Messages" },
];

function Header({ mode, setMode, workspaceOpen, setWorkspaceOpen, notificationsOpen, setNotificationsOpen, activeMill }: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  workspaceOpen: boolean;
  setWorkspaceOpen: (value: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (value: boolean) => void;
  activeMill: Mill;
}) {
  return <>
    <header className={`cd-topbar ${mode === "mill" ? "mill" : ""}`}>
      <button className="cd-wordmark" onClick={() => setMode("brand")}>FRUMA</button>
      <div className="cd-workspace-wrap">
        <button className="cd-workspace" onClick={() => setWorkspaceOpen(!workspaceOpen)}>{mode === "brand" ? demoBrands[0].name : activeMill.name}<ChevronDown size={14}/></button>
        {workspaceOpen ? <div className="cd-popover cd-workspaces">
          <b>Demo workspaces</b>
          {(mode === "brand" ? demoBrands.slice(0, 4).map((b) => b.name) : mills.slice(0, 4).map((m) => m.name)).map((name, index) => <button key={name} onClick={() => setWorkspaceOpen(false)}><span>{name}</span><small>{index === 0 ? "Active" : "Seeded demo"}</small></button>)}
        </div> : null}
      </div>
      <div className="cd-mode-switch"><button className={mode === "brand" ? "active" : ""} onClick={() => setMode("brand")}>Brand</button><button className={mode === "mill" ? "active" : ""} onClick={() => setMode("mill")}>Mill</button></div>
      <div className="cd-top-actions">
        <button aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={17}/><span className="cd-dot"/></button>
        <div className="cd-avatar">AR</div>
      </div>
    </header>
    {notificationsOpen ? <aside className="cd-notifications">
      <div className="cd-pop-head"><div><small>Notifications</small><h3>3 things need attention</h3></div><button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X size={16}/></button></div>
      <button onClick={() => setNotificationsOpen(false)}><b>Sample request updated</b><span>{activeMill.name} has opened the development pack.</span></button>
      <button onClick={() => setNotificationsOpen(false)}><b>Evidence review due</b><span>One certificate expires within 30 days.</span></button>
      <button onClick={() => setNotificationsOpen(false)}><b>Destination gap</b><span>Next requires a confirmed fit description.</span></button>
    </aside> : null}
  </>;
}

function DemoBanner({ current, total, onNext, onReset }: { current: number; total: number; onNext: () => void; onReset: () => void }) {
  return <div className="cd-demo-banner"><div><span>Customer demo mode</span><b>Step {current} of {total}</b><small>Every visible control is wired to a demo action.</small></div><div><button className="cd-secondary" onClick={onReset}>Reset demo</button><button className="cd-primary" onClick={onNext}>Next step <ArrowRight size={14}/></button></div></div>;
}

function Intent({ brief, setBrief, saved, setSaved, go }: { brief: string; setBrief: (v: string) => void; saved: boolean; setSaved: (v: boolean) => void; go: (s: BrandStep) => void }) {
  return <main className="cd-main"><div className="cd-page-head"><div><p>01 · Product intent</p><h1>Start with what the brand is trying to make.</h1><span>The intent becomes a structured case before Fruma asks the network for anything.</span></div></div>
    <div className="cd-grid two"><section className="cd-card"><label>Working product<select defaultValue={featuredProduct.id}>{[featuredProduct, ...products.slice(0, 8)].map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label>Product brief<textarea value={brief} onChange={(e) => { setBrief(e.target.value); setSaved(false); }}/></label><div className="cd-actions"><button className="cd-secondary" onClick={() => setBrief(featuredProduct.intent)}>Restore seeded brief</button><button className="cd-primary" onClick={() => setSaved(true)}>{saved ? <><Check size={14}/> Saved</> : "Save brief"}</button></div></section>
    <section className="cd-card"><p className="cd-eyebrow">Requirement frame</p>{featuredProduct.requirements.slice(0, 6).map((r) => <div className="cd-line" key={r.key}><b>{r.key}</b><span>{r.value}</span><em>{r.priority}</em></div>)}<button className="cd-primary full" onClick={() => go("concept")}>Add sketch & visual concept <ArrowRight size={14}/></button></section></div>
  </main>;
}

function CheckStep({ confirmed, setConfirmed, go }: { confirmed: string[]; setConfirmed: (v: string[]) => void; go: (s: BrandStep) => void }) {
  const rows = featuredProduct.requirements;
  return <main className="cd-main"><div className="cd-page-head"><div><p>03 · Product truth contract</p><h1>Make answerability visible before sourcing.</h1><span>Requirements stay MUST, PREFER or OPEN and can never silently become confirmed facts.</span></div></div><section className="cd-card"><div className="cd-table-head"><span>Requirement</span><span>Value</span><span>Priority</span><span>Answerability</span><span>Action</span></div>{rows.map((r) => { const done = confirmed.includes(r.key); return <div className="cd-table-row" key={r.key}><b>{r.key}</b><span>{r.value}</span><em>{r.priority}</em><small>{r.answerability}</small><button className={done ? "cd-done" : "cd-secondary"} onClick={() => setConfirmed(done ? confirmed.filter((x) => x !== r.key) : [...confirmed, r.key])}>{done ? <><Check size={13}/> Reviewed</> : "Review"}</button></div>; })}<div className="cd-actions end"><button className="cd-primary" onClick={() => go("source")}>Source eligible mills <ArrowRight size={14}/></button></div></section></main>;
}

function SourceStep({ selectedMillId, setSelectedMillId, filterOpen, setFilterOpen, evidenceOnly, setEvidenceOnly, go }: { selectedMillId: string; setSelectedMillId: (id: string) => void; filterOpen: boolean; setFilterOpen: (v: boolean) => void; evidenceOnly: boolean; setEvidenceOnly: (v: boolean) => void; go: (s: BrandStep) => void }) {
  const shortlist = useMemo(() => mills.filter((m) => m.relationship !== "excluded").filter((m) => !evidenceOnly || m.evidenceCoverage >= 85).slice(0, 8), [evidenceOnly]);
  return <main className="cd-main"><div className="cd-page-head"><div><p>04 · Network intelligence</p><h1>Find suppliers against this exact product case.</h1><span>Fruma combines current capability evidence with private relationship intelligence.</span></div><button className="cd-secondary" onClick={() => setFilterOpen(!filterOpen)}><Filter size={14}/> Filters</button></div>{filterOpen ? <div className="cd-filter-panel"><label><input type="checkbox" checked={evidenceOnly} onChange={(e) => setEvidenceOnly(e.target.checked)}/> Evidence coverage 85%+</label><button onClick={() => { setEvidenceOnly(false); setFilterOpen(false); }}>Clear filters</button></div> : null}<div className="cd-supplier-grid">{shortlist.map((m) => <article className={`cd-card supplier ${selectedMillId === m.id ? "selected" : ""}`} key={m.id}><div className="cd-supplier-top"><span>{m.evidenceCoverage}%</span><small>{m.relationship}</small></div><h2>{m.name}</h2><p>{m.region}, {m.country}</p><div className="cd-kpis"><div><span>MOQ</span><b>{m.moq.toLocaleString()}m</b></div><div><span>Lead</span><b>{m.leadWeeks} wks</b></div></div><button className="cd-primary full" onClick={() => { setSelectedMillId(m.id); go("confirm"); }}>Select & request terms</button></article>)}</div></main>;
}

function ConfirmStep({ mill, requestState, setRequestState, setMode, go }: { mill: Mill; requestState: RequestState; setRequestState: (s: RequestState) => void; setMode: (m: Mode) => void; go: (s: BrandStep) => void }) {
  return <main className="cd-main"><div className="cd-page-head"><div><p>05 · Current commercial confirmation</p><h1>Turn historical capability into a current response.</h1><span>The mill must actively confirm terms before the source is locked.</span></div></div><div className="cd-grid two"><section className="cd-card"><p className="cd-eyebrow">Anonymous request</p><h2>{featuredProduct.name}</h2><div className="cd-line"><b>Factory</b><span>{mill.name}</span></div><div className="cd-line"><b>Target MOQ</b><span>≤ 600m</span></div><div className="cd-line"><b>Reference pack</b><span>Brief + requirements + concept</span></div><button className="cd-primary full" onClick={() => setRequestState("sent")}>{requestState === "draft" ? "Send sourcing request" : <><Check size={14}/> Request sent</>}</button></section><section className="cd-card"><p className="cd-eyebrow">Current response</p>{requestState === "draft" ? <div className="cd-empty"><Inbox size={24}/><p>Send the request to start the transaction.</p></div> : requestState === "sent" ? <><div className="cd-success"><Check size={14}/> Request visible in the mill workspace</div><button className="cd-secondary full" onClick={() => setMode("mill")}>Switch to mill view</button><button className="cd-primary full" onClick={() => setRequestState("answered")}>Simulate mill response</button></> : <><div className="cd-success"><Check size={14}/> Current offer received</div><div className="cd-line"><b>Price</b><span>EUR 7.90 / m</span></div><div className="cd-line"><b>MOQ</b><span>{mill.moq}m</span></div><div className="cd-line"><b>Lead</b><span>{mill.leadWeeks} weeks</span></div><button className="cd-primary full" onClick={() => { setRequestState("selected"); go("development"); }}>Select source & lock</button></>}</section></div></main>;
}

function DevelopmentStep({ mill, sampleState, setSampleState, setMode, notes, setNotes, savedNotes, setSavedNotes, go }: { mill: Mill; sampleState: SampleState; setSampleState: (s: SampleState) => void; setMode: (m: Mode) => void; notes: string; setNotes: (v: string) => void; savedNotes: boolean; setSavedNotes: (v: boolean) => void; go: (s: BrandStep) => void }) {
  const nextState: Record<SampleState, SampleState> = { not_requested: "requested", requested: "in_progress", in_progress: "received", received: "approved", approved: "approved" };
  const label: Record<SampleState, string> = { not_requested: "Request physical sample", requested: "Mark factory started sample", in_progress: "Mark sample received", received: "Approve physical sample", approved: "Sample approved" };
  return <main className="cd-main"><div className="cd-page-head"><div><p>06 · Physical development</p><h1>Intent becomes reality through the sample.</h1><span>The AI concept remains a development reference. Physical validation is what upgrades product truth.</span></div></div><div className="cd-grid two"><section className="cd-card"><p className="cd-eyebrow">Sample status</p><h2>{mill.name}</h2><div className="cd-progress">{["requested", "in_progress", "received", "approved"].map((s) => <span key={s} className={sampleState === s || sampleState === "approved" && s !== "requested" ? "active" : ""}>{s.replace("_", " ")}</span>)}</div><button className="cd-primary full" disabled={sampleState === "approved"} onClick={() => setSampleState(nextState[sampleState])}>{sampleState === "approved" ? <><Check size={14}/> Sample approved</> : label[sampleState]}</button><button className="cd-secondary full" onClick={() => setMode("mill")}>View same sample in mill workspace</button></section><section className="cd-card"><label>Development notes<textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSavedNotes(false); }}/></label><button className="cd-secondary" onClick={() => setSavedNotes(true)}>{savedNotes ? <><Check size={14}/> Notes saved</> : "Save notes"}</button>{sampleState === "approved" ? <button className="cd-primary" onClick={() => go("standardise")}>Continue to product standardisation <ArrowRight size={14}/></button> : <p className="cd-muted">Approve the physical sample to continue.</p>}</section></div></main>;
}

function StandardiseStep({ mapped, setMapped, published, setPublished, go }: { mapped: boolean; setMapped: (v: boolean) => void; published: boolean; setPublished: (v: boolean) => void; go: (s: BrandStep) => void }) {
  const mapping = [["Comp.", "material.fibre_composition", "100% ELS Ctn", "100% extra-long staple cotton"], ["Wgt gsm", "material.weight_gsm", "190 +/- 5", "190 gsm"], ["Knit type", "material.construction", "Warp mesh", "Warp-knit mesh"], ["Shade", "product.colour", "NVY-42", "Deep Navy"], ["Origin", "commercial.origin", "PT", "Portugal"]];
  return <main className="cd-main"><div className="cd-page-head"><div><p>07 · Fruma Standard</p><h1>Translate factory language without changing what it means.</h1><span>Original source values, mapping confidence and provenance remain attached.</span></div></div><section className="cd-card"><div className="cd-standard-head"><div><p className="cd-eyebrow">Factory source → canonical truth</p><h2>Inbound mapping</h2></div><button className="cd-secondary" onClick={() => { setMapped(false); setPublished(false); }}>Reset mapping</button></div><div className="cd-table-head map"><span>Factory field</span><span>Source value</span><span>Fruma field</span><span>Canonical value</span><span>Status</span></div>{mapping.map((r) => <div className="cd-table-row map" key={r[0]}><b>{r[0]}</b><span>{r[2]}</span><code>{r[1]}</code><span>{r[3]}</span><small>{published ? "Published internally" : mapped ? "Mapped · reviewed" : "AI suggestion"}</small></div>)}<div className="cd-actions end">{!mapped ? <button className="cd-primary" onClick={() => setMapped(true)}><Sparkles size={14}/> Review & accept mappings</button> : !published ? <button className="cd-primary" onClick={() => setPublished(true)}><FileCheck2 size={14}/> Publish to Fruma product record</button> : <button className="cd-primary" onClick={() => go("ready")}>Prepare channel-ready content <ArrowRight size={14}/></button>}</div></section></main>;
}

function ReadyStep() {
  return <main className="cd-main"><div className="cd-page-head"><div><p>08 · Commercial readiness</p><h1>Prepare every destination from one governed product truth.</h1><span>Fruma gets it ready. The brand takes it from here.</span></div></div><div className="cd-grid two"><section className="cd-card"><div className="cd-success"><Check size={14}/> Product truth ready for downstream mapping</div><h2>{featuredProduct.name}</h2><div className="cd-line"><b>Fruma Standard</b><span>52 governed facts</span></div><div className="cd-line"><b>Brand Standard</b><span>96% ready</span></div><div className="cd-line"><b>Provenance</b><span>Preserved</span></div></section><section className="cd-card"><p className="cd-eyebrow">Destination readiness</p>{[["Next", 91], ["John Lewis", 88], ["M&S", 84], ["The Very Group", 79]].map(([name, score]) => <button className="cd-destination" key={String(name)} onClick={() => window.location.assign("/channel-lab")}><span><b>{name}</b><small>Synthetic demo schema</small></span><strong>{score}%</strong><ArrowRight size={14}/></button>)}<button className="cd-primary full" onClick={() => window.location.assign("/channel-lab")}>Open channel readiness workspace <ArrowRight size={14}/></button></section></div></main>;
}

function MillWorkspace({ step, setStep, mill, requestState, setRequestState, sampleState, setSampleState, dataUploaded, setDataUploaded, evidenceOpen, setEvidenceOpen, detailOpen, setDetailOpen, setMode }: { step: MillStep; setStep: (s: MillStep) => void; mill: Mill; requestState: RequestState; setRequestState: (s: RequestState) => void; sampleState: SampleState; setSampleState: (s: SampleState) => void; dataUploaded: boolean; setDataUploaded: (v: boolean) => void; evidenceOpen: string | null; setEvidenceOpen: (v: string | null) => void; detailOpen: string | null; setDetailOpen: (v: string | null) => void; setMode: (m: Mode) => void }) {
  const messages = ["Brand clarification on colour tolerance", "Sample dispatch details", "Evidence scope question"];
  return <div className="cd-mill-shell"><nav className="cd-subnav">{millSteps.map((x) => <button key={x.id} className={step === x.id ? "active" : ""} onClick={() => setStep(x.id)}>{x.label}</button>)}</nav>
    {step === "requests" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Mill workspace</p><h1>Incoming sourcing request</h1><span>The same transaction the brand created is visible here.</span></div><button className="cd-secondary" onClick={() => setMode("brand")}>Back to brand</button></div><div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Anonymous request</p><h2>{featuredProduct.category}</h2><div className="cd-line"><b>Reference</b><span>RFQ-DEMO-1026</span></div><div className="cd-line"><b>Status</b><span>{requestState}</span></div><div className="cd-line"><b>Delivery</b><span>15 May 2027</span></div><button className="cd-primary full" onClick={() => setDetailOpen(detailOpen ? null : "request")}>Open response workspace</button></section>{detailOpen === "request" ? <section className="cd-card dark"><h2>Response workspace</h2><label>Price<input defaultValue="7.90"/></label><label>MOQ<input defaultValue={String(mill.moq)}/></label><label>Lead weeks<input defaultValue={String(mill.leadWeeks)}/></label><button className="cd-primary full" onClick={() => setRequestState("answered")}><Check size={14}/> Submit current response</button></section> : <section className="cd-card dark"><div className="cd-empty"><Inbox size={24}/><p>Open the response workspace to quote against the request.</p></div></section>}</div></main> : null}
    {step === "data" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Mill data</p><h1>Upload and map native factory data.</h1><span>Source values remain intact while Fruma suggests canonical mappings.</span></div><button className="cd-primary" onClick={() => setDataUploaded(true)}><Upload size={14}/> Upload mill data</button></div><section className="cd-card dark">{dataUploaded ? <><div className="cd-success"><Check size={14}/> updated_quality_book.xlsx parsed successfully</div>{[["Comp.", "material.fibre_composition"], ["Wgt gsm", "material.weight_gsm"], ["Knit type", "material.construction"]].map((r) => <div className="cd-line" key={r[0]}><b>{r[0]}</b><code>{r[1]}</code><span>Mapped</span></div>)}<button className="cd-secondary" onClick={() => setDataUploaded(false)}>Reset upload demo</button></> : <div className="cd-empty"><Upload size={24}/><p>Upload a seeded mill file to demonstrate ingest and mapping.</p></div>}</section></main> : null}
    {step === "evidence" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Evidence</p><h1>Scope and validity stay explicit.</h1></div></div><div className="cd-supplier-grid">{mill.certifications.map((c, i) => <article className="cd-card dark" key={c}><ShieldCheck size={22}/><h2>{c}</h2><p>{i === mill.certifications.length - 1 && mill.staleEvidence ? "Review due" : "Current"}</p><button className="cd-secondary full" onClick={() => setEvidenceOpen(evidenceOpen === c ? null : c)}>Open evidence record</button>{evidenceOpen === c ? <div className="cd-evidence-detail"><div className="cd-line"><b>Issuer</b><span>Demo certification body</span></div><div className="cd-line"><b>Scope</b><span>Mill site + mapped quality families</span></div><div className="cd-line"><b>Validity</b><span>{i === mill.certifications.length - 1 ? "30 days remaining" : "Current"}</span></div><div className="cd-line"><b>Source</b><span>certificate_2026.pdf</span></div></div> : null}</article>)}</div></main> : null}
    {step === "samples" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Samples</p><h1>Physical development stays linked to the same case.</h1></div></div><section className="cd-card dark"><div className="cd-line"><b>{featuredProduct.name}</b><span>{mill.name}</span><em>{sampleState.replace("_", " ")}</em></div><button className="cd-primary" onClick={() => setSampleState(sampleState === "requested" ? "in_progress" : sampleState === "in_progress" ? "received" : sampleState === "received" ? "approved" : "requested")}>Advance sample status</button></section></main> : null}
    {step === "messages" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Messages</p><h1>Conversations stay attached to transactions.</h1></div></div><div className="cd-supplier-grid">{messages.map((m) => <article className="cd-card dark" key={m}><MessageSquare size={20}/><h2>{m}</h2><p>Linked to RFQ-DEMO-1026</p><button className="cd-secondary" onClick={() => setDetailOpen(detailOpen === m ? null : m)}>{detailOpen === m ? "Close" : "Open"}</button>{detailOpen === m ? <div className="cd-message-thread"><span>Brand</span><p>Please confirm this against the current sample and source record.</p><label>Reply<textarea defaultValue="Confirmed. We have linked the response to the current request."/></label><button className="cd-primary" onClick={() => setDetailOpen(null)}>Send reply</button></div> : null}</article>)}</div></main> : null}
  </div>;
}

export function CustomerDemoPlatform() {
  const [mode, setMode] = useState<Mode>("brand");
  const [brandStep, setBrandStep] = useState<BrandStep>("intent");
  const [millStep, setMillStep] = useState<MillStep>("requests");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [brief, setBrief] = useState(featuredProduct.intent);
  const [savedBrief, setSavedBrief] = useState(false);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [selectedMillId, setSelectedMillId] = useState(featuredProduct.shortlistMillIds[0] ?? mills[0].id);
  const [filterOpen, setFilterOpen] = useState(false);
  const [evidenceOnly, setEvidenceOnly] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("draft");
  const [sampleState, setSampleState] = useState<SampleState>("not_requested");
  const [notes, setNotes] = useState("Proto review: preserve dry handfeel and structure. Confirm shade under daylight before bulk approval.");
  const [savedNotes, setSavedNotes] = useState(false);
  const [mapped, setMapped] = useState(false);
  const [published, setPublished] = useState(false);
  const [dataUploaded, setDataUploaded] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);
  const mill = mills.find((m) => m.id === selectedMillId) ?? mills[0];
  const stepIndex = brandSteps.findIndex((x) => x.id === brandStep);

  function resetDemo() {
    setMode("brand"); setBrandStep("intent"); setMillStep("requests"); setSavedBrief(false); setConfirmed([]); setSelectedMillId(featuredProduct.shortlistMillIds[0] ?? mills[0].id); setFilterOpen(false); setEvidenceOnly(false); setRequestState("draft"); setSampleState("not_requested"); setSavedNotes(false); setMapped(false); setPublished(false); setDataUploaded(false); setEvidenceOpen(null); setDetailOpen(null); setWorkspaceOpen(false); setNotificationsOpen(false);
  }

  function nextStep() {
    if (mode === "mill") { const idx = millSteps.findIndex((x) => x.id === millStep); setMillStep(millSteps[Math.min(idx + 1, millSteps.length - 1)].id); return; }
    setBrandStep(brandSteps[Math.min(stepIndex + 1, brandSteps.length - 1)].id);
  }

  return <div className={`cd-shell ${mode === "mill" ? "mill" : ""}`}>
    <Header mode={mode} setMode={(m) => { setMode(m); setWorkspaceOpen(false); setNotificationsOpen(false); }} workspaceOpen={workspaceOpen} setWorkspaceOpen={setWorkspaceOpen} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} activeMill={mill}/>
    {mode === "brand" ? <>
      <nav className="cd-lifecycle">{brandSteps.map((s, i) => <button key={s.id} className={brandStep === s.id ? "active" : ""} onClick={() => setBrandStep(s.id)}><span>{String(i + 1).padStart(2, "0")}</span>{s.label}</button>)}</nav>
      <DemoBanner current={stepIndex + 1} total={brandSteps.length} onNext={nextStep} onReset={resetDemo}/>
      {brandStep === "intent" ? <Intent brief={brief} setBrief={setBrief} saved={savedBrief} setSaved={setSavedBrief} go={setBrandStep}/> : null}
      {brandStep === "concept" ? <main className="cd-main"><div className="cd-page-head"><div><p>02 · Visual product intent</p><h1>Turn the idea into something a factory can respond to.</h1><span>Upload a sketch, generate a visual development concept and attach it to a sample request.</span></div></div><ProductConceptLab/><div className="cd-actions end"><button className="cd-primary" onClick={() => setBrandStep("check")}>Continue to requirements <ArrowRight size={14}/></button></div></main> : null}
      {brandStep === "check" ? <CheckStep confirmed={confirmed} setConfirmed={setConfirmed} go={setBrandStep}/> : null}
      {brandStep === "source" ? <SourceStep selectedMillId={selectedMillId} setSelectedMillId={setSelectedMillId} filterOpen={filterOpen} setFilterOpen={setFilterOpen} evidenceOnly={evidenceOnly} setEvidenceOnly={setEvidenceOnly} go={setBrandStep}/> : null}
      {brandStep === "confirm" ? <ConfirmStep mill={mill} requestState={requestState} setRequestState={setRequestState} setMode={setMode} go={setBrandStep}/> : null}
      {brandStep === "development" ? <DevelopmentStep mill={mill} sampleState={sampleState} setSampleState={setSampleState} setMode={setMode} notes={notes} setNotes={setNotes} savedNotes={savedNotes} setSavedNotes={setSavedNotes} go={setBrandStep}/> : null}
      {brandStep === "standardise" ? <StandardiseStep mapped={mapped} setMapped={setMapped} published={published} setPublished={setPublished} go={setBrandStep}/> : null}
      {brandStep === "ready" ? <ReadyStep/> : null}
    </> : <MillWorkspace step={millStep} setStep={setMillStep} mill={mill} requestState={requestState} setRequestState={setRequestState} sampleState={sampleState} setSampleState={setSampleState} dataUploaded={dataUploaded} setDataUploaded={setDataUploaded} evidenceOpen={evidenceOpen} setEvidenceOpen={setEvidenceOpen} detailOpen={detailOpen} setDetailOpen={setDetailOpen} setMode={setMode}/>} 
  </div>;
}
