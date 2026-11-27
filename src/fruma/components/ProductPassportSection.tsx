import { ArrowUpRight, CircleAlert, FileText, Fingerprint, History, Layers3, LockKeyhole, Shirt } from 'lucide-react'
import { Button } from '../lib/shadcn/button'
import { Card } from '../lib/shadcn/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../lib/shadcn/tabs'
import { BrandMark, BrandWordmark, Eyebrow } from './Brand'

const passportPrinciples = [
  {
    icon: Layers3,
    title: 'The facts that define your product.',
    text: 'Composition, weight, origin, care and colourway—structured around the garment, not scattered across documents.',
  },
  {
    icon: Fingerprint,
    title: 'The evidence behind the story.',
    text: 'Bring product claims and their supporting records into context. Keep missing, expired and unverified evidence visible.',
  },
  {
    icon: History,
    title: 'A record with a version history.',
    text: 'Build on versioned, lockable product specifications, so the product story has a clear reference point as details evolve.',
  },
]

const productFacts = [
  { label: 'Composition', value: '100% cotton' },
  { label: 'Fabric weight', value: '180 gsm · Single jersey' },
  { label: 'Declared origin', value: 'Portugal · Unverified' },
  { label: 'Care', value: 'Machine wash at 30°C' },
  { label: 'Colourway', value: 'Natural' },
]

const evidenceRecords = [
  { label: 'Product specification', detail: 'Example product-truth version 03', status: 'Locked version', icon: LockKeyhole, tone: 'text-primary' },
  { label: 'Material specification', detail: 'Sample material record', status: 'Recorded', icon: FileText, tone: 'text-foreground' },
  { label: 'Origin declaration', detail: 'Claim awaiting supporting verification', status: 'Unverified', icon: CircleAlert, tone: 'text-muted-foreground' },
  { label: 'Chemical test report', detail: 'No supporting document in this example', status: 'Missing', icon: CircleAlert, tone: 'text-destructive' },
]

function PassportPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      <div aria-hidden="true" className="absolute -inset-3 rounded-2xl border border-primary/10 bg-primary/5 sm:-inset-5" />
      <Card className="relative overflow-hidden rounded-lg border-primary/20 shadow-retool-lg">
        <div className="brand-surface flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5"><BrandMark /><div><BrandWordmark className="text-[11px]" /><p className="brand-muted mt-1 text-[8px] uppercase tracking-[0.15em]">Digital product passport</p></div></div>
          <span className="brand-highlight rounded-full border border-primary/40 px-2.5 py-1.5 text-[8px] uppercase tracking-widest">Planned</span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div><p className="mb-2 font-mono text-[9px] text-muted-foreground">SAMPLE / FRM-DEMO-001</p><h3 className="text-xl font-semibold tracking-tight">Cotton jersey tee</h3><p className="mt-2 text-[11px] text-muted-foreground">One product. A more complete picture.</p></div>
            <span className="fabric-swatch flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border"><Shirt className="h-7 w-7 stroke-[1.2] text-foreground" /></span>
          </div>
          <Tabs defaultValue="facts">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1" aria-label="Illustrative passport information">
              <TabsTrigger value="facts" className="py-2 text-[11px]">Product facts</TabsTrigger>
              <TabsTrigger value="evidence" className="py-2 text-[11px]">Supporting evidence</TabsTrigger>
            </TabsList>
            <TabsContent value="facts" className="mt-4">
              <dl className="divide-y divide-border">
                {productFacts.map(fact => <div key={fact.label} className="flex items-baseline justify-between gap-4 py-3 text-[11px]"><dt className="text-muted-foreground">{fact.label}</dt><dd className="text-right font-medium">{fact.value}</dd></div>)}
              </dl>
              <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-muted-foreground"><CircleAlert className="mt-1 h-3 w-3 shrink-0" />Recorded facts are not the same as verified claims. Open supporting evidence to see the gaps.</p>
            </TabsContent>
            <TabsContent value="evidence" className="mt-4">
              <ul className="divide-y divide-border">
                {evidenceRecords.map(record => <li key={record.label} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="text-[11px] font-medium">{record.label}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{record.detail}</p></div><span className={`flex shrink-0 items-center gap-1 pt-0.5 text-[9px] ${record.tone}`}><record.icon className="h-3 w-3" />{record.status}</span></li>)}
              </ul>
              <p className="mt-3 text-[10px] leading-5 text-muted-foreground">Each record keeps its own status. No overall badge turns this evidence into a guarantee.</p>
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-muted/50 px-5 py-3 text-[9px] leading-4 text-muted-foreground sm:px-6"><Fingerprint className="h-3.5 w-3.5 shrink-0" />Synthetic sample data · Not a live or issued passport</div>
      </Card>
    </div>
  )
}

export default function ProductPassportSection({ onDemo }: { onDemo: () => void }) {
  return (
    <section id="product-passport" aria-labelledby="passport-heading" className="scroll-mt-28 border-t border-border bg-primary/[0.03] py-16 sm:py-20">
      <div className="site-container grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <div>
          <Eyebrow className="mb-5 text-primary">Further along the roadmap</Eyebrow>
          <h2 id="passport-heading" className="section-heading">Looking ahead:<br /><span className="brand-accent">the product passport.</span></h2>
          <p className="mt-6 max-w-[460px] text-sm leading-7 text-muted-foreground">Our marketplace comes first: helping brands and designers find factories, assess their reputation and request samples. Digital product passports are a key part of the longer-term vision—connecting a product’s specifications and supporting evidence into a fuller record of what it is and where it comes from.</p>
          <div className="mt-8 space-y-5">
            {passportPrinciples.map(principle => <div key={principle.title} className="flex gap-3.5"><principle.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 stroke-[1.5] text-primary" /><div><h3 className="text-xs font-semibold">{principle.title}</h3><p className="mt-1.5 max-w-sm text-xs leading-6 text-muted-foreground">{principle.text}</p></div></div>)}
          </div>
          <Button onClick={onDemo} variant="outline" className="mt-8 h-12 gap-7 rounded-full px-6 text-xs">Discuss the roadmap<ArrowUpRight className="h-4 w-4" /></Button>
          <p className="mt-4 max-w-[455px] text-[10px] leading-5 text-muted-foreground">Longer-term product direction, not a current marketplace service. This illustrative preview builds on versioned product truth; passport publishing, sharing and regulatory readiness are not established.</p>
        </div>
        <PassportPreview />
      </div>
    </section>
  )
}
