"use client";

import { useEffect } from "react";

const rows = [
  ["VDA-2401","P/D WAFFEL RIB","COTTON / SPN","285 G/M2","72\"","MIN 500YDS","Waffle rib","Cotton + elastane","285 g/m²","183 cm","460 m","86%"],
  ["VDA-2402","P/D WAFFEL RIB","COTTON / SPN","285 G/M2","72\"","MIN 500YDS","Waffle rib","Cotton + elastane","285 g/m²","183 cm","460 m","82%"],
  ["VDA-2403","P/D WAFFEL RIB","COTTON / SPN","285 G/M2","72\"","MIN 500YDS","Waffle rib","Cotton + elastane","285 g/m²","183 cm","460 m","78%"],
  ["VDA-2404","P/D WAFFEL RIB","COTTON / SPN","285 G/M2","72\"","MIN 500YDS","Waffle rib","Cotton + elastane","285 g/m²","183 cm","460 m","86%"],
  ["VDA-2405","P/D WAFFEL RIB","COTTON / SPN","285 G/M2","72\"","MIN 500YDS","Waffle rib","Cotton + elastane","285 g/m²","183 cm","460 m","82%"],
  ["VDA-2406","P/D WAFFEL RIB","COTTON / SPN","285 G/M2","72\"","MIN 500YDS","Waffle rib","Cotton + elastane","285 g/m²","183 cm","460 m","78%"],
  ["VDA-2407","S/J 30/1","100% CO","185gr","160cm","150M","Single jersey","100% cotton","185 g/m²","160 cm","150 m","91%"],
  ["VDA-2408","S/J 30/1","100% CO","185gr","160cm","150M","Single jersey","100% cotton","185 g/m²","160 cm","150 m","87%"],
  ["VDA-2409","S/J 30/1","100% CO","185gr","160cm","150M","Single jersey","100% cotton","185 g/m²","160 cm","150 m","84%"],
  ["VDA-2410","INTERLOCK 40/1","95 CO / 5 EA","220 GSM","68 IN","300 YDS","Interlock","95% cotton / 5% elastane","220 g/m²","173 cm","274 m","89%"],
  ["VDA-2411","PIQUE COMPACT","100 COT","210G","180 CM","400 MTR","Compact piqué","100% cotton","210 g/m²","180 cm","400 m","93%"],
  ["VDA-2412","2X2 RIB","CO/EA 96/4","260GSM","64\"","250Y","2×2 rib","96% cotton / 4% elastane","260 g/m²","163 cm","229 m","81%"]
];

const select = (value:string, alternatives:string[]) => `<select class="fc-select" data-original="${value}"><option>Suggested — ${value}</option>${alternatives.map(v=>`<option>${v}</option>`).join("")}<option>Keep source value</option><option>Mark unknown</option><option>Create mapping exception</option></select>`;

function markup(){
  const body=rows.map(r=>`<div class="fc-row"><label><input type="checkbox" class="fc-check"/> <span><b>${r[0]}</b><small>${r[11]} confidence</small></span></label><span class="fc-source"><b>${r[1]}</b><small>Mill sent · Structure</small></span><span class="fc-source"><b>${r[2]}</b><small>Mill sent · Composition</small></span><span class="fc-source"><b>${r[3]}</b><small>Mill sent · Weight</small></span><span class="fc-source"><b>${r[4]}</b><small>Mill sent · Width</small></span><span class="fc-source"><b>${r[5]}</b><small>Mill sent · MOQ</small></span><span>${select(r[6],["Warp knit mesh","Single jersey","Interlock","Piqué"])}</span><span>${select(r[7],["100% cotton","Cotton / polyester","Cotton / elastane"] )}</span><span>${select(r[8],["190 g/m²","210 g/m²","220 g/m²"])}</span><span>${select(r[9],["160 cm","173 cm","180 cm"])}</span><span>${select(r[10],["150 m","300 m","500 m"])}</span><span class="fc-status">AI mapped</span></div>`).join("");
  return `<div class="fc-wrap"><div class="cd-page-head"><div><p>Factory workspace · data</p><h1>Map the factory's entire catalogue into the Fruma Standard.</h1><span>Fruma ingests the data the factory already has, proposes mappings at scale and sends only uncertain decisions to human review. Source language is always preserved.</span></div><button class="cd-primary fc-upload">Upload new version</button></div><div class="fc-scale"><div><b>12,480</b><span>qualities in catalogue</span></div><div><b>186,420</b><span>source fields detected</span></div><div><b>175,236</b><span>AI mapped automatically</span></div><div><b>7,842</b><span>suggestions to review</span></div><div><b>1,204</b><span>mapping exceptions</span></div><div><b>94.0%</b><span>mapped to Fruma Standard</span></div></div><section class="fc-intelligence"><div><b>Fruma mapping intelligence</b><span>Factory language → Fruma Standard</span></div><div class="fc-work"><span>✓ 186,420 fields read</span><span>✓ units normalised</span><span>✓ repeated terminology grouped</span><span>◌ 7,842 review decisions isolated</span></div></section><section class="fc-review"><div class="fc-toolbar"><div><b>Catalogue mapping review</b><span>Showing 12 of 12,480 qualities · review exceptions rather than every field</span></div><div><button class="fc-filter">Needs review 7,842</button><button class="fc-filter">Exceptions 1,204</button><button class="cd-primary fc-apply">Apply selected mappings</button></div></div><div class="fc-bulk" hidden><b>Apply this decision across matching source data?</b><span>Fruma found <strong>418</strong> rows using the same factory terminology.</span><button class="cd-primary fc-confirm">Apply to 418 matching values</button></div><div class="fc-head"><span>Article</span><span>Mill sent · structure</span><span>Mill sent · composition</span><span>Mill sent · weight</span><span>Mill sent · width</span><span>Mill sent · MOQ</span><span>Fruma · construction</span><span>Fruma · composition</span><span>Fruma · weight</span><span>Fruma · width</span><span>Fruma · MOQ</span><span>Status</span></div><div class="fc-table">${body}</div></section><p class="fc-note">AI recommendations are suggestions until accepted. Every accepted mapping retains the original factory value, mapping decision, confidence and reviewer provenance.</p></div>`;
}

export function FactoryCatalogueEnhancer(){
  useEffect(()=>{
    let last:HTMLElement|null=null;
    const enhance=()=>{
      const headings=Array.from(document.querySelectorAll("h1"));
      const h=headings.find(x=>x.textContent?.includes("Maintain the mapping without rebuilding your source systems"));
      const main=h?.closest("main") as HTMLElement|null;
      if(!main||main.dataset.catalogueEnhanced||main===last)return;
      last=main; main.dataset.catalogueEnhanced="true"; main.innerHTML=markup();
      main.querySelectorAll(".fc-select").forEach(el=>el.addEventListener("change",()=>{const bulk=main.querySelector(".fc-bulk") as HTMLElement; if(bulk) bulk.hidden=false;}));
      main.querySelector(".fc-confirm")?.addEventListener("click",()=>{const bulk=main.querySelector(".fc-bulk") as HTMLElement; if(bulk){bulk.innerHTML="<b>✓ Mapping applied to 418 matching source values</b><span>Decision and provenance saved to the Fruma Standard mapping graph.</span>";}});
      main.querySelector(".fc-apply")?.addEventListener("click",()=>{main.querySelectorAll(".fc-check:checked").forEach(c=>{const row=c.closest(".fc-row");const s=row?.querySelector(".fc-status");if(s)s.textContent="Reviewed";});});
    };
    enhance(); const observer=new MutationObserver(enhance); observer.observe(document.body,{childList:true,subtree:true}); return()=>observer.disconnect();
  },[]);
  return null;
}
