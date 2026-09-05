"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Image as ImageIcon, LoaderCircle, Send, Sparkles, Upload } from "lucide-react";
import { featuredProduct, mills } from "@/lib/fruma/demo-data";

type ConceptState = "empty" | "uploaded" | "interpreting" | "generated" | "pdp" | "sent" | "validated";

const approvedIntent = [
  ["Product", "Men’s polo shirt · classic silhouette", "Search + designer brief"],
  ["Fabric", "Cotton piqué · 100% cotton · ~220 GSM target", "Tech pack"],
  ["Fit", "Regular fit", "Tech pack"],
  ["Colour", "Navy · 19-3920 TCX", "Tech pack"],
  ["Construction", "Rib knit collar + rib cuffs · 3-button placket · side split hem", "Tech pack"],
  ["Trim", "Matte finish · 4-hole buttons", "Tech pack"],
  ["Target market", "EU + UK + US", "Tech pack"],
];

const aiSteps = [
  "Reading product search + designer brief",
  "Reading sketch and technical pack",
  "Reconciling visual and technical requirements",
  "Flagging conflicts, gaps and unsupported assumptions",
  "Building a faithful potential end-product interpretation",
];

export function ProductConceptLab() {
  const [state, setState] = useState<ConceptState>("empty");
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedMillId, setSelectedMillId] = useState(featuredProduct.shortlistMillIds[0] ?? mills[0].id);
  const selectedMill = useMemo(() => mills.find((m) => m.id === selectedMillId) ?? mills[0], [selectedMillId]);
  const hasConcept = ["generated", "pdp", "sent", "validated"].includes(state);
  const hasPdp = ["pdp", "sent", "validated"].includes(state);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function onUpload(file?: File) {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setState("uploaded");
  }

  function generateConcept() {
    setState("interpreting");
    window.setTimeout(() => setState("generated"), 1700);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFileName("");
    setState("empty");
  }

  return <section className="pc-wrap">
    <div className="pc-head">
      <div><p className="fx-eyebrow">Search / brief → sketch + tech pack → approved specification → concept → sample validation</p><h2>Generate the product the data describes — not a redesigned version of it.</h2><p>Fruma starts with what the designer is trying to create, adds the sketch and technical pack as constraints, reconciles conflicts and missing decisions, then creates a faithful visual interpretation from the approved product specification.</p></div>
      <span className="cr-preview">Provenance preserved</span>
    </div>

    <div className="pc-steps">
      {["Product intent", "Reconcile tech pack", "Potential end product", "Validate sample"].map((x, i) => {
        const progress = state === "validated" ? 4 : state === "sent" || state === "pdp" ? 3 : hasConcept ? 2 : state === "interpreting" || state === "uploaded" ? 1 : 0;
        return <div key={x} className={progress > i ? "done" : ""}><span>{String(i + 1).padStart(2, "0")}</span><b>{x}</b></div>;
      })}
    </div>

    <div className="pc-grid">
      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Reference input</p><h3>Search / brief + sketch + technical details</h3></div><Upload size={18}/></div>
        <label className="pc-upload"><input type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0])}/>{previewUrl ? <img src={previewUrl} alt="Uploaded product sketch or tech pack preview"/> : <><ImageIcon size={28}/><b>Upload sketch or tech pack</b><span>PNG, JPG or WEBP</span></>}</label>
        {fileName ? <div className="pc-file"><Check size={14}/><span>{fileName}</span><button type="button" onClick={reset}>Replace</button></div> : null}
        <div className="pc-brief"><b>{featuredProduct.name}</b><p>{featuredProduct.intent}</p></div>
        <div className="pc-intent-table">{approvedIntent.map(([label,value,source]) => <div key={label}><span>{label}</span><b>{value}</b><small>{source}</small></div>)}</div>
        <button className="fx-primary full" disabled={state === "empty" || state === "interpreting"} onClick={generateConcept}>{state === "interpreting" ? <LoaderCircle size={14} className="pc-spin"/> : <Sparkles size={14}/>} {state === "interpreting" ? "Reconciling product data…" : hasConcept ? "Regenerate from current approved data" : "Generate potential end product"}</button>
      </section>

      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Observable AI work</p><h3>Product-data reconciliation</h3></div>{state === "interpreting" ? <span className="fx-status live">Working</span> : hasConcept ? <span className="fx-status live">Complete</span> : <span className="fx-status">Waiting</span>}</div>
        <div className="pc-ai-steps">{aiSteps.map((step, i) => <div key={step} className={state === "interpreting" && i === 4 ? "active" : hasConcept ? "done" : state !== "empty" && i < 2 ? "done" : ""}>{state === "interpreting" && i === 4 ? <LoaderCircle size={14} className="pc-spin"/> : <Check size={14}/>}<span>{step}</span></div>)}</div>
        {state !== "empty" ? <div className="pc-warning"><b>Generation rule</b><span>The concept may only visualise approved design intent. Unsupported trims, colours, branding, construction or styling must not be invented; unresolved details stay neutral or are flagged for review.</span></div> : null}
        {previewUrl ? <div className="pc-source-line"><span>Uploaded source</span><b>{fileName}</b><small>Designer reference · preserved provenance</small></div> : null}
      </section>
    </div>

    {hasConcept ? <div className="pc-concept-pdp-grid">
      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Finished-product concept</p><h3>Potential end product</h3></div><span className="fx-status live">AI interpretation</span></div>
        <div className="pc-concept" aria-label="Generated visual interpretation of the approved navy cotton pique polo"><img className="pc-concept-image" src="/products/preview-pique-navy-polo.png" alt="Potential end product: navy cotton pique men’s polo generated from approved design intent"/><div className="pc-concept-copy"><span>AI interpretation · not confirmed product truth</span><b>Men’s polo · Navy 19-3920 TCX · cotton piqué · regular fit</b><small>Generated from product search / brief + uploaded sketch + technical pack + approved requirements. The visual follows the current approved data; the physical sample is what can confirm final product truth.</small></div></div>
        <div className="pc-intent-table pc-concept-specs">{approvedIntent.slice(1, 6).map(([label,value,source]) => <div key={label}><span>{label}</span><b>{value}</b><small>{source}</small></div>)}</div>
        <div className="pc-truth"><Check size={14}/><span>Source search, designer brief, sketch, technical pack, approved requirements and generated status remain linked to this concept.</span></div>
        {!hasPdp ? <button className="fx-primary full" onClick={() => setState("pdp")}>Build fictional PDP preview <ArrowRight size={14}/></button> : null}
      </section>

      <section className="fx-card pc-panel pc-pdp">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Fictional destination preview</p><h3>Aster & Row PDP</h3></div>{hasPdp ? <span className="fx-status live">Preview ready</span> : <span className="fx-status">Waiting</span>}</div>
        {hasPdp ? <div className="pdp-shell"><div className="pdp-brand">ASTER & ROW</div><div className="pdp-hero"><div className="pdp-photo"><img src="/products/preview-pique-navy-polo.png" alt="AI visual preview of navy cotton pique polo"/><span>AI visual · not confirmed truth</span></div><div className="pdp-copy"><small>MEN / POLO SHIRTS</small><h4>Navy Cotton Piqué Polo</h4><b>£85 <span>Fictional preview</span></b><p>Classic regular-fit navy polo interpreted from the approved design brief and technical pack.</p><dl><div><dt>Colour</dt><dd>Navy · 19-3920 TCX</dd></div><div><dt>Fabric</dt><dd>100% cotton piqué · ~220 GSM target</dd></div><div><dt>Fit</dt><dd>Regular fit</dd></div><div><dt>Construction</dt><dd>Rib collar + cuffs · 3-button placket · side splits</dd></div></dl><button type="button">Preview only · not purchasable</button></div></div></div> : <div className="pc-empty"><Sparkles size={30}/><b>PDP preview appears here</b><p>Fruma only populates fields supported by approved product intent. Missing or disputed facts stay missing.</p></div>}
        {hasPdp ? <div className="pc-pdp-note"><b>Approved-intent only</b><span>This preview does not invent unsupported product claims. AI interpretation remains separate from physically validated product truth.</span></div> : null}
      </section>
    </div> : null}

    {hasPdp ? <section className="fx-card pc-sample">
      <div><p className="fx-eyebrow">Physical-development boundary</p><h3>{state === "validated" ? "Validated product truth" : "Request a physical sample"}</h3><p>{state === "validated" ? "The sample stage upgrades only the facts actually confirmed by physical review and evidence. The original AI concept remains preserved as a generated interpretation." : "Send the search / brief, sketch, technical pack, visual concept and approved requirements as development references. The factory response and physical sample are what can confirm product facts."}</p></div>
      <div className="pc-request-row"><label>Factory / mill<select value={selectedMillId} onChange={(e) => { setSelectedMillId(e.target.value); if (state === "sent" || state === "validated") setState("pdp"); }}>{mills.slice(0, 8).map((m) => <option value={m.id} key={m.id}>{m.name} · {m.country}</option>)}</select></label><div><span>Attached</span><b>Search / brief + sketch + tech pack + AI concept + approved requirements + provenance</b></div></div>
      {state === "sent" ? <><div className="pc-sent"><Check size={16}/><div><b>Sample request sent to {selectedMill.name}</b><span>Concept remains AI-generated. Awaiting physical validation.</span></div></div><button className="fx-primary" onClick={() => setState("validated")}><Check size={14}/> Demo sample validated</button></> : state === "validated" ? <div className="pc-validated"><Check size={16}/><div><b>State upgraded: validated product truth</b><span>Only physically confirmed and evidenced attributes move to validated status; all provenance remains visible.</span></div></div> : <button className="fx-primary" onClick={() => setState("sent")}><Send size={14}/> Send sample request <ArrowRight size={14}/></button>}
    </section> : null}
  </section>;
}
