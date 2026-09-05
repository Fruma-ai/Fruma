"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Image as ImageIcon, LoaderCircle, Send, Sparkles, Upload } from "lucide-react";
import { featuredProduct, mills } from "@/lib/fruma/demo-data";

type ConceptState = "empty" | "uploaded" | "interpreting" | "generated" | "pdp" | "sent" | "validated";
type ConceptMode = "ai" | "source-fallback" | "none";

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
  "Reading sketch / technical pack",
  "Reconciling visual and technical requirements",
  "Flagging conflicts, gaps and unsupported assumptions",
  "Building faithful finished-product interpretation",
];

export function ProductConceptLab() {
  const [state, setState] = useState<ConceptState>("empty");
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [sketchFile, setSketchFile] = useState<File | null>(null);
  const [conceptUrl, setConceptUrl] = useState("");
  const [conceptMode, setConceptMode] = useState<ConceptMode>("none");
  const [generationError, setGenerationError] = useState("");
  const [selectedMillId, setSelectedMillId] = useState(featuredProduct.shortlistMillIds[0] ?? mills[0].id);
  const selectedMill = useMemo(() => mills.find((m) => m.id === selectedMillId) ?? mills[0], [selectedMillId]);
  const hasConcept = ["generated", "pdp", "sent", "validated"].includes(state);
  const hasPdp = ["pdp", "sent", "validated"].includes(state);
  const displayedConceptUrl = conceptUrl || previewUrl;

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function onUpload(file?: File) {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSketchFile(file);
    setFileName(file.name);
    setConceptUrl("");
    setConceptMode("none");
    setGenerationError("");
    setState("uploaded");
  }

  async function generateConcept() {
    if (!sketchFile) return;
    setState("interpreting");
    setGenerationError("");
    setConceptUrl("");
    setConceptMode("none");

    try {
      const form = new FormData();
      form.append("sketch", sketchFile);
      form.append("brief", featuredProduct.intent);
      const response = await fetch("/api/product-concept", { method: "POST", body: form });
      const payload = await response.json();

      if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "AI concept generation failed.");
      setConceptUrl(payload.imageUrl);
      setConceptMode("ai");
    } catch (error) {
      setConceptMode("source-fallback");
      setGenerationError(error instanceof Error ? error.message : "AI concept generation is unavailable.");
    } finally {
      setState("generated");
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setSketchFile(null);
    setFileName("");
    setConceptUrl("");
    setConceptMode("none");
    setGenerationError("");
    setState("empty");
  }

  return <section className="pc-wrap">
    <div className="pc-head">
      <div><p className="fx-eyebrow">Search / brief → sketch + tech pack → approved specification → concept → sample validation</p><h2>Generate the product the data describes — not a redesigned version of it.</h2><p>Fruma starts with what the designer is trying to create, adds the sketch and technical details as constraints, reconciles conflicts and missing decisions, then creates a faithful visual interpretation from the approved product specification.</p></div>
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
        <div className="fx-card-head"><div><p className="fx-eyebrow">Reference input</p><h3>Product search / brief + sketch + technical details</h3></div><Upload size={18}/></div>
        <label className="pc-upload"><input type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0])}/>{previewUrl ? <img src={previewUrl} alt="Uploaded product sketch or technical pack preview"/> : <><ImageIcon size={28}/><b>Upload sketch or technical pack</b><span>PNG, JPG or WEBP</span></>}</label>
        {fileName ? <div className="pc-file"><Check size={14}/><span>{fileName}</span><button type="button" onClick={reset}>Replace</button></div> : null}
        <div className="pc-brief"><b>{featuredProduct.name}</b><p>{featuredProduct.intent}</p></div>
        <div className="pc-intent-table">{approvedIntent.map(([label,value,source]) => <div key={label}><span>{label}</span><b>{value}</b><small>{source}</small></div>)}</div>
        <button className="fx-primary full" disabled={state === "empty" || state === "interpreting"} onClick={generateConcept}>{state === "interpreting" ? <LoaderCircle size={14} className="pc-spin"/> : <Sparkles size={14}/>} {state === "interpreting" ? "Reconciling product data…" : hasConcept ? "Regenerate from current approved data" : "Generate potential end product"}</button>
      </section>

      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Observable AI work</p><h3>Product-data reconciliation</h3></div>{state === "interpreting" ? <span className="fx-status live">Working</span> : hasConcept ? <span className="fx-status live">Complete</span> : <span className="fx-status">Waiting</span>}</div>
        <div className="pc-ai-steps">{aiSteps.map((step, i) => <div key={step} className={state === "interpreting" && i === 4 ? "active" : hasConcept ? "done" : state !== "empty" && i < 2 ? "done" : ""}>{state === "interpreting" && i === 4 ? <LoaderCircle size={14} className="pc-spin"/> : <Check size={14}/>}<span>{step}</span></div>)}</div>
        {state !== "empty" ? <div className="pc-warning"><b>Generation rule</b><span>The concept may only visualise approved design intent. Unsupported trims, colours, branding, construction or styling must not be invented; unresolved details stay neutral or are flagged for review.</span></div> : null}
        {previewUrl ? <div className="pc-source-line"><span>Uploaded source</span><b>{fileName}</b><small>Designer reference · provenance preserved</small></div> : null}
      </section>
    </div>

    {hasConcept ? <div className="pc-concept-pdp-grid">
      <section className="fx-card pc-panel">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Finished-product concept</p><h3>Potential end product</h3></div><span className="fx-status live">{conceptMode === "ai" ? "AI interpretation" : "Source-backed preview"}</span></div>
        <div className="pc-concept" aria-label="Generated product visual derived from the reconciled approved specification">
          {displayedConceptUrl ? <div className="pc-concept-image-wrap"><img src={displayedConceptUrl} alt="Potential finished-product concept generated from approved product data"/></div> : null}
          <div className="pc-concept-copy"><span>{conceptMode === "ai" ? "AI interpretation · not confirmed product truth" : "Source reference fallback · AI generation unavailable"}</span><b>Men’s polo · Navy 19-3920 TCX · cotton piqué · regular fit</b><small>{conceptMode === "ai" ? "Generated from product search / brief + uploaded sketch / technical pack + approved requirements. The visual follows current approved intent; physical sample evidence is what can confirm product truth." : "Fruma shows the uploaded source rather than pretending a generic image was generated. The approved product specification remains the generation constraint."}</small></div>
        </div>
        {generationError ? <div className="pc-warning"><b>Concept image generation unavailable</b><span>{generationError} The uploaded source is shown as a truthful fallback instead of a hard-coded product image.</span></div> : null}
        <div className="pc-truth"><Check size={14}/><span>Product search, designer brief, sketch, technical pack, approved requirements and generated status remain linked to this concept.</span></div>
        {!hasPdp ? <button className="fx-primary full" onClick={() => setState("pdp")}>Build fictional PDP preview <ArrowRight size={14}/></button> : null}
      </section>

      <section className="fx-card pc-panel pc-pdp">
        <div className="fx-card-head"><div><p className="fx-eyebrow">Fictional destination preview</p><h3>Aster & Row PDP</h3></div>{hasPdp ? <span className="fx-status live">Preview ready</span> : <span className="fx-status">Waiting</span>}</div>
        {hasPdp ? <div className="pdp-shell"><div className="pdp-brand">ASTER & ROW</div><div className="pdp-hero"><div className="pdp-photo">{displayedConceptUrl ? <img src={displayedConceptUrl} alt="AI interpreted navy cotton pique polo in fictional PDP preview"/> : null}<span>{conceptMode === "ai" ? "AI visual · not confirmed truth" : "Source preview · not product truth"}</span></div><div className="pdp-copy"><small>MEN / POLO SHIRTS</small><h4>Navy Cotton Piqué Polo</h4><b>£85 <span>Fictional preview</span></b><p>Classic regular-fit navy polo interpreted from the approved design brief and technical pack.</p><dl><div><dt>Colour</dt><dd>Navy · 19-3920 TCX</dd></div><div><dt>Fabric</dt><dd>100% cotton piqué · ~220 GSM target</dd></div><div><dt>Fit</dt><dd>Regular fit</dd></div><div><dt>Construction</dt><dd>Rib collar + cuffs · 3-button placket · side splits</dd></div></dl><button type="button">Preview only · not purchasable</button></div></div></div> : <div className="pc-empty"><Sparkles size={30}/><b>PDP preview appears here</b><p>Fruma only populates fields supported by approved product intent. Missing or disputed facts stay missing.</p></div>}
        {hasPdp ? <div className="pc-pdp-note"><b>Approved-intent only</b><span>This preview does not invent unsupported product claims. AI interpretation remains separate from physically validated product truth.</span></div> : null}
      </section>
    </div> : null}

    {hasPdp ? <section className="fx-card pc-sample">
      <div><p className="fx-eyebrow">Physical-development boundary</p><h3>{state === "validated" ? "Validated product truth" : "Request a physical sample"}</h3><p>{state === "validated" ? "The sample stage upgrades only the facts actually confirmed by physical review and evidence. The original AI concept remains preserved as a generated interpretation." : "Send the search / brief, sketch, technical pack, visual concept and approved requirements as development references. The factory response and physical sample are what can confirm product facts."}</p></div>
      <div className="pc-request-row"><label>Factory / mill<select value={selectedMillId} onChange={(e) => { setSelectedMillId(e.target.value); if (state === "sent" || state === "validated") setState("pdp"); }}>{mills.slice(0, 8).map((m) => <option value={m.id} key={m.id}>{m.name} · {m.country}</option>)}</select></label><div><span>Attached</span><b>Search / brief + sketch / tech pack + AI concept + approved requirements + provenance</b></div></div>
      {state === "sent" ? <><div className="pc-sent"><Check size={16}/><div><b>Sample request sent to {selectedMill.name}</b><span>Concept remains AI-generated. Awaiting physical validation.</span></div></div><button className="fx-primary" onClick={() => setState("validated")}><Check size={14}/> Demo sample validated</button></> : state === "validated" ? <div className="pc-validated"><Check size={16}/><div><b>State upgraded: validated product truth</b><span>Only physically confirmed and evidenced attributes move to validated status; all provenance remains visible.</span></div></div> : <button className="fx-primary" onClick={() => setState("sent")}><Send size={14}/> Send sample request <ArrowRight size={14}/></button>}
    </section> : null}
  </section>;
}
