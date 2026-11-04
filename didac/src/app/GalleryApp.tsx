import { tx } from '../i18n'
import * as React from 'react'
import { Lock, Globe, LogOut, EyeOff } from 'lucide-react'
import { useDemo } from '../store'
import { evaluate } from '../data'
import { Btn, Chip, LangPicker, PhotoView, ProtoTag } from '../ui'
import { Zoom } from '../screens/Zoom'
import { t } from '../i18n'

/** School web app + gallery: what the school sees vs what the public website shows. */
export function GalleryApp() {
  const s = useDemo()
  const [mode, setMode] = React.useState<'school' | 'public'>('school')
  const [zoom, setZoom] = React.useState<string | null>(null)
  React.useEffect(() => { s.setViewer('gallery') }, [])
  const live = s.photos.filter((p) => s.published[p.id] && evaluate(p, s.students, true).state === 'published')
  const held = s.photos.length - live.length
  const list = mode === 'school' ? s.photos : live
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-navy text-sm font-bold text-gold">{t("SP")}</div><div><div className="font-bold leading-tight">{t("Sunrise Public School")}</div><div className="text-[11px] text-ink-3">{t("Media gallery · web app")}</div></div></div><div className="flex items-center gap-2"><LangPicker compact /><Chip tone="ok"><Lock className="size-3" /> {t("Encrypted")}</Chip><ProtoTag /><Btn variant="outline" onClick={() => s.setRole(null)}><LogOut className="size-4" /> {t("Switch app")}</Btn></div></div></header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><div className="eyebrow">{t("Album")}</div><h1 className="text-2xl font-bold">{t("Annual Day 2026")}</h1><p className="text-sm text-ink-2">{s.photos.length} {t("photos ·")} {live.length} {t("approved for public use")}</p></div>
          <div className="flex gap-1 rounded-2xl bg-sand p-1.5">{([["school", tx("Inside school"), <Lock key="a" className="size-4" />], ["public", tx("Public website preview"), <Globe key="b" className="size-4" />]] as const).map(([k, l, i]) => <button key={k} type="button" onClick={() => setMode(k)} className={`flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ${mode === k ? 'bg-white shadow-sm' : 'text-ink-2'}`}>{i}{t(l)}</button>)}</div>
        </div>
        {mode === 'public' && <div className="mb-4 rounded-2xl border border-line bg-white p-4 text-sm"><b>{t("What the world sees.")}</b> <span className="text-ink-2">{t("Only photos the school approved after checking every child’s permission.")} {held > 1 ? t("{0} photos are held back — they stay in the private gallery and parent albums.", { 0: held }) : held === 1 ? t("1 photo is held back — it stays in the private gallery and parent albums.") : t("Nothing is held back.")}</span></div>}
        {mode === 'public' && list.length === 0 ? (
          <div className="card grid place-items-center gap-2 p-12 text-center"><EyeOff className="size-8 text-ink-3" /><div className="font-bold">{t("Nothing is public yet")}</div><p className="max-w-sm text-sm text-ink-2">{t("Photos appear here only after the school approves them in the admin console. Try: Admin → approve the choir photo.")}</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {list.map((p) => { const e = evaluate(p, s.students, !!s.published[p.id]); return (
              <button key={p.id} type="button" onClick={() => { s.openPhoto(p.id); setZoom(p.id) }} className="text-left">
                <PhotoView photo={p} students={s.students} className="max-h-72" />
                <div className="mt-1.5 text-xs font-semibold">{t(p.title).split('·').pop()?.trim()}</div>
                <div className="mt-1">{e.state === 'published' ? <Chip tone="ok"><Globe className="size-3" /> {t("Public")}</Chip> : <Chip tone="muted"><Lock className="size-3" /> {t("Private")}</Chip>}</div>
              </button>) })}
          </div>)}
        <p className="mt-5 text-xs text-ink-3">{t("Opening a photo is recorded — who, when, which app. The gallery base exists today; school-specific restrictions shown here are prototype.")}</p>
      </div>
      {zoom && <Zoom photoId={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}
