'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Fingerprint, Layers3, MoveUpRight } from 'lucide-react'
import '../styles'
import { Button } from '../lib/shadcn/button'
import { Eyebrow } from '../components/Brand'
import SiteHeader from '../components/SiteHeader'
import HeroVisual from '../components/HeroVisual'
import SourceNetworkSection from '../components/SourceNetworkSection'
import ProductPassportSection from '../components/ProductPassportSection'
import ProductTour from '../components/ProductTour'
import DemoDialog from '../components/DemoDialog'
import ThemeSync from '../components/ThemeSync'
import { AudienceSection, ClosingSection, DifferenceSection, HonestySection, QuestionsSection } from '../components/MarketingSections'

export default function Home() {
  const [demoOpen, setDemoOpen] = useState(false)
  const openDemo = () => setDemoOpen(true)

  return (
    <div id="top" className="fruma-site min-h-screen overflow-x-clip bg-background text-foreground">
      <ThemeSync />
      <a href="#main-content" className="fixed left-4 top-4 z-50 -translate-y-24 rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground focus:translate-y-0">Skip to content</a>
      <SiteHeader onDemo={openDemo} />
      <main id="main-content">
        <section className="brand-surface fruma-hero">
        <div className="site-container grid items-center gap-12 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:pb-20 lg:pt-16 xl:gap-20">
          <div className="hero-copy pb-1">
            <div className="mb-7 flex items-center gap-2.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /><Eyebrow className="brand-muted">Apparel sourcing. Built on product truth.</Eyebrow></div>
            <h1 className="text-[52px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[76px] lg:text-[66px] xl:text-[80px]">Product origin,<br /><span className="brand-highlight">made visible.</span></h1>
            <p className="brand-muted mt-7 max-w-[395px] text-[14px] leading-[1.85] sm:text-[15px]">Find factories through the products they can make—and see the evidence behind the match. A clearer starting point for your next collection.</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Button onClick={openDemo} className="h-12 gap-8 rounded-full px-6 text-xs">Request a demo<ArrowUpRight className="h-4 w-4" /></Button>
              <Button asChild variant="link" className="brand-highlight h-12 gap-2 p-0 text-xs"><a href="#source-network">Watch the connections<ArrowDownRight className="h-3.5 w-3.5" /></a></Button>
            </div>
            <div className="mt-10 flex items-center gap-3"><span className="h-px w-7 bg-[hsl(var(--brand-border))]" /><p className="brand-muted text-[10px] leading-5">For apparel brands. For factories & mills.<br className="sm:hidden" /> For better-informed decisions.</p></div>
          </div>
          <HeroVisual />
        </div>
        </section>
        <SourceNetworkSection />
        <div className="site-container pb-12 pt-5 sm:pb-16">
          <div className="grid gap-5 border-y border-border py-6 sm:grid-cols-3 sm:gap-6">
            {[
              { icon: Layers3, label: 'Rooted in real product detail', sub: 'Not just a factory description' },
              { icon: Fingerprint, label: 'Evidence you can look into', sub: 'Including the gaps that matter' },
              { icon: MoveUpRight, label: 'A path from brief to sample', sub: 'Built around the next step' },
            ].map(item => <div key={item.label} className="flex items-center gap-3.5 sm:justify-center sm:first:justify-start sm:last:justify-end"><item.icon className="h-5 w-5 shrink-0 stroke-[1.3] text-primary" /><div><p className="text-[11px] font-medium">{item.label}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.sub}</p></div></div>)}
          </div>
          <p className="mt-4 text-center text-[9px] tracking-wide text-muted-foreground">Fruma is in development. Product previews use synthetic data, not a live supplier marketplace.</p>
        </div>
        <ProductPassportSection onDemo={openDemo} />
        <ProductTour onDemo={openDemo} />
        <DifferenceSection />
        <HonestySection />
        <AudienceSection onDemo={openDemo} />
        <QuestionsSection />
        <ClosingSection onDemo={openDemo} />
      </main>
      <DemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  )
}
