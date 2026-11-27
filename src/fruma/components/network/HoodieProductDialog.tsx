import { useRef } from 'react'
import { ArrowUpRight, Fingerprint, Info } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import HoodieProductImage from './HoodieProductImage'

export default function HoodieProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigatingToPassport = useRef(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[880px] gap-0 p-0" onCloseAutoFocus={event => {
        if (navigatingToPassport.current) {
          event.preventDefault()
          navigatingToPassport.current = false
        }
      }}>
        <DialogHeader className="border-b border-border px-6 pb-5 pt-6 text-left sm:px-8">
          <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.18em] text-primary">Fruma / Product concept</p>
          <DialogTitle className="text-2xl font-semibold tracking-tight">Fruma Signature Hoodie</DialogTitle>
          <DialogDescription className="pt-2">The finished product, with its story alongside it.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative border-b border-border md:border-b-0 md:border-r"><HoodieProductImage /><span className="absolute bottom-4 left-4 rounded-full border border-border bg-background/95 px-3 py-1.5 text-[9px] tracking-wide text-foreground">01 / Front view · Visual mockup</span></div>
          <div className="flex flex-col p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">The finished garment</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">A familiar form.<br /><span className="text-primary">A fuller story.</span></h3>
            <p className="mt-4 text-[13px] leading-7 text-muted-foreground">Your supplied black hoodie, presented as a product-page concept with the Fruma F placed on the wearer’s right chest.</p>
            <div className="mt-6 flex items-center gap-2.5 text-xs"><span className="h-4 w-4 rounded-full border border-border bg-[hsl(var(--brand-surface))]" /><span>Black</span><span className="text-muted-foreground">/ Violet F</span></div>
            <dl className="my-6 divide-y divide-border border-y border-border text-[11px]">
              <div className="flex justify-between gap-5 py-3"><dt className="text-muted-foreground">Brand placement</dt><dd>Wearer’s right chest</dd></div>
              <div className="flex justify-between gap-5 py-3"><dt className="text-muted-foreground">Product record</dt><dd>Illustrative concept</dd></div>
              <div className="flex justify-between gap-5 py-3"><dt className="text-muted-foreground">Materials & origin</dt><dd>Not supplied</dd></div>
            </dl>
            <p className="flex gap-2 text-[11px] leading-6 text-muted-foreground"><Fingerprint className="mt-1 h-4 w-4 shrink-0 text-primary" />The garment is the outcome. The passport is where the supporting product facts, evidence and gaps should be understood.</p>
            <Button asChild className="mt-6 h-11 justify-between rounded-full px-5 text-xs"><a href="#product-passport" onClick={() => { navigatingToPassport.current = true; onOpenChange(false) }}>Explore the passport concept<ArrowUpRight className="h-4 w-4" /></a></Button>
            <p className="mt-4 flex items-start gap-1.5 text-[9px] leading-5 text-muted-foreground"><Info className="mt-1 h-3 w-3 shrink-0" />Adapted brand artwork, not an item for sale. No fabric specification, provenance or certification is asserted.</p>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
