import * as React from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, Camera, ChevronRight, CircleCheck, EyeOff, Film, Images, Radio, Search, ShieldCheck, Upload, UserRoundSearch, X } from 'lucide-react'
import type { MediaAsset, SchoolEvent, Student } from '@/data/types'
import { evaluateAsset, summarize, type EngineCtx } from '@/engine/permission'
import { motion } from 'motion/react'
import { Avatar, Button, Card, Kpi, PageHeader, SectionTitle, Empty, toneText, type Tone } from '@/design/ui'
import { InstagramIcon } from '@/design/brand-icons'
import { useApp, pkey } from '@/store/app'
import { useCtx } from '@/store/hooks'
import { cn, fmtDate, fmtNum } from '@/lib/utils'
import { EVENT_STATUS, MONTH_LABEL, MONTH_START_MS, byId, firstName, isUnknownFace, searchStudents, useClassLabel, useScope, useScopedAssets } from './lib'
import { PermissionChips, ProtectedChip, SummaryBar, SummaryLegend } from './parts'

export function Home() {
  const scope = useScope()
  const ctx = useCtx()
  const assets = useScopedAssets()
  const events = useApp((s) => s.events)
  const allPubs = useApp((s) => s.publications)

  const stats = React.useMemo(() => {
    const month = assets.filter((a) => new Date(a.capturedAt).getTime() >= MONTH_START_MS)
    let blurred = 0
    for (const a of month) {
      const e = evaluateAsset(ctx, a, 'instagram')
      if (e.verdict === 'needs-blur') blurred += e.faces.filter((f) => f.state === 'blocked').length
    }
    const ids = new Set(assets.map((a) => a.id))
    const pubs = allPubs.filter((p) => ids.has(p.assetId))
    const monthPubs = pubs.filter((p) => new Date(p.at).getTime() >= MONTH_START_MS)
    return {
      checked: month.length,
      blurred,
      monthPubs: monthPubs.length,
      unchecked: monthPubs.filter((p) => !p.evidenceId).length, // every post carries a Publish Guard record
      unknown: assets.filter((a) => a.kind === 'photo').reduce((n, a) => n + a.faces.filter(isUnknownFace).length, 0),
      live: pubs.filter((p) => p.status === 'live').length,
      // live originals that now show a child whose parent hasn't allowed this use
      stale: pubs.filter((p) => {
        if (p.status !== 'live' || p.variant !== 'original') return false
        const a = assets.find((x) => x.id === p.assetId)
        return !!a && evaluateAsset(ctx, a, p.destination).faces.some((f) => f.state === 'blocked')
      }).length,
      takedown: pubs.filter((p) => p.status === 'takedown-requested').length,
    }
  }, [assets, ctx, allPubs])

  const sortedEvents = React.useMemo(() => [...events].sort((a, b) => b.date.localeCompare(a.date)), [events])

  return (
    <div>
      <PageHeader eyebrow="Media Safe" title={scope ? `Class ${scope} photos` : 'Photos & videos'}
        subtitle={scope ? `You see only photos that include children from Class ${scope}. Each one follows their parents’ choices.` : 'Every photo is checked against each parent’s choices before it goes anywhere.'}
        actions={<>
          {!scope && <Button variant="secondary" icon={<UserRoundSearch className="size-4" />} to="/media/review">Check faces</Button>}
          <Button icon={<Upload className="size-4" />} to="/media/upload">Upload photos</Button>
        </>} />

      <div className="mb-2 flex items-baseline justify-between"><div className="label-caps">This month · {MONTH_LABEL}</div></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Photos checked" icon={<Images className="size-4 text-ink-3" />} value={fmtNum(stats.checked)} sub="Against every parent’s choices, automatically" />
        <Kpi label="Faces auto-blurred" icon={<EyeOff className="size-4 text-ink-3" />} value={fmtNum(stats.blurred)} sub="Hidden before sharing, as parents asked" />
        <Kpi label="Published without permission" tone="ok" icon={<ShieldCheck className="size-4 text-ok" />} value={stats.unchecked}
          sub={stats.monthPubs ? `${stats.monthPubs} post${stats.monthPubs > 1 ? 's' : ''} this month — every one checked first` : 'Nothing leaves without a check'} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <CanWePost scope={scope} className="xl:col-span-2" />
        <div className="grid gap-3 sm:grid-cols-3 xl:flex xl:flex-col">
          {!scope && <Tile to="/media/review" icon={<UserRoundSearch className="size-5" />} title="Unknown faces to check" value={stats.unknown}
            sub={stats.unknown ? 'We never guess — a quick look fixes it' : 'All faces are identified'} tone={stats.unknown ? 'info' : 'ok'} />}
          {!scope && <Tile to="/publish/live" icon={<Radio className="size-5" />} title="Live posts" value={stats.live}
            sub={stats.takedown ? `${stats.takedown} flagged for takedown` : stats.stale ? `${stats.stale} no longer match${stats.stale === 1 ? 'es' : ''} parents’ choices` : 'All match parents’ current choices'}
            tone={stats.takedown || stats.stale ? 'warn' : 'azure'} />}
          <Tile to="/media/upload" icon={<Upload className="size-5" />} title="Upload" value="Add photos" sub="Faces are checked as they arrive" tone="azure" />
          {scope && <ClassMix scope={scope} />}
        </div>
      </div>

      <SectionTitle className="mt-10">Events</SectionTitle>
      {sortedEvents.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {sortedEvents.map((ev) => <EventCard key={ev.id} ev={ev} assets={assets} ctx={ctx} />)}
        </div>
      ) : (
        <Card><Empty icon={<Camera className="size-6" />} title="No events yet" body="Create an event and upload photos — each one is checked against parents’ choices." action={<Button to="/media/upload">Upload photos</Button>} /></Card>
      )}
    </div>
  )
}

const TILE_TONE: Partial<Record<Tone, string>> = { info: 'bg-info-bg text-info', ok: 'bg-ok-bg text-ok', warn: 'bg-warn-bg text-warn', azure: 'bg-azure-50 text-azure' }

function Tile({ to, icon, title, value, sub, tone }: { to: string; icon: React.ReactNode; title: string; value: React.ReactNode; sub: string; tone: Tone }) {
  return (
    <Link to={to} className="group card flex items-start gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] xl:items-center">
      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TILE_TONE[tone])}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-ink-2">{title}</div>
        <div className="font-display text-[22px] font-semibold leading-tight text-ink num">{value}</div>
        <div className="text-xs text-ink-3 xl:truncate">{sub}</div>
      </div>
      <ChevronRight className="hidden size-4 shrink-0 xl:block text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-azure" />
    </Link>
  )
}

/** Teacher view: how many children in the class can appear where. */
function ClassMix({ scope }: { scope: string }) {
  const students = useApp((s) => s.students)
  const permissions = useApp((s) => s.permissions)
  const kids = students.filter((s) => s.classId === scope)
  const pub = kids.filter((s) => !s.protected && permissions[pkey(s.id, 'public-digital')]?.status === 'granted').length
  const gal = kids.filter((s) => permissions[pkey(s.id, 'private-gallery')]?.status === 'granted').length
  return (
    <Card className="p-4">
      <div className="text-[13px] font-medium text-ink-2">Class {scope} at a glance</div>
      <div className="mt-2 space-y-1.5 text-[13px] text-ink-2">
        <div className="flex justify-between"><span>Children</span><span className="num font-semibold text-ink">{kids.length}</span></div>
        <div className="flex justify-between"><span>Allowed on website & social</span><span className="num font-semibold text-ink">{pub}</span></div>
        <div className="flex justify-between"><span>In the parents’ gallery</span><span className="num font-semibold text-ink">{gal}</span></div>
      </div>
    </Card>
  )
}

function instagramAnswer(st: Student, status?: string): { tone: Tone; text: string } {
  const f = firstName(st.name)
  const pr = st.gender === 'F' ? 'she' : 'he'
  if (st.protected) return { tone: 'risk', text: `No. ${f} is a protected child and is never shown in public posts — ${pr} is blurred automatically in every public photo.` }
  if (status === 'granted') return { tone: 'ok', text: `Yes. ${f}’s parent allows the school website and social media.` }
  if (status === 'withdrawn') return { tone: 'warn', text: `No. ${f}’s parent withdrew this permission. Group photos can still go out with ${f} blurred; older posts are flagged for takedown.` }
  if (status === 'denied') return { tone: 'warn', text: `No. ${f}’s parent said no to website and social media. Group photos can still go out with ${f} blurred.` }
  return { tone: 'muted', text: `Not yet. ${f}’s parent hasn’t set photo choices. Until they do, ${pr} is blurred automatically.` }
}

const QUICK_LEGEND = [['bg-ok', 'Allowed'], ['bg-marigold', 'Parent said no'], ['bg-ink-3/40', 'Not set yet'], ['bg-risk', 'Protected']] as const

function CanWePost({ scope, className }: { scope?: string; className?: string }) {
  const students = useApp((s) => s.students)
  const guardians = useApp((s) => s.guardians)
  const permissions = useApp((s) => s.permissions)
  const assets = useApp((s) => s.assets)
  const classLabel = useClassLabel()
  const [q, setQ] = React.useState('')
  const [picked, setPicked] = React.useState<string | null>(null)
  const matches = React.useMemo(() => searchStudents(students, q, scope, 5), [students, q, scope])
  const sel = (picked ? matches.find((s) => s.id === picked) : undefined) ?? matches[0]
  const cls = scope ?? '5B'
  const quick = React.useMemo(() => students.filter((s) => s.classId === cls).sort((a, b) => Number(!!b.hero) - Number(!!a.hero)).slice(0, 10), [students, cls])
  const dotOf = (s: Student) => {
    if (s.protected) return 'bg-risk'
    const st = permissions[pkey(s.id, 'public-digital')]?.status
    return st === 'granted' ? 'bg-ok' : st === 'denied' || st === 'withdrawn' ? 'bg-marigold' : 'bg-ink-3/40'
  }
  const g = sel ? guardians.find((x) => x.id === sel.guardianIds[0]) : undefined
  const ans = sel ? instagramAnswer(sel, permissions[pkey(sel.id, 'public-digital')]?.status) : undefined
  const photoCount = sel ? assets.filter((a) => a.kind === 'photo' && a.faces.some((f) => f.studentId === sel.id)).length : 0

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[22px] font-semibold text-ink">Can we post?</h2>
          <p className="mt-0.5 text-sm text-ink-2">Type a {scope ? `Class ${scope} ` : ''}child’s name to see what their parents allow.</p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold text-ink-2 sm:inline-flex"><InstagramIcon className="size-3.5" /> Instagram</span>
      </div>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPicked(null) }} placeholder={scope ? 'e.g. Kabir Singh' : 'e.g. Kabir Singh, or any of 1,512 students'} aria-label="Student name"
          className="h-12 w-full rounded-xl border border-line-strong bg-surface pl-11 pr-10 text-[15px] text-ink placeholder:text-ink-3 focus:border-azure focus:outline-none focus:ring-4 focus:ring-azure/15" />
        {q && <button type="button" aria-label="Clear" onClick={() => { setQ(''); setPicked(null) }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:bg-sunken"><X className="size-4" /></button>}
      </div>

      {!q.trim() && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="label-caps">Quick look · Class {cls}</div>
            <div className="flex flex-wrap gap-3 text-[11.5px] text-ink-3">
              {QUICK_LEGEND.map(([c, l]) => <span key={l} className="inline-flex items-center gap-1.5"><span className={cn('size-2 rounded-full', c)} />{l}</span>)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quick.map((s) => (
              <button key={s.id} type="button" onClick={() => { setQ(s.name); setPicked(s.id) }}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[13px] font-medium text-ink-2 transition-colors hover:border-azure/40 hover:text-ink">
                <Avatar name={s.name} size={24} />{s.name}<span className={cn('size-2 rounded-full', dotOf(s))} />
              </button>
            ))}
          </div>
        </div>
      )}

      {q.trim() && !sel && <p className="mt-4 rounded-xl bg-sunken px-4 py-3 text-sm text-ink-2">No {scope ? `Class ${scope} ` : ''}child called “{q.trim()}”. Check the spelling or try a first name.</p>}

      {sel && ans && (
        <motion.div key={sel.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={sel.name} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="text-[17px] font-semibold text-ink">{sel.name}</span>{sel.protected && <ProtectedChip />}</div>
              <div className="text-[13px] text-ink-2">{classLabel(sel.classId)}{g ? ` · Parent: ${g.name} (${g.relation})` : ''}</div>
            </div>
            <Link to={`/media/students/${sel.id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-azure hover:underline">
              {photoCount ? `See ${photoCount} photo${photoCount > 1 ? 's' : ''}` : 'Open profile'} <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <PermissionChips studentId={sel.id} className="mt-4" />
          <div className={cn('mt-4 flex items-start gap-3 rounded-xl px-4 py-3', ans.tone === 'ok' ? 'bg-ok-bg' : ans.tone === 'risk' ? 'bg-risk-bg' : ans.tone === 'warn' ? 'bg-warn-bg' : 'bg-sunken')}>
            <InstagramIcon className={cn('mt-0.5 size-4 shrink-0', toneText[ans.tone])} />
            <p className="text-sm text-ink"><span className="font-semibold">Instagram: </span>{ans.text}</p>
          </div>
          {matches.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
              Also
              {matches.filter((s) => s.id !== sel.id).map((s) => (
                <button key={s.id} type="button" onClick={() => setPicked(s.id)} className="rounded-full border border-line px-2.5 py-0.5 font-medium text-ink-2 hover:border-azure/40 hover:text-azure">
                  {s.name} · {classLabel(s.classId)}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </Card>
  )
}

function EventCard({ ev, assets, ctx }: { ev: SchoolEvent; assets: MediaAsset[]; ctx: EngineCtx }) {
  const { photos, videos, s, cover } = React.useMemo(() => {
    const mine = assets.filter((a) => a.eventId === ev.id)
    const photos = mine.filter((a) => a.kind === 'photo').sort(byId)
    const videos = mine.filter((a) => a.kind === 'video')
    const cover = ev.cover ?? (photos.find((a) => evaluateAsset(ctx, a, 'instagram').verdict === 'ready') ?? photos[0])?.src
    return { photos, videos, s: summarize(ctx, photos, 'instagram'), cover }
  }, [assets, ev, ctx])
  return (
    <Link to={`/media/events/${ev.id}`} className="group card flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] sm:flex-row">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-sunken sm:aspect-auto sm:min-h-[216px] sm:w-[44%]">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#f1efe9] to-[#e8eefc] text-ink-3">
            <Camera className="size-7" /><span className="text-xs font-medium">Photos arrive here after upload</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">{EVENT_STATUS[ev.status]}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-semibold text-ink">{ev.name}</h3>
            <p className="truncate text-[13px] text-ink-3">{fmtDate(ev.date)} · {ev.location}</p>
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-azure" />
        </div>
        <div className="mt-3 flex items-center gap-4 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-1.5"><Images className="size-4 text-ink-3" /><span className="num font-semibold text-ink">{photos.length}</span> photo{photos.length === 1 ? '' : 's'}</span>
          <span className="inline-flex items-center gap-1.5"><Film className="size-4 text-ink-3" /><span className="num font-semibold text-ink">{videos.length}</span> video{videos.length === 1 ? '' : 's'}</span>
        </div>
        {photos.length ? (
          <div className="mt-auto pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3"><InstagramIcon className="size-3.5" /> For Instagram</div>
            <SummaryBar s={s} />
            <SummaryLegend s={s} className="mt-3" />
          </div>
        ) : (
          <p className="mt-auto flex items-center gap-2 pt-4 text-[13px] text-ink-3"><CircleCheck className="size-4" /> No photos yet — each upload is checked as it lands.</p>
        )}
      </div>
    </Link>
  )
}
