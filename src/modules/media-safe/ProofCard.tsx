import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  BadgeCheck, ChevronLeft, ChevronRight, Clock3, EyeOff, Film, Fingerprint, HelpCircle, ImageOff, ListChecks, Lock, ScrollText, ShieldCheck, UserRound, UserRoundSearch,
} from 'lucide-react'
import type { MediaAsset, Verdict } from '@/data/types'
import { decisionTrace, evaluateAsset, type FaceEval } from '@/engine/permission'
import { DEST, MEDIA_PURPOSES } from '@/data/reference'
import { Avatar, Button, Card, Chip, Empty, Switch, type Tone } from '@/design/ui'
import { EvidenceLink, PhotoFaces, VerdictChip } from '@/design/media'
import { WhatsappIcon } from '@/design/brand-icons'
import { useApp, personName } from '@/store/app'
import { useAsset, useCtx } from '@/store/hooks'
import { addDays, cn, fmtDate, fmtDateTime } from '@/lib/utils'
import { CHANNEL_LABEL, STATUS_WORD, VERIFY_LABEL, actorOf, byId, firstName, photoLabel, useClassLabel, useDest, useScope, useScopedAssets, type MediaDest } from './lib'
import { Crumbs, DestSwitch, FaceCrop, FaceRings, StatusChip } from './parts'

function faceChip(fe: FaceEval, verdict: Verdict): { tone: Tone; label: string } {
  if (fe.face.review === 'non-student') return { tone: 'muted', label: 'Adult / visitor' }
  if (fe.face.review === 'always-blur') return { tone: 'warn', label: 'Always blurred' }
  if (fe.state === 'unknown') return { tone: 'info', label: 'Unknown' }
  if (fe.state === 'ok') return { tone: 'ok', label: 'Allowed' }
  if (fe.student?.protected) return { tone: 'risk', label: 'Protected' }
  return verdict === 'needs-blur' ? { tone: 'warn', label: 'Blurred' } : { tone: 'risk', label: 'Not allowed' }
}

const askable = (fe: FaceEval) =>
  fe.state === 'blocked' && !!fe.student && !fe.student.protected && fe.face.review !== 'always-blur' && (!fe.permission || fe.permission.status === 'pending' || fe.permission.status === 'denied')

export function ProofCard() {
  const { assetId } = useParams()
  const asset = useAsset(assetId)
  const ctx = useCtx()
  const [dest, setDest] = useDest()
  const scope = useScope()
  const scoped = useScopedAssets()
  const role = useApp((s) => s.role)
  const ev = useApp((s) => s.events.find((e) => e.id === asset?.eventId))
  const tasks = useApp((s) => s.tasks)
  const evidence = useApp((s) => s.evidence)
  const setUI = useApp((s) => s.setUI)
  const classLabel = useClassLabel()
  const navigate = useNavigate()
  const [sel, setSel] = React.useState<string | null>(null)
  const [blur, setBlur] = React.useState(true)

  const siblings = React.useMemo(() => (asset ? scoped.filter((a) => a.eventId === asset.eventId && a.kind === 'photo').sort(byId) : []), [scoped, asset])
  const idx = siblings.findIndex((a) => a.id === assetId)
  const prev = idx > 0 ? siblings[idx - 1] : undefined
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined
  const qs = `?dest=${dest}`
  const e = React.useMemo(() => (asset ? evaluateAsset(ctx, asset, dest) : undefined), [asset, ctx, dest])

  React.useEffect(() => {
    const h = (k: KeyboardEvent) => {
      if ((k.target as HTMLElement | null)?.closest?.('input,textarea,select,[contenteditable="true"]')) return
      if (k.key === 'ArrowLeft' && prev) navigate(`/media/photos/${prev.id}${qs}`)
      if (k.key === 'ArrowRight' && next) navigate(`/media/photos/${next.id}${qs}`)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [prev, next, qs, navigate])

  if (!asset || !e || (scope && !scoped.some((a) => a.id === asset.id))) {
    return (
      <div>
        <Crumbs items={[{ label: 'Media Safe', to: '/media' }, { label: 'Photo' }]} />
        <Card><Empty icon={<ImageOff className="size-6" />} title={asset ? 'This photo isn’t in your class' : 'We couldn’t find that photo'}
          body={asset ? `You can see photos that include children from Class ${scope}.` : 'It may have been removed or archived.'} action={<Button to="/media">Back to Media Safe</Button>} /></Card>
      </div>
    )
  }
  if (asset.kind === 'video') {
    return (
      <div>
        <Crumbs items={[{ label: 'Media Safe', to: '/media' }, ...(ev ? [{ label: ev.name, to: `/media/events/${ev.id}` }] : []), { label: 'Video' }]} />
        <Card><Empty icon={<Film className="size-6" />} title="This is a video" body="Videos are checked frame by frame in Video Studio." action={<Button to="/video">Open Video Studio</Button>} /></Card>
      </div>
    )
  }

  const selFace = e.faces.find((f) => f.face.id === sel) ?? e.faces.find((f) => f.state === 'blocked') ?? e.faces.find((f) => f.state === 'unknown') ?? e.faces[0]
  const destLabel = DEST[dest].label
  const label = photoLabel(asset, idx)
  const target = (selFace && askable(selFace) ? selFace : undefined) ?? [...e.faces.filter(askable)].sort((a, b) => Number(b.permission?.status === 'pending') - Number(a.permission?.status === 'pending'))[0]
  const tStudent = target?.student
  const tGuardian = tStudent ? ctx.guardians.find((g) => g.id === (target?.permission?.guardianId ?? tStudent.guardianIds[0])) : undefined
  const askLink = `/media/photos/${asset.id}`
  const asked = !!tStudent && tasks.some((t) => t.status === 'open' && !!t.link?.startsWith(askLink) && t.title.includes(tStudent.name))
  const kept = evidence.findLast((x) => x.type === 'review' && x.refs[0] === asset.id && x.payload?.decision === 'Keep private' && x.payload?.destination === destLabel)

  const keepPrivate = () => {
    const id = useApp.getState().addEvidence({
      type: 'review', title: `${label} kept private — not for ${destLabel}`, actor: actorOf(role), refs: [asset.id, ...(ev ? [ev.id] : [])],
      payload: { decision: 'Keep private', destination: destLabel, reason: e.reason },
    })
    toast.success('Kept private', { description: `It won’t go to ${destLabel}. Recorded as ${id}.`, action: { label: 'View record', onClick: () => setUI({ evidenceDrawer: id }) } })
  }
  const askParent = () => {
    if (!tStudent || !tGuardian) return
    const s = useApp.getState()
    s.addTask({ title: `Waiting on ${tGuardian.name}: allow ${tStudent.name} in ${label} for ${destLabel}?`, area: 'media', ownerId: 'U-OFFICE', dueAt: addDays(new Date().toISOString(), 3), link: `${askLink}${qs}`, kind: 'review' })
    s.addEvidence({ type: 'permission', title: `Asked ${tGuardian.name} on WhatsApp to allow ${tStudent.name} in ${asset.id} (${destLabel})`, actor: actorOf(role), refs: [tStudent.id, asset.id, tGuardian.id], payload: { channel: 'WhatsApp', photo: asset.id, use: destLabel } })
    toast.success(`Request sent to ${tGuardian.name} on WhatsApp`, { description: `This photo updates by itself as soon as ${firstName(tGuardian.name)} replies.` })
  }
  const canShare = e.verdict === 'ready' || e.verdict === 'needs-blur'

  return (
    <div>
      <Crumbs items={[{ label: 'Media Safe', to: '/media' }, ...(ev ? [{ label: ev.name, to: `/media/events/${ev.id}${qs}` }] : []), { label }]} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="label-caps mb-1.5">Proof card</div>
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{label}</h1>
          <p className="mt-1 text-sm text-ink-2">{ev?.name ?? 'Event'} · {fmtDateTime(asset.capturedAt)} · uploaded by {personName(asset.uploadedBy)}</p>
        </div>
        {siblings.length > 1 && (
          <div className="flex items-center gap-2">
            <NavBtn to={prev && `/media/photos/${prev.id}${qs}`} label="Previous photo"><ChevronLeft className="size-4" /></NavBtn>
            <span className="min-w-14 text-center text-sm text-ink-2 num">{idx + 1} / {siblings.length}</span>
            <NavBtn to={next && `/media/photos/${next.id}${qs}`} label="Next photo"><ChevronRight className="size-4" /></NavBtn>
          </div>
        )}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <DestSwitch value={dest} onChange={setDest} />
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink-2">
                <Switch checked={blur} onCheckedChange={setBlur} label="Show blur" /> Show blur
              </label>
            </div>
            <div className="mb-4 rounded-xl border border-line bg-[#fbfaf7] p-3.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <VerdictChip verdict={e.verdict} />
                <span className="text-sm text-ink-2">{e.verdict === 'keep-private' && DEST[dest].note && !e.faces.some((f) => f.state === 'blocked' && f.face.main) ? DEST[dest].note : e.reason}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!scope && (e.verdict === 'check-faces'
                  ? <Button icon={<UserRoundSearch className="size-4" />} to="/media/review">Check faces first</Button>
                  : canShare
                    ? <Button icon={<EyeOff className="size-4" />} to={`/publish/blur/${asset.id}?dest=${dest}`}>{e.verdict === 'ready' ? 'Share' : 'Blur & share'}</Button>
                    : <Button icon={<EyeOff className="size-4" />} disabled title={e.reason}>Blur & share</Button>)}
                <Button variant="secondary" icon={<Lock className="size-4" />} onClick={keepPrivate} disabled={!!kept}>{kept ? 'Kept private' : 'Keep private'}</Button>
                <Button variant="secondary" icon={<WhatsappIcon className="size-4" />} onClick={askParent} disabled={!tGuardian || asked}>{asked ? 'Parent asked' : 'Ask parent'}</Button>
              </div>
              <p className="mt-2.5 text-[13px] text-ink-3">
                {kept ? <>Kept private for {destLabel} on {fmtDate(kept.at)} by {personName(kept.actor)} · <EvidenceLink id={kept.id} /></>
                  : tStudent && tGuardian ? (asked ? `Waiting for ${tGuardian.name} to reply on WhatsApp.` : `Ask parent sends ${tGuardian.name} (${firstName(tStudent.name)}’s ${tGuardian.relation.toLowerCase()}) a one-tap request for this photo.`)
                    : e.faces.some((f) => f.state === 'unknown') ? 'Check the unknown face first — then we know whose parent to ask.'
                      : e.faces.some((f) => f.state === 'blocked' && f.student?.protected) ? 'Protected children are never shared publicly, so there’s no one to ask.'
                        : e.faces.some((f) => f.state === 'blocked' && f.permission?.status === 'withdrawn') ? 'A parent withdrew this permission — we don’t ask again.'
                          : 'Everyone here is already cleared — no need to ask.'}
              </p>
            </div>
            <div className="mx-auto" style={{ maxWidth: `min(100%, calc(62vh * ${(asset.w / asset.h).toFixed(3)}))` }}>
              <PhotoFaces asset={asset} evals={e.faces} blurBlocked={blur} loading="eager">
                <FaceRings asset={asset} evals={e.faces} blur={blur} selectedId={selFace?.face.id} onSelect={setSel} />
              </PhotoFaces>
            </div>
          </Card>
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-3"><ShieldCheck className="size-3.5 text-ok" /> Face matching is used only to enforce parents’ choices.</p>
        </div>

        <Card className="p-5 xl:sticky xl:top-24">
          <h2 className="font-display text-[20px] font-semibold text-ink">Why this decision</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Each face is checked against its own parent’s choice for {destLabel}. Tap a face to see the proof.</p>
          {e.faces.length ? (
            <ul className="mt-4 space-y-1">
              {e.faces.map((fe) => {
                const chip = faceChip(fe, e.verdict)
                const active = fe.face.id === selFace?.face.id
                return (
                  <li key={fe.face.id}>
                    <button type="button" onClick={() => setSel(fe.face.id)} aria-pressed={active}
                      className={cn('flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors', active ? 'border-azure/40 bg-azure-50/70' : 'border-transparent hover:bg-sunken')}>
                      <FaceCrop asset={asset} face={fe.face} size={40} zoom={1.5} className="rounded-full" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{fe.face.review === 'non-student' ? 'Adult / visitor' : fe.student?.name ?? 'Unknown face'}</span>
                          {fe.student && <span className="shrink-0 text-xs text-ink-3">{classLabel(fe.student.classId)}</span>}
                        </div>
                        <div className="truncate text-xs text-ink-3">{fe.reason}</div>
                      </div>
                      <Chip size="sm" tone={chip.tone}>{chip.label}</Chip>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : <p className="mt-4 rounded-xl bg-sunken px-4 py-3 text-sm text-ink-2">No faces in this photo — nothing to check.</p>}
          {selFace && <div className="mt-5 border-t border-line pt-5"><FaceDetail fe={selFace} dest={dest} asset={asset} /></div>}
        </Card>
      </div>
    </div>
  )
}

function NavBtn({ to, label, children }: { to?: string; label: string; children: React.ReactNode }) {
  const cls = 'inline-flex size-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink transition-colors'
  return to ? <Link to={to} aria-label={label} title={`${label} (arrow key)`} className={cn(cls, 'hover:bg-sunken')}>{children}</Link>
    : <span aria-disabled className={cn(cls, 'opacity-40')}>{children}</span>
}

function FaceDetail({ fe, dest, asset }: { fe: FaceEval; dest: MediaDest; asset: MediaAsset }) {
  const evidence = useApp((s) => s.evidence)
  const reviewEv = evidence.findLast((x) => x.type === 'review' && x.refs.includes(fe.face.id))
  if (fe.face.review === 'non-student' || fe.face.review === 'always-blur') {
    const adult = fe.face.review === 'non-student'
    return (
      <div className="rounded-xl bg-sunken p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">{adult ? <UserRound className="size-4" /> : <EyeOff className="size-4" />}{adult ? 'Adult or visitor' : 'Always blurred'}</div>
        <p className="mt-1 text-[13px] text-ink-2">{adult ? 'Marked as an adult or visitor, so no parent’s choice applies.' : 'Staff asked for this face to be blurred everywhere, whatever the destination.'}</p>
        {reviewEv && <p className="mt-2 text-xs text-ink-3">Recorded {fmtDate(reviewEv.at)} · <EvidenceLink id={reviewEv.id} /></p>}
      </div>
    )
  }
  if (fe.state === 'unknown' || !fe.student) {
    return (
      <div className="rounded-xl bg-info-bg/70 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-info"><HelpCircle className="size-4" /> Not matched to any student</div>
        <p className="mt-1 text-[13px] text-ink-2">Unknown faces are never guessed. Someone at school confirms who this is — then that parent’s choice applies straight away.</p>
        <Button size="sm" variant="soft" className="mt-3" icon={<UserRoundSearch className="size-4" />} to="/media/review">Check this face</Button>
      </div>
    )
  }
  return <Trace fe={fe} dest={dest} />
}

function Trace({ fe, dest }: { fe: FaceEval; dest: MediaDest }) {
  const ctx = useCtx()
  const purpose = DEST[dest].purpose
  const { student, permission: p, guardian: g, notice } = decisionTrace(ctx, fe.student!.id, purpose)
  if (!student) return null
  const prev = p && p.history.length > 1 ? p.history[p.history.length - 2] : undefined
  const steps: { icon: React.ReactNode; label: string; body: React.ReactNode }[] = [
    { icon: <UserRound className="size-4" />, label: 'Parent', body: g ? <><span className="font-semibold">{g.name}</span> · {g.relation}</> : 'No parent linked yet' },
    { icon: <BadgeCheck className="size-4" />, label: 'Verified', body: g?.verification ? `${VERIFY_LABEL[g.verification.method]} · ${fmtDate(g.verification.at)}` : <span className="text-warn">Not verified yet</span> },
    { icon: <ListChecks className="size-4" />, label: 'Choice', body: <span className="flex flex-wrap items-center gap-2">{MEDIA_PURPOSES.find((x) => x.key === purpose)?.label}<StatusChip status={p?.status ?? 'pending'} size="sm" /></span> },
    { icon: <ScrollText className="size-4" />, label: 'Notice', body: notice ? `Version ${notice.id} · ${notice.status === 'live' ? 'current notice' : notice.status} · ${notice.languages.map((l) => (l === 'hi' ? 'Hindi' : 'English')).join(' + ')}` : 'Not recorded' },
    { icon: <Clock3 className="size-4" />, label: 'Set at', body: p ? `${fmtDateTime(p.at)} · ${CHANNEL_LABEL[p.via]}` : 'No choice recorded yet' },
    { icon: <Fingerprint className="size-4" />, label: 'Evidence ID', body: p ? <EvidenceLink id={p.evidenceId} /> : '—' },
  ]
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={student.name} size={36} />
        <div className="min-w-0">
          <Link to={`/media/students/${student.id}`} className="text-sm font-semibold text-ink hover:text-azure">{student.name}’s choice for {DEST[dest].label}</Link>
          <div className="text-xs text-ink-3">{fe.face.review === 'confirmed' ? 'Identity confirmed by staff' : `Matched automatically · ${Math.round(fe.face.confidence * 100)}% sure`}</div>
        </div>
      </div>
      {student.protected && (
        <div className="mb-4 rounded-xl bg-risk-bg px-3.5 py-2.5 text-[13px] text-ink"><span className="font-semibold text-risk">Safeguarding flag. </span>Never shown publicly, whatever the permission says.</div>
      )}
      <ol>
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className="absolute bottom-0 left-4 top-9 w-px bg-line" />}
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2">{s.icon}</span>
            <div className="min-w-0 pt-0.5">
              <div className="label-caps">{s.label}</div>
              <div className="mt-0.5 text-sm text-ink">{s.body}</div>
            </div>
          </li>
        ))}
      </ol>
      {prev && <p className="mt-3 rounded-lg bg-sunken px-3 py-2 text-xs text-ink-2">Earlier: {STATUS_WORD[prev.status]} on {fmtDate(prev.at)}. The latest choice always wins.</p>}
    </div>
  )
}
