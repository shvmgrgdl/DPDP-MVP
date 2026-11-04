import * as React from 'react'
import { cn } from '@/lib/utils'
import type { Evaluation, Photo, Student } from './data'
import { STATE_META } from './data'
import { useDemo } from './store'
import { useNow } from './lib/useNow'
import { traceId } from './lib/fake'

export const pub = (p: string) => p

type Tone = 'ok' | 'warn' | 'risk' | 'info' | 'gold' | 'muted'
const tones: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok', warn: 'bg-warn-bg text-warn', risk: 'bg-risk-bg text-risk', info: 'bg-info-bg text-info', gold: 'bg-gold-50 text-gold', muted: 'bg-sand text-ink-2',
}
export function Chip({ tone = 'muted', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>{children}</span>
}
export const StateChip = ({ ev }: { ev: Evaluation }) => <Chip tone={STATE_META[ev.state].tone}>{STATE_META[ev.state].label}</Chip>

export function Btn({ variant = 'navy', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'navy' | 'gold' | 'ghost' | 'outline' }) {
  const v = { navy: 'bg-navy text-white hover:bg-navy-2', gold: 'bg-gold text-white hover:brightness-95', ghost: 'text-ink-2 hover:bg-sand', outline: 'border border-line-strong border-[#d6cdb8] bg-white text-ink hover:bg-sand' }[variant]
  return <button type="button" {...p} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-40', v, className)} />
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-ok' : 'bg-[#cfc8b6]')}>
      <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}
export const ProtoTag = ({ className }: { className?: string }) => <Chip tone="gold" className={className}>Prototype · synthetic data</Chip>

export const SectionTitle = ({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) => (
  <div className="mb-6">
    {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
    <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
    {sub && <p className="mt-2 max-w-2xl text-[15px] text-ink-2">{sub}</p>}
  </div>
)

/** Photo at natural aspect, so normalised face boxes map straight to percentages. */
export function PhotoView({ photo, students, mode = 'plain', ev, blurRestricted, highlightId, onFaceClick, selected, className, watermark = true }: {
  photo: Photo; students: Student[]; mode?: 'plain' | 'admin' | 'parent'; ev?: Evaluation; blurRestricted?: boolean; highlightId?: string
  onFaceClick?: (i: number) => void; selected?: number | null; className?: string; watermark?: boolean
}) {
  return (
    <div className={cn('relative w-full overflow-hidden rounded-xl bg-sand', className)} style={{ aspectRatio: `${photo.w} / ${photo.h}` }}>
      <img src={pub(photo.src)} alt={photo.title} className="absolute inset-0 size-full select-none object-cover [-webkit-touch-callout:none]" draggable={false} onContextMenu={(e) => e.preventDefault()} />
      {watermark && <Watermark photoId={photo.id} />}
      {photo.faces.map((f, i) => {
        const st = students.find((s) => s.id === f.studentId)
        const [x, y, w, h] = f.box
        const pad = 0.12
        const style: React.CSSProperties = { left: `${(x - w * pad) * 100}%`, top: `${(y - h * pad) * 100}%`, width: `${w * (1 + 2 * pad) * 100}%`, height: `${h * (1 + 2 * pad) * 100}%` }
        const restricted = !!st && !(st.perms.public || st.approvals.includes(photo.id))
        const unknown = !st && !f.adult
        const mine = !!highlightId && st?.id === highlightId
        const blur = (mode === 'parent' && !mine) || (mode === 'admin' && blurRestricted && (restricted || unknown))
        const ring = mode === 'admin' ? (restricted ? 'ring-risk' : unknown ? 'ring-[#e8a317]' : f.adult ? 'ring-info' : 'ring-ok') : mine ? 'ring-gold' : 'ring-transparent'
        const label = f.adult ? 'Adult' : st ? st.name.split(' ')[0] : 'Unknown'
        return (
          <button key={i} type="button" disabled={!onFaceClick} onClick={() => onFaceClick?.(i)} style={style} aria-label={`Face ${i + 1}: ${label}`}
            className={cn('absolute rounded-lg ring-2 transition', ring, blur && 'backdrop-blur-xl bg-white/20', selected === i && 'ring-4 ring-gold', !onFaceClick && 'pointer-events-none')}>
            {mode === 'admin' && !blur && <span className={cn('absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white', restricted ? 'bg-risk' : unknown ? 'bg-[#b87a00]' : f.adult ? 'bg-info' : 'bg-ok')}>{label}</span>}
            {mode === 'admin' && blur && <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white drop-shadow">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

export const fmtT = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
export const fmtD = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Who is looking right now — school-issued ID or role, never a personal name. */
export const viewerLabelOf = (s: ReturnType<typeof useDemo.getState>) => s.role === 'photographer' ? 'Photographer' : s.viewer === 'parent' || s.role === 'parent' ? `Guardian ${s.accounts[s.session ?? s.childId]?.id ?? ''}`.trim() : s.viewer === 'admin' || s.role === 'admin' ? 'School admin' : 'Gallery viewer'
export function useViewerLabel() { return useDemo(viewerLabelOf) }
export const wmTime = (ms: number) => new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

/** Live, tiled watermark: viewer ID · current time · trace ID. Sized by container width so it reads on thumbnails and full screens alike. */
export function Watermark({ photoId }: { photoId: string }) {
  const who = useViewerLabel(); const now = useNow()
  const text = `${who} · ${wmTime(now)} · ${traceId(who, photoId)}`
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden" style={{ containerType: 'inline-size' }}>
      <div className="absolute -inset-[40%] flex -rotate-[24deg] flex-col justify-center gap-[7cqw]" style={{ fontSize: '2.6cqw' }}>
        {Array.from({ length: 9 }, (_, r) => <div key={r} className="flex gap-[6cqw] whitespace-nowrap font-semibold text-white/55" style={{ textShadow: '0 0 3px rgba(0,0,0,.55)', marginLeft: r % 2 ? '-14cqw' : 0 }}>{Array.from({ length: 4 }, (_, c) => <span key={c}>{text}</span>)}</div>)}
      </div>
    </div>
  )
}
