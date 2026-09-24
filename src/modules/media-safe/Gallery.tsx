import * as React from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Archive, CalendarDays, Camera, Film, MapPin, Play, ShieldCheck, Upload, Users } from 'lucide-react'
import type { Verdict } from '@/data/types'
import { channelMap, evaluateAsset } from '@/engine/permission'
import { VERDICT_META } from '@/data/reference'
import { Button, Card, Empty, PageHeader } from '@/design/ui'
import { ChannelDots, PhotoFaces, VerdictChip } from '@/design/media'
import { useApp } from '@/store/app'
import { useCtx } from '@/store/hooks'
import { cn, DEMO_NOW, fmtDate, fmtDateTime } from '@/lib/utils'
import { DEST_LABEL, byId, isUnknownFace, photoLabel, useDest, useScope, useScopedAssets, type MediaDest } from './lib'
import { Crumbs, DestSwitch, VERDICT_DOT, VERDICT_ORDER } from './parts'

type Show = 'all' | Verdict
const DEST_HINT: Record<MediaDest, string> = {
  instagram: 'Previews show exactly what would be posted: children without permission are softly blurred.',
  website: 'Previews show exactly what would go on the website: children without permission are softly blurred.',
  print: 'Print never uses blurred faces — every child in a printed photo needs permission.',
  'private-gallery': 'Parents see these inside the app. Protected children and families who opted out are blurred.',
}

export function Gallery() {
  const { eventId } = useParams()
  const ev = useApp((s) => s.events.find((e) => e.id === eventId))
  const people = useApp((s) => s.people)
  const scope = useScope()
  const ctx = useCtx()
  const scoped = useScopedAssets()
  const [dest, setDest] = useDest()
  const [sp, setSp] = useSearchParams()
  const showRaw = sp.get('show')
  const show: Show = showRaw && (VERDICT_ORDER as string[]).includes(showRaw) ? (showRaw as Verdict) : 'all'
  const setShow = (v: Show) => setSp((p) => { const n = new URLSearchParams(p); if (v === 'all') n.delete('show'); else n.set('show', v); return n }, { replace: true })

  const photos = React.useMemo(() => scoped.filter((a) => a.eventId === eventId && a.kind === 'photo').sort(byId), [scoped, eventId])
  const videos = React.useMemo(() => scoped.filter((a) => a.eventId === eventId && a.kind === 'video').sort(byId), [scoped, eventId])
  const evals = React.useMemo(() => photos.map((a) => evaluateAsset(ctx, a, dest)), [photos, ctx, dest])
  const counts = React.useMemo(() => {
    const c: Record<Show, number> = { all: evals.length, ready: 0, 'needs-blur': 0, 'keep-private': 0, 'check-faces': 0 }
    evals.forEach((e) => c[e.verdict]++)
    return c
  }, [evals])
  const shown = show === 'all' ? evals : evals.filter((e) => e.verdict === show)
  const qs = `?dest=${dest}`

  if (!ev) {
    return (
      <div>
        <Crumbs items={[{ label: 'Media Safe', to: '/media' }, { label: 'Event not found' }]} />
        <Card><Empty icon={<Camera className="size-6" />} title="We couldn’t find that event" body="It may have been archived. Pick an event from Media Safe." action={<Button to="/media">Back to Media Safe</Button>} /></Card>
      </div>
    )
  }

  const photographers = ev.photographerIds.map((id) => people.find((p) => p.id === id)?.name ?? id)
  const windowOpen = ev.uploadWindow ? new Date(ev.uploadWindow.to).getTime() > new Date(DEMO_NOW).getTime() : false
  const access = photographers.length
    ? `${photographers.join(', ')} (guest)${ev.uploadWindow ? ` · link ${windowOpen ? 'open until' : 'closed'} ${fmtDate(ev.uploadWindow.to)}` : ' · link closed'}`
    : 'Staff uploads only — no guest access'

  return (
    <div>
      <Crumbs items={[{ label: 'Media Safe', to: '/media' }, { label: ev.name }]} />
      <PageHeader title={ev.name}
        subtitle={photos.length || videos.length
          ? `${photos.length} photo${photos.length === 1 ? '' : 's'}${videos.length ? ` · ${videos.length} video${videos.length === 1 ? '' : 's'}` : ''}${scope ? ` with Class ${scope} children` : ''}, each checked against every parent’s choice.`
          : 'No photos yet. Each one is checked against every parent’s choice as it arrives.'}
        actions={<>
          <Button variant="secondary" icon={<Upload className="size-4" />} to={`/media/upload?event=${ev.id}`}>Upload photos</Button>
          {!scope && <Button icon={<ShieldCheck className="size-4" />} to={`/publish?event=${ev.id}`}>Open Publish Guard</Button>}
        </>} />

      <Card className="mb-6 grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Meta icon={<CalendarDays className="size-4" />} label="Date" value={fmtDateTime(ev.date)} />
        <Meta icon={<MapPin className="size-4" />} label="Location" value={ev.location} />
        <Meta icon={<Camera className="size-4" />} label="Photographer access" value={access} tone={windowOpen ? 'text-ok' : undefined} />
        <Meta icon={<Archive className="size-4" />} label="Kept until" value={`${fmtDate(ev.retentionUntil)}, then archived or deleted`} />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DestSwitch value={dest} onChange={setDest} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter photos">
          {(['all', ...VERDICT_ORDER] as Show[]).map((k) => {
            const active = show === k
            return (
              <button key={k} type="button" onClick={() => setShow(k)} aria-pressed={active} disabled={k !== 'all' && !counts[k] && !active}
                className={cn('inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-45',
                  active ? 'border-navy bg-navy text-white' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink')}>
                {k !== 'all' && <span className={cn('size-2 rounded-full', VERDICT_DOT[k])} />}
                {k === 'all' ? 'All' : VERDICT_META[k].label}
                <span className={cn('num', active ? 'text-white/70' : 'text-ink-3')}>{counts[k]}</span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-3">{DEST_HINT[dest]}</p>

      {!photos.length ? (
        <Card className="mt-5">
          <Empty icon={<Camera className="size-6" />} title="No photos yet"
            body="Photos from this event appear here as soon as they’re uploaded — already checked against every parent’s choice."
            action={<Button icon={<Upload className="size-4" />} to={`/media/upload?event=${ev.id}`}>Upload photos</Button>} />
        </Card>
      ) : !shown.length ? (
        <Card className="mt-5">
          <Empty title={`Nothing under “${show === 'all' ? 'All' : VERDICT_META[show].label}” for ${DEST_LABEL[dest]}`} body="Try another filter or destination." action={<Button variant="secondary" onClick={() => setShow('all')}>Show all photos</Button>} />
        </Card>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((e) => {
            const unknown = e.asset.faces.filter(isUnknownFace).length
            return (
              <Link key={e.asset.id} to={`/media/photos/${e.asset.id}${qs}`}
                className="group card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
                <div className="overflow-hidden">
                  <PhotoFaces asset={e.asset} evals={e.faces} aspect={4 / 3} blurBlocked rounded="rounded-none" className="transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <VerdictChip verdict={e.verdict} size="sm" />
                    <span className="inline-flex items-center gap-1 text-xs text-ink-3" title="Faces found">
                      <Users className="size-3.5" />{e.asset.faces.length}{unknown ? <span className="text-info"> · {unknown} unknown</span> : null}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-ink-3">{photoLabel(e.asset, photos.indexOf(e.asset))}</span>
                    <ChannelDots items={channelMap(ctx, e.asset)} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {videos.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Videos</h2>
            <Link to="/video" className="text-[13px] font-semibold text-azure hover:underline">Open Video Studio</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => {
              const verdict = evaluateAsset(ctx, v, dest).verdict
              return (
                <Link key={v.id} to="/video" className="group card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
                  <div className="relative aspect-video bg-navy">
                    <video src={`${v.src}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover opacity-90" />
                    <span className="absolute inset-0 flex items-center justify-center"><span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-navy shadow transition-transform group-hover:scale-105"><Play className="ml-0.5 size-5" /></span></span>
                    {v.duration ? <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white num">{Math.floor(v.duration / 60)}:{String(Math.round(v.duration % 60)).padStart(2, '0')}</span> : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3.5">
                    <VerdictChip verdict={verdict} size="sm" />
                    <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Film className="size-3.5" />{v.tracks?.length ?? v.faces.length} people tracked</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function Meta({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-2">{icon}</span>
      <div className="min-w-0">
        <div className="label-caps">{label}</div>
        <div className={cn('mt-0.5 text-sm text-ink', tone)}>{value}</div>
      </div>
    </div>
  )
}
