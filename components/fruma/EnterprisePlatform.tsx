"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  CircleCheck,
  FileText,
  Filter,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  MessageSquare,
  Moon,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";
import { demoBrands, featuredProduct, mills, products, requests, type Mill, type Product } from "@/lib/fruma/demo-data";

type BrandScreen = "intent" | "check" | "source" | "confirm" | "suppliers";
type Mode = "brand" | "mill";

const brandScreens: { id: BrandScreen; label: string }[] = [
  { id: "intent", label: "Intent" },
  { id: "check", label: "Check" },
  { id: "source", label: "Source" },
  { id: "confirm", label: "Confirm" },
  { id: "suppliers", label: "Suppliers" },
];

const money = (value: number, currency = "USD") => `${currency} ${value.toFixed(2)}`;

function BrandTopbar({ screen, setScreen }: { screen: BrandScreen; setScreen: (screen: BrandScreen) => void }) {
  return (
    <header className="ep-topbar">
      <div className="ep-wordmark">FRUMA</div>
      <button className="ep-workspace">{demoBrands[0].name}<ChevronDown size={14} /></button>
      <nav>{brandScreens.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}>{item.label}</button>)}</nav>
      <div className="ep-top-actions"><button aria-label="Notifications"><Bell size={16}/></button><div className="ep-avatar">AR</div></div>
    </header>
  );
}

function ProductRail({ product }: { product: Product }) {
  const items = ["Overview", "Product Brief", "Inspiration", "Targets", "Bill of Materials", "Development Notes"];
  const memory = ["Previous Cases", "Saved Searches", "Supplier Shortlist"];
  return (
    <aside className="ep-rail">
      <p className="ep-rail-label">Product case</p>
      {items.map((item, i) => <button key={item} className={i === 0 ? "active" : ""}><span>{i === 0 ? "◫" : "○"}</span>{item}</button>)}
      <p className="ep-rail-label second">Memory</p>
      {memory.map((item) => <button key={item}><span>○</span>{item}</button>)}
      <div className="ep-rail-spacer" />
      <button><HelpCircle size={14}/>Help</button>
      <div className="ep-case-mini"><span>{product.sku}</span><b>{product.season}</b></div>
    </aside>
  );
}

function PageHead({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="ep-page-head"><div>{eyebrow && <p className="ep-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function IntentScreen({ product, setProduct }: { product: Product; setProduct: (product: Product) => void }) {
  const options = [featuredProduct, ...products.slice(0, 14)];
  return (
    <div className="ep-with-rail"><ProductRail product={product}/><main className="ep-main ep-intent-main">
      <PageHead title="New Product Case" copy="Define what you are building, capture commercial targets, and turn the brief into a traceable sourcing case." action={<div className="ep-head-actions"><span>Case ID: FR-{product.id.replace(/\D/g, "").slice(-4) || "0008"}</span><button className="ep-primary">Save case</button></div>}/>
      <div className="ep-form-grid four">
        <label>Working product<select value={product.id} onChange={(e) => setProduct(options.find((p) => p.id === e.target.value) ?? featuredProduct)}>{options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Category<input value={product.category} readOnly/></label>
        <label>Season<input value={product.season} readOnly/></label>
        <label>Target quantity<input value="3,000 pcs" readOnly/></label>
        <label>Target cost (FOB)<input value="USD 6.50" readOnly/></label>
        <label>Target margin<input value="55%" readOnly/></label>
        <label>Target retail<input value="USD 39.00" readOnly/></label>
        <label>Target ship date<input value="15 May 2027" readOnly/></label>
      </div>
      <div className="ep-intent-grid">
        <section className="ep-card ep-brief-card"><div className="ep-card-head"><h2>Product brief</h2><span>Source truth</span></div><textarea value={product.intent} readOnly/><h3>Key requirements</h3><div className="ep-chip-wrap">{product.requirements.slice(0, 6).map((r) => <span key={r.key} className="ep-chip"><CircleCheck size={12}/>{r.value}</span>)}</div></section>
        <section className="ep-upload"><ImageIcon size={26}/><b>Drag & drop images</b><span>or click to upload</span></section>
      </div>
      <section className="ep-inspiration"><div className="ep-section-title"><h2>Inspiration <span>(3)</span></h2><button>View all</button></div><div className="ep-image-row"><div/><div/><div/></div></section>
    </main></div>
  );
}

function CheckScreen({ product }: { product: Product }) {
  return <main className="ep-main ep-full-main"><PageHead title="Product Truth" copy="Verified knowledge from trusted public and private sources, with uncertainty kept visible." action={<div className="ep-success"><CircleCheck size={15}/>Sufficient coverage</div>}/>
    <div className="ep-tabs"><button className="active">Overview</button><button>Materials</button><button>Construction</button><button>Compliance</button><button>Markets</button><button>Benchmarks</button></div>
    <div className="ep-truth-grid">
      <section className="ep-card ep-tall"><div className="ep-card-head"><h2>Material</h2><span className="ep-verified">Verified</span></div><h3>{product.requirements[0]?.value ?? "Cotton"}</h3><p>Best for: soft handfeel, breathability, dyeability. Evidence combines mill records and internal benchmark history.</p><button className="ep-text-button">View evidence</button><div className="ep-divider"/><div className="ep-card-head"><h2>GSM</h2><span className="ep-verified">Verified</span></div><h3>180–200 GSM</h3><p>Optimal range for a refined jersey or knit product within this brief.</p><button className="ep-text-button">View evidence</button></section>
      <section className="ep-card"><div className="ep-card-head"><h2>Cost benchmarks (FOB)</h2></div><div className="ep-benchmark"><div><span>Good</span><b>$5.20–$6.30</b></div><div><span>Better</span><b>$6.30–$7.80</b></div><div><span>Best</span><b>$7.80–$9.50</b></div><div className="target"><span>Your target</span><b>$6.50</b></div></div></section>
      <section className="ep-card"><div className="ep-card-head"><h2>Construction</h2><span className="ep-verified">Verified</span></div><h3>{product.requirements[1]?.value ?? "Single jersey"}</h3><p>Common for this category. Stable with a soft drape and compatible with the target use.</p><button className="ep-text-button">View evidence</button></section>
      <section className="ep-card"><div className="ep-card-head"><h2>Compliance</h2></div><div className="ep-compliance">{["OEKO-TEX Standard 100", "REACH", "AZO Dyes Restricted"].map((x) => <div key={x}><span>{x}</span><span className="ep-verified">Verified</span></div>)}</div><button className="ep-text-button">View all (6)</button></section>
    </div>
  </main>;
}

function rankMills(product: Product) {
  const shortlisted = product.shortlistMillIds.map((id) => mills.find((m) => m.id === id)).filter(Boolean) as Mill[];
  const extras = mills.filter((m) => !product.shortlistMillIds.includes(m.id) && m.relationship !== "excluded").slice(0, 9);
  return [...shortlisted, ...extras].slice(0, 12);
}

function SourceScreen({ product, selectedMillId, setSelectedMillId, setScreen }: { product: Product; selectedMillId: string; setSelectedMillId: (id: string) => void; setScreen: (s: BrandScreen) => void }) {
  const candidates = useMemo(() => rankMills(product), [product]);
  return <main className="ep-main ep-full-main"><PageHead title="Source" copy="Search the network for this exact product, compare current capability and evidence, then shortlist with confidence."/>
    <div className="ep-source-toolbar"><div className="ep-filter-pills">{["Best Overall", "Cost", "Quality", "Delivery", "Sustainability"].map((x, i) => <button key={x} className={i === 0 ? "active" : ""}>{x}</button>)}</div><div><button className="ep-secondary"><Filter size={14}/>Filters</button><button className="ep-secondary"><FileText size={14}/>Save search</button></div></div>
    <div className="ep-result-summary"><b>{candidates.length} matching results</b><span>Sorted by Best Overall <ChevronDown size={13}/></span></div>
    <div className="ep-source-grid">{candidates.slice(0, 6).map((mill, index) => { const score = Math.max(72, Math.min(97, mill.evidenceCoverage + (mill.relationship === "preferred" ? 4 : 0) - mill.staleEvidence * 2)); return <article className={`ep-supplier-result ${selectedMillId === mill.id ? "selected" : ""}`} key={mill.id}><div className="ep-result-top"><span className="ep-score">{score}</span><span>Best Overall</span><button aria-label="Favourite"><Heart size={16}/></button></div><h2>{mill.name}</h2><p>{mill.region}, {mill.country}</p><dl><div><dt>FOB price</dt><dd>{money(5.9 + index * .37)}</dd></div><div><dt>MOQ</dt><dd>{mill.moq.toLocaleString()} m</dd></div><div><dt>Lead time</dt><dd>{mill.leadWeeks * 7} days</dd></div></dl><div className="ep-match"><span>Match</span><div><i style={{width:`${score}%`}}/></div><b>{score}%</b></div><div className="ep-mini-tags">{mill.specialties.slice(0, 3).map((x) => <span key={x}>{x}</span>)}</div><button className="ep-result-action" onClick={() => { setSelectedMillId(mill.id); setScreen("confirm"); }}>View details</button></article>})}</div>
  </main>;
}

function ConfirmScreen({ product, mill }: { product: Product; mill: Mill }) {
  const [sampleRequested, setSampleRequested] = useState(false);
  return <main className="ep-main ep-full-main"><PageHead title="Confirm & Transact" copy="Review the selected supplier, validate the configuration, request samples, and move toward a commercial decision."/>
    <div className="ep-confirm-top">
      <section className="ep-card"><div className="ep-card-head"><h2>Selected supplier</h2><span className="ep-score small">95 Match</span></div><h3>{mill.name}</h3><p>{mill.region}, {mill.country}</p><dl className="ep-detail-list"><div><dt>FOB price</dt><dd>USD 6.40</dd></div><div><dt>MOQ</dt><dd>{mill.moq.toLocaleString()} m</dd></div><div><dt>Lead time</dt><dd>{mill.leadWeeks * 7} days</dd></div><div><dt>Payment terms</dt><dd>30% deposit / 70% before shipment</dd></div><div><dt>Certifications</dt><dd>{mill.certifications.join(", ")}</dd></div></dl><button className="ep-secondary full">View supplier profile</button></section>
      <section className="ep-card"><div className="ep-card-head"><h2>Your configuration</h2></div><dl className="ep-detail-list">{product.requirements.slice(0, 5).map((r) => <div key={r.key}><dt>{r.key}</dt><dd>{r.value}</dd></div>)}<div><dt>Target ship date</dt><dd>15 May 2027</dd></div></dl><button className="ep-secondary full">Edit configuration</button></section>
      <section className="ep-card"><div className="ep-card-head"><h2>Next steps</h2></div><div className="ep-steps">{["Request sample", "Supplier confirms", "Sample in transit", "Sample review", "Negotiate & confirm", "Place order"].map((x, i) => <div key={x} className={i < (sampleRequested ? 2 : 1) ? "done" : i === (sampleRequested ? 2 : 1) ? "current" : ""}><span>{i < (sampleRequested ? 2 : 1) ? "✓" : i + 1}</span>{x}</div>)}</div></section>
    </div>
    <div className="ep-confirm-bottom"><section className="ep-card"><h2>Request sample</h2><p>Your request will be sent to {mill.name}. They will confirm availability and ship samples to your workspace.</p><button className="ep-primary full" onClick={() => setSampleRequested(true)}>{sampleRequested ? "Sample requested" : "Request sample"}</button></section><section className="ep-card"><h2>Internal notes <span>(private)</span></h2><textarea placeholder="Add notes for your team…"/><button className="ep-secondary">Save note</button></section></div>
  </main>;
}

function SuppliersScreen() {
  const list = mills.filter((m) => m.relationship !== "excluded").slice(0, 12);
  return <main className="ep-main ep-full-main"><PageHead title="Suppliers & Memory" copy="Your private supplier relationships, sourcing history, and institutional knowledge in one place." action={<button className="ep-primary">Add supplier</button>}/>
    <div className="ep-tabs supplier-tabs"><button className="active">All suppliers</button><button>Shortlist</button><button>Working with</button><button>Past</button><button>Blocked</button></div>
    <div className="ep-search-row"><div><Search size={14}/><input placeholder="Search suppliers…"/></div></div>
    <div className="ep-table-wrap"><table className="ep-table"><thead><tr><th>Supplier</th><th>Location</th><th>Category</th><th>Last engaged</th><th>Status</th><th>Score</th></tr></thead><tbody>{list.map((m, i) => <tr key={m.id}><td><b>{m.name}</b></td><td>{m.region}, {m.country}</td><td>{m.specialties[0]}</td><td>{i < 2 ? `${i + 1} week ago` : `${i + 1} weeks ago`}</td><td><span className={`ep-status ${m.relationship}`}>{m.relationship === "preferred" ? "Working with" : m.relationship === "proven" ? "Shortlisted" : "Past"}</span></td><td><b>{Math.max(71, m.evidenceCoverage)}</b></td></tr>)}</tbody></table></div>
    <section className="ep-memory"><div><p className="ep-eyebrow">Memory insights</p><h2>Your network with context.</h2><p>Relationships and evidence compound over time instead of resetting with every sourcing case.</p></div><div className="ep-memory-stats"><div><span>Active relationships</span><b>7</b></div><div><span>Completed orders</span><b>18</b></div><div><span>Total volume</span><b>152,300 pcs</b></div><div><span>Preferred categories</span><b>Knit, Woven</b></div></div></section>
  </main>;
}

function BrandApp() {
  const [screen, setScreen] = useState<BrandScreen>("intent");
  const [product, setProduct] = useState<Product>(featuredProduct);
  const [selectedMillId, setSelectedMillId] = useState(product.shortlistMillIds[0] ?? mills[0].id);
  const selectedMill = mills.find((m) => m.id === selectedMillId) ?? mills[0];
  return <div className="ep-app brand"><BrandTopbar screen={screen} setScreen={setScreen}/>{screen === "intent" && <IntentScreen product={product} setProduct={(p) => { setProduct(p); setSelectedMillId(p.shortlistMillIds[0] ?? mills[0].id); }}/>} {screen === "check" && <CheckScreen product={product}/>} {screen === "source" && <SourceScreen product={product} selectedMillId={selectedMillId} setSelectedMillId={setSelectedMillId} setScreen={setScreen}/>} {screen === "confirm" && <ConfirmScreen product={product} mill={selectedMill}/>} {screen === "suppliers" && <SuppliersScreen/>}</div>;
}

function MillApp() {
  const mill = mills[3];
  const millRequests = requests.filter((r) => r.millId === mill.id).slice(0, 8);
  const rows = millRequests.length ? millRequests : requests.slice(0, 8);
  return <div className="ep-app mill"><header className="ep-topbar ep-mill-top"><div className="ep-wordmark">FRUMA</div><button className="ep-workspace dark">{mill.name}<ChevronDown size={14}/></button><nav><button className="active">Requests</button><button>Samples</button><button>Orders</button><button>Messages</button><button>Account</button></nav><div className="ep-top-actions"><button><Bell size={16}/></button><div className="ep-avatar dark">PT</div></div></header><div className="ep-mill-layout"><aside className="ep-mill-rail"><p className="ep-rail-label">Overview</p>{["Requests", "Samples", "Orders", "Messages"].map((x, i) => <button className={i === 0 ? "active" : ""} key={x}>{i === 0 ? <FileText size={14}/> : i === 3 ? <MessageSquare size={14}/> : <CircleCheck size={14}/>}<span>{x}</span><em>{[6,3,2,0][i]}</em></button>)}<p className="ep-rail-label second">Tools</p>{["Capacity calendar", "Price calculator", "Library"].map((x) => <button key={x}><SlidersHorizontal size={14}/><span>{x}</span></button>)}<div className="ep-rail-spacer"/><button><Settings size={14}/><span>Settings</span></button><button><HelpCircle size={14}/><span>Help</span></button></aside><main className="ep-mill-main"><PageHead title="Incoming Requests" copy="Brands are looking for products you can make." action={<button className="ep-dark-button"><Filter size={14}/>Filter</button>}/><div className="ep-dark-table"><table><thead><tr><th>Request</th><th>Product</th><th>Quantity</th><th>Target price</th><th>Requested</th><th>Status</th></tr></thead><tbody>{rows.map((r, i) => {const p = products.find((x) => x.id === r.productId) ?? products[i]; return <tr key={r.id}><td>{r.id.toUpperCase()}</td><td><b>{p?.name ?? "Product"}</b></td><td>{r.volume.replace("m", " pcs")}</td><td>{r.quotedPrice ? `${r.currency} ${r.quotedPrice.toFixed(2)}` : `USD ${(5.6 + i * .4).toFixed(2)}`}</td><td>{i < 2 ? `${i + 2}h ago` : `${i}d ago`}</td><td><span className={`ep-dark-status ${r.status}`}>{r.status === "answered" ? "Quoted" : r.status === "sent" ? "New" : r.status === "declined" ? "Declined" : "In review"}</span></td></tr>})}</tbody></table></div><div className="ep-mill-stats"><div><span>Response rate</span><b>92%</b><small>Last 30 days</small></div><div><span>Requests this week</span><b>18</b><small>+12% vs last week</small></div><div><span>Quotes sent</span><b>11</b><small>This month</small></div><div><span>Orders won</span><b>4</b><small>This month</small></div></div></main></div></div>;
}

export function EnterprisePlatform() {
  const [mode, setMode] = useState<Mode>("brand");
  return <><div className="ep-mode-switch"><button className={mode === "brand" ? "active" : ""} onClick={() => setMode("brand")}><Sun size={14}/>Brand</button><button className={mode === "mill" ? "active" : ""} onClick={() => setMode("mill")}><Moon size={14}/>Mill</button></div>{mode === "brand" ? <BrandApp/> : <MillApp/>}</>;
}
