import * as React from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Ban, Check, EyeOff, Info, KeyRound, Loader2, Lock, Mail, Phone, ScanFace, UploadCloud } from 'lucide-react'
import { create } from 'zustand'
import { toast } from 'sonner'
import { Avatar, Button, Card, Mono } from '@/design/ui'
import { useApp } from '@/store/app'
import { useCan } from '@/store/hooks'
import { cn, fmtDateTime } from '@/lib/utils'
import type { Vendor } from '@/data/types'
import { phaseIndex, usePortalSession, type XItem } from './session'
import { DropZone, EngineStatus } from './parts'
import { XRayPhoto } from './XRayPhoto'
import { fetchSampleFiles, useSamples } from './samples'
import { accessState, countdown, issuePhotographerLink, PHOTO_VENDOR_ID, scopedEventId, usePhotoVendor, useTicker } from './access'

/** Device checklist confirmation survives navigation within the session. */
const useAttestation = create<{ evidenceId: string | null; token: string | null }>(() => ({ evidenceId: null, token: null }))
useApp.subscribe((s, prev) => { if (s.evidence.length < prev.evidence.length) useAttestation.setState({ evidenceId: null, token: null }) })

export function PortalPage() {
  const role = useApp((s) => s.role)
  const v = usePhotoVendor()
  const now = useTicker(1000)
  const [params] = useSearchParams()
  const linkToken = params.get('token')
  // an old link (after the school issued a new one) is closed too
  const state = linkToken && v?.access && linkToken !== v.access.token ? 'replaced' : accessState(v, now)
  const eventId = scopedEventId(v) ?? ''
  const event = useApp((s) => s.events.find((e) => e.id === eventId))
  const photographer = useApp((s) => s.people.find((p) => p.id === 'U-PHOTO'))
  const school = useApp((s) => s.school)
  const all = usePortalSession((s) => s.items)
  const items = React.useMemo(() => all.filter((i) => i.eventId === eventId), [all, eventId])
  const { samples } = useSamples(eventId)
  const [samplesLoading, setSamplesLoading] = React.useState(false)

  React.useEffect(() => {
    if (state !== 'active') usePortalSession.getState().cancelQueued('The upload link closed before this photo was sent.')
  }, [state])

  if (state !== 'active') return <ClosedLink vendor={v} state={state} preview={role !== 'photographer'} />

  const addFiles = (files: File[]) => { usePortalSession.getState().add(files, eventId) }
  const addSamples = async () => {
    setSamplesLoading(true)
    try {
      const files = await fetchSampleFiles(samples)
      if (!files.length) toast.error('Sample photos could not be loaded')
      else addFiles(files)
    } finally {
      setSamplesLoading(false)
    }
  }
  const firstName = photographer?.name.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      {role !== 'photographer' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-azure/20 bg-azure-50 px-4 py-2.5 text-[13px] text-ink-2">
          <Info className="size-4 text-azure" /> Preview of the photographer’s view. Photographers see only this page: no names, no library, no downloads.
          <Button size="sm" variant="ghost" className="ml-auto" to="/media/upload">Back to Media X-Ray</Button>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <AccessCard vendor={v!} now={now} windowFrom={event?.uploadWindow?.from} />
        </aside>

        <div className="min-w-0 space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="label-caps">Guest upload · {event?.name}</div>
              <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight text-ink">Hi {firstName}, upload your {event?.name} photos</h1>
              <p className="mt-1.5 max-w-2xl text-[15px] text-ink-2">They go straight to {school.name}. Faces are found here so the school can apply each family’s choices. You won’t see any names.</p>
            </div>
            <EngineStatus />
          </header>

          <DropZone compact={items.length > 0} onFiles={addFiles} onSamples={samples.length ? () => void addSamples() : undefined} samplesLoading={samplesLoading}
            title={items.length ? 'Add more photos' : `Drop your ${event?.name ?? 'event'} photos here`}
            hint={items.length ? 'Drag photos here or choose them.' : 'or choose them from this computer. JPG or PNG, straight from the card is fine.'} />

          {items.length > 0 && <FacesBanner items={items} />}

          {items.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {items.map((it) => <PortalItem key={it.key} item={it} />)}
              </AnimatePresence>
            </div>
          )}

          {items.some((i) => i.phase === 'done') && <DeviceChecklist vendor={v!} eventName={event?.name ?? ''} eventId={eventId} photos={items.filter((i) => i.phase === 'done').length} />}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Access card ---------------- */

function AccessCard({ vendor, now, windowFrom }: { vendor: Vendor; now: number; windowFrom?: string }) {
  const school = useApp((s) => s.school)
  const access = vendor.access!
  const end = new Date(access.expiresAt).getTime()
  const start = windowFrom ? new Date(windowFrom).getTime() : end - 7 * 86400000
  const left = countdown(end - now)
  const pctLeft = Math.max(0, Math.min(100, ((end - now) / Math.max(1, end - start)) * 100))
  const scope = access.scope.split('·').map((s) => s.trim()).filter(Boolean)
  const scopeIcon = (s: string) => (/download/i.test(s) ? <Ban className="size-4" /> : /name/i.test(s) ? <EyeOff className="size-4" /> : <UploadCloud className="size-4" />)
  return (
    <Card className="overflow-hidden">
      <div className="bg-navy p-5 text-white">
        <div className="flex items-center gap-3">
          <Avatar name={vendor.name} size={40} />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-semibold">{vendor.name}</div>
            <div className="text-[12.5px] text-white/65">Guest upload link · time-bound</div>
          </div>
        </div>
        <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.06em] text-white/55">Link closes in</div>
        <div className="mt-1 flex items-baseline gap-2.5 font-display font-semibold num" aria-live="off">
          <TimePart v={left.d} u="d" /><TimePart v={left.h} u="h" /><TimePart v={left.m} u="m" /><TimePart v={left.s} u="s" dim />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#7FB3FF] transition-all duration-1000" style={{ width: `${pctLeft}%` }} /></div>
        <div className="mt-1.5 text-[12px] text-white/60">Until {fmtDateTime(access.expiresAt)}</div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <div className="label-caps">Access token</div>
          <div className="mt-1.5 inline-flex items-center gap-2 rounded-lg bg-sunken px-2.5 py-1.5"><KeyRound className="size-3.5 text-ink-3" /><Mono className="text-ink">{access.token}</Mono></div>
        </div>
        <div>
          <div className="label-caps">This link allows</div>
          <ul className="mt-2 space-y-2">
            {scope.map((s, i) => (
              <li key={s} className="flex items-center gap-2.5 text-[13.5px] text-ink">
                <span className={cn('flex size-7 items-center justify-center rounded-lg', i === 0 ? 'bg-ok-bg text-ok' : 'bg-sunken text-ink-2')}>{scopeIcon(s)}</span>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </li>
            ))}
          </ul>
        </div>
        <p className="border-t border-line pt-3 text-[12px] text-ink-3">Questions? {school.privacyContact.name}, {school.privacyContact.role.toLowerCase()} · {school.privacyContact.email}</p>
      </div>
    </Card>
  )
}

function TimePart({ v, u, dim }: { v: number; u: string; dim?: boolean }) {
  return (
    <span className={cn('text-[34px] leading-none', dim && 'text-white/55')}>
      {String(v).padStart(u === 'd' ? 1 : 2, '0')}<span className="ml-0.5 font-sans text-[13px] font-semibold text-white/55">{u}</span>
    </span>
  )
}

/* ---------------- Items ---------------- */

function FacesBanner({ items }: { items: XItem[] }) {
  const detected = items.filter((i) => i.detected)
  const faces = detected.reduce((n, i) => n + i.faces.length, 0)
  const busy = items.some((i) => i.phase !== 'done' && i.phase !== 'error')
  const done = items.filter((i) => i.phase === 'done').length
  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-azure-50 text-azure"><ScanFace className="size-6" /></span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[22px] font-semibold leading-tight text-ink num">
          {faces} face{faces === 1 ? '' : 's'} detected <span className="font-sans text-[15px] font-medium text-ink-2">— the school will match them privately</span>
        </div>
        <p className="mt-0.5 text-[13px] text-ink-3 num">{busy ? `Uploading ${Math.min(done + 1, items.length)} of ${items.length}…` : `${done} photo${done === 1 ? '' : 's'} uploaded to the school.`} Names are never shown here.</p>
      </div>
      {busy ? <Loader2 className="size-5 animate-spin text-azure" /> : <span className="flex size-8 items-center justify-center rounded-full bg-ok-bg text-ok"><Check className="size-4" strokeWidth={2.5} /></span>}
    </Card>
  )
}

function portalStatus(it: XItem): { text: string; tone: 'muted' | 'azure' | 'ok' | 'risk' } {
  switch (it.phase) {
    case 'queued': return { text: 'Waiting', tone: 'muted' }
    case 'reading': return { text: 'Opening', tone: 'azure' }
    case 'faces': return { text: it.detected ? `${it.faces.length} face${it.faces.length === 1 ? '' : 's'} found` : 'Finding faces', tone: 'azure' }
    case 'matching':
    case 'permissions': return { text: 'Sending to the school', tone: 'azure' }
    case 'evidence': return { text: 'Recording the upload', tone: 'azure' }
    case 'done': return { text: `${it.faces.length} face${it.faces.length === 1 ? '' : 's'} detected · uploaded`, tone: 'ok' }
    default: return { text: it.error ?? 'Not uploaded', tone: 'risk' }
  }
}

function PortalItem({ item }: { item: XItem }) {
  const st = portalStatus(item)
  const busy = st.tone === 'azure'
  const p = phaseIndex(item.phase)
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <Card className={cn('overflow-hidden transition-shadow', busy && 'ring-2 ring-azure/40')}>
        <div className="bg-navy p-2.5">
          <XRayPhoto item={item} anonymous maxHeight={210} rounded="rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full',
            st.tone === 'ok' ? 'bg-ok-bg text-ok' : st.tone === 'risk' ? 'bg-risk-bg text-risk' : st.tone === 'azure' ? 'bg-azure-50 text-azure' : 'bg-sunken text-ink-3')}>
            {st.tone === 'ok' ? <Check className="size-4" strokeWidth={2.5} /> : st.tone === 'risk' ? <AlertCircle className="size-4" /> : st.tone === 'azure' ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">{item.name}</div>
            <div className={cn('truncate text-[12px]', st.tone === 'risk' ? 'text-risk' : 'text-ink-3')}>{st.text}</div>
          </div>
        </div>
        <div className="h-1 bg-sunken"><motion.div className={cn('h-full', item.phase === 'error' ? 'bg-risk' : 'bg-azure')} initial={false} animate={{ width: `${item.phase === 'done' ? 100 : item.phase === 'error' ? 100 : Math.max(0, ((p - 1) / 5) * 100)}%`, opacity: item.phase === 'done' ? 0 : 1 }} transition={{ duration: 0.5 }} /></div>
      </Card>
    </motion.div>
  )
}

/* ---------------- Device checklist ---------------- */

function CheckRow({ checked, onChange, disabled, title, body }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; title: string; body?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn('flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed',
        checked ? 'border-ok/30 bg-ok-bg/60' : 'border-line bg-surface hover:border-line-strong', disabled && !checked && 'opacity-55')}>
      <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors', checked ? 'border-ok bg-ok text-white' : 'border-line-strong bg-surface')}>
        <AnimatePresence>{checked && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="size-3.5" strokeWidth={3} /></motion.span>}</AnimatePresence>
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        {body && <span className="block text-[12.5px] text-ink-3">{body}</span>}
      </span>
    </button>
  )
}

function DeviceChecklist({ vendor, eventName, eventId, photos }: { vendor: Vendor; eventName: string; eventId: string; photos: number }) {
  const token = vendor.access?.token ?? ''
  const att = useAttestation()
  const confirmedId = att.token === token ? att.evidenceId : null
  const [wiped, setWiped] = React.useState(!!confirmedId)
  const [noCopies, setNoCopies] = React.useState(!!confirmedId)
  const confirm = () => {
    const s = useApp.getState()
    const id = s.addEvidence({
      type: 'vendor', actor: 'U-PHOTO', refs: [PHOTO_VENDOR_ID, token, eventId],
      title: `${vendor.name} confirmed: memory card wiped and no copies kept after uploading ${eventName} photos`,
      payload: { photos, cardWiped: true, noCopiesKept: true },
    })
    s.notify({ text: `${vendor.name} confirmed the memory card was wiped and no copies were kept (${eventName})`, link: '/trust/vendors', roles: ['office', 'principal'] })
    useAttestation.setState({ evidenceId: id, token })
    toast.success('Thank you — confirmation recorded', { description: `Reference ${id}` })
  }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[20px] font-semibold text-ink">Before you pack up</h2>
            <p className="mt-0.5 text-[13.5px] text-ink-2">Two quick promises that keep children’s photos safe after the event.</p>
          </div>
          {confirmedId && <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-[12.5px] font-semibold text-ok"><Check className="size-3.5" strokeWidth={2.5} /> Confirmed</span>}
        </div>
        <div className="mt-4 grid gap-2.5 md:grid-cols-2">
          <CheckRow checked={wiped} onChange={setWiped} disabled={!!confirmedId} title="Card wiped after upload" body="Format the memory card once every photo shows “uploaded”." />
          <CheckRow checked={noCopies} onChange={setNoCopies} disabled={!!confirmedId} title="No copies kept" body="Nothing left on a laptop, phone, hard drive or cloud folder." />
        </div>
        <div className="mt-4 border-t border-line pt-4">
          {confirmedId ? (
            <p className="flex flex-wrap items-center gap-2 text-[13.5px] text-ink-2"><Lock className="size-4 text-ok" /> Recorded for the school’s evidence log · reference <Mono className="text-ink">{confirmedId}</Mono></p>
          ) : (
            <CheckRow checked={false} onChange={(v) => v && confirm()} disabled={!(wiped && noCopies)}
              title={`I confirm both of these on behalf of ${vendor.name}`} body={wiped && noCopies ? 'Ticking this records your confirmation with a timestamp.' : 'Tick both items above first.'} />
          )}
        </div>
      </Card>
    </motion.div>
  )
}

/* ---------------- Closed link ---------------- */

function ClosedLink({ vendor, state, preview }: { vendor?: Vendor; state: ReturnType<typeof accessState> | 'replaced'; preview: boolean }) {
  const school = useApp((s) => s.school)
  const canVendors = useCan('manage-vendors')
  const canApprove = useCan('approve')
  const reason = state === 'revoked'
    ? 'The school has switched this upload link off.'
    : state === 'replaced'
      ? 'The school has replaced this link with a newer one.'
    : state === 'expired' && vendor?.access
      ? `This link expired on ${fmtDateTime(vendor.access.expiresAt)}.`
      : 'There is no active upload link for this photographer.'
  return (
    <div className="mx-auto max-w-xl py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card className="p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sunken text-ink-2"><Lock className="size-7" /></span>
          <h1 className="mt-4 font-display text-[26px] font-semibold text-ink">This upload link is closed</h1>
          <p className="mx-auto mt-2 max-w-sm text-[14.5px] text-ink-2">{reason} Photos already uploaded are safe with the school.</p>
          {vendor?.access && state !== 'replaced' && <div className="mt-3"><Mono className="rounded-md bg-sunken px-2 py-1 text-ink-3 line-through decoration-ink-3/50">{vendor.access.token}</Mono></div>}
          <div className="mt-6 rounded-xl bg-sunken/70 p-4 text-left text-[13.5px] text-ink-2">
            <div className="font-semibold text-ink">Still have photos to share?</div>
            <p className="mt-0.5">Ask {school.privacyContact.name} ({school.privacyContact.role.toLowerCase()}) for a new link.</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
              <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{school.privacyContact.email}</span>
              <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{school.privacyContact.phone}</span>
            </div>
          </div>
          {preview && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" to="/media/upload">Back to Media X-Ray</Button>
              {(canVendors || canApprove) && (
                <Button variant="soft" icon={<KeyRound className="size-4" />} onClick={() => { const id = issuePhotographerLink(); toast.success('New link issued', { description: `Valid for 3 days.${id ? ` Evidence ${id}` : ''}` }) }}>Issue a new link</Button>
              )}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
