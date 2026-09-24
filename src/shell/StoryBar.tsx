import { useNavigate } from 'react-router'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useApp } from '@/store/app'
import { STORY } from './story'

export function StoryBar() {
  const step = useApp((s) => s.storyStep)
  const setUI = useApp((s) => s.setUI)
  const navigate = useNavigate()
  if (step === null) return null
  const s = STORY[step]
  const go = (i: number) => {
    const t = STORY[i]
    useApp.getState().setRole(t.role)
    navigate(t.path)
    setUI({ storyStep: i })
  }
  return (
    <div className="no-print fixed bottom-4 left-1/2 z-40 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-white/10 bg-navy/95 p-3 text-white shadow-[var(--shadow-pop)] backdrop-blur">
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Previous step" disabled={step === 0} onClick={() => go(step - 1)} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="size-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">Scene {step + 1} of {STORY.length}</div>
          <div className="truncate text-sm font-semibold">{s.title}</div>
          <div className="line-clamp-2 text-xs text-white/75">{s.note}</div>
        </div>
        <button type="button" aria-label="Next step" disabled={step === STORY.length - 1} onClick={() => go(step + 1)} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><ChevronRight className="size-5" /></button>
        <button type="button" aria-label="Close story mode" onClick={() => setUI({ storyStep: null })} className="rounded-lg p-2 hover:bg-white/10"><X className="size-4" /></button>
      </div>
    </div>
  )
}
