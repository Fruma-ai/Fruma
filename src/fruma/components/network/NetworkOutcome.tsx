import { useState } from 'react'
import { ArrowUpRight, FileText, Fingerprint, Layers3, Maximize2 } from 'lucide-react'
import HoodieProductImage from './HoodieProductImage'
import HoodieProductDialog from './HoodieProductDialog'
import { BrandWordmark } from '../Brand'
import { Button } from '../../lib/shadcn/button'
import { Card } from '../../lib/shadcn/card'

export default function NetworkOutcome({ revealed, onInspect }: { revealed: boolean; onInspect: () => void }) {
  const [productOpen, setProductOpen] = useState(false)

  function inspectProduct() {
    onInspect()
    setProductOpen(true)
  }

  return (
    <>
    <figure className="network-outcome" data-revealed={revealed} aria-label="Illustrative finished Fruma hoodie beside a digital product passport concept">
      <div className="relative mx-auto min-h-[360px] w-full max-w-[370px] sm:min-h-[400px]">
        <Card className="network-finished-product absolute left-0 top-4 w-[67%] overflow-hidden rounded-lg border-primary/20 shadow-retool-lg">
          <Button variant="ghost" className="relative block h-auto w-full rounded-none p-0 hover:bg-transparent" onClick={inspectProduct} aria-label="Open Fruma Signature Hoodie product preview"><HoodieProductImage /><span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background/95 text-foreground"><Maximize2 className="h-3 w-3" /></span></Button>
          <div className="border-t border-border px-4 py-3"><p className="text-[11px] font-semibold">Signature Hoodie</p><p className="mt-1 text-[9px] text-muted-foreground">Black · Right-chest Fruma F</p><Button onClick={inspectProduct} variant="link" className="mt-2 h-auto p-0 text-[9px]">View product<ArrowUpRight className="h-3 w-3" /></Button></div>
        </Card>
        <Card className="network-mini-passport absolute bottom-8 right-0 w-[42%] overflow-hidden rounded-lg border-primary/40 shadow-retool-lg">
          <Button asChild variant="ghost" className="h-auto w-full whitespace-normal rounded-none p-0 text-left hover:bg-primary/5">
            <a href="#product-passport" className="flex flex-col items-stretch">
              <div className="flex items-center justify-between bg-primary px-3 py-3 text-primary-foreground"><BrandWordmark className="text-[9px]" /><ArrowUpRight className="h-3 w-3" /></div>
              <div className="px-3 pb-4 pt-4"><Fingerprint className="network-passport-fingerprint mb-4 h-8 w-8 stroke-[1.2] text-primary" /><h3 className="text-[11px] font-semibold leading-4">Digital product<br />passport</h3><div className="mt-4 space-y-2 text-[8px] text-muted-foreground"><p className="flex items-center gap-1.5"><Layers3 className="h-2.5 w-2.5" />Product facts</p><p className="flex items-center gap-1.5"><FileText className="h-2.5 w-2.5" />Evidence & gaps</p></div><p className="mt-4 border-t border-border pt-2 text-[7px] uppercase tracking-widest text-primary">Concept preview</p></div>
            </a>
          </Button>
        </Card>
      </div>
      <figcaption className="brand-muted mx-auto max-w-[340px] text-center text-[9px] leading-5">A product is more than its finished form.<br /><span className="brand-highlight">See the record beside it.</span></figcaption>
    </figure>
    <HoodieProductDialog open={productOpen} onOpenChange={setProductOpen} />
    </>
  )
}
