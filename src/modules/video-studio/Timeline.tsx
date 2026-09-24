import * as React from 'react'
import { Lock, ScanFace, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Card, Progress, Switch, Tip } from '@/design/ui'
import { cn } from '@/lib/utils'
import type { Lane } from './lanes'
import { useTime, type TimeStore } from './player'
import { fmtClock } from './media'

const GUTTER = 300

function tickStep(d: number) {
  for (const s of [1, 2, 5, 10, 15, 30, 60, 120, 300]) if (d / s <= 10) return s
  return 600
}

export interface ScanInfo { active: boolean; progress: number; label: string; error?: string; onRetry?: () => void }

export function Timeline({ lanes, duration, time, onSeek, selectedId, onSelect, onToggle, scan, destWhere, disabled = false }: {
  lanes: Lane[]
  duration: number
  time: TimeStore
  onSeek: (t: number) => void
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string, blur: boolean) => void
  scan: ScanInfo | null
  destWhere: string
  /** Locks the Blur toggles (while an export is recording). */
  disabled?: boolean
}) {
  const d = duration > 0 ? duration : 1
  const ticks = React.useMemo(() => {
    const s = tickStep(d)
    const out: number[] = []
    for (let t = 0; t <= d + 1e-6; t += s) out.push(Math.round(t * 1000) / 1000)
    return out
  }, [d])
  const blurred = lanes.filter((l) => l.blur).length

  const seekFrom = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * d)
  }
  const scrub = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.setPointerCapture(e.pointerId); seekFrom(e) },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => { if (e.buttons & 1) seekFrom(e) },
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <div className="text-[15px] font-semibold text-ink">Faces in this video</div>
          <div className="text-[12.5px] text-ink-3">
            {lanes.length ? `${lanes.length} ${lanes.length === 1 ? 'person' : 'people'} tracked · ${blurred} blurred ${destWhere} · click the timeline to jump` : 'Each person gets a lane showing when they are on screen'}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-ink-2">
          <Legend cls="bg-[#6cc59d]" label="Shown" />
          <Legend cls={STRIPES} label="Blurred" />
          <Legend cls="bg-info/25 ring-1 ring-inset ring-info/40" label="Check" />
        </div>
      </div>

      {scan && (scan.active || scan.error) && (
        <div className={cn('flex items-center gap-4 border-b border-line px-5 py-3', scan.error ? 'bg-risk-bg' : 'bg-[#fbfaf7]')}>
          <ScanFace className={cn('size-5 shrink-0', scan.error ? 'text-risk' : 'text-azure')} />
          <div className="min-w-0 flex-1">
            <div className={cn('text-[13px] font-semibold', scan.error ? 'text-risk' : 'text-ink')}>{scan.error ? 'We couldn’t finish the face scan' : scan.label}</div>
            {scan.error ? <div className="text-[12px] text-ink-2">{scan.error}</div> : <Progress value={scan.progress * 100} className="mt-1.5 h-1.5" />}
          </div>
          {scan.error && scan.onRetry && <button type="button" onClick={scan.onRetry} className="text-[13px] font-semibold text-azure hover:underline">Try again</button>}
          {!scan.error && <span className="num text-[12px] text-ink-3">{Math.round(scan.progress * 100)}%</span>}
        </div>
      )}

      <div className="relative">
        {/* ruler */}
        <div className="grid" style={{ gridTemplateColumns: `${GUTTER}px minmax(0,1fr)` }}>
          <div className="label-caps flex items-center justify-between px-5 py-2"><span>Person</span><span className="w-12 text-center">Blur</span></div>
          <div className="relative h-8 cursor-pointer touch-none border-l border-line" {...scrub}>
            {ticks.map((t) => (
              <span key={t} className="absolute bottom-0 top-0 flex items-end" style={{ left: `${(t / d) * 100}%` }}>
                <span className="h-2 w-px bg-line-strong" />
                <span className={cn('num absolute bottom-2.5 whitespace-nowrap text-[11px] text-ink-3', t === 0 ? 'left-1' : '-translate-x-1/2')}>{t >= d - 1e-3 && t > 0 ? '' : fmtClock(t)}</span>
              </span>
            ))}
          </div>
        </div>

        {lanes.length === 0 ? (
          <div className="grid border-t border-line" style={{ gridTemplateColumns: `${GUTTER}px minmax(0,1fr)` }}>
            <div className="px-5 py-5 text-[13px] text-ink-3">{scan?.active ? 'Looking for faces…' : scan?.error ? 'No faces yet' : 'No faces found'}</div>
            <div className="flex items-center border-l border-line px-5 text-[13px] text-ink-3">
              {scan?.active ? 'Faces appear here as they’re found.' : scan?.error ? '' : 'Nobody’s face is visible in this video, so there’s nothing to blur.'}
            </div>
          </div>
        ) : (
          lanes.map((l) => (
            <LaneRow key={l.id} lane={l} d={d} selected={l.id === selectedId} onSelect={() => onSelect(l.id)} onToggle={(v) => onToggle(l.id, v)} scrub={scrub} disabled={disabled} />
          ))
        )}
        <Playhead time={time} d={d} />
      </div>
    </Card>
  )
}

const STRIPES = 'bg-[repeating-linear-gradient(135deg,#f6d49c_0px,#f6d49c_6px,#f1c47c_6px,#f1c47c_12px)] ring-1 ring-inset ring-[#e8a317]/50'

function Legend({ cls, label }: { cls: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn('h-2.5 w-5 rounded-full', cls)} />{label}</span>
}

function Playhead({ time, d }: { time: TimeStore; d: number }) {
  const t = useTime(time)
  const p = Math.max(0, Math.min(1, t / d))
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: GUTTER }}>
      <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-azure" style={{ left: `${p * 100}%` }}>
        <span className="absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-azure" />
      </div>
    </div>
  )
}

const TONE_TEXT = { ok: 'text-ok', blocked: 'text-warn', unknown: 'text-info' } as const

function LaneRow({ lane, d, selected, onSelect, onToggle, scrub, disabled }: {
  lane: Lane
  disabled: boolean
  d: number
  selected: boolean
  onSelect: () => void
  onToggle: (v: boolean) => void
  scrub: { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void; onPointerMove: (e: React.PointerEvent<HTMLElement>) => void }
}) {
  const segCls = lane.blur ? STRIPES : lane.tone === 'unknown' ? 'bg-info/20 ring-1 ring-inset ring-info/40' : 'bg-[#6cc59d]'
  const label = lane.blur ? 'Blurred' : lane.tone === 'unknown' ? 'Check' : ''
  const labelCls = lane.blur ? 'text-[#7a4700]' : 'text-info'
  return (
    <div className={cn('grid border-t border-line transition-colors', selected ? 'bg-azure-50/60' : 'hover:bg-[#fbfaf7]')} style={{ gridTemplateColumns: `${GUTTER}px minmax(0,1fr)` }}>
      <div className="flex min-w-0 items-center gap-3 px-5 py-2.5">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left" aria-label={`${lane.name}: jump to first appearance`}>
          <FaceThumb lane={lane} />
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold text-ink">{lane.name}</span>
            <Tip content={lane.detail}>
              <span className={cn('block truncate text-[12px]', TONE_TEXT[lane.tone])}>{lane.reason}</span>
            </Tip>
          </span>
        </button>
        <BlurToggle lane={lane} onToggle={onToggle} disabled={disabled} />
      </div>
      <div className="relative h-[58px] cursor-pointer touch-none border-l border-line" {...scrub}>
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
        {lane.segments.map((s, i) => {
          const w = ((s.end - s.start) / d) * 100
          return (
            <span key={i} className={cn('absolute inset-y-3 flex items-center overflow-hidden rounded-md', segCls)}
              style={{ left: `${(s.start / d) * 100}%`, width: `${Math.max(0.6, w)}%` }}>
              {label && w > 7 && <span className={cn('truncate px-2 text-[11px] font-semibold', labelCls)}>{label}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function FaceThumb({ lane }: { lane: Lane }) {
  const ring = lane.blur ? 'ring-[#e8a317]/70' : lane.tone === 'unknown' ? 'ring-info/50' : 'ring-ok/50'
  if (lane.thumb) return <img src={lane.thumb} alt="" className={cn('size-10 shrink-0 rounded-xl object-cover ring-2', ring)} draggable={false} />
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-ink-3 ring-2', ring)}>
      {lane.studentId ? <span className="text-[13px] font-semibold text-ink-2">{lane.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span> : <UserRound className="size-5" />}
    </span>
  )
}

function BlurToggle({ lane, onToggle, disabled }: { lane: Lane; onToggle: (v: boolean) => void; disabled: boolean }) {
  if (lane.locked) {
    return (
      <Tip content={`${lane.detail} This face is always blurred for this destination.`}>
        <button type="button" onClick={() => toast(`${lane.name} stays blurred`, { description: lane.detail })}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-warn-bg px-2.5 py-1 text-[12px] font-semibold text-warn" aria-label={`${lane.name} is always blurred here`}>
          <Lock className="size-3.5" />Blurred
        </button>
      </Tip>
    )
  }
  return (
    <span className="shrink-0">
      <Switch checked={lane.blur} onCheckedChange={onToggle} label={`Blur ${lane.name}`} disabled={disabled} />
    </span>
  )
}
