import * as React from 'react'
import { Check, X, ListChecks, Table2, ScrollText, Upload, UserRoundCheck, Lock, ZoomIn } from 'lucide-react'
import { useDemo, verifyChain } from '../store'
import { evaluate, PURPOSES } from '../data'
import { Btn, Chip, PhotoView, StateChip, fmtD } from '../ui'
import { Zoom } from './Zoom'

type Tab = 'queue' | 'perms' | 'evidence'
export function Admin({ focusPhoto, onFocus }: { focusPhoto: string; onFocus: (id: string) => void }) {
  const [tab, setTab] = React.useState<Tab>('queue')
  React.useEffect(() => { const h = (e: Event) => setTab((e as CustomEvent<Tab>).detail); window.addEventListener('admin-tab', h); return () => window.removeEventListener('admin-tab', h) }, [])
  const s = useDemo()
  const [face, setFace] = React.useState<number | null>(null)
  const [zoom, setZoom] = React.useState<string | null>(null)
  const photo = s.photos.find((p) => p.id === focusPhoto) ?? s.photos[0]
  const ev = evaluate(photo, s.students, !!s.published[photo.id])
  const counts = s.photos.reduce((a, p) => { const k = evaluate(p, s.students, !!s.published[p.id]).state; a[k] = (a[k] ?? 0) + 1; return a }, {} as Record<string, number>)
  const tabs: [Tab, string, React.ReactNode][] = [['queue', 'Review queue', <ListChecks key="a" className="size-4" />], ['perms', 'Permissions', <Table2 key="b" className="size-4" />], ['evidence', 'Evidence', <ScrollText key="c" className="size-4" />]]
  const faceObj = face !== null ? photo.faces[face] : null

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-navy px-4 py-3 text-white">
        <div><div className="text-[11px] font-bold uppercase tracking-widest text-white/60">Admin console · laptop</div><div className="font-bold">Annual Day · Sunrise Public School (fictional)</div></div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Chip tone="risk">{counts.blocked ?? 0} blocked</Chip><Chip tone="warn">{counts.review ?? 0} to review</Chip><Chip tone="info">{counts.eligible ?? 0} eligible</Chip><Chip tone="ok">{(counts.published ?? 0) + (counts.takedown ?? 0)} published</Chip>
        </div>
      </div>
      <div className="flex gap-1 border-b border-line bg-sand p-1.5">
        {tabs.map(([k, l, i]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${tab === k ? 'bg-white shadow-sm' : 'text-ink-2 hover:bg-white/60'}`}>{i}{l}</button>
        ))}
        <Btn variant="outline" className="ml-auto min-h-10 text-xs" onClick={() => { s.upload(); onFocus('P4') }} disabled={s.photos.some((p) => p.id === 'P4')}><Upload className="size-4" /> Photographer uploads new batch</Btn>
      </div>

      {tab === 'queue' && (
        <div className="grid gap-4 p-4 lg:grid-cols-[210px_1fr]">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {s.photos.map((p) => { const e = evaluate(p, s.students, !!s.published[p.id]); return (
              <li key={p.id} className="w-40 shrink-0 lg:w-auto">
                <button type="button" onClick={() => { onFocus(p.id); setFace(null) }} className={`w-full rounded-xl border p-2 text-left ${p.id === photo.id ? 'border-gold bg-gold-50' : 'border-line bg-white hover:bg-sand'}`}>
                  <PhotoView photo={p} students={s.students} className="mb-1.5" />
                  <div className="truncate text-xs font-semibold">{p.title.replace('Annual Day · ', '')}</div>
                  <StateChip ev={e} />
                </button>
              </li>) })}
          </ul>
          <div className="min-w-0">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div><div className="font-bold">{photo.title}</div><div className="text-xs text-ink-3">Public-use check for website & social media</div></div>
              <Btn variant="ghost" className="min-h-9 px-2 text-xs" onClick={() => { s.openPhoto(photo.id); setZoom(photo.id) }}><ZoomIn className="size-4" /> Zoom & activity</Btn>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div>
              <PhotoView photo={photo} students={s.students} mode="admin" ev={ev} blurRestricted={ev.state === 'blocked' || ev.state === 'review' || ev.state === 'takedown'} onFaceClick={(i) => setFace(i)} selected={face} />
              </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="mb-1.5 flex items-center justify-between"><span className="eyebrow">Decision</span><StateChip ev={ev} /></div>
                {ev.reasons.length === 0 ? <p className="text-sm text-ink-2">Everyone depicted allows website & social use. Ready for the school’s approval.</p> : <ul className="space-y-1 text-sm">{ev.reasons.map((r) => <li key={r} className="flex gap-1.5"><X className="mt-0.5 size-4 shrink-0 text-risk" />{r}</li>)}</ul>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn variant="gold" disabled={ev.state !== 'eligible'} onClick={() => s.approve(photo.id)}><Check className="size-4" /> Approve for public use</Btn>
                  <Btn variant="outline" disabled={ev.state === 'published'} onClick={() => s.albumOnly(photo.id)}><Lock className="size-4" /> Keep to parent album</Btn>
                </div>
                {ev.state === 'blocked' && <p className="mt-2 text-xs text-ink-3">The publish button stays off while any depicted child is restricted — it cannot be overridden from this screen.</p>}
              </div>
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="eyebrow mb-1.5">Face review</div>
                {faceObj === null ? <p className="text-sm text-ink-3">Click a face on the photo to review who it is.</p> : (
                  <div className="space-y-2 text-sm">
                    <div>Face {face! + 1}: <b>{faceObj.adult ? 'Adult / not a student' : s.students.find((x) => x.id === faceObj.studentId)?.name ?? 'Unknown'}</b></div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.students.map((st) => <Btn key={st.id} variant="outline" className="min-h-9 px-2.5 text-xs" onClick={() => s.assignFace(photo.id, face!, st.id)}><UserRoundCheck className="size-3.5" />{st.name.split(' ')[0]}</Btn>)}
                      <Btn variant="outline" className="min-h-9 px-2.5 text-xs" onClick={() => s.assignFace(photo.id, face!, 'adult')}>Not a student</Btn>
                    </div>
                    <p className="text-xs text-ink-3">Unmatched faces are never presumed consented — a person decides.</p>
                  </div>)}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'perms' && (
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-ink-3"><th className="pb-2">Student</th>{PURPOSES.map((p) => <th key={p.key} className="pb-2">{p.label}</th>)}<th className="pb-2">Guardian</th></tr></thead>
            <tbody>{s.students.map((st) => (
              <tr key={st.id} className="border-t border-line">
                <td className="py-2.5 font-semibold">{st.name} <span className="font-normal text-ink-3">· {st.cls}</span></td>
                {PURPOSES.map((p) => <td key={p.key}>{st.perms[p.key] ? <Chip tone="ok"><Check className="size-3" /> Allowed</Chip> : <Chip tone="risk"><X className="size-3" /> Not allowed</Chip>}</td>)}
                <td className="text-ink-2">{st.guardian}</td>
              </tr>))}</tbody>
          </table>
          <p className="mt-3 text-xs text-ink-3">Choices come from guardians (see Parent view). Changes appear here instantly and re-evaluate every photo.</p>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-ink-2">Every decision is chained to the one before it. Edit any entry and the chain breaks.</div>
            <Chip tone={verifyChain(s.audit) ? 'ok' : 'risk'}>{verifyChain(s.audit) ? `Chain verified · ${s.audit.length} entries` : 'Chain broken'}</Chip>
          </div>
          <ol className="max-h-[420px] space-y-2 overflow-auto">
            {s.audit.slice().reverse().map((a) => (
              <li key={a.n} className="rounded-xl border border-line bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-1"><span className="font-semibold">#{a.n} · {a.action}{a.photoId ? ` · ${a.photoId}` : ''}</span><span className="text-xs text-ink-3">{fmtD(a.t)}</span></div>
                <div className="text-xs text-ink-2">{a.actor} — {a.detail}</div>
                <div className="mt-1 font-mono text-[10px] text-ink-3">{a.hash}</div>
              </li>))}
          </ol>
          <p className="mt-3 text-xs text-ink-3">This is a readiness record, not a compliance certificate.</p>
        </div>
      )}
      {zoom && <Zoom photoId={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}
