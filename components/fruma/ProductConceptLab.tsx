"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Image as ImageIcon, LoaderCircle, Send, Sparkles, Upload } from "lucide-react";
import { featuredProduct, mills } from "@/lib/fruma/demo-data";

type ConceptState = "empty" | "uploaded" | "interpreting" | "generated" | "pdp" | "sent" | "validated";

const approvedIntent = [
  ["Product", "Textured navy polo", "Designer brief"],
  ["Material intent", "Extra-long staple cotton", "Approved requirement"],
  ["Construction", "Structured warp-knit mesh · not piqué", "Approved requirement"],
  ["Colour", "Deep navy", "Designer brief"],
  ["Handfeel", "Premium · dry", "Designer brief"],
  ["Target market", "UK + EU", "Approved requirement"],
];

const aiSteps = ["Reading sketch", "Reconciling sketch with written brief", "Checking approved requirements", "Separating confirmed intent from suggestions", "Building visual interpretation"];

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
      <div><p className="fx-eyebrow">Product concept → PDP preview → sample validation</p><h2>Turn product intent into a visual concept without turning AI into truth.</h2><p>Fruma interprets the uploaded sketch alongside the written brief and approved requirements, preserves where every input came from, and uses only approved intent to create a fictional brand PDP preview.</p></div>
      <span className="cr-preview">Provenance preserved</span>
    </div>

    <div className="pc-steps">
      {["Upload sketch", "Interpret intent", "Concept + PDP", "Validate sample"].map((x, i) => {
        const progress = state === "validated" ? 4 : state === "sent" || state === "pdp" ? 3 : hasConcept ? 2 : state === "interpreting" || state === "uploaded" ? 1 : 0;
        return <div key={x} className={progress > i ? "done" : ""}><span>{String(i + 1).padStart(2, "0")}</span><b>{x}</b></div>;
      })}
    </div>

    <div className="pc-grid">
      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Reference input</p><h3>Designer sketch + product intent</h3></div><Upload size={18}/></div>
        <label className="pc-upload"><input type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0])}/>{previewUrl ? <img src={previewUrl} alt="Uploaded product sketch preview"/> : <><ImageIcon size={28}/><b>Upload product sketch</b><span>PNG, JPG or WEBP</span></>}</label>
        {fileName ? <div className="pc-file"><Check size={14}/><span>{fileName}</span><button type="button" onClick={reset}>Replace</button></div> : null}
        <div className="pc-brief"><b>{featuredProduct.name}</b><p>{featuredProduct.intent}</p></div>
        <div className="pc-intent-table">{approvedIntent.map(([label,value,source]) => <div key={label}><span>{label}</span><b>{value}</b><small>{source}</small></div>)}</div>
        <button className="fx-primary full" disabled={state === "empty" || state === "interpreting"} onClick={generateConcept}>{state === "interpreting" ? <LoaderCircle size={14} className="pc-spin"/> : <Sparkles size={14}/>} {state === "interpreting" ? "Interpreting product intent…" : hasConcept ? "Regenerate concept" : "Generate AI product concept"}</button>
      </section>

      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Observable AI work</p><h3>Sketch interpretation</h3></div>{state === "interpreting" ? <span className="fx-status live">Working</span> : hasConcept ? <span className="fx-status live">Complete</span> : <span className="fx-status">Waiting</span>}</div>
        <div className="pc-ai-steps">{aiSteps.map((step, i) => <div key={step} className={state === "interpreting" && i === 4 ? "active" : hasConcept ? "done" : state !== "empty" && i < 2 ? "done" : ""}>{state === "interpreting" && i === 4 ? <LoaderCircle size={14} className="pc-spin"/> : <Check size={14}/>}<span>{step}</span></div>)}</div>
        {state !== "empty" ? <div className="pc-warning"><b>Interpretation boundary</b><span>Sketch visuals may suggest shape or construction, but they do not confirm material, weight, quality, compliance or sample performance.</span></div> : null}
        {previewUrl ? <div className="pc-source-line"><span>Source sketch</span><b>{fileName}</b><small>Uploaded by designer · reference input</small></div> : null}
      </section>
    </div>

    {hasConcept ? <div className="pc-concept-pdp-grid">
      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Finished-product concept</p><h3>Potential end product</h3></div><span className="fx-status live">AI interpretation</span></div>
        <div className="pc-concept" aria-label="Generated visual concept of a navy polo shirt"><svg viewBox="0 0 420 420" role="img" aria-label="Stylised generated navy polo concept"><defs><linearGradient id="shirt" x1="0" x2="1"><stop offset="0" stopColor="#172235"/><stop offset="1" stopColor="#263751"/></linearGradient></defs><path d="M142 88 95 115 45 181l55 35 28-38v165h164V178l28 38 55-35-50-66-47-27-28 25h-80z" fill="url(#shirt)"/><path d="m170 88 40 37 40-37-15 58-25-17-25 17z" fill="#eef0ec"/><path d="M210 129v89" stroke="#eef0ec" strokeWidth="5"/><circle cx="222" cy="151" r="3" fill="#182337"/><circle cx="222" cy="167" r="3" fill="#182337"/><path d="M128 178h164M128 206h164M128 234h164M128 262h164M128 290h164" stroke="#4e6685" strokeWidth="2" opacity=".55"/></svg><div className="pc-concept-copy"><span>AI interpretation · not confirmed product truth</span><b>Deep navy · structured warp-knit mesh direction</b><small>Generated from uploaded sketch + written brief + approved requirements. The image itself cannot promote a fact to confirmed status.</small></div></div>
        <div className="pc-truth"><Check size={14}/><span>Source sketch, designer brief, approved requirements and generated status remain linked to this concept.</span></div>
        {!hasPdp ? <button className="fx-primary full" onClick={() => setState("pdp")}>Build fictional PDP preview <ArrowRight size={14}/></button> : null}
      </section>

      <section className="fx-card pc-panel pc-pdp">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Fictional destination preview</p><h3>Aster & Row PDP</h3></div>{hasPdp ? <span className="fx-status live">Preview ready</span> : <span className="fx-status">Waiting</span>}</div>
        {hasPdp ? <div className="pdp-shell"><div className="pdp-brand">ASTER & ROW</div><div className="pdp-hero"><div className="pdp-photo"><svg viewBox="0 0 420 420" aria-hidden="true"><path d="M142 88 95 115 45 181l55 35 28-38v165h164V178l28 38 55-35-50-66-47-27-28 25h-80z" fill="#182337"/><path d="m170 88 40 37 40-37-15 58-25-17-25 17z" fill="#efeee8"/></svg><span>AI visual · not confirmed truth</span></div><div className="pdp-copy"><small>MEN / POLO SHIRTS</small><h4>Textured Navy Cotton Polo</h4><b>£85 <span>Fictional preview</span></b><p>Refined navy polo concept with a structured, breathable feel and premium dry handfeel, created from the approved product intent.</p><dl><div><dt>Colour</dt><dd>Deep navy</dd></div><div><dt>Material intent</dt><dd>Extra-long staple cotton</dd></div><div><dt>Construction</dt><dd>Structured warp-knit mesh · not piqué</dd></div><div><dt>Market</dt><dd>UK + EU</dd></div></dl><button type="button">Preview only · not purchasable</button></div></div></div> : <div className="pc-empty"><Sparkles size={30}/><b>PDP preview appears here</b><p>Fruma will only populate fields that come from approved intent. Missing facts stay missing.</p></div>}
        {hasPdp ? <div className="pc-pdp-note"><b>Approved-intent only</b><span>No fibre %, fabric weight, care, sustainability, compliance or performance claims are invented here because they are not yet confirmed.</span></div> : null}
      </section>
    </div> : null}

    {hasPdp ? <section className="fx-card pc-sample">
      <div><p className="fx-eyebrow">Physical-development boundary</p><h3>{state === "validated" ? "Validated product truth" : "Request a physical sample"}</h3><p>{state === "validated" ? "The sample stage upgrades only the facts actually confirmed by physical review and evidence. The original AI concept remains preserved as a generated interpretation." : "Send the sketch, visual concept and approved requirements as development references. The factory response and physical sample are what can confirm product facts."}</p></div>
      <div className="pc-request-row"><label>Factory / mill<select value={selectedMillId} onChange={(e) => { setSelectedMillId(e.target.value); if (state === "sent" || state === "validated") setState("pdp"); }}>{mills.slice(0, 8).map((m) => <option value={m.id} key={m.id}>{m.name} · {m.country}</option>)}</select></label><div><span>Attached</span><b>Sketch + AI concept + approved requirements + provenance</b></div></div>
      {state === "sent" ? <><div className="pc-sent"><Check size={16}/><div><b>Sample request sent to {selectedMill.name}</b><span>Concept remains AI-generated. Awaiting physical validation.</span></div></div><button className="fx-primary" onClick={() => setState("validated")}><Check size={14}/> Demo sample validated</button></> : state === "validated" ? <div className="pc-validated"><Check size={16}/><div><b>State upgraded: validated product truth</b><span>Only physically confirmed and evidenced attributes move to validated status; all provenance remains visible.</span></div></div> : <button className="fx-primary" onClick={() => setState("sent")}><Send size={14}/> Send sample request <ArrowRight size={14}/></button>}
    </section> : null}
  </section>;
}
