import { ArrowRight, ArrowUpRight, Check, CircleDashed, FileText, Fingerprint, Layers3, Minus, ScanSearch } from 'lucide-react'
const brandConcept = '/fruma/assets/fruma-brand-concept.jpeg'
import { Button } from '../lib/shadcn/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../lib/shadcn/accordion'
import { Brand, BrandMark, Eyebrow } from './Brand'

export function DifferenceSection() {
  return (
    <section id="difference" className="scroll-mt-28 border-t border-border bg-muted/30 py-20 sm:py-28">
      <div className="site-container">
        <div className="grid gap-6 md:grid-cols-2 md:items-end"><div><Eyebrow className="mb-5 text-muted-foreground">Not another supplier directory</Eyebrow><h2 className="section-heading">Less guesswork.<br /><span className="brand-accent">More to go on.</span></h2></div><p className="max-w-sm text-sm leading-7 text-muted-foreground md:ml-auto">A self-written profile is a starting point. Fruma is being built to help you look beyond it.</p></div>
        <div className="mt-14 grid gap-9 md:grid-cols-3 md:gap-10">
          {[
            { number: '01', icon: ScanSearch, title: 'Start with the product.', text: 'Describe what you want to make. Explore matches based on material construction, composition, weight, and feel—not just a factory’s description.', detail: 'Product-level matching' },
            { number: '02', icon: Fingerprint, title: 'Look behind the claim.', text: 'See compliance evidence in context. Current, expired, missing, or unverified: each state stays visible, so you know what still needs a closer look.', detail: 'Evidence with context' },
            { number: '03', icon: Layers3, title: 'Keep the detail intact.', text: 'Versioned product specifications and feedback by dimension preserve the nuance. Strong craftsmanship and developing sampling speed can both be true.', detail: 'Product truth, not a trust score' },
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
        <div className="mb-12 text-center"><Eyebrow className="mb-5 text-muted-foreground">Different sides. A shared foundation.</Eyebrow><h2 className="section-heading">Good relationships start<br />with <span className="brand-accent">a clearer understanding.</span></h2></div>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="brand-surface group relative min-h-[400px] overflow-hidden rounded-md">
            <img src={brandConcept} alt="Supplied Fruma brand concept showing the purple F identity, black exhibition stand, and garment rail" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center opacity-45 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-surface))] via-[hsl(var(--brand-surface)/0.7)] to-transparent" />
            <div className="relative flex h-full flex-col items-start p-8 sm:p-10"><Eyebrow className="brand-muted mb-16">For apparel brands</Eyebrow><h3 className="text-3xl tracking-[-0.04em]">Source with a<br />clearer perspective.</h3><p className="brand-muted mt-4 max-w-xs text-[13px] leading-6">Look beyond a listing. Explore the materials, capabilities, and evidence behind your next production partner.</p><Button variant="link" className="brand-highlight mt-7 h-auto p-0 text-xs" onClick={onDemo}>Explore the brand experience<ArrowUpRight className="h-3.5 w-3.5" /></Button><p className="brand-muted mt-4 text-[9px]">Supplied Fruma brand concept imagery</p></div>
          </article>
          <article className="flex min-h-[400px] flex-col items-start rounded-md border border-border bg-card p-8 sm:p-10"><Eyebrow className="mb-16 text-muted-foreground">For factories & mills</Eyebrow><h3 className="text-3xl tracking-[-0.04em]">Let your capabilities<br />tell a fuller story.</h3><p className="mt-4 max-w-xs text-[13px] leading-6 text-muted-foreground">Fruma’s vision gives structured materials, production capabilities, and supporting evidence a place alongside your profile.</p><Button variant="link" className="mt-7 h-auto p-0 text-xs" onClick={onDemo}>Talk about the supplier perspective<ArrowUpRight className="h-3.5 w-3.5" /></Button><p className="mt-5 max-w-xs text-[10px] leading-5 text-muted-foreground">A dedicated supplier portal and self-service onboarding are not yet available.</p></article>
        </div>
      </div>
    </section>
  )
}

const questions = [
  { question: 'What is Fruma?', answer: 'Fruma is an apparel sourcing marketplace and product-data platform in development. The working prototype connects product-level search, factory capabilities, compliance evidence, dimensional brand feedback, and sample briefs—anchored in versioned product specifications.' },
  { question: 'How does a digital product passport evidence a product?', answer: 'A digital product passport brings product identity, composition, origin and other product information into a structured digital record. Its value depends on the quality of the underlying evidence—not simply having a passport. Fruma’s direction connects that record to versioned product truth and supporting documents, while keeping missing or unverified evidence visible. The passport shown here is an illustrative concept, not a live issued passport or a claim of regulatory compliance.' },
  { question: 'Is the marketplace live?', answer: 'Not yet. The current marketplace is a working prototype using synthetic sample data for validation. The previews on this website are illustrative and do not represent real factories, live availability, or customer activity.' },
  { question: 'Does Fruma certify factories?', answer: 'No. Fruma shows evidence labels, expiry dates, and gaps. Current evidence is not a guarantee of compliance or quality. Missing, expired, and unverified records remain visible, and buyers still need to carry out appropriate due diligence.' },
  { question: 'What would a product demo cover?', answer: 'A walkthrough can cover the prototype’s natural-language sourcing search, a factory profile and material library, compliance evidence, feedback by dimension, and the shortlist-to-sample-request workflow. Some flows remain planned, including the factory portal and rating submission.' },
  { question: 'Can I request a demo from this website?', answer: 'This design prototype lets you prepare and download a demo brief. It does not send requests, create bookings, or store your details on a server. A live submission destination has not been connected.' },
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
      <section className="border-y border-primary/15 bg-primary/5 py-20 sm:py-24"><div className="site-container flex flex-col items-start justify-between gap-9 md:flex-row md:items-center"><div><Eyebrow className="mb-5 text-muted-foreground">Your next collection starts with a conversation</Eyebrow><h2 className="section-heading">Let’s find a<br /><span className="brand-accent">better starting point.</span></h2></div><div className="md:pr-8"><Button onClick={onDemo} size="lg" className="h-14 gap-10 rounded-full px-7 text-xs">Request a demo<ArrowUpRight className="h-4 w-4" /></Button><p className="mt-4 text-[10px] text-muted-foreground">Get to know the product. See the thinking behind it.</p></div></div></section>
      <footer className="site-container pb-8 pt-12"><div className="flex flex-col justify-between gap-8 sm:flex-row"><div><Brand /><p className="mt-4 text-xs text-muted-foreground">Product origin, made visible.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-7 gap-y-4 self-start text-[11px] text-muted-foreground"><a href="#platform" className="hover:text-foreground">The platform</a><a href="#product-passport" className="hover:text-foreground">Product passport</a><a href="#difference" className="hover:text-foreground">Our approach</a><a href="#questions" className="hover:text-foreground">Product status & FAQs</a><Button onClick={onDemo} variant="link" className="h-auto p-0 text-[11px]">Request a demo<ArrowRight className="h-3 w-3" /></Button></nav></div><div className="mt-10 flex flex-col justify-between gap-3 border-t border-border pt-6 text-[9px] leading-5 text-muted-foreground sm:flex-row"><p>© {new Date().getFullYear()} Fruma. A clearer way forward.</p><p className="max-w-md sm:text-right">In development. Product previews use synthetic data.<br />Evidence signals are not certification or legal advice.</p></div></footer>
    </>
  )
}
