"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  Database,
  FileCheck2,
  FileText,
  Filter,
  Heart,
  Inbox,
  MapPinned,
  MessageSquare,
  PackageCheck,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  demoBrands,
  featuredProduct,
  mills,
  products,
  requests,
  type Mill,
  type Product,
  type Stage,
} from "@/lib/fruma/demo-data";

type Mode = "brand" | "mill";
type BrandScreen = Stage | "range" | "suppliers";
type MillScreen = "requests" | "book" | "data" | "evidence" | "samples" | "orders" | "messages";
type ProductPanel = "overview" | "brief" | "inspiration" | "targets" | "bom" | "development";
type RequestState = "draft" | "sent" | "answered";
type MappingState = "ready" | "mapped" | "published";

const lifecycle: { id: Stage; label: string }[] = [
  { id: "intent", label: "Intent" },
  { id: "check", label: "Check" },
  { id: "source", label: "Source" },
  { id: "confirm", label: "Confirm" },
  { id: "development", label: "Development" },
  { id: "list", label: "List" },
  { id: "live", label: "Live" },
];

const millNav: { id: MillScreen; label: string }[] = [
  { id: "requests", label: "Requests" },
  { id: "book", label: "Book" },
  { id: "data", label: "Data" },
  { id: "evidence", label: "Evidence" },
  { id: "samples", label: "Samples" },
  { id: "orders", label: "Orders" },
  { id: "messages", label: "Messages" },
];

function PageHead({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy: string; action?: React.ReactNode }) {
  return (
    <div className="fx-page-head">
      <div>{eyebrow ? <p className="fx-eyebrow">{eyebrow}</p> : null}<h1>{title}</h1><p>{copy}</p></div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

function ModeSwitch({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return (
    <div className="fx-mode-switch" aria-label="Workspace mode">
      <button className={mode === "brand" ? "active" : ""} onClick={() => setMode("brand")}>Brand</button>
      <button className={mode === "mill" ? "active" : ""} onClick={() => setMode("mill")}>Mill</button>
    </div>
  );
}

function BrandHeader({ screen, setScreen, mode, setMode }: { screen: BrandScreen; setScreen: (screen: BrandScreen) => void; mode: Mode; setMode: (mode: Mode) => void }) {
  return (
    <header className="fx-topbar">
      <button className="fx-wordmark" onClick={() => setScreen("range")}>FRUMA</button>
      <button className="fx-workspace">{demoBrands[0].name}<ChevronDown size={14}/></button>
      <nav className="fx-main-nav">
        <button className={screen === "range" ? "active" : ""} onClick={() => setScreen("range")}>Range</button>
        <button className={lifecycle.some((x) => x.id === screen) ? "active" : ""} onClick={() => setScreen("intent")}>Products</button>
        <button className={screen === "suppliers" ? "active" : ""} onClick={() => setScreen("suppliers")}>Suppliers</button>
      </nav>
      <div className="fx-top-actions"><ModeSwitch mode={mode} setMode={setMode}/><button aria-label="Notifications"><Bell size={16}/></button><div className="fx-avatar">AR</div></div>
    </header>
  );
}

function LifecycleBar({ screen, setScreen }: { screen: BrandScreen; setScreen: (screen: BrandScreen) => void }) {
  if (!lifecycle.some((x) => x.id === screen)) return null;
  return <div className="fx-lifecycle">{lifecycle.map((item, index) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</button>)}</div>;
}

function ProductRail({ product, panel, setPanel }: { product: Product; panel: ProductPanel; setPanel: (panel: ProductPanel) => void }) {
  const items: { id: ProductPanel; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "brief", label: "Product Brief" },
    { id: "inspiration", label: "Inspiration" },
    { id: "targets", label: "Targets" },
    { id: "bom", label: "Bill of Materials" },
    { id: "development", label: "Development Notes" },
  ];
  return <aside className="fx-rail"><p className="fx-rail-label">Product case</p>{items.map((item) => <button key={item.id} className={panel === item.id ? "active" : ""} onClick={() => setPanel(item.id)}>{item.label}</button>)}<div className="fx-rail-spacer"/><div className="fx-case-mini"><span>{product.sku}</span><b>{product.season}</b></div></aside>;
}

function ProductPanelView({ panel, product }: { panel: ProductPanel; product: Product }) {
  if (panel === "brief") return <section className="fx-panel-detail"><h2>Product brief</h2><p>{product.intent}</p><div className="fx-chip-row">{product.requirements.slice(0, 6).map((r) => <span key={r.key}>{r.key}: {r.value}</span>)}</div></section>;
  if (panel === "inspiration") return <section className="fx-panel-detail"><h2>Inspiration</h2><p>Visual references stay attached to the case as source material, not confirmed product facts.</p><div className="fx-inspiration-grid"><div/><div/><div/></div></section>;
  if (panel === "targets") return <section className="fx-panel-detail"><h2>Commercial targets</h2><div className="fx-kpi-grid"><div><span>Target quantity</span><b>3,000 pcs</b></div><div><span>FOB target</span><b>USD 6.50</b></div><div><span>Retail target</span><b>USD 39.00</b></div><div><span>Margin</span><b>55%</b></div></div></section>;
  if (panel === "bom") return <section className="fx-panel-detail"><h2>Bill of materials</h2>{product.requirements.slice(0, 5).map((r) => <div className="fx-line" key={r.key}><b>{r.key}</b><span>{r.value}</span><em>{r.priority}</em></div>)}</section>;
  if (panel === "development") return <section className="fx-panel-detail"><h2>Development notes</h2><textarea defaultValue="Proto review: preserve dry handfeel and structure. Confirm shade under daylight before bulk approval."/><button className="fx-secondary">Save notes</button></section>;
  return <section className="fx-panel-detail"><h2>Case overview</h2><p>{product.name} is currently at <b>{product.stage}</b>. The sourcing record carries requirements, candidate mills and evidence forward without changing source meaning.</p><div className="fx-kpi-grid"><div><span>Requirements</span><b>{product.requirements.length}</b></div><div><span>Shortlisted mills</span><b>{product.shortlistMillIds.length}</b></div><div><span>Category</span><b>{product.category}</b></div><div><span>Season</span><b>{product.season}</b></div></div></section>;
}

function RangeScreen({ setProduct, setScreen }: { setProduct: (product: Product) => void; setScreen: (screen: BrandScreen) => void }) {
  return <main className="fx-main"><PageHead eyebrow="Brand range" title="Products in motion." copy="Open any seeded product and continue from its current lifecycle stage."/><div className="fx-table-card"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Season</th><th>Stage</th><th/></tr></thead><tbody>{products.slice(0, 28).map((p) => <tr key={p.id} onClick={() => { setProduct(p); setScreen(p.stage); }}><td><b>{p.name}</b></td><td>{p.sku}</td><td>{p.category}</td><td>{p.season}</td><td><span className="fx-status">{p.stage}</span></td><td><ArrowRight size={14}/></td></tr>)}</tbody></table></div></main>;
}

function IntentScreen({ product, setProduct, panel, setPanel, setScreen }: { product: Product; setProduct: (product: Product) => void; panel: ProductPanel; setPanel: (panel: ProductPanel) => void; setScreen: (screen: BrandScreen) => void }) {
  const options = [featuredProduct, ...products.slice(0, 20)];
  return <div className="fx-with-rail"><ProductRail product={product} panel={panel} setPanel={setPanel}/><main className="fx-main"><PageHead title="Product intent" copy="Start with what the brand is trying to make, then structure it into requirements Fruma can test and source." action={<button className="fx-primary" onClick={() => setScreen("check")}>Build requirement contract <ArrowRight size={14}/></button>}/><div className="fx-form-grid"><label>Working product<select value={product.id} onChange={(e) => setProduct(options.find((p) => p.id === e.target.value) ?? featuredProduct)}>{options.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label>Category<input readOnly value={product.category}/></label><label>Season<input readOnly value={product.season}/></label><label>Target ship date<input readOnly value="15 May 2027"/></label></div><ProductPanelView panel={panel} product={product}/></main></div>;
}

function CheckScreen({ product, setScreen }: { product: Product; setScreen: (screen: BrandScreen) => void }) {
  const tabs = ["Overview", "Materials", "Construction", "Compliance", "Markets", "Benchmarks"];
  const [tab, setTab] = useState("Overview");
  return <main className="fx-main"><PageHead title="Product truth" copy="Every requirement keeps priority, answerability and evidence state visible." action={<button className="fx-primary" onClick={() => setScreen("source")}>Source eligible mills <ArrowRight size={14}/></button>}/><div className="fx-tabs">{tabs.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</div><section className="fx-card"><div className="fx-card-head"><h2>{tab}</h2><span><CircleCheck size={13}/> Source-linked</span></div>{product.requirements.map((r) => <div className="fx-contract-row" key={r.key}><b>{r.key}</b><span>{r.value}</span><em>{r.priority}</em><small>{r.answerability}</small></div>)}</section></main>;
}

function rankedMills(product: Product) {
  const first = product.shortlistMillIds.map((id) => mills.find((m) => m.id === id)).filter(Boolean) as Mill[];
  const extras = mills.filter((m) => !product.shortlistMillIds.includes(m.id) && m.relationship !== "excluded");
  return [...first, ...extras].slice(0, 12);
}

function SourceScreen({ product, selectedMillId, setSelectedMillId, setScreen }: { product: Product; selectedMillId: string; setSelectedMillId: (id: string) => void; setScreen: (screen: BrandScreen) => void }) {
  const [sort, setSort] = useState("Best Overall");
  const [favourites, setFavourites] = useState<string[]>([]);
  const candidates = useMemo(() => rankedMills(product), [product]);
  return <main className="fx-main"><PageHead title="Source" copy="Compare the network against this exact case, keeping current evidence and relationship history visible."/><div className="fx-toolbar"><div className="fx-tabs compact">{["Best Overall", "Cost", "Quality", "Delivery", "Sustainability"].map((x) => <button key={x} className={sort === x ? "active" : ""} onClick={() => setSort(x)}>{x}</button>)}</div><button className="fx-secondary"><Filter size={14}/> Filters</button></div><div className="fx-source-grid">{candidates.slice(0, 8).map((mill, i) => { const score = Math.max(70, Math.min(98, mill.evidenceCoverage + (mill.relationship === "preferred" ? 5 : 0) - mill.staleEvidence * 2)); const fav = favourites.includes(mill.id); return <article className={`fx-supplier ${selectedMillId === mill.id ? "selected" : ""}`} key={mill.id}><div className="fx-card-head"><span className="fx-score">{score}</span><button onClick={() => setFavourites(fav ? favourites.filter((x) => x !== mill.id) : [...favourites, mill.id])} aria-label="Favourite"><Heart size={16} fill={fav ? "currentColor" : "none"}/></button></div><h2>{mill.name}</h2><p>{mill.region}, {mill.country}</p><div className="fx-kpi-grid small"><div><span>MOQ</span><b>{mill.moq.toLocaleString()} m</b></div><div><span>Lead</span><b>{mill.leadWeeks} wks</b></div><div><span>Evidence</span><b>{mill.evidenceCoverage}%</b></div><div><span>Relationship</span><b>{mill.relationship}</b></div></div><div className="fx-chip-row">{mill.specialties.slice(0, 3).map((x) => <span key={x}>{x}</span>)}</div><button className="fx-primary full" onClick={() => { setSelectedMillId(mill.id); setScreen("confirm"); }}>Select & confirm</button></article>; })}</div></main>;
}

function ConfirmScreen({ product, mill, requestState, setRequestState, setScreen }: { product: Product; mill: Mill; requestState: RequestState; setRequestState: (state: RequestState) => void; setScreen: (screen: BrandScreen) => void }) {
  return <main className="fx-main"><PageHead title="Confirm" copy="Turn a likely fit into a current mill response before locking the source."/><div className="fx-two-col"><section className="fx-card"><p className="fx-eyebrow">Anonymous request</p><h2>{product.name}</h2><div className="fx-line"><b>Mill</b><span>{mill.name}</span></div><div className="fx-line"><b>MOQ on file</b><span>{mill.moq} m</span></div><div className="fx-line"><b>Lead on file</b><span>{mill.leadWeeks} weeks</span></div><button className="fx-primary full" onClick={() => setRequestState("sent")}>{requestState === "draft" ? "Send request" : "Request sent"}</button></section><section className="fx-card"><p className="fx-eyebrow">Current response</p>{requestState === "draft" ? <p>Send the request to ask the mill for current commercial terms.</p> : requestState === "sent" ? <><p>The request is open. Historical book data is visible but not treated as a current commitment.</p><button className="fx-secondary" onClick={() => setRequestState("answered")}>Simulate mill response</button></> : <><div className="fx-success"><Check size={14}/> Current offer received</div><div className="fx-line"><b>Price</b><span>EUR 7.90 / m</span></div><div className="fx-line"><b>MOQ</b><span>{mill.moq} m</span></div><div className="fx-line"><b>Lead</b><span>{mill.leadWeeks} weeks</span></div><button className="fx-primary full" onClick={() => setScreen("development")}>Select source & lock</button></>}</section></div></main>;
}

function DevelopmentScreen({ product, mill, setScreen }: { product: Product; mill: Mill; setScreen: (screen: BrandScreen) => void }) {
  return <main className="fx-main"><PageHead eyebrow="Physical development boundary" title="Development" copy="Fruma keeps the product truth intact while proto, fit, colour and bulk approvals happen physically."/><section className="fx-card"><div className="fx-success"><Check size={14}/> Source locked</div><h2>{mill.name}</h2><p>{product.sku} · requirements, commercial confirmation and evidence remain attached.</p><textarea defaultValue="Proto requested. Handfeel and colour remain pending physical validation."/><button className="fx-primary" onClick={() => setScreen("list")}>Approve product & continue</button></section></main>;
}

function ListScreen({ product, mill, setScreen }: { product: Product; mill: Mill; setScreen: (screen: BrandScreen) => void }) {
  return <main className="fx-main"><PageHead title="List" copy="Map one locked product record into different commerce destinations without changing the underlying source truth."/><div className="fx-two-col"><section className="fx-card"><h2>Locked product record</h2><div className="fx-line"><b>SKU</b><span>{product.sku}</span></div><div className="fx-line"><b>Source</b><span>{mill.name}</span></div><div className="fx-line"><b>Source country</b><span>{mill.country}</span></div><div className="fx-line"><b>Evidence</b><span>{mill.evidenceCoverage}% mapped</span></div></section><section className="fx-card"><h2>Destination mapping</h2>{["Own site", "Retailer A", "Retailer B"].map((x, i) => <div className="fx-line" key={x}><b>{x}</b><span>{i === 2 && mill.staleEvidence ? "Needs evidence review" : "Ready"}</span></div>)}<button className="fx-primary full" onClick={() => setScreen("live")}>Publish mapped record</button></section></div></main>;
}

function LiveScreen({ product, mill }: { product: Product; mill: Mill }) {
  return <main className="fx-main"><PageHead title="Live" copy="The product can be sold while its identity, source and supporting evidence remain linked."/><section className="fx-live-card"><span className="fx-status live">Live</span><h1>{product.name}</h1><p>{product.sku}</p><div className="fx-kpi-grid"><div><span>Source</span><b>{mill.name}</b></div><div><span>Country</span><b>{mill.country}</b></div><div><span>Evidence</span><b>{mill.evidenceCoverage}%</b></div><div><span>Certifications</span><b>{mill.certifications.length}</b></div></div></section></main>;
}

function SuppliersScreen({ setSelectedMillId, setScreen }: { setSelectedMillId: (id: string) => void; setScreen: (screen: BrandScreen) => void }) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const visible = mills.filter((m) => m.relationship !== "excluded").filter((m) => !query || m.name.toLowerCase().includes(query.toLowerCase())).filter((m) => tab === "All" || (tab === "Preferred" ? m.relationship === "preferred" : tab === "Proven" ? m.relationship === "proven" : true)).slice(0, 24);
  return <main className="fx-main"><PageHead title="Suppliers & memory" copy="Private relationship intelligence accumulates alongside mill capability and evidence."/><div className="fx-toolbar"><div className="fx-tabs compact">{["All", "Preferred", "Proven", "Previous"].map((x) => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x}</button>)}</div><label className="fx-search"><Search size={14}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search suppliers"/></label></div><div className="fx-table-card"><table><thead><tr><th>Supplier</th><th>Location</th><th>Specialty</th><th>Relationship</th><th>Evidence</th><th/></tr></thead><tbody>{visible.map((m) => <tr key={m.id} onClick={() => { setSelectedMillId(m.id); setScreen("confirm"); }}><td><b>{m.name}</b></td><td>{m.region}, {m.country}</td><td>{m.specialties[0]}</td><td>{m.relationship}</td><td>{m.evidenceCoverage}%</td><td><ArrowRight size={14}/></td></tr>)}</tbody></table></div></main>;
}

function BrandWorkspace({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  const [screen, setScreen] = useState<BrandScreen>("intent");
  const [product, setProduct] = useState<Product>(featuredProduct);
  const [panel, setPanel] = useState<ProductPanel>("overview");
  const [selectedMillId, setSelectedMillId] = useState(product.shortlistMillIds[0] ?? mills[0].id);
  const [requestState, setRequestState] = useState<RequestState>("draft");
  const mill = mills.find((m) => m.id === selectedMillId) ?? mills[0];
  function chooseProduct(p: Product) { setProduct(p); setSelectedMillId(p.shortlistMillIds[0] ?? mills[0].id); setRequestState("draft"); }
  return <div className="fx-shell brand"><BrandHeader screen={screen} setScreen={setScreen} mode={mode} setMode={setMode}/><LifecycleBar screen={screen} setScreen={setScreen}/>{screen === "range" ? <RangeScreen setProduct={chooseProduct} setScreen={setScreen}/> : screen === "intent" ? <IntentScreen product={product} setProduct={chooseProduct} panel={panel} setPanel={setPanel} setScreen={setScreen}/> : screen === "check" ? <CheckScreen product={product} setScreen={setScreen}/> : screen === "source" ? <SourceScreen product={product} selectedMillId={selectedMillId} setSelectedMillId={setSelectedMillId} setScreen={setScreen}/> : screen === "confirm" ? <ConfirmScreen product={product} mill={mill} requestState={requestState} setRequestState={setRequestState} setScreen={setScreen}/> : screen === "development" ? <DevelopmentScreen product={product} mill={mill} setScreen={setScreen}/> : screen === "list" ? <ListScreen product={product} mill={mill} setScreen={setScreen}/> : screen === "live" ? <LiveScreen product={product} mill={mill}/> : <SuppliersScreen setSelectedMillId={setSelectedMillId} setScreen={setScreen}/>}</div>;
}

function MillHeader({ screen, setScreen, mode, setMode, mill }: { screen: MillScreen; setScreen: (screen: MillScreen) => void; mode: Mode; setMode: (mode: Mode) => void; mill: Mill }) {
  return <header className="fx-topbar mill"><button className="fx-wordmark" onClick={() => setScreen("requests")}>FRUMA</button><button className="fx-workspace">{mill.name}<ChevronDown size={14}/></button><nav className="fx-main-nav">{millNav.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}>{item.label}</button>)}</nav><div className="fx-top-actions"><ModeSwitch mode={mode} setMode={setMode}/><div className="fx-avatar">VM</div></div></header>;
}

function MillRequests({ mill }: { mill: Mill }) {
  const millRequests = requests.filter((r) => r.millId === mill.id).slice(0, 16);
  const fallback = requests.slice(0, 10);
  const list = millRequests.length ? millRequests : fallback;
  const [selected, setSelected] = useState(list[0]?.id ?? "");
  const current = list.find((r) => r.id === selected) ?? list[0];
  return <main className="fx-main mill-main"><PageHead eyebrow="Mill workspace" title="Incoming requests" copy="Anonymous sourcing cases matched to your mapped book and evidence."/><div className="fx-two-col request-layout"><div className="fx-table-card dark"><table><thead><tr><th>Request</th><th>Product</th><th>Status</th><th>Delivery</th></tr></thead><tbody>{list.map((r) => { const p = products.find((x) => x.id === r.productId); return <tr key={r.id} className={selected === r.id ? "selected" : ""} onClick={() => setSelected(r.id)}><td><b>{r.id}</b></td><td>{p?.category ?? "Product"}</td><td>{r.status}</td><td>{r.requestedDelivery}</td></tr>; })}</tbody></table></div><section className="fx-card dark">{current ? <><p className="fx-eyebrow">Selected request</p><h2>{products.find((p) => p.id === current.productId)?.category ?? "Product request"}</h2><p>The brand remains anonymous until the transaction reaches the appropriate point.</p><div className="fx-line"><b>Volume</b><span>{current.volume}</span></div><div className="fx-line"><b>Requested delivery</b><span>{current.requestedDelivery}</span></div><div className="fx-line"><b>Status</b><span>{current.status}</span></div><button className="fx-primary full">Open response workspace</button></> : <p>No requests yet.</p>}</section></div></main>;
}

function MillBook({ mill }: { mill: Mill }) {
  const [selected, setSelected] = useState(0);
  const rows = Array.from({ length: 16 }, (_, i) => ({ code: `${mill.id.slice(-3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`, name: `${mill.specialties[i % mill.specialties.length]} ${160 + (i % 7) * 20} GSM`, construction: mill.specialties[i % mill.specialties.length], moq: mill.moq + (i % 4) * 100, lead: mill.leadWeeks + (i % 3) }));
  return <main className="fx-main mill-main"><PageHead title="Mapped mill book" copy="Your own quality language remains visible alongside the Fruma-standard interpretation."/><div className="fx-table-card dark"><table><thead><tr><th>Mill code</th><th>Quality</th><th>Construction</th><th>MOQ</th><th>Lead</th><th>Mapping</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.code} className={selected === i ? "selected" : ""} onClick={() => setSelected(i)}><td>{r.code}</td><td><b>{r.name}</b></td><td>{r.construction}</td><td>{r.moq} m</td><td>{r.lead} wks</td><td><span className="fx-status live">Mapped</span></td></tr>)}</tbody></table></div></main>;
}

const mappingRows = [
  ["Article / Quality", "quality_name", "Direct"],
  ["Composition", "material_composition", "Direct"],
  ["Weight (g/m²)", "weight_gsm", "Direct"],
  ["Width", "usable_width_cm", "Unit conversion"],
  ["MOQ", "commercial_moq", "Needs scope"],
  ["Lead time", "commercial_lead_time", "Needs freshness"],
  ["Certification", "evidence_claim", "Evidence link required"],
  ["Colour minimum", "colour_moq", "Direct"],
];

function MillData({ mill }: { mill: Mill }) {
  const [state, setState] = useState<MappingState>("ready");
  const [files, setFiles] = useState(["SS27_master_quality_book.xlsx", "certificates_2026.zip"]);
  function simulateUpload() { setFiles((current) => current.includes("updated_commercial_terms.csv") ? current : ["updated_commercial_terms.csv", ...current]); setState("ready"); }
  return <main className="fx-main mill-main"><PageHead eyebrow="Critical data workflow" title="Upload, map, review, publish." copy="Fruma does not overwrite the mill's language. It preserves the source value, maps it to the Fruma standard, and keeps provenance and confidence attached." action={<button className="fx-primary" onClick={simulateUpload}><Upload size={14}/> Upload mill data</button>}/><div className="fx-data-steps"><div className="active"><Upload size={18}/><span>1. Ingest</span><b>{files.length} files</b></div><div className={state !== "ready" ? "active" : ""}><MapPinned size={18}/><span>2. Map</span><b>{mappingRows.length} fields</b></div><div className={state === "published" ? "active" : ""}><FileCheck2 size={18}/><span>3. Review</span><b>{state === "published" ? "Complete" : "Pending"}</b></div><div className={state === "published" ? "active" : ""}><Database size={18}/><span>4. Publish internally</span><b>{state === "published" ? "Published" : "Not yet"}</b></div></div><div className="fx-two-col data-layout"><section className="fx-card dark"><div className="fx-card-head"><h2>Source files</h2><span>Mill-owned</span></div>{files.map((file, i) => <div className="fx-file" key={file}><FileText size={16}/><div><b>{file}</b><span>{i === 0 ? "Uploaded just now" : `${i + 1} source tables detected`}</span></div><span className="fx-status">Parsed</span></div>)}<button className="fx-secondary full" onClick={simulateUpload}>Add another file</button></section><section className="fx-card dark"><div className="fx-card-head"><h2>Mapping summary</h2><span>{mill.name}</span></div><div className="fx-kpi-grid small"><div><span>Mapped</span><b>{state === "ready" ? 5 : 8}/8</b></div><div><span>Needs review</span><b>{state === "ready" ? 3 : 0}</b></div><div><span>Source preserved</span><b>100%</b></div><div><span>Published</span><b>{state === "published" ? "Yes" : "No"}</b></div></div></section></div><section className="fx-card dark mapping-table"><div className="fx-card-head"><h2>Source → Fruma standard mapping</h2><span>Nothing becomes confirmed truth just because it mapped successfully.</span></div><div className="fx-map-head"><span>Mill source field</span><span>Fruma standard field</span><span>Mapping rule</span><span>Status</span></div>{mappingRows.map(([source, target, rule], i) => <div className="fx-map-row" key={source}><b>{source}</b><code>{target}</code><span>{rule}</span><span className={`fx-status ${state !== "ready" || i < 5 ? "live" : ""}`}>{state !== "ready" || i < 5 ? "Mapped" : "Review"}</span></div>)}<div className="fx-map-actions">{state === "ready" ? <button className="fx-primary" onClick={() => setState("mapped")}>Accept reviewed mappings <ArrowRight size={14}/></button> : state === "mapped" ? <button className="fx-primary" onClick={() => setState("published")}>Publish to internal mill record <ArrowRight size={14}/></button> : <div className="fx-success"><Check size={14}/> Mapping published to Fruma's internal standard with source provenance preserved.</div>}</div></section></main>;
}

function MillEvidence({ mill }: { mill: Mill }) {
  return <main className="fx-main mill-main"><PageHead title="Evidence" copy="Manage evidence separately from capability and commercial claims, with scope and freshness explicit."/><div className="fx-source-grid evidence">{mill.certifications.map((c, i) => <article className="fx-card dark" key={c}><ShieldCheck size={22}/><h2>{c}</h2><p>Scope: mill site · applicable quality families subject to mapping.</p><div className="fx-line"><b>Status</b><span>{i === mill.certifications.length - 1 && mill.staleEvidence ? "Review due" : "Current"}</span></div><button className="fx-secondary full">Open evidence record</button></article>)}</div></main>;
}

function SimpleMillScreen({ screen }: { screen: MillScreen }) {
  const content = screen === "samples" ? ["3 active sample requests", "2 in transit", "1 awaiting review"] : screen === "orders" ? ["4 confirmed orders", "2 production milestones due", "1 shipment this week"] : ["6 active conversations", "2 need a reply", "1 linked to an open sourcing request"];
  const Icon = screen === "samples" ? PackageCheck : screen === "orders" ? BookOpen : MessageSquare;
  return <main className="fx-main mill-main"><PageHead title={screen[0].toUpperCase() + screen.slice(1)} copy={`Operational ${screen} stay linked to the same underlying sourcing and product records.`}/><div className="fx-source-grid simple">{content.map((x, i) => <article className="fx-card dark" key={x}><Icon size={22}/><h2>{x}</h2><p>{i === 0 ? "Open workspace" : "Linked records and current status available."}</p><button className="fx-secondary">Open</button></article>)}</div></main>;
}

function MillWorkspace({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  const [screen, setScreen] = useState<MillScreen>("requests");
  const activeMill = mills[3] ?? mills[0];
  return <div className="fx-shell mill"><MillHeader screen={screen} setScreen={setScreen} mode={mode} setMode={setMode} mill={activeMill}/>{screen === "requests" ? <MillRequests mill={activeMill}/> : screen === "book" ? <MillBook mill={activeMill}/> : screen === "data" ? <MillData mill={activeMill}/> : screen === "evidence" ? <MillEvidence mill={activeMill}/> : <SimpleMillScreen screen={screen}/>}</div>;
}

export function InteractivePlatform() {
  const [mode, setMode] = useState<Mode>("brand");
  return mode === "brand" ? <BrandWorkspace mode={mode} setMode={setMode}/> : <MillWorkspace mode={mode} setMode={setMode}/>;
}
