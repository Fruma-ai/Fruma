"use client";

import { useState } from "react";
import { ArrowRight, Check, Database, FileCheck2, Home, MapPinned, Upload } from "lucide-react";
import { CustomerDemoPlatform } from "@/components/fruma/CustomerDemoPlatform";

const mappingRows = [
  ["Article", "quality.article_code", "SYN-QA-100", "SYN-QA-100"],
  ["Construction", "material.construction", "S/J 30/1", "Single jersey 30/1"],
  ["Composition", "material.fibre_composition", "100% CO", "100% cotton"],
  ["Weight", "material.weight_gsm", "185gr", "185 gsm"],
  ["Width", "material.width_cm", "160cm", "160 cm"],
  ["Colour", "product.colour", "Navy", "Navy"],
  ["MOQ", "commercial.moq_m", "150M", "150 m"],
  ["Cert", "evidence.certification", "OEKO-TEX", "Needs evidence review"],
];

type Stage = "profile" | "file" | "map" | "review" | "home" | "full";

export function FactoryFirstPlatform() {
  const [stage, setStage] = useState<Stage>("profile");
  const [profileSaved, setProfileSaved] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [mappingAccepted, setMappingAccepted] = useState(false);

  if (stage === "full") return <CustomerDemoPlatform />;

  if (stage === "home") {
    return <div className="cd-shell mill">
      <header className="cd-topbar mill"><div className="cd-wordmark">FRUMA</div><div className="cd-workspace">Vale do Ave Textile Works</div><div/><div className="cd-avatar">VM</div></header>
      <nav className="cd-subnav"><button className="active"><Home size={14}/> Home</button><button>Requests</button><button>Book</button><button onClick={() => setStage("map")}>Data</button><button>Evidence</button><button>Samples</button><button>Messages</button></nav>
      <main className="cd-main dark">
        <div className="cd-page-head"><div><p>Factory workspace</p><h1>Your factory is set up.</h1><span>The profile and first data mapping are locked. Fruma can now use the mapped factory book for requests, matching and evidence workflows.</span></div><button className="cd-secondary" onClick={() => setStage("full")}>Open full Fruma demo</button></div>
        <div className="cd-grid two">
          <section className="cd-card dark"><div className="cd-success"><Check size={14}/> Setup complete</div><h2>Vale do Ave Textile Works</h2><div className="cd-line"><b>Profile</b><span>Confirmed</span></div><div className="cd-line"><b>Source file</b><span>sample-mill-hanger.csv</span></div><div className="cd-line"><b>Mapped fields</b><span>8 Fruma Standard fields</span></div><div className="cd-line"><b>Source preserved</b><span>100%</span></div></section>
          <section className="cd-card dark"><p className="cd-eyebrow">What happens next</p><h2>Factory home</h2><div className="cd-line"><b>Requests</b><span>Receive product cases matched to your mapped book</span></div><div className="cd-line"><b>Book</b><span>Manage qualities in your own language + Fruma mapping</span></div><div className="cd-line"><b>Evidence</b><span>Attach scope and validity to claims</span></div><button className="cd-primary full" onClick={() => setStage("full")}>Continue into the operating workspace <ArrowRight size={14}/></button></section>
        </div>
      </main>
    </div>;
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
      <div className="cd-page-head"><div><p>Factory onboarding</p><h1>Set up the factory before entering Fruma.</h1><span>This is the first journey for a new factory: confirm the profile, upload its own working file, map the source fields to the Fruma Standard, review the result, then unlock the factory home.</span></div></div>
      <div className="fx-data-steps">{steps.map(([id, label]) => <div key={id} className={stage === id || (id === "profile" && profileSaved) || (id === "file" && fileLoaded) || (id === "map" && mappingAccepted) ? "active" : ""}><span>{label}</span><b>{stage === id ? "In progress" : id === "profile" && profileSaved || id === "file" && fileLoaded || id === "map" && mappingAccepted ? "Complete" : "Locked"}</b></div>)}</div>

      {stage === "profile" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 1</p><h2>Factory profile</h2><label>Factory name<input defaultValue="Vale do Ave Textile Works"/></label><label>Location<input defaultValue="Famalicão, Portugal"/></label><label>Core capabilities<input defaultValue="Jersey, interlock, pique, technical cotton"/></label><label>Typical MOQ<input defaultValue="150–600 metres"/></label><button className="cd-primary full" onClick={() => { setProfileSaved(true); setStage("file"); }}><Check size={14}/> Save factory profile</button></section><section className="cd-card dark"><p className="cd-eyebrow">Why this matters</p><h2>Fruma starts from the factory's own truth.</h2><p>The factory profile establishes identity and capability context. It does not yet make the factory searchable: the working data still has to be mapped and reviewed.</p></section></div> : null}

      {stage === "file" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 2</p><h2>Upload the factory working file</h2><p>Use the included synthetic hanger list to show the workflow exactly as a factory would experience it.</p><a className="cd-secondary full" href="/demo/sample-mill-hanger.csv" download><Upload size={14}/> Download sample file</a><button className="cd-primary full" onClick={() => setFileLoaded(true)}><Upload size={14}/> Load sample-mill-hanger.csv</button>{fileLoaded ? <div className="cd-success"><Check size={14}/> File received · source rows preserved</div> : null}<button className="cd-primary full" disabled={!fileLoaded} onClick={() => setStage("map")}>Continue to field mapping <ArrowRight size={14}/></button></section><section className="cd-card dark"><p className="cd-eyebrow">Source preview</p><h2>What Fruma sees</h2><div className="cd-line"><b>Article</b><span>SYN-QA-100</span></div><div className="cd-line"><b>Composition</b><span>100% CO</span></div><div className="cd-line"><b>Weight</b><span>185gr</span></div><div className="cd-line"><b>Width</b><span>160cm</span></div><div className="cd-line"><b>Colour</b><span>Navy</span></div></section></div> : null}

      {stage === "map" ? <section className="cd-card dark"><div className="cd-standard-head"><div><p className="cd-eyebrow">Step 3</p><h2>Factory source → Fruma Standard</h2><p>The left side stays exactly as the factory sent it. The right side is Fruma's canonical interpretation.</p></div></div><div className="cd-table-head map"><span>Factory field</span><span>Source value</span><span>Fruma field</span><span>Canonical value</span><span>Status</span></div>{mappingRows.map((r, i) => <div className="cd-table-row map" key={r[0]}><b>{r[0]}</b><span>{r[2]}</span><code>{r[1]}</code><span>{r[3]}</span><small>{mappingAccepted ? "Reviewed" : i < 6 ? "Suggested" : "Needs review"}</small></div>)}<div className="cd-actions end"><button className="cd-primary" onClick={() => { setMappingAccepted(true); setStage("review"); }}><MapPinned size={14}/> Review & accept mappings</button></div></section> : null}

      {stage === "review" ? <div className="cd-grid two"><section className="cd-card dark"><p className="cd-eyebrow">Step 4</p><h2>Review the factory record</h2><div className="cd-success"><Check size={14}/> 8 fields mapped with source lineage preserved</div><div className="cd-line"><b>Factory profile</b><span>Confirmed</span></div><div className="cd-line"><b>Source file</b><span>sample-mill-hanger.csv</span></div><div className="cd-line"><b>Canonical mapping</b><span>Reviewed</span></div><div className="cd-line"><b>Evidence claim</b><span>Requires scoped document review</span></div><button className="cd-primary full" onClick={() => setStage("home")}><FileCheck2 size={14}/> Lock setup & enter factory home</button></section><section className="cd-card dark"><Database size={24}/><h2>What locking means</h2><p>Fruma can now reuse this mapping for future factory files and use mapped qualities for matching. Mapping does not invent missing facts, and certification claims remain separate until evidence is reviewed.</p></section></div> : null}
    </main>
  </div>;
}
