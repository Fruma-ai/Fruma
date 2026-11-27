import { ArrowUpRight, Fingerprint, LockKeyhole } from 'lucide-react'
import SparklingBrandMark from './branding/SparklingBrandMark'
import { Eyebrow } from './Brand'

export default function HeroVisual() {
  return (
    <div className="hero-visual relative isolate mx-auto w-full max-w-[590px] lg:ml-auto lg:mr-0">
      <div className="relative aspect-[1.04] overflow-hidden sm:aspect-[1.16] lg:aspect-[1.02]">
        <SparklingBrandMark />
        <div className="brand-muted absolute left-1 top-0 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] sm:left-5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> The detail behind every decision
        </div>
        <div className="brand-muted absolute bottom-14 right-2 text-[9px] uppercase tracking-[0.2em] sm:bottom-16">Fruma / Product truth</div>
      </div>
      <div className="evidence-float brand-surface brand-divider relative z-10 -mt-3 flex items-center gap-4 rounded-md border p-5 sm:ml-1 sm:mr-14">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[hsl(var(--brand-highlight))]"><Fingerprint className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><Eyebrow className="brand-muted mb-2">Behind the product</Eyebrow><h3 className="text-sm font-medium">Product detail. Evidence. Context.</h3><p className="brand-muted mt-2 flex items-center gap-1.5 text-[10px]"><LockKeyhole className="h-3 w-3" />Versioned specifications, not just claims.</p></div>
        <ArrowUpRight className="brand-highlight h-4 w-4 shrink-0" />
      </div>
    </div>
  )
}
