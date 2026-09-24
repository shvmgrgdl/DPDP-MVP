import * as React from 'react'
import { ChevronsLeftRight, Columns2, LoaderCircle, Pause, Play, ScanFace, ShieldCheck, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTime, type Player } from './player'
import { fmtClock } from './media'
import type { Segment } from './tracks'

function useContentBox(ref: React.RefObject<HTMLDivElement | null>, w: number, h: number) {
  const [box, setBox] = React.useState({ left: 0, top: 0, width: 0, height: 0 })
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const calc = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      const s = Math.min(cw / w, ch / h)
      const width = w * s
      const height = h * s
      setBox({ left: (cw - width) / 2, top: (ch - height) / 2, width, height })
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, w, h])
  return box
}

function StageChip({ children, tone = 'glass', className }: { children: React.ReactNode; tone?: 'glass' | 'rec' | 'warm'; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold backdrop-blur-md',
      tone === 'glass' && 'bg-white/12 text-white ring-1 ring-white/15',
      tone === 'rec' && 'bg-[#b42318]/90 text-white ring-1 ring-white/20',
      tone === 'warm' && 'bg-[#fdf0d9]/95 text-[#8a5300]', className)}>
      {children}
    </span>
  )
}

export function Stage({ src, player, destName, compare, setCompare, scan, blurredCount, spans }: {
  src: string
  player: Player
  destName: string
  compare: number | null
  setCompare: (v: number | null) => void
  scan: { active: boolean; progress: number; label: string } | null
  blurredCount: number
  spans: Segment[]
}) {
  const { videoRef, frameRef, overlayRef, state } = player
  const boxRef = React.useRef<HTMLDivElement>(null)
  const content = useContentBox(boxRef, state.w, state.h)
  const exporting = state.exporting

  const compareFrom = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setCompare(Math.max(0.02, Math.min(0.98, (e.clientX - r.left) / r.width)))
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (exporting) return
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); player.toggle() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); player.seek(player.time.get() + 2) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); player.seek(player.time.get() - 2) }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_50%_0%,#1a2540_0%,#0b1220_62%)] shadow-[0_28px_60px_-28px_rgba(11,28,48,0.55)] ring-1 ring-black/5">
      <div ref={boxRef} tabIndex={0} onKeyDown={onKey} aria-label="Video player. Space to play or pause, arrow keys to skip."
        className="relative h-[min(56vh,560px)] min-h-[300px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
        onClick={() => { if (compare === null && !exporting && state.ready) player.toggle() }}>
        <video ref={videoRef} src={src} playsInline preload="auto" aria-hidden tabIndex={-1}
          className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-[0.01]" />
        <canvas ref={frameRef} role="img" aria-label={`Protected preview for ${destName}`} className={cn('absolute inset-0 size-full object-contain transition-opacity duration-300', state.ready ? 'opacity-100' : 'opacity-0')} />
        <canvas ref={overlayRef} aria-hidden className="pointer-events-none absolute inset-0 size-full object-contain" />

        <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <StageChip><ShieldCheck className="size-3.5 text-[#6ee7b7]" />Protected preview · {destName}</StageChip>
          {blurredCount > 0 && <StageChip>{blurredCount} face{blurredCount > 1 ? 's' : ''} hidden</StageChip>}
          {scan?.active && <StageChip tone="warm"><ScanFace className="size-3.5" />{scan.label}</StageChip>}
        </div>
        {exporting && (
          <div className="pointer-events-none absolute right-4 top-4">
            <StageChip tone="rec"><span className="size-2 animate-pulse rounded-full bg-white" />Recording protected copy</StageChip>
          </div>
        )}

        {compare !== null && state.ready && !exporting && (
          <div className="absolute cursor-ew-resize touch-none" style={{ left: content.left, top: content.top, width: content.width, height: content.height }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); compareFrom(e) }}
            onPointerMove={(e) => { if (e.buttons & 1) compareFrom(e) }}
            onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)]" style={{ left: `${compare * 100}%` }}>
              <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-navy shadow-lg">
                <ChevronsLeftRight className="size-4" />
              </span>
            </div>
            <span className="pointer-events-none absolute bottom-3 left-3"><StageChip>Original · for checking only</StageChip></span>
            <span className="pointer-events-none absolute bottom-3 right-3"><StageChip><ShieldCheck className="size-3.5 text-[#6ee7b7]" />Protected</StageChip></span>
          </div>
        )}

        {!state.ready && !state.error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <LoaderCircle className="size-7 animate-spin" />
            <span className="text-[13px]">Loading video…</span>
          </div>
        )}
        {state.error && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="max-w-sm text-center text-white">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/10"><Play className="size-5" /></div>
              <div className="font-semibold">This video can’t be played here</div>
              <p className="mt-1 text-[13px] text-white/70">{state.error}</p>
            </div>
          </div>
        )}
        {state.ready && !state.playing && !exporting && compare === null && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow-xl">
            <Play className="ml-1 size-7" fill="currentColor" />
          </span>
        )}
      </div>
      <Transport player={player} compare={compare} setCompare={setCompare} spans={spans} />
    </div>
  )
}

function Transport({ player, compare, setCompare, spans }: { player: Player; compare: number | null; setCompare: (v: number | null) => void; spans: Segment[] }) {
  const { state } = player
  const t = useTime(player.time)
  const d = state.duration
  const disabled = !state.ready || state.exporting
  const barRef = React.useRef<HTMLDivElement>(null)
  const seekFrom = (e: React.PointerEvent) => {
    const r = barRef.current?.getBoundingClientRect()
    if (!r || !d) return
    player.seek(((e.clientX - r.left) / r.width) * d)
  }
  return (
    <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3 text-white">
      <button type="button" disabled={disabled} onClick={player.toggle} aria-label={state.playing ? 'Pause' : 'Play'}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-navy transition hover:bg-white/90 disabled:opacity-40">
        {state.playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
      </button>
      <span className="num w-[92px] shrink-0 text-[12.5px] text-white/75">{fmtClock(t)} / {fmtClock(d)}</span>
      <div ref={barRef} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(d)} aria-valuenow={Math.round(t)} tabIndex={-1}
        className={cn('group relative h-6 flex-1 touch-none', disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer')}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekFrom(e) }}
        onPointerMove={(e) => { if (e.buttons & 1) seekFrom(e) }}>
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/15">
          {d > 0 && spans.map((s, i) => (
            <span key={i} className="absolute inset-y-0 bg-[#fbbf24]/45" style={{ left: `${(s.start / d) * 100}%`, width: `${Math.max(0.4, ((s.end - s.start) / d) * 100)}%` }} />
          ))}
          <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${d ? Math.min(100, (t / d) * 100) : 0}%` }} />
        </div>
        <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow opacity-0 transition-opacity group-hover:opacity-100" style={{ left: `${d ? Math.min(100, (t / d) * 100) : 0}%` }} />
      </div>
      <button type="button" disabled={disabled} onClick={() => setCompare(compare === null ? 0.5 : null)} aria-pressed={compare !== null}
        className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition disabled:opacity-40',
          compare !== null ? 'bg-white text-navy' : 'bg-white/10 text-white hover:bg-white/15')}>
        <Columns2 className="size-4" />Compare
      </button>
      <button type="button" onClick={() => player.setMuted(!state.muted)} aria-label={state.muted ? 'Unmute' : 'Mute'} disabled={state.exporting}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40">
        {state.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  )
}
