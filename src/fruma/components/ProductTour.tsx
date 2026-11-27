import { useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, ChevronRight, CircleAlert, FileCheck2, FileText, Layers3, LockKeyhole, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../lib/shadcn/tabs'
import { Button } from '../lib/shadcn/button'
import { Card } from '../lib/shadcn/card'
import { Eyebrow } from './Brand'

const examples = [
  { label: 'Cotton jersey', brief: 'A 180 gsm cotton tee with a soft handfeel, for the UK market.', material: 'Cotton single jersey', details: '100% cotton · 180 gsm · Soft', facets: ['Jersey', 'Cotton', '170–190 gsm', 'Soft handfeel', 'UK market'] },
  { label: 'Loopback fleece', brief: 'A heavyweight cotton sweatshirt, loopback finish, for the EU market.', material: 'Cotton loopback terry', details: '100% cotton · 340 gsm · Loopback', facets: ['Sweatshirts', 'Cotton', '320–360 gsm', 'Loopback', 'EU market'] },
  { label: 'Linen shirting', brief: 'A light linen shirt with a relaxed feel, for the EU market.', material: 'Linen plain weave', details: '100% linen · 140 gsm · Relaxed', facets: ['Shirting', 'Linen', '120–160 gsm', 'Soft handfeel', 'EU market'] },
]

export default function ProductTour({ onDemo }: { onDemo: () => void }) {
  const [tab, setTab] = useState('discover')
  const [exampleIndex, setExampleIndex] = useState(0)
  const [shortlisted, setShortlisted] = useState(false)
  const example = examples[exampleIndex] ?? examples[0]!

  return (
    <section id="platform" className="scroll-mt-28 border-t border-border py-20 sm:py-28">
      <div className="site-container">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><Eyebrow className="mb-5 text-muted-foreground">Explore the Fruma marketplace</Eyebrow><h2 className="section-heading">From your idea<br />to <span className="brand-accent">your first sample.</span></h2></div>
          <p className="max-w-[325px] text-sm leading-7 text-muted-foreground">Search for factories that fit your product, understand their capabilities and reputation, then request samples before deciding who to work with.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="overflow-hidden rounded-lg border border-border bg-card shadow-retool-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-7">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              {['discover', 'evaluate', 'sample'].map((value, index) => <TabsTrigger key={value} value={value} className="gap-2 rounded-full px-4 py-2.5 text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"><span className="opacity-60">0{index + 1}</span>{value === 'discover' ? 'Search factories' : value === 'evaluate' ? 'Assess factories' : 'Request samples'}</TabsTrigger>)}
            </TabsList>
            <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-warning" />Illustrative preview</span>
          </div>
          <TabsContent value="discover" className="m-0">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border-b border-border bg-muted/35 p-6 sm:p-9 lg:border-b-0 lg:border-r">
                <span className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background"><Sparkles className="h-4 w-4 text-primary" /></span>
                <h3 className="text-2xl font-normal tracking-tight">Describe what you want to make.</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Start with your product, not a directory of names. Fruma’s prototype interprets a sourcing brief and finds relevant factory materials and capabilities. Try these illustrative examples.</p>
                <div className="mt-7 flex flex-wrap gap-2">{examples.map((item, index) => <Button key={item.label} onClick={() => { setExampleIndex(index); setShortlisted(false) }} variant={index === exampleIndex ? 'default' : 'outline'} size="sm" aria-pressed={index === exampleIndex} className="h-8 rounded-full px-3 text-[10px]">{item.label}</Button>)}</div>
                <div className="mt-6 rounded-md border border-border bg-background p-4"><Search className="mb-3 h-4 w-4 text-muted-foreground" /><p aria-live="polite" className="text-sm leading-6">“{example.brief}”</p></div>
                <p className="mt-3 text-[10px] leading-5 text-muted-foreground">Preset examples, not a live search or AI response.</p>
              </div>
              <div className="p-6 sm:p-9">
                <div className="mb-4 flex items-center justify-between"><Eyebrow className="text-muted-foreground">What Fruma understood</Eyebrow><SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <div className="mb-7 flex flex-wrap gap-2" aria-live="polite">{example.facets.map(facet => <span key={facet} className="rounded-full border border-border px-2.5 py-1 text-[10px]">{facet}</span>)}</div>
                <Card className="rounded-md p-5 shadow-none">
                  <div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">Synthetic factory profile</p><h4 className="text-lg font-medium tracking-tight">Factory 014</h4><p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" />Portugal · Knit & cut-and-sew</p></div><span className="fabric-swatch h-12 w-12 rounded-sm border border-border" /></div>
                  <div className="my-5 border-y border-border py-4"><p className="text-xs font-medium">{example.material}</p><p className="mt-1 text-[11px] text-muted-foreground">{example.details}</p></div>
                  <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />Material construction and weight align with the example brief. Compliance gaps still need review.</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Button variant="link" onClick={() => setTab('evaluate')} className="h-auto p-0 text-xs">Review this factory<ArrowRight className="h-3.5 w-3.5" /></Button><Button variant={shortlisted ? 'secondary' : 'outline'} size="sm" className="h-8 rounded-full px-3 text-[10px]" onClick={() => setShortlisted(value => !value)} aria-pressed={shortlisted}>{shortlisted && <Check className="h-3 w-3" />}{shortlisted ? 'Shortlisted' : '+ Shortlist'}</Button></div>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="evaluate" className="m-0">
            <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
              <div><Eyebrow className="mb-5 text-muted-foreground">Factory 014 · Synthetic profile</Eyebrow><h3 className="text-2xl tracking-tight">Capabilities. Reputation. Fit.</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">Assess manufacturing capabilities alongside brand-experience signals and supporting evidence. Quality, sampling, reliability and communication each matter; no single score replaces your judgement.</p><div className="mt-6 flex items-start gap-3 rounded-md bg-muted p-4"><Layers3 className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-xs leading-6">Example nuance: strong product quality, with sampling speed still developing. No single score hides the difference.</p></div><p className="mt-5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Brand feedback by dimension</p><div className="mt-3 flex flex-wrap gap-2">{['Quality', 'Sampling', 'Reliability', 'Communication'].map(dimension => <span key={dimension} className="rounded-full border border-border px-2.5 py-1 text-[10px]">{dimension}</span>)}</div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">Dimensions illustrated here; not verified ratings for a real factory.</p><Button variant="link" className="mt-5 px-0 text-xs" onClick={() => { setShortlisted(true); setTab('sample') }}>Add to example shortlist<ArrowRight className="h-3.5 w-3.5" /></Button></div>
              <div className="rounded-md border border-border p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><h4 className="text-sm font-medium">Evidence, in context</h4><FileCheck2 className="h-4 w-4 text-muted-foreground" /></div><div className="divide-y divide-border">{[
                { title: 'Product specification', subtitle: 'Composition and weight recorded · Version 03', state: 'Locked', icon: LockKeyhole, className: 'text-foreground' },
                { title: 'GOTS certificate', subtitle: 'Example expiry: 31 January 2025', state: 'Expired', icon: CircleAlert, className: 'text-destructive' },
                { title: 'Chemical test report', subtitle: 'Document supplied; verification outstanding', state: 'Unverified', icon: CircleAlert, className: 'text-muted-foreground' },
              ].map(row => <div key={row.title} className="flex items-start justify-between gap-4 py-4 first:pt-0"><div><p className="text-xs font-medium">{row.title}</p><p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">{row.subtitle}</p></div><span className={`flex shrink-0 items-center gap-1.5 pt-0.5 text-[10px] ${row.className}`}><row.icon className="h-3 w-3" />{row.state}</span></div>)}</div><p className="mt-3 border-t border-border pt-4 text-[10px] leading-5 text-muted-foreground">Illustrative evidence only. Fruma does not certify factories or assert legal compliance.</p></div>
            </div>
          </TabsContent>
          <TabsContent value="sample" className="m-0">
            <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
              <div><Eyebrow className="mb-5 text-muted-foreground">Turn a match into a conversation</Eyebrow><h3 className="text-2xl tracking-tight">Try the fit before you commit.</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">Shortlist the factories you want to explore. The prototype brings your tech pack and sample brief together so you can start with samples and assess the fit. Production ordering is a planned later step.</p><Button className="mt-7 rounded-full px-5 text-xs" onClick={onDemo}>Explore the workflow in a demo<ArrowUpRight className="h-3.5 w-3.5" /></Button></div>
              <div className="rounded-md border border-border bg-muted/20 p-5 sm:p-6"><div className="flex items-center justify-between border-b border-border pb-4"><h4 className="text-sm font-medium">Your sample brief</h4><FileText className="h-4 w-4 text-muted-foreground" /></div><div className="space-y-4 py-5 text-xs"><div className="flex justify-between gap-4"><span className="text-muted-foreground">Product</span><span>{example.material}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Specification</span><span>{example.details.split(' · ')[1]}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Shortlist</span><span>{shortlisted ? 'Factory 014 selected' : 'No factory selected'}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Tech pack</span><span>Attach in a product demo</span></div></div>{!shortlisted && <Button variant="outline" size="sm" className="mb-4 rounded-full text-[10px]" onClick={() => setShortlisted(true)}>Add example factory<ChevronRight className="h-3 w-3" /></Button>}<p className="border-t border-border pt-4 text-[10px] leading-5 text-muted-foreground">A preview of the workflow, not a sample order. No factory is contacted from this website.</p></div>
            </div>
          </TabsContent>
          <div className="flex items-center gap-2 border-t border-border bg-muted/25 px-6 py-3 text-[9px] leading-4 text-muted-foreground sm:px-9"><CircleAlert className="h-3 w-3 shrink-0" />Prototype signals (not live). All profiles, materials, and evidence shown here are synthetic examples.</div>
        </Tabs>
      </div>
    </section>
  )
}
