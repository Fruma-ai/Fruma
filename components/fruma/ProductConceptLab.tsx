"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Image as ImageIcon, Send, Sparkles, Upload } from "lucide-react";
import { featuredProduct, mills } from "@/lib/fruma/demo-data";

type ConceptState = "empty" | "uploaded" | "generated" | "sent";
const SAMPLE_SKETCH = "/demo/sample-brand-sketch.svg";

export function ProductConceptLab() {
  const [state, setState] = useState<ConceptState>("uploaded");
  const [fileName, setFileName] = useState("sample-brand-sketch.svg");
  const [previewUrl, setPreviewUrl] = useState(SAMPLE_SKETCH);
  const [selectedMillId, setSelectedMillId] = useState(featuredProduct.shortlistMillIds[0] ?? mills[0].id);
  const selectedMill = useMemo(() => mills.find((m) => m.id === selectedMillId) ?? mills[0], [selectedMillId]);

  useEffect(() => () => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function onUpload(file?: File) {
    if (!file) return;
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setState("uploaded");
  }

  function reset() {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(SAMPLE_SKETCH);
    setFileName("sample-brand-sketch.svg");
    setState("uploaded");
  }

  return <section className="pc-wrap">
    <div className="pc-head">
      <div><p className="fx-eyebrow">Product concept → sample request</p><h2>Turn a sketch into a factory-ready visual brief.</h2><p>The sketch is reference material, not product truth. AI creates a visual concept from the brief and approved requirements, then the brand can attach it to a sample request.</p></div>
      <span className="cr-preview">Demo workflow</span>
    </div>

    <div className="pc-steps">
      {["Upload sketch", "Generate concept", "Review", "Request sample"].map((x, i) => <div key={x} className={(state === "sent" ? 4 : state === "generated" ? 3 : state === "uploaded" ? 1 : 0) > i ? "done" : ""}><span>{String(i + 1).padStart(2, "0")}</span><b>{x}</b></div>)}
    </div>

    <div className="pc-grid">
      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Reference input</p><h3>Brand sketch</h3></div><Upload size={18}/></div>
        <label className="pc-upload">
          <input type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0])}/>
          {previewUrl ? <img src={previewUrl} alt="Brand product sketch preview"/> : <><ImageIcon size={28}/><b>Upload product sketch</b><span>PNG, JPG or WEBP</span></>}
        </label>
        <div className="pc-file"><Check size={14}/><span>{fileName}</span><button type="button" onClick={reset}>Use sample sketch</button></div>
        <div className="pc-brief"><b>{featuredProduct.name}</b><p>{featuredProduct.intent}</p></div>
        <button className="fx-primary full" disabled={state === "empty"} onClick={() => setState("generated")}><Sparkles size={14}/>{state === "generated" || state === "sent" ? "Regenerate concept" : "Generate AI product concept"}</button>
      </section>

      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">AI visualisation</p><h3>Potential end product</h3></div>{state === "generated" || state === "sent" ? <span className="fx-status live">Generated</span> : <span className="fx-status">Waiting</span>}</div>
        {state === "generated" || state === "sent" ? <div className="pc-concept" aria-label="Generated visual concept of a navy polo shirt">
          <svg viewBox="0 0 420 420" role="img" aria-label="Stylised generated navy polo concept"><path d="M142 88 95 115 45 181l55 35 28-38v165h164V178l28 38 55-35-50-66-47-27-28 25h-80z" fill="#182337"/><path d="m170 88 40 37 40-37-15 58-25-17-25 17z" fill="#eef0ec"/><path d="M210 129v89" stroke="#eef0ec" strokeWidth="5"/><circle cx="222" cy="151" r="3" fill="#182337"/><circle cx="222" cy="167" r="3" fill="#182337"/><path d="M128 178h164M128 206h164M128 234h164M128 262h164M128 290h164" stroke="#263650" strokeWidth="3" opacity=".65"/></svg>
          <div className="pc-concept-copy"><span>AI concept · visual reference only</span><b>Deep navy · structured warp-knit mesh</b><small>Generated from sketch + approved product brief. Not treated as a confirmed physical product fact.</small></div>
        </div> : <div className="pc-empty"><Sparkles size={30}/><b>Concept appears here</b><p>The sample sketch is already loaded. Generate the visualisation to see the workflow immediately.</p></div>}
        {state === "generated" || state === "sent" ? <div className="pc-truth"><Check size={14}/><span>Visual linked to the product case with source sketch, prompt context and generated status preserved.</span></div> : null}
      </section>
    </div>

    {state === "generated" || state === "sent" ? <section className="fx-card pc-sample">
      <div><p className="fx-eyebrow">Factory handoff</p><h3>Request a physical sample</h3><p>Send the visual concept alongside the product brief, material requirements and sourcing context. The factory receives it as a development reference, not as locked product truth.</p></div>
      <div className="pc-request-row"><label>Factory / mill<select value={selectedMillId} onChange={(e) => { setSelectedMillId(e.target.value); if (state === "sent") setState("generated"); }}>{mills.slice(0, 8).map((m) => <option value={m.id} key={m.id}>{m.name} · {m.country}</option>)}</select></label><div><span>Attached</span><b>Sketch + AI concept + product brief + requirements</b></div></div>
      {state === "sent" ? <div className="pc-sent"><Check size={16}/><div><b>Sample request sent to {selectedMill.name}</b><span>Demo request created and linked to {featuredProduct.sku}. The visual remains marked AI-generated.</span></div></div> : <button className="fx-primary" onClick={() => setState("sent")}><Send size={14}/> Send sample request <ArrowRight size={14}/></button>}
    </section> : null}
  </section>;
}
