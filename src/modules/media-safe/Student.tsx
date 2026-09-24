import * as React from 'react'
import { Link, useParams } from 'react-router'
import { Building2, Film, Globe, ImageOff, Images, Printer, RefreshCw, Send, ShieldAlert, UserRound, UserX } from 'lucide-react'
import type { DestinationKey } from '@/data/types'
import { assetsOfStudent, evaluateAsset } from '@/engine/permission'
import { DEST, MEDIA_PURPOSES } from '@/data/reference'
import { Avatar, Button, Card, Chip, Empty, Mono, SectionTitle } from '@/design/ui'
import { EvidenceLink, PhotoFaces, VerdictChip } from '@/design/media'
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/design/brand-icons'
import { useApp, pkey } from '@/store/app'
import { useCtx, useStudent } from '@/store/hooks'
import { fmtDate } from '@/lib/utils'
import { CHANNEL_LABEL, PUB_STATUS, PURPOSE_SHORT, VERIFY_LABEL, byId, firstName, useClassLabel, useScope } from './lib'
import { Crumbs, ProtectedChip, StatusChip } from './parts'

const PUB_ICON: Partial<Record<DestinationKey, React.ReactNode>> = {
  instagram: <InstagramIcon className="size-4" />, facebook: <FacebookIcon className="size-4" />, youtube: <YoutubeIcon className="size-4" />,
  website: <Globe className="size-4" />, print: <Printer className="size-4" />, internal: <Building2 className="size-4" />,
}

export function StudentPage() {
  const { studentId } = useParams()
  const st = useStudent(studentId)
  const scope = useScope()
  const ctx = useCtx()
  const assets = useApp((s) => s.assets)
  const pubs = useApp((s) => s.publications)
  const permissions = useApp((s) => s.permissions)
  const guardians = useApp((s) => s.guardians)
  const events = useApp((s) => s.events)
  const classLabel = useClassLabel()

  const mine = React.useMemo(() => (st ? assetsOfStudent(assets, st.id).sort(byId) : []), [assets, st])
  const photos = mine.filter((a) => a.kind === 'photo')
  const videos = mine.filter((a) => a.kind === 'video')
  const myPubs = React.useMemo(() => {
    const ids = new Set(mine.map((a) => a.id))
    return pubs.filter((p) => ids.has(p.assetId)).sort((a, b) => b.at.localeCompare(a.at))
  }, [mine, pubs])

  if (!st || (scope && st.classId !== scope)) {
    return (
      <div>
        <Crumbs items={[{ label: 'Media Safe', to: '/media' }, { label: 'Student' }]} />
        <Card><Empty icon={<UserX className="size-6" />} title={st ? 'This child isn’t in your class' : 'We couldn’t find that student'}
          body={st ? `You can see children from Class ${scope}.` : 'Try the “Can we post?” search on Media Safe.'} action={<Button to="/media">Back to Media Safe</Button>} /></Card>
      </div>
    )
  }

  const g = guardians.find((x) => x.id === st.guardianIds[0])
  const f = firstName(st.name)
  const liveCount = myPubs.filter((p) => p.status === 'live').length

  return (
    <div>
      <Crumbs items={[{ label: 'Media Safe', to: '/media' }, { label: st.name }]} />
      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={st.name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{st.name}</h1>
              {st.protected && <ProtectedChip />}
            </div>
            <p className="mt-1 text-sm text-ink-2">{classLabel(st.classId)} · {st.house} house · Admission no. <Mono>{st.admissionNo}</Mono></p>
            {g && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                <UserRound className="size-4 text-ink-3" /> Parent: <span className="font-semibold text-ink">{g.name}</span> ({g.relation})
                <span className="text-ink-3">·</span>
                {g.verification ? <span>Verified via {VERIFY_LABEL[g.verification.method].toLowerCase()} on {fmtDate(g.verification.at)}</span> : <span className="text-warn">Not verified yet</span>}
              </p>
            )}
          </div>
          <div className="flex gap-6 text-right">
            <div><div className="font-display text-[30px] font-semibold leading-none text-ink num">{photos.length}</div><div className="mt-1 text-xs text-ink-3">photo{photos.length === 1 ? '' : 's'}</div></div>
            <div><div className="font-display text-[30px] font-semibold leading-none text-ink num">{liveCount}</div><div className="mt-1 text-xs text-ink-3">live post{liveCount === 1 ? '' : 's'}</div></div>
          </div>
        </div>

        {st.protected && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-risk/15 bg-risk-bg px-4 py-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-risk" />
            <div>
              <div className="font-semibold text-risk">Protected child</div>
              <p className="text-[13px] text-ink-2">A safeguarding flag is set. {f} is never shown in public posts, print or ads — whatever the permissions say — and is blurred automatically. Only the school office can change this.</p>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <div className="label-caps mb-3">Photo choices</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {MEDIA_PURPOSES.map((p) => {
              const perm = permissions[pkey(st.id, p.key)]
              return (
                <div key={p.key} className="rounded-xl border border-line bg-[#fbfaf7] p-3.5" title={p.label}>
                  <div className="text-[13px] font-semibold leading-snug text-ink">{PURPOSE_SHORT[p.key]}</div>
                  <div className="mt-2"><StatusChip status={perm?.status ?? 'pending'} size="sm" /></div>
                  <div className="mt-2 text-xs text-ink-3">{perm ? `Set ${fmtDate(perm.at)} · ${CHANNEL_LABEL[perm.via]}` : 'No choice recorded'}</div>
                  {perm && <EvidenceLink id={perm.evidenceId} className="mt-1 text-[11px]" />}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <SectionTitle action={<span className="text-xs text-ink-3">Previews show how each photo would look on Instagram</span>}>All photos of {f} <span className="ml-1 font-normal text-ink-3 num">{photos.length}</span></SectionTitle>
          {photos.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {photos.map((a) => {
                const e = evaluateAsset(ctx, a, 'instagram')
                return (
                  <Link key={a.id} to={`/media/photos/${a.id}`} className="group card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
                    <div className="overflow-hidden"><PhotoFaces asset={a} evals={e.faces} aspect={4 / 3} blurBlocked rounded="rounded-none" className="transition-transform duration-500 group-hover:scale-[1.03]" /></div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <VerdictChip verdict={e.verdict} size="sm" />
                      <span className="truncate text-xs text-ink-3">{events.find((x) => x.id === a.eventId)?.name}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <Card><Empty icon={<ImageOff className="size-6" />} title={`No photos of ${f} yet`} body={`When ${f} appears in an event photo, it shows up here — already following ${st.gender === 'F' ? 'her' : 'his'} parent’s choices.`} /></Card>
          )}
          {videos.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-2"><Film className="size-4 text-ink-3" /> Also in {videos.length} video{videos.length > 1 ? 's' : ''} · <Link to="/video" className="font-semibold text-azure hover:underline">Open Video Studio</Link></p>}
        </section>

        <aside className="space-y-6">
          <Card className="p-5">
            <SectionTitle>Where published</SectionTitle>
            {myPubs.length ? (
              <ul className="space-y-3">
                {myPubs.map((p) => {
                  const a = mine.find((x) => x.id === p.assetId)!
                  const s = PUB_STATUS[p.status]
                  return (
                    <li key={p.id} className="flex gap-3">
                      <Link to={`/media/photos/${a.id}`} className="shrink-0">
                        {a.kind === 'photo' ? <img src={a.src} alt="" loading="lazy" className="size-12 rounded-lg object-cover" /> : <span className="flex size-12 items-center justify-center rounded-lg bg-sunken text-ink-3"><Film className="size-5" /></span>}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">{PUB_ICON[p.destination] ?? <Send className="size-4" />}{DEST[p.destination].label}</span>
                          <Chip size="sm" tone={s.tone}>{s.label}</Chip>
                        </div>
                        <div className="mt-0.5 text-xs text-ink-3">{fmtDate(p.at)} · {p.variant === 'blurred' ? 'Blurred copy' : 'Original'}</div>
                        <EvidenceLink id={p.evidenceId} className="text-[11px]" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-xl bg-sunken px-4 py-3 text-[13px] text-ink-2">{f} isn’t in any published post.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-azure-50 text-azure"><RefreshCw className="size-[18px]" /></span>
              <h3 className="font-display text-lg font-semibold text-ink">Permission follows the child</h3>
            </div>
            <p className="mt-2 text-[13px] text-ink-2">Choices belong to {f}, not to a photo or an album. Change one, and everything updates.</p>
            <ol className="mt-4 space-y-3.5">
              {[
                ['A parent changes a choice', 'In the parent app, on WhatsApp or at the school office.'],
                [photos.length === 1 ? `${f}’s photo is re-checked` : `${photos.length ? `All ${photos.length}` : 'Every'} photos of ${f} are re-checked`, 'Instantly — in every event, for every destination.'],
                ['Live posts are flagged', 'Anything already shared that no longer matches gets a takedown task, with a record.'],
              ].map(([t, b], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-semibold text-white num">{i + 1}</span>
                  <div><div className="text-sm font-semibold text-ink">{t}</div><div className="text-[13px] text-ink-2">{b}</div></div>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-sunken px-3 py-2 text-xs text-ink-2"><Images className="size-3.5 text-ink-3" /> Face matching is used only to enforce parents’ choices.</div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
