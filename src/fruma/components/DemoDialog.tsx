import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Loader2 } from 'lucide-react'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../lib/shadcn/dialog'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Eyebrow } from './Brand'

type DemoBrief = { name: string; email: string; company: string; role: string; notes: string }
type Status = 'idle' | 'loading' | 'ok' | 'error'

const INBOX = 'owen@fruma.ai'

const roleLabel = (role: string) =>
  role === 'brand' ? 'Apparel brand' : role === 'designer' ? 'Designer / design studio' : role === 'factory' ? 'Factory / mill' : 'Other'

async function sendDemoRequest(brief: DemoBrief) {
  const role = roleLabel(brief.role)
  // FormSubmit must be called from the browser. Server-side posts from Vercel
  // are blocked by Cloudflare and return 403, which surfaced as "Could not send".
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(INBOX)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: `Fruma demo request — ${role} — ${brief.company}`,
      _replyto: brief.email,
      _template: 'table',
      _captcha: 'false',
      name: brief.name,
      email: brief.email,
      company: brief.company,
      role,
      notes: brief.notes || 'No notes provided.',
      source: 'www.fruma.ai marketplace demo form',
    }),
  })

  let data: { success?: string | boolean; message?: string } = {}
  try {
    data = await res.json()
  } catch {
    throw new Error(`Could not send that just now. Email ${INBOX}.`)
  }

  const success = String(data.success) === 'true'
  const message = String(data.message ?? '')
  if (success) return { activated: true as const }

  // First submission asks Owen to click FormSubmit's Activate Form link.
  if (/activation|activate form/i.test(message)) {
    return { activated: false as const }
  }

  throw new Error(message || `Could not send that just now. Email ${INBOX}.`)
}

export default function DemoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [brief, setBrief] = useState<DemoBrief>({ name: '', email: '', company: '', role: 'brand', notes: '' })
  const [honey, setHoney] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [needsActivation, setNeedsActivation] = useState(false)

  function update(field: keyof DemoBrief, value: string) {
    setBrief(previous => ({ ...previous, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (honey) {
      setStatus('ok')
      return
    }
    setStatus('loading')
    setError('')
    setNeedsActivation(false)
    try {
      const result = await sendDemoRequest(brief)
      setNeedsActivation(!result.activated)
      setStatus('ok')
      // Best-effort server log; ignore failures.
      void fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...brief, clientSent: true }),
      }).catch(() => undefined)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : `Could not send that. Email ${INBOX}.`)
    }
  }

  function handleOpen(value: boolean) {
    onOpenChange(value)
    if (!value) {
      setStatus('idle')
      setError('')
      setNeedsActivation(false)
      setHoney('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-[540px] gap-6 rounded-lg p-6 sm:p-9">
        <DialogHeader className="space-y-3 text-left">
          <Eyebrow className="text-muted-foreground">Meet the Fruma marketplace</Eyebrow>
          <DialogTitle className="text-3xl font-normal leading-tight tracking-[-0.04em]">
            {status === 'ok' ? (needsActivation ? 'One more step.' : 'Request sent.') : 'Find your next manufacturing partner.'}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {status === 'ok'
              ? needsActivation
                ? `We’ve emailed ${INBOX} an activation link from FormSubmit. Click Activate Form once, then demo requests will arrive there.`
                : 'Thanks — we’ve got your details and will be in touch.'
              : 'Tell us about your brand or design studio, what you want to make, and the factories you are looking for.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {status === 'ok' ? (
            <div className="space-y-5">
              <div className="rounded-md border border-border bg-muted/40 p-5 text-sm">
                <p className="font-medium">{brief.name}</p>
                <p className="mt-1 text-muted-foreground">{brief.company} · {roleLabel(brief.role)}</p>
                <p className="mt-1 break-all text-muted-foreground">{brief.email}</p>
                {brief.notes && <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 leading-relaxed">{brief.notes}</p>}
              </div>
              <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5" />
                {needsActivation ? `Activation email sent to ${INBOX}.` : `Sent to ${INBOX}.`}
              </p>
              <Button
                variant="ghost"
                className="w-full rounded-full"
                onClick={() => {
                  setBrief({ name: '', email: '', company: '', role: 'brand', notes: '' })
                  setStatus('idle')
                  setError('')
                  setNeedsActivation(false)
                }}
              >
                <ArrowLeft className="h-4 w-4" />Send another request
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="demo-name">Your name</Label><Input id="demo-name" autoComplete="name" required maxLength={120} placeholder="Alex Taylor" value={brief.name} onChange={event => update('name', event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="demo-company">Company</Label><Input id="demo-company" autoComplete="organization" required maxLength={160} placeholder="Your company" value={brief.company} onChange={event => update('company', event.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="demo-email">Work email</Label><Input id="demo-email" type="email" autoComplete="email" required maxLength={254} placeholder="alex@company.com" value={brief.email} onChange={event => update('email', event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="demo-role">I represent</Label><Select value={brief.role} onValueChange={value => update('role', value)}><SelectTrigger id="demo-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="brand">An apparel brand</SelectItem><SelectItem value="designer">A designer or design studio</SelectItem><SelectItem value="factory">A factory or mill</SelectItem><SelectItem value="other">Something else</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="demo-notes">What would you like to explore? <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="demo-notes" value={brief.notes} onChange={event => update('notes', event.target.value)} maxLength={2000} placeholder="Tell us what you want to make, the factory capabilities you need, or your sample requirements…" className="min-h-24 resize-y" /></div>
              <input type="text" name="_honey" value={honey} onChange={event => setHoney(event.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              {status === 'error' && <p className="text-xs text-destructive" role="alert">{error}</p>}
              <p className="rounded-md bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">Your request is emailed to {INBOX}. We’ll reply to the work email you provide.</p>
              <Button type="submit" disabled={status === 'loading'} className="h-12 w-full justify-between rounded-full px-5">
                {status === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <>Send demo request<ArrowUpRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
