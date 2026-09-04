"use client";

import { useState } from "react";
import { ArrowRight, Check, Database, FileCheck2, FileText, MapPinned, Upload } from "lucide-react";
import { InteractivePlatform } from "@/components/fruma/InteractivePlatform";

type SetupStage = "profile" | "file" | "map" | "review" | "workspace";

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

export function FrumaDemoPlatform() {
  const [stage, setStage] = useState<SetupStage>("profile");
  const [profileSaved, setProfileSaved] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [mappingAccepted, setMappingAccepted] = useState(false);

  if (stage === "workspace") return <InteractivePlatform initialMode="mill"/>;

  const steps = [
    ["profile", "1. Factory profile"],
    ["file", "2. Upload data"],
    ["map", "3. Map to Fruma Standard"],
    ["review", "4. Review & lock"],
  ] as const;

  return <div className="cd-shell mill">
    <header className="cd-topbar mill"><div className="cd-wordmark">FRUMA</div><div className="cd-workspace">New factory setup</div><div/><div className="cd-avatar">VM</div></header>
    <main className="cd-main dark">
      <div className="cd-page-head"><div><p>Factory onboarding</p><h1>Set up the factory before entering Fruma.</h1><span>A new factory first establishes its profile, uploads its working data, maps that language to the Fruma Standard, reviews the result and locks the setup. Then the full operating platform unlocks.</span></div></div>
      <div className="fx-data-steps">{steps.map(([id, label]) => <div key={id} className={stage === id || (id === "profile" && profileSaved) || (id === "file" && fileLoaded) || (id === "map" && mappingAccepted) ? "active" : ""}><span>{label}</span><b>{stage === id ? "In progress" : id === "profile" && profileSaved || id === "file" && fileLoaded || id === "map" && mappingAccepted ? "Complete" : "Locked"}</b></div>)}</div>

      {stage === "profile" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 1</p><h2>Factory profile</h2><label>Factory name<input defaultValue="Vale do Ave Textile Works"/></label><label>Location<input defaultValue="Famalicão, Portugal"/></label><label>Core capabilities<input defaultValue="Jersey, interlock, pique, technical cotton"/></label><label>Typical MOQ<input defaultValue="150–600 metres"/></label><label>Lead-time range<input defaultValue="5–9 weeks"/></label><button className="cd-primary full" onClick={() => { setProfileSaved(true); setStage("file"); }}><Check size={14}/> Save factory profile</button></section><section className="cd-card dark"><p className="cd-eyebrow">Why this matters</p><h2>Identity before discovery.</h2><p>The factory is not searchable yet. Its own quality book still has to be ingested, mapped and reviewed before matching can use it.</p></section></div> : null}

      {stage === "file" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 2</p><h2>Upload the factory working file</h2><p>Use the seeded hanger list or upload the factory&apos;s own file. The original source rows are retained exactly as supplied.</p><a className="cd-secondary full" href="/demo/sample-mill-hanger.csv" download><FileText size={14}/> Download sample hanger CSV</a><button className="cd-primary full" onClick={() => setFileLoaded(true)}><Upload size={14}/> Load sample-mill-hanger.csv</button>{fileLoaded ? <div className="cd-success"><Check size={14}/> 4 source rows received · original values preserved</div> : null}<button className="cd-primary full" disabled={!fileLoaded} onClick={() => setStage("map")}>Continue to mapping <ArrowRight size={14}/></button></section><section className="cd-card dark"><p className="cd-eyebrow">Source preview</p><h2>Factory language stays visible</h2><div className="cd-line"><b>Article</b><span>SYN-QA-100</span></div><div className="cd-line"><b>Construction</b><span>S/J 30/1</span></div><div className="cd-line"><b>Composition</b><span>100% CO</span></div><div className="cd-line"><b>Weight</b><span>185gr</span></div><div className="cd-line"><b>Width</b><span>160cm</span></div></section></div> : null}

      {stage === "map" ? <section className="cd-card dark"><div className="cd-standard-head"><div><p className="cd-eyebrow">Step 3</p><h2>Factory source → Fruma Standard</h2><p>Source field, source value, canonical field and canonical interpretation stay visible together.</p></div></div><div className="cd-table-head map"><span>Factory field</span><span>Source value</span><span>Fruma field</span><span>Canonical value</span><span>Status</span></div>{mappingRows.map((r, i) => <div className="cd-table-row map" key={r[0]}><b>{r[0]}</b><span>{r[2]}</span><code>{r[1]}</code><span>{r[3]}</span><small>{mappingAccepted ? "Reviewed" : i < 6 ? r[4] : "Needs review"}</small></div>)}<div className="cd-actions end"><button className="cd-primary" onClick={() => { setMappingAccepted(true); setStage("review"); }}><MapPinned size={14}/> Review & accept mappings</button></div></section> : null}

      {stage === "review" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 4</p><h2>Review and lock the factory record</h2><div className="cd-success"><Check size={14}/> 8 fields mapped with source lineage preserved</div><div className="cd-line"><b>Factory profile</b><span>Confirmed</span></div><div className="cd-line"><b>Source file</b><span>sample-mill-hanger.csv</span></div><div className="cd-line"><b>Reusable mapping</b><span>Reviewed</span></div><div className="cd-line"><b>Commercial terms</b><span>Mapped but freshness-aware</span></div><div className="cd-line"><b>Evidence claim</b><span>Requires scoped document review</span></div><button className="cd-primary full" onClick={() => setStage("workspace")}><FileCheck2 size={14}/> Lock setup & enter full factory workspace</button></section><section className="cd-card dark"><Database size={24}/><h2>What locking unlocks</h2><p>The complete Fruma operating product opens: factory Home, Requests, Book, Data, Evidence, Samples, Orders and Messages, plus the full Brand workspace via the mode switch.</p></section></div> : null}
    </main>
  </div>;
}
