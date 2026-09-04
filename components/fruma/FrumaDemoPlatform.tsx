"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Database,
  FileCheck2,
  FileText,
  Home,
  Inbox,
  MapPinned,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { CustomerDemoPlatform } from "@/components/fruma/CustomerDemoPlatform";
import { mills, products, requests } from "@/lib/fruma/demo-data";

type SetupStage = "profile" | "file" | "map" | "review" | "workspace" | "brand";
type FactoryView = "home" | "requests" | "book" | "data" | "evidence" | "samples" | "orders" | "messages";

const mappingRows = [
  ["Article", "quality.article_code", "SYN-QA-100", "SYN-QA-100", "Direct"],
  ["Construction", "material.construction", "S/J 30/1", "Single jersey 30/1", "Normalised"],
  ["Composition", "material.fibre_composition", "100% CO", "100% cotton", "Normalised"],
  ["Weight", "material.weight_gsm", "185gr", "185 gsm", "Unit normalised"],
  ["Width", "material.width_cm", "160cm", "160 cm", "Unit normalised"],
  ["Colour", "product.colour", "Navy", "Navy", "Direct"],
  ["MOQ", "commercial.moq_m", "150M", "150 m", "Commercial"],
  ["Cert", "evidence.certification", "OEKO-TEX", "Needs evidence review", "Evidence required"],
];

const factoryNav: { id: FactoryView; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "requests", label: "Requests" },
  { id: "book", label: "Book" },
  { id: "data", label: "Data" },
  { id: "evidence", label: "Evidence" },
  { id: "samples", label: "Samples" },
  { id: "orders", label: "Orders" },
  { id: "messages", label: "Messages" },
];

export function FrumaDemoPlatform() {
  const [stage, setStage] = useState<SetupStage>("profile");
  const [profileSaved, setProfileSaved] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [mappingAccepted, setMappingAccepted] = useState(false);
  const [factoryView, setFactoryView] = useState<FactoryView>("home");
  const activeMill = mills[3] ?? mills[0];

  if (stage === "brand") return <CustomerDemoPlatform />;

  if (stage === "workspace") {
    return <FactoryWorkspace view={factoryView} setView={setFactoryView} activeMill={activeMill} onBrand={() => setStage("brand")} onSetup={() => setStage("data")} />;
  }

  const steps = [
    ["profile", "1. Factory profile"],
    ["file", "2. Upload data"],
    ["map", "3. Map to Fruma Standard"],
    ["review", "4. Review & lock"],
  ] as const;

  return <div className="cd-shell mill">
    <header className="cd-topbar mill"><div className="cd-wordmark">FRUMA</div><div className="cd-workspace">New factory setup</div><div/><div className="cd-avatar">VM</div></header>
    <main className="cd-main dark">
      <div className="cd-page-head"><div><p>Factory onboarding</p><h1>Set up the factory before entering Fruma.</h1><span>A new factory first establishes its profile, uploads its own working data, maps that language to the Fruma Standard, reviews the result and locks the setup. Only then does the operating workspace unlock.</span></div></div>
      <div className="fx-data-steps">{steps.map(([id, label]) => <div key={id} className={stage === id || (id === "profile" && profileSaved) || (id === "file" && fileLoaded) || (id === "map" && mappingAccepted) ? "active" : ""}><span>{label}</span><b>{stage === id ? "In progress" : id === "profile" && profileSaved || id === "file" && fileLoaded || id === "map" && mappingAccepted ? "Complete" : "Locked"}</b></div>)}</div>

      {stage === "profile" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 1</p><h2>Factory profile</h2><label>Factory name<input defaultValue="Vale do Ave Textile Works"/></label><label>Location<input defaultValue="Famalicão, Portugal"/></label><label>Core capabilities<input defaultValue="Jersey, interlock, pique, technical cotton"/></label><label>Typical MOQ<input defaultValue="150–600 metres"/></label><label>Lead-time range<input defaultValue="5–9 weeks"/></label><button className="cd-primary full" onClick={() => { setProfileSaved(true); setStage("file"); }}><Check size={14}/> Save factory profile</button></section><section className="cd-card dark"><p className="cd-eyebrow">Why this matters</p><h2>Identity before discovery.</h2><p>The factory is not searchable yet. Profile data gives Fruma context, but the factory's own quality book still has to be ingested, mapped and reviewed before matching can use it.</p></section></div> : null}

      {stage === "file" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 2</p><h2>Upload the factory working file</h2><p>Use the seeded hanger list or upload the factory's own file. The original source rows are retained exactly as supplied.</p><a className="cd-secondary full" href="/demo/sample-mill-hanger.csv" download><FileText size={14}/> Download sample hanger CSV</a><button className="cd-primary full" onClick={() => setFileLoaded(true)}><Upload size={14}/> Load sample-mill-hanger.csv</button>{fileLoaded ? <div className="cd-success"><Check size={14}/> 4 source rows received · original values preserved</div> : null}<button className="cd-primary full" disabled={!fileLoaded} onClick={() => setStage("map")}>Continue to mapping <ArrowRight size={14}/></button></section><section className="cd-card dark"><p className="cd-eyebrow">Source preview</p><h2>Factory language stays visible</h2><div className="cd-line"><b>Article</b><span>SYN-QA-100</span></div><div className="cd-line"><b>Construction</b><span>S/J 30/1</span></div><div className="cd-line"><b>Composition</b><span>100% CO</span></div><div className="cd-line"><b>Weight</b><span>185gr</span></div><div className="cd-line"><b>Width</b><span>160cm</span></div></section></div> : null}

      {stage === "map" ? <section className="cd-card dark"><div className="cd-standard-head"><div><p className="cd-eyebrow">Step 3</p><h2>Factory source → Fruma Standard</h2><p>This is the critical transformation: source field, source value, canonical field and canonical interpretation are all visible together.</p></div></div><div className="cd-table-head map"><span>Factory field</span><span>Source value</span><span>Fruma field</span><span>Canonical value</span><span>Status</span></div>{mappingRows.map((r, i) => <div className="cd-table-row map" key={r[0]}><b>{r[0]}</b><span>{r[2]}</span><code>{r[1]}</code><span>{r[3]}</span><small>{mappingAccepted ? "Reviewed" : i < 6 ? r[4] : "Needs review"}</small></div>)}<div className="cd-actions end"><button className="cd-primary" onClick={() => { setMappingAccepted(true); setStage("review"); }}><MapPinned size={14}/> Review & accept mappings</button></div></section> : null}

      {stage === "review" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 4</p><h2>Review and lock the factory record</h2><div className="cd-success"><Check size={14}/> 8 fields mapped with source lineage preserved</div><div className="cd-line"><b>Factory profile</b><span>Confirmed</span></div><div className="cd-line"><b>Source file</b><span>sample-mill-hanger.csv</span></div><div className="cd-line"><b>Reusable mapping</b><span>Reviewed</span></div><div className="cd-line"><b>Commercial terms</b><span>Mapped but freshness-aware</span></div><div className="cd-line"><b>Evidence claim</b><span>Requires scoped document review</span></div><button className="cd-primary full" onClick={() => { setFactoryView("home"); setStage("workspace"); }}><FileCheck2 size={14}/> Lock setup & enter factory home</button></section><section className="cd-card dark"><Database size={24}/><h2>What locking unlocks</h2><p>The factory quality book becomes searchable, future files can reuse confirmed mappings, sourcing requests can be matched against mapped qualities, and evidence can be attached with explicit scope and validity.</p></section></div> : null}
    </main>
  </div>;
}

function FactoryWorkspace({ view, setView, activeMill, onBrand, onSetup }: { view: FactoryView; setView: (v: FactoryView) => void; activeMill: typeof mills[number]; onBrand: () => void; onSetup: () => void }) {
  return <div className="cd-shell mill">
    <header className="cd-topbar mill"><div className="cd-wordmark">FRUMA</div><div className="cd-workspace">{activeMill.name}</div><div/><div className="cd-top-actions"><button className="cd-secondary" onClick={onBrand}>Brand demo</button><div className="cd-avatar">VM</div></div></header>
    <nav className="cd-subnav">{factoryNav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</nav>
    {view === "home" ? <FactoryHome setView={setView} onBrand={onBrand}/> : view === "requests" ? <FactoryRequests activeMill={activeMill}/> : view === "book" ? <FactoryBook activeMill={activeMill}/> : view === "data" ? <FactoryData onSetup={onSetup}/> : view === "evidence" ? <FactoryEvidence activeMill={activeMill}/> : <FactorySimple view={view}/>}
  </div>;
}

function FactoryHome({ setView, onBrand }: { setView: (v: FactoryView) => void; onBrand: () => void }) {
  return <main className="cd-main dark"><div className="cd-page-head"><div><p>Factory home</p><h1>Your factory is live in Fruma.</h1><span>The first mapping is locked, the source book is searchable and the normal operating workspace is now available.</span></div><button className="cd-secondary" onClick={onBrand}>See the connected brand journey</button></div><div className="cd-grid two"><section className="cd-card dark"><div className="cd-success"><Check size={14}/> Setup complete</div><h2>Factory readiness</h2><div className="cd-line"><b>Mapped qualities</b><span>16 searchable</span></div><div className="cd-line"><b>Source preserved</b><span>100%</span></div><div className="cd-line"><b>Current evidence</b><span>8 records</span></div><div className="cd-line"><b>Open requests</b><span>6 matched cases</span></div></section><section className="cd-card dark"><p className="cd-eyebrow">Start work</p><h2>What the factory does next</h2><button className="cd-secondary full" onClick={() => setView("requests")}><Inbox size={14}/> Open incoming requests</button><button className="cd-secondary full" onClick={() => setView("book")}><BookOpen size={14}/> Review mapped quality book</button><button className="cd-secondary full" onClick={() => setView("evidence")}><ShieldCheck size={14}/> Manage evidence</button></section></div></main>;
}

function FactoryRequests({ activeMill }: { activeMill: typeof mills[number] }) {
  const list = useMemo(() => { const own = requests.filter((r) => r.millId === activeMill.id); return (own.length ? own : requests).slice(0, 8); }, [activeMill.id]);
  return <main className="cd-main dark"><div className="cd-page-head"><div><p>Requests</p><h1>Incoming sourcing cases.</h1><span>Cases are matched against the factory's mapped book and evidence; brand identity remains hidden until the correct transaction point.</span></div></div><section className="cd-card dark"><div className="cd-table-head"><span>Request</span><span>Product</span><span>Status</span><span>Delivery</span><span>Action</span></div>{list.map((r) => { const p = products.find((x) => x.id === r.productId); return <div className="cd-table-row" key={r.id}><b>{r.id}</b><span>{p?.category ?? "Product"}</span><em>{r.status}</em><small>{r.requestedDelivery}</small><button className="cd-secondary">Open</button></div>; })}</section></main>;
}

function FactoryBook({ activeMill }: { activeMill: typeof mills[number] }) {
  const rows = Array.from({ length: 16 }, (_, i) => ({ code: `QA-${String(i + 1).padStart(3, "0")}`, source: ["S/J 30/1", "PIQUE 20/1", "INTERLOCK", "JERSEY 24/1"][i % 4], canonical: ["Single jersey", "Pique", "Interlock", "Jersey"][i % 4], gsm: 160 + (i % 6) * 20, moq: 150 + (i % 4) * 100 }));
  return <main className="cd-main dark"><div className="cd-page-head"><div><p>Mapped factory book</p><h1>Your language and Fruma's language stay side by side.</h1><span>{activeMill.name} keeps its own quality codes while Fruma provides a stable semantic layer for search and matching.</span></div></div><section className="cd-card dark"><div className="cd-table-head"><span>Factory code</span><span>Source construction</span><span>Fruma construction</span><span>Weight</span><span>MOQ</span></div>{rows.map((r) => <div className="cd-table-row" key={r.code}><b>{r.code}</b><span>{r.source}</span><span>{r.canonical}</span><small>{r.gsm} gsm</small><em>{r.moq} m</em></div>)}</section></main>;
}

function FactoryData({ onSetup }: { onSetup: () => void }) {
  return <main className="cd-main dark"><div className="cd-page-head"><div><p>Data</p><h1>Maintain the source → Fruma Standard mapping.</h1><span>The onboarding mapping becomes a reusable data asset rather than a one-off upload screen.</span></div><button className="cd-secondary" onClick={onSetup}>Review original setup mapping</button></div><section className="cd-card dark"><div className="fx-data-steps"><div className="active"><Upload size={18}/><span>Ingest</span><b>3 files</b></div><div className="active"><MapPinned size={18}/><span>Map</span><b>8 fields</b></div><div className="active"><FileCheck2 size={18}/><span>Review</span><b>Complete</b></div><div className="active"><Database size={18}/><span>Publish internally</span><b>Active</b></div></div>{mappingRows.map((r) => <div className="cd-line" key={r[0]}><b>{r[0]}</b><code>{r[1]}</code><span>{r[4]}</span></div>)}</section></main>;
}

function FactoryEvidence({ activeMill }: { activeMill: typeof mills[number] }) {
  return <main className="cd-main dark"><div className="cd-page-head"><div><p>Evidence</p><h1>Claims stay scoped and current.</h1><span>Evidence is managed separately from capability and commercial data so a mapped field cannot silently become a substantiated claim.</span></div></div><div className="cd-supplier-grid">{activeMill.certifications.map((cert, i) => <article className="cd-card dark" key={cert}><ShieldCheck size={22}/><h2>{cert}</h2><p>{i === activeMill.certifications.length - 1 && activeMill.staleEvidence ? "Review due" : "Current"}</p><div className="cd-line"><b>Scope</b><span>Factory site + applicable quality families</span></div><div className="cd-line"><b>Source</b><span>certificate_2026.pdf</span></div><button className="cd-secondary full">Open evidence record</button></article>)}</div></main>;
}

function FactorySimple({ view }: { view: "samples" | "orders" | "messages" }) {
  const content = view === "samples" ? ["3 active sample requests", "2 in transit", "1 awaiting review"] : view === "orders" ? ["4 confirmed orders", "2 production milestones due", "1 shipment this week"] : ["6 active conversations", "2 need a reply", "1 linked to an open sourcing request"];
  const Icon = view === "samples" ? PackageCheck : view === "orders" ? BookOpen : MessageSquare;
  return <main className="cd-main dark"><div className="cd-page-head"><div><p>{view}</p><h1>{view[0].toUpperCase() + view.slice(1)} stay linked to the same product records.</h1></div></div><div className="cd-supplier-grid">{content.map((item) => <article className="cd-card dark" key={item}><Icon size={22}/><h2>{item}</h2><p>Linked records, source context and current state remain available.</p><button className="cd-secondary">Open</button></article>)}</div></main>;
}
