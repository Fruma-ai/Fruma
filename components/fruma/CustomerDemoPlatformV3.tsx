"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import { demoBrands, featuredProduct, mills, products, type Mill, type Product, type Requirement } from "@/lib/fruma/demo-data";
import { ProductConceptLab } from "@/components/fruma/ProductConceptLab";
import { DemoPromotedFactorySetup, DemoPromotedSpine } from "@/components/fruma/DemoPromotedSpine";
import type { WedgeSliceResult } from "@/lib/fruma/wedge";

type Mode = "brand" | "factory";
type BrandStep = "intent" | "concept" | "check" | "source" | "confirm" | "development" | "standardise" | "ready";
type FactoryStep = "setup" | "requests" | "book" | "data" | "evidence" | "samples" | "messages";
type IntentPhase = "editing" | "analysing" | "structuring" | "gaps" | "ready";
type ReqStatus = "captured" | "missing" | "suggested" | "approved" | "open";

type SmartRequirement = Requirement & {
  status: ReqStatus;
  provenance: "Designer supplied" | "AI suggested" | "Designer approved · AI suggested" | "Open" | "Missing";
  suggestion?: string;
  reason?: string;
};

/** Confirm → Standardise (lock) → Development → Ready — physical after lock. */
const brandSteps: { id: BrandStep; label: string }[] = [
  { id: "intent", label: "Intent" },
  { id: "concept", label: "Concept" },
  { id: "check", label: "Check" },
  { id: "source", label: "Source" },
  { id: "confirm", label: "Confirm" },
  { id: "standardise", label: "Standardise" },
  { id: "development", label: "Development" },
  { id: "ready", label: "Channel ready" },
];
const factorySteps: { id: FactoryStep; label: string }[] = [
  { id: "setup", label: "Setup" }, { id: "requests", label: "Requests" }, { id: "book", label: "Book" }, { id: "data", label: "Data" },
  { id: "evidence", label: "Evidence" }, { id: "samples", label: "Samples" }, { id: "messages", label: "Messages" },
];

const categoryProfiles: Record<string, { material: string; construction: string; handfeel: string; moq: string; tags: string[]; missing: { key: string; suggestion: string; reason: string }[] }> = {
  Polo: { material: "Extra-long staple cotton", construction: "Structured mesh, not piqué", handfeel: "Premium dry handfeel", moq: "≤ 600m", tags: ["fine cotton", "warp knit", "mesh", "technical cotton"], missing: [
    { key: "Fabric weight", suggestion: "190–210 gsm", reason: "Supports a structured polo with a dry, breathable handfeel." },
    { key: "Fit", suggestion: "Refined regular fit", reason: "A balanced starting point for a premium UK/EU polo." },
    { key: "Collar construction", suggestion: "Flat-knit rib collar", reason: "Commonly compatible with a clean structured polo silhouette." },
  ]},
  Sweater: { material: "Merino-rich wool blend", construction: "Double knit", handfeel: "Soft, compact, low-pilling", moq: "≤ 450m", tags: ["merino", "wool blends", "double knit"], missing: [
    { key: "Gauge", suggestion: "12 gauge", reason: "Balances compact structure and year-round wearability." }, { key: "Fit", suggestion: "Regular fit", reason: "Neutral starting point until silhouette is clarified." },
  ]},
  Shirt: { material: "Long-staple cotton", construction: "Fine woven poplin", handfeel: "Crisp, smooth, lightweight", moq: "≤ 700m", tags: ["woven shirting", "poplin", "oxford"], missing: [
    { key: "Fabric weight", suggestion: "110–130 gsm", reason: "Typical range for a lightweight premium poplin." }, { key: "Collar", suggestion: "Semi-spread collar", reason: "Versatile default until the designer specifies otherwise." },
  ]},
  Jacket: { material: "Recycled wool blend", construction: "Compact twill", handfeel: "Structured, brushed, substantial", moq: "≤ 500m", tags: ["outerwear", "wool coating", "compact twill"], missing: [
    { key: "Lining", suggestion: "Full recycled viscose lining", reason: "Useful construction detail for factory feasibility and costing." }, { key: "Finished weight", suggestion: "420–480 gsm", reason: "Supports a substantial outerwear hand." },
  ]},
  "T-shirt": { material: "Long-staple cotton", construction: "Single jersey", handfeel: "Soft, clean, smooth", moq: "≤ 800m", tags: ["fine cotton", "jersey", "interlock"], missing: [
    { key: "Fabric weight", suggestion: "180–200 gsm", reason: "Balanced premium jersey weight." }, { key: "Neck rib", suggestion: "1x1 rib, 2.2 cm", reason: "Gives a factory a more precise construction starting point." },
  ]},
};

function baseRequirements(product: Product): SmartRequirement[] {
  const p = categoryProfiles[product.category] ?? categoryProfiles.Polo;
  const colour = product.name.match(/navy|stone|forest|black|cream|clay/i)?.[0] ?? "Navy";
  const captured: SmartRequirement[] = [
    { key: "Material", value: p.material, priority: "MUST", answerability: "Can check now", status: "captured", provenance: "Designer supplied" },
    { key: "Construction", value: p.construction, priority: "MUST", answerability: "Can check now", status: "captured", provenance: "Designer supplied" },
    { key: "Colour", value: colour[0].toUpperCase() + colour.slice(1), priority: "PREFER", answerability: "Needs factory confirmation", status: "captured", provenance: "Designer supplied" },
    { key: "Handfeel", value: p.handfeel, priority: "PREFER", answerability: "Physical validation", status: "captured", provenance: "Designer supplied" },
    { key: "MOQ", value: p.moq, priority: "MUST", answerability: "Can check now", status: "captured", provenance: "Designer supplied" },
    { key: "Market", value: "UK + EU", priority: "MUST", answerability: "Can check now", status: "captured", provenance: "Designer supplied" },
  ];
  return [...captured, ...p.missing.map((m) => ({ key: m.key, value: "", priority: "OPEN" as const, answerability: "Needs designer detail", status: "missing" as const, provenance: "Missing" as const, suggestion: m.suggestion, reason: m.reason }))];
}

function maxMoq(reqs: SmartRequirement[]) {
  const value = reqs.find((r) => r.key === "MOQ")?.value ?? "600";
  return Number(value.replace(/[^0-9]/g, "")) || 600;
}

function recommendationFor(product: Product, reqs: SmartRequirement[], mill: Mill) {
  const profile = categoryProfiles[product.category] ?? categoryProfiles.Polo;
  const matches = mill.specialties.filter((s) => profile.tags.some((tag) => s.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(s.toLowerCase())));
  const moqPass = mill.moq <= maxMoq(reqs);
  const relationshipBoost = mill.relationship === "preferred" ? 12 : mill.relationship === "proven" ? 9 : mill.relationship === "previous" ? 5 : mill.relationship === "new" ? 2 : -50;
  const unresolved = reqs.filter((r) => r.status === "missing").length;
  const score = Math.max(0, Math.min(99, 45 + matches.length * 18 + (moqPass ? 16 : -7) + Math.round((mill.evidenceCoverage - 60) * .45) + relationshipBoost + (mill.leadWeeks <= 7 ? 7 : 3) - unresolved * 2));
  return { score, reasons: [matches.length ? `${matches.slice(0, 2).join(" + ")} capability` : `${product.category.toLowerCase()} capability partially evidenced`, moqPass ? `MOQ fits ${maxMoq(reqs)}m ceiling` : `MOQ ${mill.moq}m above target`, `${mill.evidenceCoverage}% evidence coverage`, mill.relationship === "new" ? "New relationship" : `${mill.relationship} relationship`] };
}

function Activity({ title, steps }: { title: string; steps: { label: string; agent: string; state: "done" | "active" | "queued" }[] }) {
  return <div className="v3-activity"><div className="v3-activity-head"><span className="v3-spinner"><LoaderCircle size={22}/></span><div><b>{title}</b><small>Fruma is running product intelligence in sequence</small></div></div><div className="v3-activity-list">{steps.map((s) => <div key={s.label} className={`v3-activity-row ${s.state}`}><span>{s.state === "done" ? <Check size={13}/> : s.state === "active" ? <LoaderCircle size={13} className="cd-spin"/> : <span className="v3-dot"/>}</span><div><b>{s.label}</b><small>{s.agent}</small></div></div>)}</div></div>;
}

function Header({ mode, setMode, mill }: { mode: Mode; setMode: (m: Mode) => void; mill: Mill }) {
  const [open, setOpen] = useState(false);
  return <header className={`cd-topbar ${mode === "factory" ? "mill" : ""}`}><button className="cd-wordmark" onClick={() => setMode("brand")}>FRUMA</button><div className="cd-workspace-wrap"><button className="cd-workspace" onClick={() => setOpen(!open)}>{mode === "brand" ? demoBrands[0].name : mill.name}<ChevronDown size={14}/></button>{open ? <div className="cd-popover cd-workspaces"><b>Demo workspace</b><button onClick={() => setOpen(false)}><span>{mode === "brand" ? demoBrands[0].name : mill.name}</span><small>Active</small></button></div> : null}</div><div className="cd-mode-switch"><button className={mode === "brand" ? "active" : ""} onClick={() => setMode("brand")}>Brand</button><button className={mode === "factory" ? "active" : ""} onClick={() => setMode("factory")}>Factory</button></div><div className="cd-top-actions"><button aria-label="Notifications"><Bell size={17}/></button><div className="cd-avatar">AR</div></div></header>;
}

function Intent({ product, chooseProduct, brief, setBrief, reqs, setReqs, phase, setPhase, visibleCount, setVisibleCount, go }: { product: Product; chooseProduct:(id:string)=>void; brief:string; setBrief:(v:string)=>void; reqs:SmartRequirement[]; setReqs:(v:SmartRequirement[])=>void; phase:IntentPhase; setPhase:(p:IntentPhase)=>void; visibleCount:number; setVisibleCount:(n:number)=>void; go:(s:BrandStep)=>void }) {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const run = () => {
    timers.current.forEach(window.clearTimeout); timers.current = []; setReqs(baseRequirements(product)); setVisibleCount(0); setPhase("analysing");
    timers.current.push(window.setTimeout(() => setPhase("structuring"), 650));
    baseRequirements(product).forEach((_, i) => timers.current.push(window.setTimeout(() => setVisibleCount(i + 1), 1050 + i * 180)));
    timers.current.push(window.setTimeout(() => setPhase("gaps"), 1050 + baseRequirements(product).length * 180 + 250));
    timers.current.push(window.setTimeout(() => setPhase("ready"), 1050 + baseRequirements(product).length * 180 + 900));
  };
  const updateReq = (key:string, patch:Partial<SmartRequirement>) => setReqs(reqs.map((r) => r.key === key ? {...r, ...patch} : r));
  const unresolved = reqs.filter((r) => r.status === "missing").length;
  const steps = phase === "analysing" ? [
    {label:"Reading written brief",agent:"Brief Interpreter",state:"active" as const},{label:"Extracting product attributes",agent:"Product Standard Agent",state:"queued" as const},{label:"Checking for missing design detail",agent:"Completeness Check",state:"queued" as const},{label:"Preparing sourcing criteria",agent:"Requirement Builder",state:"queued" as const}
  ] : phase === "structuring" ? [
    {label:"Reading written brief",agent:"Brief Interpreter",state:"done" as const},{label:"Extracting product attributes",agent:"Product Standard Agent",state:"active" as const},{label:"Checking for missing design detail",agent:"Completeness Check",state:"queued" as const},{label:"Preparing sourcing criteria",agent:"Requirement Builder",state:"queued" as const}
  ] : [
    {label:"Reading written brief",agent:"Brief Interpreter",state:"done" as const},{label:"Extracting product attributes",agent:"Product Standard Agent",state:"done" as const},{label:"Checking for missing design detail",agent:"Completeness Check",state:"done" as const},{label:"Preparing sourcing criteria",agent:"Requirement Builder",state: phase === "gaps" ? "active" as const : "done" as const}
  ];
  return <main className="cd-main"><div className="cd-page-head"><div><p>01 · Product intent</p><h1>Turn a designer's idea into sourcing-ready product intent.</h1><span>Write or draw what you want to make. Fruma structures it, flags missing detail and keeps AI suggestions separate from approved intent.</span></div></div><div className="v3-intent-grid"><section className="cd-card"><label>Working product<select value={product.id} onChange={(e)=>chooseProduct(e.target.value)}>{[featuredProduct,...products.slice(0,15)].map((p)=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label>Product brief<textarea value={brief} onChange={(e)=>{setBrief(e.target.value);setPhase("editing");}}/></label><div className="cd-actions"><button className="cd-secondary" onClick={()=>setBrief(product.intent)}>Restore product brief</button><button className="cd-primary" onClick={run}>{phase!=="editing"&&phase!=="ready"?<><LoaderCircle size={14} className="cd-spin"/> Analysing intent</>:<><Sparkles size={14}/> Analyse product intent</>}</button></div>{phase!=="editing"&&phase!=="ready"?<Activity title="Building the product requirement contract" steps={steps}/>:null}</section><section className="cd-card v3-requirements"><div className="cd-standard-head"><div><p className="cd-eyebrow">Product requirement contract</p><h2>{phase==="editing"?"Waiting for analysis":`${reqs.length} requirements identified`}</h2></div>{phase==="ready"?<span className="cd-ai-badge"><Sparkles size={12}/> Reviewable intelligence</span>:null}</div>{phase==="editing"?<div className="cd-empty"><WandSparkles size={24}/><p>Analyse the brief and Fruma will map what is known and highlight what the designer still needs to decide.</p></div>:<div className="v3-req-list">{reqs.slice(0,visibleCount).map((r)=><div className={`v3-req ${r.status}`} key={r.key}><div className="v3-req-main"><div><b>{r.key}</b><small>{r.provenance}</small></div>{r.status==="missing"?<span className="v3-missing"><CircleAlert size={12}/> Missing detail</span>:<span className="v3-captured"><Check size={12}/> {r.status==="approved"?"Approved":r.status==="open"?"Open":"Captured"}</span>}</div>{r.status==="missing"?<><input aria-label={`Enter ${r.key}`} placeholder={`Enter ${r.key.toLowerCase()}…`} value={r.value} onChange={(e)=>updateReq(r.key,{value:e.target.value})}/><div className="v3-gap-actions"><button className="cd-secondary" onClick={()=>{if(r.value.trim())updateReq(r.key,{status:"captured",provenance:"Designer supplied",answerability:"Designer clarified"});}}>Use my detail</button><button className="cd-secondary" onClick={()=>updateReq(r.key,{value:r.suggestion??"",status:"suggested",provenance:"AI suggested"})}><Sparkles size={12}/> AI suggestion</button><button className="cd-secondary" onClick={()=>updateReq(r.key,{status:"open",provenance:"Open",value:"Open by design"})}>Leave open</button></div>{r.reason?<small className="v3-reason">Why Fruma flagged this: {r.reason}</small>:null}</>:r.status==="suggested"?<><div className="v3-suggestion"><Sparkles size={13}/><div><b>{r.value}</b><small>AI suggestion · {r.reason}</small></div></div><div className="v3-gap-actions"><button className="cd-primary" onClick={()=>updateReq(r.key,{status:"approved",provenance:"Designer approved · AI suggested",answerability:"Designer approved"})}>Accept suggestion</button><button className="cd-secondary" onClick={()=>updateReq(r.key,{status:"missing",provenance:"Missing",value:""})}>Dismiss</button></div></>:<div className="v3-req-value"><span>{r.value}</span><em>{r.priority}</em></div>}</div>)}</div>}{phase==="ready"?<><div className={unresolved?"v3-warning":"cd-success"}>{unresolved?<><CircleAlert size={14}/>{unresolved} requirement{unresolved===1?"":"s"} still need clarification. Sourcing can continue, but recommendations will be provisional.</>:<><Check size={14}/> Product intent is complete enough for a higher-confidence search.</>}</div><div className="cd-actions end"><button className="cd-secondary" onClick={run}>Re-evaluate requirements</button><button className="cd-primary" onClick={()=>go("concept")}>Add sketch & visual concept <ArrowRight size={14}/></button></div></>:null}</section></div></main>;
}

export function CustomerDemoPlatformV3(){
  const [mode,setMode]=useState<Mode>("brand"); const [brandStep,setBrandStep]=useState<BrandStep>("intent"); const [factoryStep,setFactoryStep]=useState<FactoryStep>("setup");
  const [productId,setProductId]=useState(featuredProduct.id); const product=[featuredProduct,...products].find(p=>p.id===productId)??featuredProduct; const [brief,setBrief]=useState(product.intent); const [reqs,setReqs]=useState<SmartRequirement[]>(baseRequirements(product)); const [intentPhase,setIntentPhase]=useState<IntentPhase>("editing"); const [visibleCount,setVisibleCount]=useState(0);
  const [selectedMillId,setSelectedMillId]=useState(featuredProduct.shortlistMillIds[0]??mills[0].id); const mill=mills.find(m=>m.id===selectedMillId)??mills[0]; const [requestState,setRequestState]=useState("draft"); const [sampleState,setSampleState]=useState("not requested");
  const [wedgeResult,setWedgeResult]=useState<WedgeSliceResult|null>(null);
  const chooseProduct=(id:string)=>{const next=[featuredProduct,...products].find(p=>p.id===id)??featuredProduct;setProductId(id);setBrief(next.intent);setReqs(baseRequirements(next));setIntentPhase("editing");setVisibleCount(0);setRequestState("draft");setSampleState("not requested");setWedgeResult(null);};
  const stepIndex=brandSteps.findIndex(s=>s.id===brandStep);
  const spineStep = brandStep==="source"||brandStep==="confirm"||brandStep==="standardise" ? brandStep : null;
  const promotedBook = wedgeResult?.pilot.workbook.qualitiesAfterConfirm;
  const displayMill: Mill = wedgeResult
    ? { ...mill, name: wedgeResult.pilot.workbook.millName }
    : mill;
  const spineNeedsRun =
    (brandStep === "source" || brandStep === "confirm" || brandStep === "standardise") && !wedgeResult;
  const nextBlocked = spineNeedsRun;
  const goNext = () => {
    if (nextBlocked) {
      setBrandStep("source");
      return;
    }
    setBrandStep(brandSteps[Math.min(stepIndex + 1, brandSteps.length - 1)].id);
  };
  return <div className={`cd-shell ${mode==="factory"?"mill":""}`}><Header mode={mode} setMode={setMode} mill={displayMill}/>{mode==="brand"?<><nav className="cd-lifecycle">{brandSteps.map((s,i)=><button key={s.id} className={brandStep===s.id?"active":""} onClick={()=>{
    if ((s.id==="confirm"||s.id==="standardise") && !wedgeResult) { setBrandStep("source"); return; }
    setBrandStep(s.id);
  }}><span>{String(i+1).padStart(2,"0")}</span>{s.label}</button>)}</nav><div className="cd-demo-banner"><div><span>Customer demo · promoted spine</span><b>Step {stepIndex+1} of {brandSteps.length}</b><small>{nextBlocked?"Run the Source wedge before Confirm / Standardise.":"Source → Confirm → Standardise (lock) → Development. Intent & concept stay story scaffolding."}</small></div><div><button className="cd-secondary" onClick={()=>{setBrandStep("intent");chooseProduct(featuredProduct.id);}}>Reset demo</button><button className="cd-primary" disabled={nextBlocked && brandStep==="source"} onClick={goNext} title={nextBlocked?"Run the Source wedge first":undefined}>{nextBlocked && brandStep!=="source"?"Go to Source":<>Next step <ArrowRight size={14}/></>} </button></div></div>{brandStep==="intent"?<Intent product={product} chooseProduct={chooseProduct} brief={brief} setBrief={setBrief} reqs={reqs} setReqs={setReqs} phase={intentPhase} setPhase={setIntentPhase} visibleCount={visibleCount} setVisibleCount={setVisibleCount} go={setBrandStep}/>:null}{brandStep==="concept"?<main className="cd-main"><div className="cd-page-head"><div><p>02 · Sketch + visual intent</p><h1>Give Fruma more visual context before sourcing.</h1><span>The sketch, written brief and requirement contract are interpreted together. AI concepts stay suggestions until physically validated.</span></div></div><ProductConceptLab/><div className="cd-actions end"><button className="cd-primary" onClick={()=>setBrandStep("check")}>Review product requirements <ArrowRight size={14}/></button></div></main>:null}{brandStep==="check"?<main className="cd-main"><div className="cd-page-head"><div><p>03 · Product truth contract</p><h1>Review exactly what Fruma will search for.</h1><span>Designer supplied, AI suggested, approved and open requirements remain distinguishable.</span></div></div><section className="cd-card">{reqs.map(r=><div className="cd-line" key={r.key}><b>{r.key}</b><span>{r.value||"Needs detail"}</span><small>{r.provenance}</small></div>)}<div className="cd-actions end"><button className="cd-primary" onClick={()=>setBrandStep("source")}>Find cloth that can become this product <Search size={14}/></button></div></section></main>:null}{spineStep?<DemoPromotedSpine step={spineStep} go={setBrandStep} result={wedgeResult} setResult={setWedgeResult}/>:null}{brandStep==="development"?<main className="cd-main"><div className="cd-page-head"><div><p>07 · Physical development</p><h1>Physical development stays physical.</h1><span>Proto, fit and samples stay outside Fruma. The locked product-truth record continues when approved facts return.</span></div></div><section className="cd-card"><div className="cd-line"><b>{product.name}</b><span>{wedgeResult?.locked.lockedSourceId??displayMill.name}</span><em>{sampleState}</em></div><button className="cd-primary" onClick={()=>setSampleState(sampleState==="not requested"?"requested":sampleState==="requested"?"received":"approved")}>Advance sample</button><button className="cd-primary" disabled={sampleState!=="approved"} onClick={()=>setBrandStep("ready")}>Continue to channel-ready</button></section></main>:null}{brandStep==="ready"?<main className="cd-main"><div className="cd-page-head"><div><p>08 · Ready for brand</p><h1>One governed product truth — destinations are projections.</h1><span>{wedgeResult?.locked.lockedSourceId?`Source locked · ${wedgeResult.locked.lockedSourceId}. `:"Run Source → Confirm → Standardise to lock product truth. "}Destinations are projections — open channel-lab only as a sandbox.</span></div></div><div className="cd-grid two"><section className="cd-card"><div className="cd-success"><Check size={14}/> {wedgeResult?.locked?"Product truth locked":"Product truth not locked yet"}</div><h2>{product.name}</h2><div className="cd-line"><b>Fruma Standard</b><span>{wedgeResult?.locked?"Versioned record":"Awaiting lock"}</span></div><div className="cd-line"><b>Commercials</b><span>{wedgeResult?`${wedgeResult.commercials.moqM}m · ${wedgeResult.commercials.leadWeeks}w confirmed`:"Awaiting mill confirm"}</span></div><div className="cd-line"><b>Mill</b><span>{displayMill.name}</span></div></section><section className="cd-card"><p className="cd-eyebrow">Destination projections · not live</p><p className="cd-muted">Channel-lab schemas are synthetic. They do not rewrite locked source facts or prove retailer acceptance.</p><button className="cd-secondary full" onClick={()=>window.location.assign("/channel-lab")}>Open channel-lab sandbox <ArrowRight size={14}/></button></section></div></main>:null}</>:<><nav className="cd-subnav">{factorySteps.map(s=><button key={s.id} className={factoryStep===s.id?"active":""} onClick={()=>setFactoryStep(s.id)}>{s.label}</button>)}</nav>{factoryStep==="setup"?<DemoPromotedFactorySetup result={wedgeResult} onResult={setWedgeResult} onComplete={()=>setFactoryStep("book")}/>:null}{factoryStep==="requests"?<main className="cd-main dark"><div className="cd-page-head"><div><p>Factory workspace · requests</p><h1>Structured demand arrives against your mapped capability.</h1><span>{wedgeResult?"Mill view stays brand-anonymous after the promoted confirm.":"Run promoted factory setup or brand Source wedge first."}</span></div></div><div className="cd-grid two"><section className="cd-card dark"><h2>{wedgeResult?.confirmation.qualityArticle??product.name}</h2><div className="cd-line"><b>Status</b><span>{wedgeResult?.request.brandSide.status??requestState}</span></div><div className="cd-line"><b>MOQ confirmed</b><span>{wedgeResult?`${wedgeResult.commercials.moqM}m`:"—"}</span></div><div className="cd-line"><b>Lead confirmed</b><span>{wedgeResult?`${wedgeResult.commercials.leadWeeks}w`:"—"}</span></div>{wedgeResult?<div className="cd-success"><Check size={14}/> Timestamped mill confirmation on the Demo spine</div>:<button className="cd-primary full" onClick={()=>setRequestState("answered")}>Submit current response</button>}</section><section className="cd-card dark"><p className="cd-eyebrow">Mill-visible request</p>{wedgeResult?<>{[wedgeResult.request.millVisible.millVisible.category,wedgeResult.request.millVisible.millVisible.colour,wedgeResult.request.millVisible.millVisible.deliveryRegion].filter(Boolean).map(r=><div className="cd-line" key={String(r)}><Check size={13}/><span>{r}</span></div>)}<p className="cd-eyebrow">Brand id is not on this view.</p></>:recommendationFor(product,reqs,mill).reasons.map(r=><div className="cd-line" key={r}><Check size={13}/><span>{r}</span></div>)}</section></div></main>:null}{factoryStep==="book"?<main className="cd-main dark"><div className="cd-page-head"><div><p>Factory workspace · mapped book</p><h1>Your quality book, now searchable through Fruma.</h1></div></div><div className="v3-stat-grid"><div><b>{promotedBook??"—"}</b><span>Mapped qualities</span></div><div><b>{wedgeResult?.pilot.mapping.proposals.length??"—"}</b><span>Headers reviewed</span></div><div><b>{wedgeResult?.pilot.shortlist.matchingFabricCount??"—"}</b><span>Polo-capable fabrics</span></div><div><b>{wedgeResult?"Live":"Awaiting map"}</b><span>Network status</span></div></div></main>:null}{factoryStep==="data"?<main className="cd-main dark"><div className="cd-page-head"><div><p>Factory workspace · data</p><h1>Maintain the mapping without rebuilding your source systems.</h1></div></div><section className="cd-card dark"><div className="cd-line"><b>{wedgeResult?.pilot.workbook.filename??"Pilot fabric book"}</b><span>{wedgeResult?"Mapped on Demo spine":"Not mapped yet"}</span><em>{promotedBook?`${promotedBook} qualities`:"—"}</em></div><button className="cd-primary" onClick={()=>setFactoryStep("setup")}><Upload size={14}/> Re-run promoted mapping</button></section></main>:null}{factoryStep==="evidence"?<main className="cd-main dark"><div className="cd-page-head"><div><p>Evidence</p><h1>Evidence stays scoped to the facts it supports.</h1></div></div><div className="cd-supplier-grid">{(wedgeResult?.pilot.shortlist.evidence??[]).map(e=><article className="cd-card dark" key={e.code}><ShieldCheck size={20}/><h2>{e.title}</h2><p>{e.detail}</p></article>)}{!wedgeResult?mill.certifications.map(c=><article className="cd-card dark" key={c}><ShieldCheck size={20}/><h2>{c}</h2><p>Seeded demo evidence · run promoted setup for live flags</p></article>):null}</div></main>:null}{factoryStep==="samples"?<main className="cd-main dark"><div className="cd-page-head"><div><p>Samples</p><h1>Physical development stays linked to the same product case.</h1></div></div><section className="cd-card dark"><div className="cd-line"><b>{product.name}</b><span>{wedgeResult?.locked.lockedSourceId??mill.name}</span><em>{sampleState}</em></div></section></main>:null}{factoryStep==="messages"?<main className="cd-main dark"><div className="cd-page-head"><div><p>Messages</p><h1>Conversations stay attached to requests, evidence and samples.</h1></div></div><section className="cd-card dark"><MessageSquare size={20}/><h2>Current sourcing case</h2><p>Linked to {product.sku}</p></section></main>:null}</>}</div>;
}
