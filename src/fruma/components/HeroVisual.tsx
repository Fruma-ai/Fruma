import { ArrowUpRight, Factory, PackageOpen } from 'lucide-react'
import SparklingBrandMark from './branding/SparklingBrandMark'
import { Eyebrow } from './Brand'

export default function HeroVisual() {
  return (
    <div className="hero-visual relative isolate mx-auto w-full max-w-[590px] lg:ml-auto lg:mr-0">
      <div className="relative aspect-[1.04] overflow-hidden sm:aspect-[1.16] lg:aspect-[1.02]">
        <SparklingBrandMark />
        <div className="brand-muted absolute left-1 top-0 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] sm:left-5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Good products start with the right people
        </div>
        <div className="brand-muted absolute bottom-2 right-2 text-[9px] uppercase tracking-[0.2em]">Fruma / Factory marketplace</div>
      </div>
      <div className="evidence-float brand-surface brand-divider relative -mt-3 flex items-center gap-4 rounded-md border p-5 sm:ml-1 sm:mr-14">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[hsl(var(--brand-highlight))]"><Factory className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><Eyebrow className="brand-muted mb-2">Your next manufacturing partner</Eyebrow><h3 className="text-sm font-medium">Find. Shortlist. Request samples.</h3><p className="brand-muted mt-2 flex items-center gap-1.5 text-[10px]"><PackageOpen className="h-3 w-3" />Choose with more context, not just a listing.</p></div>
        <ArrowUpRight className="brand-highlight h-4 w-4 shrink-0" />
      </div>
    </div>
  )
}
