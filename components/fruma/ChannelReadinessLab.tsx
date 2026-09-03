"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, CircleAlert, FileDown, Sparkles } from "lucide-react";
import { featuredProduct, mills } from "@/lib/fruma/demo-data";

type View = "flow" | "brand" | "destinations" | "content" | "handoff";
type Destination = { id: string; name: string; type: string; score: number; missing: number; conflicts: number; fields: number };

const destinations: Destination[] = [
  { id: "own", name: "Brand own site", type: "DTC", score: 96, missing: 1, conflicts: 0, fields: 48 },
  { id: "ret-a", name: "Retail partner A", type: "Retail", score: 91, missing: 2, conflicts: 1, fields: 54 },
  { id: "ret-b", name: "Retail partner B", type: "Retail", score: 78, missing: 7, conflicts: 2, fields: 63 },
  { id: "wh-a", name: "Wholesale partner A", type: "Wholesale", score: 87, missing: 4, conflicts: 1, fields: 51 },
  { id: "wh-b", name: "Wholesale partner B", type: "Wholesale", score: 83, missing: 5, conflicts: 2, fields: 58 },
];

const mappings = [
  ["material.composition", "100% extra-long staple cotton", "Fabric composition", "100% Extra-Long Staple Cotton", "Primary material / Composition", "Cotton / 100% cotton", "98%"],
  ["material.construction", "Warp-knit mesh", "Fabric structure", "Warp-knit mesh", "Construction", "Warp knit", "96%"],
  ["material.weight_gsm", "190 GSM", "Fabric weight", "190 gsm", "Weight range", "181–200 gsm", "99%"],
  ["product.colour", "Navy", "Colour name", "Deep Navy", "Colour family", "Blue", "94%"],
  ["evidence.certification", "OEKO-TEX Standard 100", "Product certification", "OEKO-TEX® Standard 100", "Certification", "OEKO-TEX", "97%"],
  ["commercial.origin", "Portugal", "Country of manufacture", "Portugal", "Country of origin", "Portugal", "100%"],
];

export function ChannelReadinessLab() {
  const [view, setView] = useState<View>("flow");
  const [destinationId, setDestinationId] = useState("ret-a");
  const [aiMapped, setAiMapped] = useState(false);
  const [resolved, setResolved] = useState<string[]>([]);
  const destination = useMemo(() => destinations.find((x) => x.id === destinationId) ?? destinations[0], [destinationId]);
  const mill = mills.find((m) => m.id === featuredProduct.shortlistMillIds[0]) ?? mills[0];
  const nav: { id: View; label: string }[] = [{id:"flow",label:"Standardisation"},{id:"brand",label:"Brand mapping"},{id:"destinations",label:"Destinations"},{id:"content",label:"Content"},{id:"handoff",label:"Ready for brand"}];

  return <main className="cr-lab">
    <div className="cr-head"><div><p className="fx-eyebrow">Channel readiness lab · preview only</p><h1>One product truth. Every commercial language.</h1><p>Fruma standardises inbound factory data, translates it into the brand standard, then uses that governed truth to prepare retailer and wholesale-specific content. Fruma prepares; the brand takes it from here.</p></div><span className="cr-preview">Not production</span></div>
    <div className="cr-nav">{nav.map((x)=><button key={x.id} className={view===x.id?"active":""} onClick={()=>setView(x.id)}>{x.label}</button>)}</div>

    {view === "flow" && <>
      <div className="cr-flow">
        <section><small>01 · SOURCE</small><h2>Factory / mill data</h2><p>Mill-native files, abbreviations, units and evidence.</p><b>{mill.name}</b><span>Comp. · 100% ELS Ctn</span><span>Wgt gsm · 190 +/- 5</span></section><ArrowRight/>
        <section className="core"><small>02 · CANONICAL</small><h2>Fruma Standard</h2><p>Meaning is normalised while original values and provenance remain attached.</p><b>material.composition</b><span>100% extra-long staple cotton</span><span>Evidence: source-linked</span></section><ArrowRight/>
        <section><small>03 · BRAND</small><h2>Brand Standard</h2><p>The brand's taxonomy, naming, attributes and approved commercial language.</p><b>Fabric composition</b><span>100% Extra-Long Staple Cotton</span><span>Approved brand value</span></section><ArrowRight/>
        <section className="core"><small>04 · TRANSLATION</small><h2>Fruma governed mapping</h2><p>AI-supported mapping uses canonical truth plus brand-approved enrichment.</p><b>No silent invention</b><span>Confidence + gaps visible</span><span>Source lineage preserved</span></section><ArrowRight/>
        <section><small>05 · DESTINATION</small><h2>Retail / wholesale standard</h2><p>Partner-specific fields, taxonomies, formatting and content requirements.</p><b>Primary material · Cotton</b><span>Composition · 100% cotton</span><span>Ready for brand handoff</span></section>
      </div>
      <div className="cr-principle"><Sparkles size={18}/><div><b>Anything → Fruma → Brand → Fruma-governed translation → Anything</b><p>The Fruma Standard is the stable semantic layer. Mapping changes structure and expression, never the underlying source truth.</p></div></div>
    </>}

    {view === "brand" && <>
      <div className="cr-kpis"><div><span>Fruma facts</span><b>52</b></div><div><span>Brand fields</span><b>48</b></div><div><span>Auto-map confidence</span><b>{aiMapped?"97%":"—"}</b></div><div><span>Brand readiness</span><b>{aiMapped?"96%":"74%"}</b></div></div>
      <section className="fx-card"><div className="fx-card-head"><div><p className="fx-eyebrow">AI-supported mapping</p><h2>Fruma Standard → Brand Standard</h2></div><button className="fx-primary" onClick={()=>setAiMapped(true)}><Sparkles size={14}/>{aiMapped?"Suggestions applied":"Suggest mappings"}</button></div><div className="cr-map-head"><span>Fruma field</span><span>Canonical value</span><span>Brand field</span><span>Brand value</span><span>Confidence</span></div>{mappings.map((r)=><div className="cr-map-row" key={r[0]}><code>{r[0]}</code><span>{r[1]}</span><b>{r[2]}</b><span>{r[3]}</span><em>{aiMapped?r[6]:"Review"}</em></div>)}</section>
    </>}

    {view === "destinations" && <div className="cr-destination-layout"><aside className="cr-dest-list">{destinations.map((d)=><button key={d.id} className={destinationId===d.id?"active":""} onClick={()=>setDestinationId(d.id)}><div><b>{d.name}</b><span>{d.type} · {d.fields} required fields</span></div><strong>{d.score}%</strong></button>)}</aside><section className="fx-card"><p className="fx-eyebrow">Destination readiness</p><div className="cr-score"><b>{destination.score}%</b><div><h2>{destination.name}</h2><p>Scored against the partner standard using the completed brand record and its source-linked Fruma truth.</p></div></div><div className="cr-kpis three"><div><span>Missing required</span><b>{Math.max(0,destination.missing-resolved.length)}</b></div><div><span>Mapping conflicts</span><b>{Math.max(0,destination.conflicts-resolved.length)}</b></div><div><span>Ready fields</span><b>{destination.fields-destination.missing}</b></div></div><h3>What blocks readiness</h3>{["Partner-specific fit description missing","Colour taxonomy needs confirmation","Sustainability wording requires evidence scope"].slice(0,Math.min(3,destination.missing)).map((x)=><div className="cr-issue" key={x}><CircleAlert size={15}/><span>{x}</span><button onClick={()=>setResolved(resolved.includes(x)?resolved: [...resolved,x])}>{resolved.includes(x)?"Resolved":"Resolve"}</button></div>)}</section></div>}

    {view === "content" && <div className="cr-content-grid"><section className="fx-card"><p className="fx-eyebrow">Selected destination</p><select value={destinationId} onChange={(e)=>setDestinationId(e.target.value)}>{destinations.map((d)=><option value={d.id} key={d.id}>{d.name}</option>)}</select><h2>Content optimisation</h2><p>Expression can change for the destination. Facts cannot. Every generated statement is constrained to approved brand data and source-linked product truth.</p><div className="cr-field"><label>Destination title</label><textarea defaultValue="Men's Textured Extra-Long Staple Cotton Polo in Deep Navy"/></div><div className="cr-field"><label>Product description</label><textarea defaultValue="A refined navy polo crafted from breathable extra-long staple cotton in a structured warp-knit mesh. Designed with a premium dry handfeel for an elevated everyday finish."/></div><button className="fx-secondary"><Sparkles size={14}/> Optimise to partner rules</button></section><section className="fx-card"><p className="fx-eyebrow">Truth guardrail</p><h2>Claims used</h2>{["Extra-long staple cotton","Warp-knit mesh","Deep Navy","Made in Portugal","OEKO-TEX Standard 100"].map((x,i)=><div className="cr-truth" key={x}><Check size={14}/><span>{x}</span><em>{i===3?"Brand approved":"Source-linked"}</em></div>)}<div className="cr-warning"><CircleAlert size={15}/><span>“Low impact” was not used: evidence scope is insufficient for this product-level claim.</span></div></section></div>}

    {view === "handoff" && <section className="cr-handoff"><div className="cr-ready"><Check size={22}/></div><p className="fx-eyebrow">Terminal Fruma state</p><h1>Ready for brand</h1><p>Fruma has prepared the destination package. Nothing has been submitted or published to the partner. The brand picks it up from here using its existing PIM, portal, spreadsheet or retailer workflow.</p><div className="cr-kpis"><div><span>Brand standard</span><b>96%</b></div><div><span>{destination.name}</span><b>{destination.score}%</b></div><div><span>Source lineage</span><b>Preserved</b></div><div><span>Submission</span><b>Brand-owned</b></div></div><button className="fx-primary"><FileDown size={14}/> Prepare handoff package</button></section>}
  </main>;
}
