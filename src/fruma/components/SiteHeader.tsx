import { useState } from 'react'
import { ArrowUpRight, Menu } from 'lucide-react'
import { Button } from '../lib/shadcn/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '../lib/shadcn/sheet'
import { Brand, BrandMark, BrandWordmark } from './Brand'

const links = [
  { label: 'The platform', href: '#platform' },
  { label: 'Product passport', href: '#product-passport' },
  { label: 'The Fruma difference', href: '#difference' },
  { label: 'Who it’s for', href: '#for-you' },
]

export default function SiteHeader({ onDemo }: { onDemo: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="brand-surface brand-divider sticky top-0 z-40 border-b">
      <div className="site-container flex h-[88px] items-center justify-between gap-6">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-5 text-[11px] lg:flex xl:gap-8 xl:text-[12px]">
          {links.map(link => <a key={link.href} href={link.href} className="brand-nav-link whitespace-nowrap">{link.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <Button onClick={onDemo} className="hidden h-10 gap-6 rounded-full px-5 text-[11px] sm:inline-flex">Request a demo<ArrowUpRight className="h-3.5 w-3.5" /></Button>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="brand-highlight hover:bg-primary/20 lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent className="flex flex-col gap-8 p-7">
              <SheetTitle className="flex items-center gap-3"><BrandMark /><BrandWordmark className="text-[36px]" /></SheetTitle>
              <SheetDescription>Product origin, made visible.</SheetDescription>
              <nav aria-label="Mobile navigation" className="flex flex-col gap-6">
                {links.map(link => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="text-lg hover:text-muted-foreground">{link.label}</a>)}
                <a href="#questions" onClick={() => setMenuOpen(false)} className="text-lg hover:text-muted-foreground">Your questions</a>
              </nav>
              <Button className="mt-4 justify-between rounded-full" onClick={() => { setMenuOpen(false); onDemo() }}>Request a demo<ArrowUpRight className="h-4 w-4" /></Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
