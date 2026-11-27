import { ArrowRight, ArrowUpRight, Check, CircleDashed, FileText, Fingerprint, Layers3, Minus, ScanSearch } from 'lucide-react'
const brandConcept = '/fruma/assets/fruma-brand-concept.jpeg'
import { Button } from '../lib/shadcn/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../lib/shadcn/accordion'
import { Brand, BrandMark, Eyebrow } from './Brand'

export function DifferenceSection() {
  return (
    <section id="difference" className="scroll-mt-28 border-t border-border bg-muted/30 py-20 sm:py-28">
      <div className="site-container">
        <div className="grid gap-6 md:grid-cols-2 md:items-end"><div><Eyebrow className="mb-5 text-muted-foreground">Not another supplier directory</Eyebrow><h2 className="section-heading">Find the right people.<br /><span className="brand-accent">Not just another listing.</span></h2></div><p className="max-w-sm text-sm leading-7 text-muted-foreground md:ml-auto">Find factories with relevant capabilities, understand how other brands describe the experience, and begin with samples before making a bigger commitment.</p></div>
        <div className="mt-14 grid gap-9 md:grid-cols-3 md:gap-10">
          {[
            { number: '01', icon: ScanSearch, title: 'Find factories that fit.', text: 'Describe what you want to make. Explore factories through their material construction, composition, weight and manufacturing capabilities—not just their profile description.', detail: 'A product-led factory search' },
            { number: '02', icon: Fingerprint, title: 'Understand their reputation.', text: 'Consider brand feedback on quality, sampling, reliability and communication alongside the supporting evidence. Strengths and gaps both deserve to be seen.', detail: 'Context, not a blanket trust badge' },
            { number: '03', icon: Layers3, title: 'Start with a sample.', text: 'Bring your shortlist, tech pack and product brief together. Request samples to assess the fit before taking the next step towards production.', detail: 'A clearer path from search to samples' },
          ].map(item => <article key={item.number} className="border-t border-foreground/25 pt-5"><div className="mb-9 flex items-center justify-between"><span className="font-mono text-[10px] text-muted-foreground">{item.number} /</span><item.icon className="h-5 w-5 stroke-[1.3] text-primary" /></div><h3 className="mb-4 text-xl font-medium tracking-[-0.035em]">{item.title}</h3><p className="text-[13px] leading-7 text-muted-foreground">{item.text}</p><p className="mt-7 flex items-center gap-2 text-[10px] font-medium"><span className="h-1 w-1 rounded-full bg-primary" />{item.detail}</p></article>)}
        </div>
      </div>
    </section>
  )
}

export function HonestySection() {
  return (
    <section className="brand-surface py-16 sm:py-20">
      <div className="site-container grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-20">
        <div><Eyebrow className="brand-muted mb-6">Clarity is a principle. Not a feature.</Eyebrow><h2 className="section-heading">The gaps matter.<br /><span className="brand-highlight">We keep them visible.</span></h2><p className="brand-muted mt-6 max-w-sm text-sm leading-7">An expired document shouldn’t become a reassuring badge. A missing detail shouldn’t disappear into an average. Better decisions start with an honest picture.</p></div>
        <div className="brand-divider rounded-md border p-6 sm:p-8"><div className="mb-7 flex items-center justify-between"><p className="text-xs">Not every answer is a green tick.</p><BrandMark /></div><div className="grid grid-cols-2 gap-3">{[
          { label: 'Current', description: 'Evidence within date', icon: Check },
          { label: 'Expired', description: 'Needs an updated record', icon: FileText },
          { label: 'Missing', description: 'No evidence on record', icon: Minus },
          { label: 'Unverified', description: 'Not yet substantiated', icon: CircleDashed },
        ].map(item => <div key={item.label} className="brand-divider rounded-sm border bg-primary/10 p-4"><item.icon className="brand-highlight mb-3 h-4 w-4" /><p className="text-xs">{item.label}</p><p className="brand-muted mt-1.5 text-[9px] leading-4">{item.description}</p></div>)}</div><p className="brand-muted mt-6 text-[10px] leading-5">Fruma surfaces evidence. It does not certify factories, guarantee quality, or assert legal compliance.</p></div>
      </div>
    </section>
  )
}

export function AudienceSection({ onDemo }: { onDemo: () => void }) {
  return (
    <section id="for-you" className="scroll-mt-28 py-20 sm:py-28">
      <div className="site-container">
        <div className="mb-12 text-center"><Eyebrow className="mb-5 text-muted-foreground">Built for the people behind the next collection</Eyebrow><h2 className="section-heading">Your ideas.<br /><span className="brand-accent">The right manufacturing partner.</span></h2></div>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="brand-surface group relative min-h-[400px] overflow-hidden rounded-md">
            <img src={brandConcept} alt="Supplied Fruma brand concept showing the purple F identity, black exhibition stand, and garment rail" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center opacity-45 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-surface))] via-[hsl(var(--brand-surface)/0.7)] to-transparent" />
            <div className="relative flex h-full flex-col items-start p-8 sm:p-10"><Eyebrow className="brand-muted mb-16">For brands & designers</Eyebrow><h3 className="text-3xl tracking-[-0.04em]">Find your factory.<br />Make your next move.</h3><p className="brand-muted mt-4 max-w-xs text-[13px] leading-6">Whether you are building a brand or designing your next collection, explore factory capabilities, assess reputation and start conversations through a sample brief.</p><Button variant="link" className="brand-highlight mt-7 h-auto p-0 text-xs" onClick={onDemo}>Explore the marketplace in a demo<ArrowUpRight className="h-3.5 w-3.5" /></Button><p className="brand-muted mt-4 text-[9px]">Supplied Fruma brand concept imagery</p></div>
          </article>
          <article className="flex min-h-[400px] flex-col items-start rounded-md border border-border bg-card p-8 sm:p-10"><Eyebrow className="mb-16 text-muted-foreground">For factories & mills</Eyebrow><h3 className="text-3xl tracking-[-0.04em]">Let your capabilities<br />tell a fuller story.</h3><p className="mt-4 max-w-xs text-[13px] leading-6 text-muted-foreground">Fruma’s marketplace vision gives your materials, production capabilities and supporting evidence a place alongside your profile, helping relevant brands and designers understand what you can make.</p><Button variant="link" className="mt-7 h-auto p-0 text-xs" onClick={onDemo}>Talk about the supplier perspective<ArrowUpRight className="h-3.5 w-3.5" /></Button><p className="mt-5 max-w-xs text-[10px] leading-5 text-muted-foreground">A dedicated supplier portal and self-service onboarding are not yet available.</p></article>
        </div>
      </div>
    </section>
  )
}

const questions = [
  { question: 'What is Fruma?', answer: 'Fruma is an apparel sourcing marketplace in development for brands and designers. The core journey is to search for suitable factories, assess their capabilities and reputation, build a shortlist and request samples. Production order placement is a planned later step, once a buyer is satisfied with the samples and their manufacturing partner.' },
  { question: 'How does Fruma help me assess a factory’s reputation?', answer: 'The prototype brings material libraries and manufacturing capabilities together with brand feedback by dimension, including quality, sampling, reliability and communication. Supporting compliance evidence and gaps remain visible. These signals support your own assessment; Fruma does not certify factories, guarantee quality or replace due diligence.' },
  { question: 'Can I request samples?', answer: 'The working marketplace prototype includes shortlisting, a tech-pack upload and a structured sample-request brief. A demo can walk through that flow. The illustrative website tour does not contact factories or place sample orders, and the marketplace data remains synthetic rather than a live supplier network.' },
  { question: 'Will I be able to place production orders?', answer: 'That is the longer-term goal: find a factory, review its capabilities and reputation, request samples and, once you are satisfied, place a production order. Production ordering, checkout and payments are not available in the current prototype. No launch date is promised here.' },
  { question: 'Is the marketplace live?', answer: 'Not yet. The current marketplace is a working prototype using synthetic sample data for validation. The previews on this website are illustrative and do not represent real factories, live availability or customer activity.' },
  { question: 'Where do digital product passports fit?', answer: 'They are a key part of the longer-term roadmap, not the main marketplace journey today. The intention is to connect product specifications and supporting records into a fuller product story after establishing factory discovery and sampling. The passport shown here is an illustrative concept, not an issued passport or a claim of regulatory compliance.' },
  { question: 'What will I see in a demo?', answer: 'Start with a sourcing brief, explore factory matches, review a profile’s capabilities and brand-experience signals, build a shortlist and walk through a sample request. We can also discuss the roadmap for production orders and product passports, with planned features clearly separated from the working prototype.' },
  { question: 'Can I request a demo from this website?', answer: 'Yes. Use Request a demo to send your details to the Fruma team. We will reply to the work email you provide.' },
]

export function QuestionsSection() {
  return (
    <section id="questions" className="scroll-mt-28 border-t border-border py-16 sm:py-24">
      <div className="site-container grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-20"><div><Eyebrow className="mb-5 text-muted-foreground">A few things worth knowing</Eyebrow><h2 className="section-heading">Good questions.<br /><span className="brand-accent">Clear answers.</span></h2></div><Accordion type="single" collapsible className="-mt-2">{questions.map((item, index) => <AccordionItem key={item.question} value={`question-${index}`}><AccordionTrigger className="gap-5 py-6 text-left text-[13px] font-medium">{item.question}</AccordionTrigger><AccordionContent className="pb-6 pr-8 text-[13px] leading-7 text-muted-foreground">{item.answer}</AccordionContent></AccordionItem>)}</Accordion></div>
    </section>
  )
}

export function ClosingSection({ onDemo }: { onDemo: () => void }) {
  return (
    <>
      <section className="border-y border-primary/15 bg-primary/5 py-20 sm:py-24"><div className="site-container flex flex-col items-start justify-between gap-9 md:flex-row md:items-center"><div><Eyebrow className="mb-5 text-muted-foreground">Your next collection starts with the right factory</Eyebrow><h2 className="section-heading">Find your factory.<br /><span className="brand-accent">Start with a sample.</span></h2></div><div className="md:pr-8"><Button onClick={onDemo} size="lg" className="h-14 gap-10 rounded-full px-7 text-xs">Request a demo<ArrowUpRight className="h-4 w-4" /></Button><p className="mt-4 text-[10px] text-muted-foreground">See factory discovery, reputation and sample requests in action.</p></div></div></section>
      <footer className="site-container pb-8 pt-12"><div className="flex flex-col justify-between gap-8 sm:flex-row"><div><Brand /><p className="mt-4 text-xs text-muted-foreground">Find your factory. Start with a sample.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-7 gap-y-4 self-start text-[11px] text-muted-foreground"><a href="#platform" className="hover:text-foreground">The marketplace</a><a href="#journey" className="hover:text-foreground">How it works</a><a href="#product-passport" className="hover:text-foreground">Roadmap: passports</a><a href="#difference" className="hover:text-foreground">Our approach</a><a href="#questions" className="hover:text-foreground">Product status & FAQs</a><Button onClick={onDemo} variant="link" className="h-auto p-0 text-[11px]">Request a demo<ArrowRight className="h-3 w-3" /></Button></nav></div><div className="mt-10 flex flex-col justify-between gap-3 border-t border-border pt-6 text-[9px] leading-5 text-muted-foreground sm:flex-row"><p>© {new Date().getFullYear()} Fruma. A clearer way forward.</p><p className="max-w-md sm:text-right">In development. Product previews use synthetic data.<br />Evidence signals are not certification or legal advice.</p></div></footer>
    </>
  )
}
