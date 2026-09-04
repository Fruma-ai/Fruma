"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  FileCheck2,
  Filter,
  Inbox,
  LoaderCircle,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { demoBrands, featuredProduct, mills, products, type Mill, type Product, type Requirement } from "@/lib/fruma/demo-data";
import { ProductConceptLab } from "@/components/fruma/ProductConceptLab";

type Mode = "brand" | "mill";
type BrandStep = "intent" | "concept" | "check" | "source" | "confirm" | "development" | "standardise" | "ready";
type MillStep = "requests" | "data" | "evidence" | "samples" | "messages";
type RequestState = "draft" | "sent" | "answered" | "selected";
type SampleState = "not_requested" | "requested" | "in_progress" | "received" | "approved";
type IntentPhase = "editing" | "analysing" | "structuring" | "searching" | "ready";

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

const categoryProfiles: Record<string, { material: string; construction: string; handfeel: string; moq: string; tags: string[] }> = {
  Polo: { material: "Extra-long staple cotton", construction: "Warp-knit mesh", handfeel: "Dry, breathable, clean", moq: "≤ 600m", tags: ["fine cotton", "warp knit", "mesh", "technical cotton"] },
  Sweater: { material: "Merino-rich wool blend", construction: "Double knit", handfeel: "Soft, compact, low-pilling", moq: "≤ 450m", tags: ["merino", "wool blends", "double knit"] },
  Shirt: { material: "Long-staple cotton", construction: "Fine woven poplin", handfeel: "Crisp, smooth, lightweight", moq: "≤ 700m", tags: ["woven shirting", "poplin", "oxford"] },
  Jacket: { material: "Recycled wool blend", construction: "Compact twill", handfeel: "Structured, brushed, substantial", moq: "≤ 500m", tags: ["outerwear", "wool coating", "compact twill"] },
  "T-shirt": { material: "Long-staple cotton", construction: "Single jersey", handfeel: "Soft, clean, smooth", moq: "≤ 800m", tags: ["fine cotton", "jersey", "interlock"] },
  Trouser: { material: "Cotton-linen blend", construction: "Compact woven twill", handfeel: "Dry, crisp, fluid", moq: "≤ 650m", tags: ["linen", "hemp blends", "compact twill"] },
  Dress: { material: "Viscose blend", construction: "Fluid woven", handfeel: "Fluid, cool, soft", moq: "≤ 700m", tags: ["viscose", "modal", "cellulosics"] },
  Overshirt: { material: "Organic cotton", construction: "Compact twill", handfeel: "Dry, structured, garment-ready", moq: "≤ 550m", tags: ["outerwear", "compact twill", "fine cotton"] },
};

function requirementsFor(product: Product): Requirement[] {
  const profile = categoryProfiles[product.category] ?? categoryProfiles.Polo;
  const colour = product.name.match(/navy|stone|forest|black|cream|clay/i)?.[0] ?? "Navy";
  return [
    { key: "Material", value: profile.material, priority: "MUST", answerability: "Can check now" },
    { key: "Construction", value: profile.construction, priority: "MUST", answerability: "Can check now" },
    { key: "Colour", value: colour[0].toUpperCase() + colour.slice(1), priority: "PREFER", answerability: "Needs mill confirmation" },
    { key: "Handfeel", value: profile.handfeel, priority: "PREFER", answerability: "Physical validation" },
    { key: "MOQ", value: profile.moq, priority: "MUST", answerability: "Can check now" },
    { key: "Market", value: "UK + EU", priority: "MUST", answerability: "Can check now" },
  ];
}

function maxMoq(requirements: Requirement[]) {
  const row = requirements.find((r) => r.key === "MOQ")?.value ?? "600";
  return Number(row.replace(/[^0-9]/g, "")) || 600;
}

function recommendationFor(product: Product, mill: Mill) {
  const profile = categoryProfiles[product.category] ?? categoryProfiles.Polo;
  const reqs = requirementsFor(product);
  const specialtyMatches = mill.specialties.filter((s) => profile.tags.some((tag) => s.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(s.toLowerCase())));
  const moqPass = mill.moq <= maxMoq(reqs);
  const relationshipBoost = mill.relationship === "preferred" ? 12 : mill.relationship === "proven" ? 9 : mill.relationship === "previous" ? 5 : mill.relationship === "new" ? 2 : -50;
  const capability = specialtyMatches.length * 18;
  const commercial = moqPass ? 16 : Math.max(-12, 8 - Math.round((mill.moq - maxMoq(reqs)) / 75));
  const evidence = Math.round((mill.evidenceCoverage - 60) * 0.45);
  const lead = mill.leadWeeks <= 7 ? 7 : mill.leadWeeks <= 9 ? 4 : 1;
  const score = Math.max(0, Math.min(99, 45 + capability + commercial + evidence + relationshipBoost + lead));
  const reasons = [
    specialtyMatches.length ? `${specialtyMatches.slice(0, 2).join(" + ")} capability` : `${product.category.toLowerCase()} capability not directly evidenced`,
    moqPass ? `MOQ fits ${maxMoq(reqs)}m ceiling` : `MOQ ${mill.moq}m is above target`,
    `${mill.evidenceCoverage}% evidence coverage`,
    mill.relationship === "new" ? "New relationship" : `${mill.relationship} relationship`,
  ];
  return { score, reasons, specialtyMatches, moqPass };
}

function Header({ mode, setMode, activeMill, workspaceOpen, setWorkspaceOpen, notificationsOpen, setNotificationsOpen }: {
  mode: Mode; setMode: (m: Mode) => void; activeMill: Mill; workspaceOpen: boolean; setWorkspaceOpen: (v: boolean) => void; notificationsOpen: boolean; setNotificationsOpen: (v: boolean) => void;
}) {
  return <>
    <header className={`cd-topbar ${mode === "mill" ? "mill" : ""}`}>
      <button className="cd-wordmark" onClick={() => setMode("brand")}>FRUMA</button>
      <div className="cd-workspace-wrap">
        <button className="cd-workspace" onClick={() => setWorkspaceOpen(!workspaceOpen)}>{mode === "brand" ? demoBrands[0].name : activeMill.name}<ChevronDown size={14}/></button>
        {workspaceOpen ? <div className="cd-popover cd-workspaces"><b>Demo workspaces</b>{(mode === "brand" ? demoBrands.slice(0, 4).map((b) => b.name) : mills.slice(0, 4).map((m) => m.name)).map((name, index) => <button key={name} onClick={() => setWorkspaceOpen(false)}><span>{name}</span><small>{index === 0 ? "Active" : "Seeded demo"}</small></button>)}</div> : null}
      </div>
      <div className="cd-mode-switch"><button className={mode === "brand" ? "active" : ""} onClick={() => setMode("brand")}>Brand</button><button className={mode === "mill" ? "active" : ""} onClick={() => setMode("mill")}>Factory</button></div>
      <div className="cd-top-actions"><button aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={17}/><span className="cd-dot"/></button><div className="cd-avatar">AR</div></div>
    </header>
    {notificationsOpen ? <aside className="cd-notifications"><div className="cd-pop-head"><div><small>Notifications</small><h3>3 things need attention</h3></div><button aria-label="Close" onClick={() => setNotificationsOpen(false)}><X size={16}/></button></div><button onClick={() => setNotificationsOpen(false)}><b>Sample request updated</b><span>{activeMill.name} opened the development pack.</span></button><button onClick={() => setNotificationsOpen(false)}><b>Evidence review due</b><span>One certificate expires within 30 days.</span></button><button onClick={() => setNotificationsOpen(false)}><b>Destination gap</b><span>One channel still needs a confirmed fit description.</span></button></aside> : null}
  </>;
}

function WorkingState({ title, detail, progress }: { title: string; detail: string; progress?: number }) {
  return <div className="cd-working-state"><div className="cd-working-icon"><LoaderCircle size={22}/></div><div><b>{title}</b><span>{detail}</span>{typeof progress === "number" ? <div className="cd-working-progress"><i style={{ width: `${progress}%` }}/></div> : null}</div></div>;
}

function Intent({ product, setProductId, brief, setBrief, saved, phase, visibleRequirements, onSave, go }: {
  product: Product; setProductId: (id: string) => void; brief: string; setBrief: (v: string) => void; saved: boolean; phase: IntentPhase; visibleRequirements: number; onSave: () => void; go: (s: BrandStep) => void;
}) {
  const reqs = requirementsFor(product);
  const phaseCopy = phase === "analysing" ? ["Reading product intent", "Fruma is identifying material, construction, commercial and validation requirements.", 18] as const : phase === "structuring" ? ["Structuring the requirement contract", "Turning the brief into MUST, PREFER and OPEN requirements with answerability states.", 58] as const : phase === "searching" ? ["Preparing network intelligence", "Checking capability, MOQ, evidence and brand relationship data across the demo supplier network.", 86] as const : null;
  return <main className="cd-main"><div className="cd-page-head"><div><p>01 · Product intent</p><h1>Start with what the brand is trying to make.</h1><span>The brief becomes a structured sourcing case before Fruma asks the network for anything.</span></div></div>
    <div className="cd-grid two">
      <section className="cd-card"><label>Working product<select value={product.id} onChange={(e) => setProductId(e.target.value)}>{[featuredProduct, ...products.slice(0, 15)].map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label>Product brief<textarea value={brief} onChange={(e) => setBrief(e.target.value)}/></label><div className="cd-actions"><button className="cd-secondary" onClick={() => setBrief(product.intent)}>Restore product brief</button><button className="cd-primary" onClick={onSave}>{saved && phase === "ready" ? <><Check size={14}/> Brief structured</> : saved ? <><LoaderCircle className="cd-spin" size={14}/> Fruma working</> : "Save brief"}</button></div></section>
      <section className="cd-card cd-requirement-card"><div className="cd-standard-head"><div><p className="cd-eyebrow">AI-generated requirement frame</p><h2>{phase === "editing" ? "Waiting for a saved brief" : "Product requirement contract"}</h2></div>{phase === "ready" ? <span className="cd-ai-badge"><Sparkles size={12}/> AI structured · reviewable</span> : null}</div>
        {phase === "editing" ? <div className="cd-empty"><Sparkles size={24}/><p>Save the brief and Fruma will structure the requirements here.</p></div> : null}
        {phaseCopy ? <WorkingState title={phaseCopy[0]} detail={phaseCopy[1]} progress={phaseCopy[2]}/> : null}
        {phase !== "analysing" ? <div className="cd-requirement-reveal">{reqs.slice(0, visibleRequirements).map((r, index) => <div className="cd-line cd-generated" key={r.key} style={{ animationDelay: `${index * 45}ms` }}><b>{r.key}</b><span>{r.value}</span><em>{r.priority}</em></div>)}</div> : null}
        {phase === "ready" ? <><div className="cd-success"><Check size={14}/> 6 requirements structured · network search prepared</div><button className="cd-primary full" onClick={() => go("concept")}>Add sketch & visual concept <ArrowRight size={14}/></button></> : null}
      </section>
    </div>
  </main>;
}

function CheckStep({ product, confirmed, setConfirmed, go }: { product: Product; confirmed: string[]; setConfirmed: (v: string[]) => void; go: (s: BrandStep) => void }) {
  const rows = requirementsFor(product);
  return <main className="cd-main"><div className="cd-page-head"><div><p>03 · Product truth contract</p><h1>Review what Fruma extracted before sourcing.</h1><span>Every requirement keeps its priority and answerability state.</span></div></div><section className="cd-card"><div className="cd-table-head"><span>Requirement</span><span>Value</span><span>Priority</span><span>Answerability</span><span>Action</span></div>{rows.map((r) => { const done = confirmed.includes(r.key); return <div className="cd-table-row" key={r.key}><b>{r.key}</b><span>{r.value}</span><em>{r.priority}</em><small>{r.answerability}</small><button className={done ? "cd-done" : "cd-secondary"} onClick={() => setConfirmed(done ? confirmed.filter((x) => x !== r.key) : [...confirmed, r.key])}>{done ? <><Check size={13}/> Reviewed</> : "Review"}</button></div>; })}<div className="cd-actions end"><button className="cd-primary" onClick={() => go("source")}>Find recommended factories <Search size={14}/></button></div></section></main>;
}

function SourceStep({ product, selectedMillId, setSelectedMillId, filterOpen, setFilterOpen, evidenceOnly, setEvidenceOnly, go }: {
  product: Product; selectedMillId: string; setSelectedMillId: (id: string) => void; filterOpen: boolean; setFilterOpen: (v: boolean) => void; evidenceOnly: boolean; setEvidenceOnly: (v: boolean) => void; go: (s: BrandStep) => void;
}) {
  const [searching, setSearching] = useState(true);
  useEffect(() => { setSearching(true); const timer = window.setTimeout(() => setSearching(false), 1750); return () => window.clearTimeout(timer); }, [product.id]);
  const ranked = useMemo(() => mills.map((mill) => ({ mill, ...recommendationFor(product, mill) })).filter((x) => x.mill.relationship !== "excluded").filter((x) => !evidenceOnly || x.mill.evidenceCoverage >= 85).sort((a, b) => b.score - a.score).slice(0, 8), [product, evidenceOnly]);
  return <main className="cd-main"><div className="cd-page-head"><div><p>04 · Network intelligence</p><h1>Recommended factories for {product.name}.</h1><span>Recommendations are calculated from the requirements, mill capability, MOQ, evidence coverage and the brand's private relationship history.</span></div><button className="cd-secondary" onClick={() => setFilterOpen(!filterOpen)}><Filter size={14}/> Filters</button></div>
    {searching ? <section className="cd-card cd-network-search"><WorkingState title="Searching the Fruma network" detail={`Comparing ${mills.length} factories against ${requirementsFor(product).length} product requirements, evidence records and relationship signals.`} progress={72}/><div className="cd-search-steps"><span><Check size={13}/> Product requirements normalised</span><span><Check size={13}/> Factory capability checked</span><span><LoaderCircle className="cd-spin" size={13}/> Ranking evidence + commercial fit</span></div></section> : <>
      {filterOpen ? <div className="cd-filter-panel"><label><input type="checkbox" checked={evidenceOnly} onChange={(e) => setEvidenceOnly(e.target.checked)}/> Evidence coverage 85%+</label><button onClick={() => { setEvidenceOnly(false); setFilterOpen(false); }}>Clear filters</button></div> : null}
      <div className="cd-match-summary"><Sparkles size={16}/><div><b>{ranked.length} strongest matches ranked</b><span>Top recommendations change when you choose a different product because the capability and commercial requirements change.</span></div></div>
      <div className="cd-supplier-grid">{ranked.map(({ mill, score, reasons }, index) => <article className={`cd-card supplier ${selectedMillId === mill.id ? "selected" : ""}`} key={mill.id}><div className="cd-supplier-top"><span>{score}%</span><small>{index < 3 ? "Recommended" : mill.relationship}</small></div><h2>{mill.name}</h2><p>{mill.region}, {mill.country}</p><div className="cd-recommendation-reasons">{reasons.slice(0, 3).map((r) => <span key={r}><Check size={12}/>{r}</span>)}</div><div className="cd-kpis"><div><span>MOQ</span><b>{mill.moq.toLocaleString()}m</b></div><div><span>Lead</span><b>{mill.leadWeeks} wks</b></div></div><button className="cd-primary full" onClick={() => { setSelectedMillId(mill.id); go("confirm"); }}>Select & request terms</button></article>)}</div>
    </>}
  </main>;
}

function ConfirmStep({ product, mill, requestState, setRequestState, setMode, go }: { product: Product; mill: Mill; requestState: RequestState; setRequestState: (s: RequestState) => void; setMode: (m: Mode) => void; go: (s: BrandStep) => void }) {
  return <main className="cd-main"><div className="cd-page-head"><div><p>05 · Current commercial confirmation</p><h1>Turn a recommendation into a current factory response.</h1><span>Historical capability is useful, but current price, MOQ and lead time still need confirmation.</span></div></div><div className="cd-grid two"><section className="cd-card"><p className="cd-eyebrow">Structured request</p><h2>{product.name}</h2><div className="cd-line"><b>Factory</b><span>{mill.name}</span></div><div className="cd-line"><b>Target MOQ</b><span>{requirementsFor(product).find((r) => r.key === "MOQ")?.value}</span></div><div className="cd-line"><b>Reference pack</b><span>Brief + requirements + visual concept</span></div><button className="cd-primary full" onClick={() => setRequestState("sent")}>{requestState === "draft" ? "Send sourcing request" : <><Check size={14}/> Request sent</>}</button></section><section className="cd-card"><p className="cd-eyebrow">Current response</p>{requestState === "draft" ? <div className="cd-empty"><Inbox size={24}/><p>Send the request to start the transaction.</p></div> : requestState === "sent" ? <><WorkingState title="Waiting for current factory response" detail="The request is now visible in the factory workspace."/><button className="cd-secondary full" onClick={() => setMode("mill")}>Open factory workspace</button><button className="cd-primary full" onClick={() => setRequestState("answered")}>Simulate factory response</button></> : <><div className="cd-success"><Check size={14}/> Current offer received</div><div className="cd-line"><b>Price</b><span>EUR 7.90 / m</span></div><div className="cd-line"><b>MOQ</b><span>{mill.moq}m</span></div><div className="cd-line"><b>Lead</b><span>{mill.leadWeeks} weeks</span></div><button className="cd-primary full" onClick={() => { setRequestState("selected"); go("development"); }}>Select source & lock</button></>}</section></div></main>;
}

function DevelopmentStep({ product, mill, sampleState, setSampleState, setMode, notes, setNotes, savedNotes, setSavedNotes, go }: { product: Product; mill: Mill; sampleState: SampleState; setSampleState: (s: SampleState) => void; setMode: (m: Mode) => void; notes: string; setNotes: (v: string) => void; savedNotes: boolean; setSavedNotes: (v: boolean) => void; go: (s: BrandStep) => void }) {
  const nextState: Record<SampleState, SampleState> = { not_requested: "requested", requested: "in_progress", in_progress: "received", received: "approved", approved: "approved" };
  const label: Record<SampleState, string> = { not_requested: "Request physical sample", requested: "Mark factory started sample", in_progress: "Mark sample received", received: "Approve physical sample", approved: "Sample approved" };
  return <main className="cd-main"><div className="cd-page-head"><div><p>06 · Physical development</p><h1>Intent becomes product truth through the sample.</h1><span>The AI concept stays a development reference. Physical validation is what upgrades product truth.</span></div></div><div className="cd-grid two"><section className="cd-card"><p className="cd-eyebrow">Sample status</p><h2>{product.name} · {mill.name}</h2><div className="cd-progress">{["requested", "in_progress", "received", "approved"].map((s) => <span key={s} className={sampleState === s || sampleState === "approved" ? "active" : ""}>{s.replace("_", " ")}</span>)}</div><button className="cd-primary full" disabled={sampleState === "approved"} onClick={() => setSampleState(nextState[sampleState])}>{sampleState === "approved" ? <><Check size={14}/> Sample approved</> : label[sampleState]}</button><button className="cd-secondary full" onClick={() => setMode("mill")}>View same sample in factory workspace</button></section><section className="cd-card"><label>Development notes<textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSavedNotes(false); }}/></label><button className="cd-secondary" onClick={() => setSavedNotes(true)}>{savedNotes ? <><Check size={14}/> Notes saved</> : "Save notes"}</button>{sampleState === "approved" ? <button className="cd-primary" onClick={() => go("standardise")}>Continue to product standardisation <ArrowRight size={14}/></button> : <p className="cd-muted">Approve the physical sample to continue.</p>}</section></div></main>;
}

function StandardiseStep({ product, mapped, setMapped, published, setPublished, go }: { product: Product; mapped: boolean; setMapped: (v: boolean) => void; published: boolean; setPublished: (v: boolean) => void; go: (s: BrandStep) => void }) {
  const reqs = requirementsFor(product);
  const mapping = [["Material desc.", "material.fibre_composition", reqs[0].value, reqs[0].value], ["Construction", "material.construction", reqs[1].value, reqs[1].value], ["Shade", "product.colour", reqs[2].value, reqs[2].value], ["MOQ", "commercial.moq", String(mills[0].moq), String(mills[0].moq)], ["Origin", "commercial.origin", "PT", "Portugal"]];
  return <main className="cd-main"><div className="cd-page-head"><div><p>07 · Fruma Standard</p><h1>Translate factory language without changing what it means.</h1><span>Original source values, mapping confidence and provenance remain attached.</span></div></div><section className="cd-card"><div className="cd-standard-head"><div><p className="cd-eyebrow">Factory source → Fruma Standard</p><h2>Inbound mapping</h2></div><button className="cd-secondary" onClick={() => { setMapped(false); setPublished(false); }}>Reset mapping</button></div><div className="cd-table-head map"><span>Factory field</span><span>Source value</span><span>Fruma field</span><span>Canonical value</span><span>Status</span></div>{mapping.map((r) => <div className="cd-table-row map" key={r[0]}><b>{r[0]}</b><span>{r[2]}</span><code>{r[1]}</code><span>{r[3]}</span><small>{published ? "Published internally" : mapped ? "Mapped · reviewed" : "AI suggestion"}</small></div>)}<div className="cd-actions end">{!mapped ? <button className="cd-primary" onClick={() => setMapped(true)}><Sparkles size={14}/> Review & accept mappings</button> : !published ? <button className="cd-primary" onClick={() => setPublished(true)}><FileCheck2 size={14}/> Publish to Fruma product record</button> : <button className="cd-primary" onClick={() => go("ready")}>Prepare channel-ready content <ArrowRight size={14}/></button>}</div></section></main>;
}

function ReadyStep({ product }: { product: Product }) {
  return <main className="cd-main"><div className="cd-page-head"><div><p>08 · Commercial readiness</p><h1>Prepare every destination from one governed product truth.</h1><span>Fruma gets it ready. The brand takes it from here.</span></div></div><div className="cd-grid two"><section className="cd-card"><div className="cd-success"><Check size={14}/> Product truth ready for downstream mapping</div><h2>{product.name}</h2><div className="cd-line"><b>Fruma Standard</b><span>52 governed facts</span></div><div className="cd-line"><b>Alder & Row Standard</b><span>96% ready</span></div><div className="cd-line"><b>Provenance</b><span>Preserved</span></div></section><section className="cd-card"><p className="cd-eyebrow">Destination readiness</p>{[["Next", 91], ["John Lewis", 88], ["M&S", 84], ["The Very Group", 79]].map(([name, score]) => <button className="cd-destination" key={String(name)} onClick={() => window.location.assign("/channel-lab")}><span><b>{name}</b><small>Synthetic demo schema</small></span><strong>{score}%</strong><ArrowRight size={14}/></button>)}<button className="cd-primary full" onClick={() => window.location.assign("/channel-lab")}>Open channel readiness workspace <ArrowRight size={14}/></button></section></div></main>;
}

function MillWorkspace({ step, setStep, product, mill, requestState, setRequestState, sampleState, setSampleState, dataUploaded, setDataUploaded, evidenceOpen, setEvidenceOpen, detailOpen, setDetailOpen, setMode }: {
  step: MillStep; setStep: (s: MillStep) => void; product: Product; mill: Mill; requestState: RequestState; setRequestState: (s: RequestState) => void; sampleState: SampleState; setSampleState: (s: SampleState) => void; dataUploaded: boolean; setDataUploaded: (v: boolean) => void; evidenceOpen: string | null; setEvidenceOpen: (v: string | null) => void; detailOpen: string | null; setDetailOpen: (v: string | null) => void; setMode: (m: Mode) => void;
}) {
  const messages = ["Sample request · current development case", "Evidence query · quality scope", "Commercial response · current RFQ"];
  return <div className="cd-mill-shell"><nav className="cd-subnav">{millSteps.map((s) => <button key={s.id} className={step === s.id ? "active" : ""} onClick={() => setStep(s.id)}>{s.label}</button>)}</nav>
    {step === "requests" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Factory workspace · requests</p><h1>Respond to structured demand, not disconnected email.</h1><span>The same product case the brand created is visible here.</span></div></div><div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Incoming request</p><h2>{product.name}</h2><div className="cd-line"><b>Brand</b><span>Anonymous until selected</span></div><div className="cd-line"><b>Requirements</b><span>{requirementsFor(product).length} structured fields</span></div><div className="cd-line"><b>Status</b><span>{requestState}</span></div><button className="cd-primary full" onClick={() => setRequestState("answered")}>{requestState === "answered" ? <><Check size={14}/> Response submitted</> : "Submit current response"}</button><button className="cd-secondary full" onClick={() => setMode("brand")}>Back to brand</button></section><section className="cd-card dark"><p className="cd-eyebrow">Why this request reached you</p>{recommendationFor(product, mill).reasons.map((r) => <div className="cd-line" key={r}><Check size={13}/><span>{r}</span></div>)}</section></div></main> : null}
    {step === "data" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Factory data</p><h1>Keep your spreadsheet. Fruma maps it.</h1><span>Source values stay attached while Fruma translates them into the canonical standard.</span></div></div><section className="cd-card dark"><button className="cd-primary" onClick={() => setDataUploaded(true)}><Upload size={14}/> {dataUploaded ? "updated_quality_book.xlsx uploaded" : "Upload mill data"}</button>{dataUploaded ? <><div className="cd-success"><Check size={14}/> 5 source fields parsed and mapped</div>{[["Comp.", "100% ELS Ctn", "material.fibre_composition"], ["Wgt gsm", "190 +/- 5", "material.weight_gsm"], ["Knit type", "Warp mesh", "material.construction"], ["Shade", "NVY-42", "product.colour"], ["Origin", "PT", "commercial.origin"]].map((r) => <div className="cd-line" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><code>{r[2]}</code></div>)}<button className="cd-secondary" onClick={() => setDataUploaded(false)}>Reset upload demo</button></> : <div className="cd-empty"><Upload size={24}/><p>Upload a spreadsheet to start mapping.</p></div>}</section></main> : null}
    {step === "evidence" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Evidence</p><h1>Evidence scope stays attached to the facts it supports.</h1></div></div><div className="cd-supplier-grid">{mill.certifications.map((cert) => <article className="cd-card dark" key={cert}><ShieldCheck size={20}/><h2>{cert}</h2><p>{mill.staleEvidence ? "Review date approaching" : "Current evidence"}</p><button className="cd-secondary" onClick={() => setEvidenceOpen(evidenceOpen === cert ? null : cert)}>{evidenceOpen === cert ? "Close evidence" : "Open evidence record"}</button>{evidenceOpen === cert ? <div className="cd-evidence-detail"><div className="cd-line"><b>Issuer</b><span>Seeded demo issuer</span></div><div className="cd-line"><b>Scope</b><span>Material + site</span></div><div className="cd-line"><b>Source</b><span>certificate.pdf</span></div></div> : null}</article>)}</div></main> : null}
    {step === "samples" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Samples</p><h1>Physical development stays linked to the same case.</h1></div></div><section className="cd-card dark"><div className="cd-line"><b>{product.name}</b><span>{mill.name}</span><em>{sampleState.replace("_", " ")}</em></div><button className="cd-primary" onClick={() => setSampleState(sampleState === "requested" ? "in_progress" : sampleState === "in_progress" ? "received" : sampleState === "received" ? "approved" : "requested")}>Advance sample status</button></section></main> : null}
    {step === "messages" ? <main className="cd-main dark"><div className="cd-page-head"><div><p>Messages</p><h1>Conversations stay attached to transactions.</h1></div></div><div className="cd-supplier-grid">{messages.map((m) => <article className="cd-card dark" key={m}><MessageSquare size={20}/><h2>{m}</h2><p>Linked to RFQ-DEMO-1026</p><button className="cd-secondary" onClick={() => setDetailOpen(detailOpen === m ? null : m)}>{detailOpen === m ? "Close" : "Open"}</button>{detailOpen === m ? <div className="cd-message-thread"><span>Brand</span><p>Please confirm this against the current sample and source record.</p><label>Reply<textarea defaultValue="Confirmed. We have linked the response to the current request."/></label><button className="cd-primary" onClick={() => setDetailOpen(null)}>Send reply</button></div> : null}</article>)}</div></main> : null}
  </div>;
}

export function CustomerDemoPlatformV2() {
  const [mode, setMode] = useState<Mode>("brand");
  const [brandStep, setBrandStep] = useState<BrandStep>("intent");
  const [millStep, setMillStep] = useState<MillStep>("requests");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [productId, setProductId] = useState(featuredProduct.id);
  const product = useMemo(() => productId === featuredProduct.id ? featuredProduct : products.find((p) => p.id === productId) ?? featuredProduct, [productId]);
  const [brief, setBrief] = useState(featuredProduct.intent);
  const [savedBrief, setSavedBrief] = useState(false);
  const [intentPhase, setIntentPhase] = useState<IntentPhase>("editing");
  const [visibleRequirements, setVisibleRequirements] = useState(0);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [selectedMillId, setSelectedMillId] = useState(featuredProduct.shortlistMillIds[0] ?? mills[0].id);
  const [filterOpen, setFilterOpen] = useState(false);
  const [evidenceOnly, setEvidenceOnly] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("draft");
  const [sampleState, setSampleState] = useState<SampleState>("not_requested");
  const [notes, setNotes] = useState("Proto review: preserve intended handfeel and structure. Confirm shade under daylight before bulk approval.");
  const [savedNotes, setSavedNotes] = useState(false);
  const [mapped, setMapped] = useState(false);
  const [published, setPublished] = useState(false);
  const [dataUploaded, setDataUploaded] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);
  const mill = mills.find((m) => m.id === selectedMillId) ?? mills[0];
  const stepIndex = brandSteps.findIndex((x) => x.id === brandStep);

  function chooseProduct(id: string) {
    const next = id === featuredProduct.id ? featuredProduct : products.find((p) => p.id === id) ?? featuredProduct;
    setProductId(id); setBrief(next.intent); setSavedBrief(false); setIntentPhase("editing"); setVisibleRequirements(0); setConfirmed([]); setRequestState("draft"); setSampleState("not_requested");
  }

  function saveAndStructureBrief() {
    const reqs = requirementsFor(product);
    setSavedBrief(true); setIntentPhase("analysing"); setVisibleRequirements(0);
    window.setTimeout(() => setIntentPhase("structuring"), 550);
    reqs.forEach((_, i) => window.setTimeout(() => setVisibleRequirements(i + 1), 900 + i * 260));
    window.setTimeout(() => setIntentPhase("searching"), 900 + reqs.length * 260 + 250);
    window.setTimeout(() => setIntentPhase("ready"), 900 + reqs.length * 260 + 1650);
  }

  function resetDemo() {
    setMode("brand"); setBrandStep("intent"); setMillStep("requests"); setProductId(featuredProduct.id); setBrief(featuredProduct.intent); setSavedBrief(false); setIntentPhase("editing"); setVisibleRequirements(0); setConfirmed([]); setSelectedMillId(featuredProduct.shortlistMillIds[0] ?? mills[0].id); setFilterOpen(false); setEvidenceOnly(false); setRequestState("draft"); setSampleState("not_requested"); setSavedNotes(false); setMapped(false); setPublished(false); setDataUploaded(false); setEvidenceOpen(null); setDetailOpen(null); setWorkspaceOpen(false); setNotificationsOpen(false);
  }

  function nextStep() {
    if (mode === "mill") { const idx = millSteps.findIndex((x) => x.id === millStep); setMillStep(millSteps[Math.min(idx + 1, millSteps.length - 1)].id); return; }
    setBrandStep(brandSteps[Math.min(stepIndex + 1, brandSteps.length - 1)].id);
  }

  return <div className={`cd-shell ${mode === "mill" ? "mill" : ""}`}>
    <Header mode={mode} setMode={(m) => { setMode(m); setWorkspaceOpen(false); setNotificationsOpen(false); }} activeMill={mill} workspaceOpen={workspaceOpen} setWorkspaceOpen={setWorkspaceOpen} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen}/>
    {mode === "brand" ? <>
      <nav className="cd-lifecycle">{brandSteps.map((s, i) => <button key={s.id} className={brandStep === s.id ? "active" : ""} onClick={() => setBrandStep(s.id)}><span>{String(i + 1).padStart(2, "0")}</span>{s.label}</button>)}</nav>
      <div className="cd-demo-banner"><div><span>Customer demo mode</span><b>Step {stepIndex + 1} of {brandSteps.length}</b><small>Stage gates now show Fruma analysing, structuring and searching rather than jumping instantly.</small></div><div><button className="cd-secondary" onClick={resetDemo}>Reset demo</button><button className="cd-primary" onClick={nextStep}>Next step <ArrowRight size={14}/></button></div></div>
      {brandStep === "intent" ? <Intent product={product} setProductId={chooseProduct} brief={brief} setBrief={(v) => { setBrief(v); setSavedBrief(false); setIntentPhase("editing"); setVisibleRequirements(0); }} saved={savedBrief} phase={intentPhase} visibleRequirements={visibleRequirements} onSave={saveAndStructureBrief} go={setBrandStep}/> : null}
      {brandStep === "concept" ? <main className="cd-main"><div className="cd-page-head"><div><p>02 · Visual product intent</p><h1>Turn the idea into something a factory can respond to.</h1><span>{product.name} · upload a sketch, generate a development concept and attach it to the request.</span></div></div><ProductConceptLab/><div className="cd-actions end"><button className="cd-primary" onClick={() => setBrandStep("check")}>Continue to requirements <ArrowRight size={14}/></button></div></main> : null}
      {brandStep === "check" ? <CheckStep product={product} confirmed={confirmed} setConfirmed={setConfirmed} go={setBrandStep}/> : null}
      {brandStep === "source" ? <SourceStep product={product} selectedMillId={selectedMillId} setSelectedMillId={setSelectedMillId} filterOpen={filterOpen} setFilterOpen={setFilterOpen} evidenceOnly={evidenceOnly} setEvidenceOnly={setEvidenceOnly} go={setBrandStep}/> : null}
      {brandStep === "confirm" ? <ConfirmStep product={product} mill={mill} requestState={requestState} setRequestState={setRequestState} setMode={setMode} go={setBrandStep}/> : null}
      {brandStep === "development" ? <DevelopmentStep product={product} mill={mill} sampleState={sampleState} setSampleState={setSampleState} setMode={setMode} notes={notes} setNotes={setNotes} savedNotes={savedNotes} setSavedNotes={setSavedNotes} go={setBrandStep}/> : null}
      {brandStep === "standardise" ? <StandardiseStep product={product} mapped={mapped} setMapped={setMapped} published={published} setPublished={setPublished} go={setBrandStep}/> : null}
      {brandStep === "ready" ? <ReadyStep product={product}/> : null}
    </> : <MillWorkspace step={millStep} setStep={setMillStep} product={product} mill={mill} requestState={requestState} setRequestState={setRequestState} sampleState={sampleState} setSampleState={setSampleState} dataUploaded={dataUploaded} setDataUploaded={setDataUploaded} evidenceOpen={evidenceOpen} setEvidenceOpen={setEvidenceOpen} detailOpen={detailOpen} setDetailOpen={setDetailOpen} setMode={setMode}/>} 
  </div>;
}
