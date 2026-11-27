import { ArrowUpRight, Factory, PackageOpen, Search, ShoppingBag } from 'lucide-react'
import { Button } from '../lib/shadcn/button'
import { Card } from '../lib/shadcn/card'
import { Eyebrow } from './Brand'

const steps = [
  { number: '01', title: 'Find your factories.', icon: Search, text: 'Describe the garment you want to make. Explore factories whose materials and manufacturing capabilities fit your brief.', planned: false },
  { number: '02', title: 'Build your shortlist.', icon: Factory, text: 'Look at capabilities, brand feedback and supporting evidence. Understand the strengths and the gaps before choosing who to approach.', planned: false },
  { number: '03', title: 'Start with samples.', icon: PackageOpen, text: 'Bring your tech pack and sample brief together. Request samples from shortlisted factories and assess the fit before committing further.', planned: false },
  { number: '04', title: 'Then move to production.', icon: ShoppingBag, text: 'Our next planned step: place production orders once you are satisfied with the samples and have chosen your manufacturing partner.', planned: true },
]

export default function MarketplaceJourney({ onDemo }: { onDemo: () => void }) {
  return (
    <section id="journey" aria-labelledby="journey-heading" className="scroll-mt-28 border-t border-border py-20 sm:py-24">
      <div className="site-container">
        <div className="mb-10 grid gap-6 md:grid-cols-2 md:items-end">
          <div><Eyebrow className="mb-5 text-muted-foreground">Built around how sourcing actually works</Eyebrow><h2 id="journey-heading" className="section-heading">Find. Assess. Sample.<br /><span className="brand-accent">Then take the next step.</span></h2></div>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground md:ml-auto">The marketplace comes first. Find the right manufacturing partner, learn what they can do, and start with samples—not a leap of faith.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(step => <Card key={step.number} className={`flex flex-col rounded-lg p-6 shadow-none ${step.planned ? 'border-dashed border-primary/30 bg-primary/5' : 'bg-card'}`}>
            <div className="mb-8 flex items-center justify-between gap-2"><span className="font-mono text-[11px] text-muted-foreground">{step.number} /</span>{step.planned ? <span className="rounded-full border border-primary/25 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-primary">Planned</span> : <step.icon className="h-5 w-5 stroke-[1.4] text-primary" />}</div>
            <h3 className="text-lg font-medium leading-snug tracking-tight">{step.title}</h3><p className="mt-4 text-xs leading-6 text-muted-foreground">{step.text}</p>
            {step.planned && <p className="mt-auto pt-5 text-[10px] leading-5 text-muted-foreground">Production ordering is not available in the current prototype.</p>}
          </Card>)}
        </div>
        <div className="mt-7 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><p className="max-w-xl text-[11px] leading-6 text-muted-foreground">Factory discovery, evaluation and sample requests are demonstrated in the working prototype. The website uses illustrative data and does not place sample or production orders.</p><Button onClick={onDemo} className="h-11 shrink-0 gap-5 rounded-full px-5 text-xs">See the marketplace in a demo<ArrowUpRight className="h-3.5 w-3.5" /></Button></div>
      </div>
    </section>
  )
}
