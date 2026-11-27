import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Download, Info } from 'lucide-react'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../lib/shadcn/dialog'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Eyebrow } from './Brand'

type DemoBrief = { name: string; email: string; company: string; role: string; notes: string }

export default function DemoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [brief, setBrief] = useState<DemoBrief>({ name: '', email: '', company: '', role: 'brand', notes: '' })
  const [prepared, setPrepared] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  function update(field: keyof DemoBrief, value: string) {
    setBrief(previous => ({ ...previous, [field]: value }))
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPrepared(true)
  }

  function downloadBrief() {
    const content = `FRUMA — DEMO REQUEST BRIEF\n\nName: ${brief.name}\nWork email: ${brief.email}\nCompany: ${brief.company}\nI represent: ${brief.role}\n\nWhat I would like to explore:\n${brief.notes || 'Factory discovery, capabilities, reputation, and the sample-request workflow.'}\n\nPrepared locally in the Fruma design prototype. This request has not been sent to Fruma.\n`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'fruma-demo-brief.txt'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setDownloaded(true)
  }

  function handleOpen(value: boolean) {
    onOpenChange(value)
    if (!value) {
      setPrepared(false)
      setDownloaded(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-[540px] gap-6 rounded-lg p-6 sm:p-9">
        <DialogHeader className="space-y-3 text-left">
          <Eyebrow className="text-muted-foreground">Meet the Fruma marketplace</Eyebrow>
          <DialogTitle className="text-3xl font-normal leading-tight tracking-[-0.04em]">{prepared ? 'Your demo brief, ready.' : 'Find your next manufacturing partner.'}</DialogTitle>
          <DialogDescription className="leading-relaxed">{prepared ? 'Review your details and download a brief to share with the Fruma team. Nothing has been sent.' : 'Tell us about your brand or design studio, what you want to make, and the factories you are looking for.'}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {prepared ? (
            <div className="space-y-5">
              <div className="rounded-md border border-border bg-muted/40 p-5 text-sm">
                <p className="font-medium">{brief.name}</p>
                <p className="mt-1 text-muted-foreground">{brief.company} · {brief.role === 'brand' ? 'Apparel brand' : brief.role === 'designer' ? 'Designer / design studio' : brief.role === 'factory' ? 'Factory / mill' : 'Other'}</p>
                <p className="mt-1 break-all text-muted-foreground">{brief.email}</p>
                {brief.notes && <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 leading-relaxed">{brief.notes}</p>}
              </div>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />This is a design prototype. No booking has been made, and your details have not been sent or saved to a server.</p>
              <Button onClick={downloadBrief} className="h-12 w-full rounded-full"><Download className="h-4 w-4" />Download demo brief</Button>
              {downloaded && <p role="status" className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" />Brief prepared for download. No request was sent.</p>}
              <Button variant="ghost" className="w-full rounded-full" onClick={() => { setPrepared(false); setDownloaded(false) }}><ArrowLeft className="h-4 w-4" />Edit details</Button>
            </div>
          ) : (
            <form onSubmit={prepare} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="demo-name">Your name</Label><Input id="demo-name" autoComplete="name" required maxLength={120} placeholder="Alex Taylor" value={brief.name} onChange={event => update('name', event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="demo-company">Company</Label><Input id="demo-company" autoComplete="organization" required maxLength={160} placeholder="Your company" value={brief.company} onChange={event => update('company', event.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="demo-email">Work email</Label><Input id="demo-email" type="email" autoComplete="email" required maxLength={254} placeholder="alex@company.com" value={brief.email} onChange={event => update('email', event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="demo-role">I represent</Label><Select value={brief.role} onValueChange={value => update('role', value)}><SelectTrigger id="demo-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="brand">An apparel brand</SelectItem><SelectItem value="designer">A designer or design studio</SelectItem><SelectItem value="factory">A factory or mill</SelectItem><SelectItem value="other">Something else</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="demo-notes">What would you like to explore? <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="demo-notes" value={brief.notes} onChange={event => update('notes', event.target.value)} maxLength={2000} placeholder="Tell us what you want to make, the factory capabilities you need, or your sample requirements…" className="min-h-24 resize-y" /></div>
              <div className="rounded-md bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground"><strong className="font-medium text-foreground">Prototype only.</strong> This form prepares a downloadable brief. It does not send a demo request or store your details on a server.</div>
              <Button type="submit" className="h-12 w-full justify-between rounded-full px-5">Prepare my demo request<ArrowUpRight className="h-4 w-4" /></Button>
            </form>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
