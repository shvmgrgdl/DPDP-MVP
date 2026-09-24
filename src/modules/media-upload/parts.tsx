import * as React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Check, ImagePlus, Loader2, Lock, RotateCcw, Sparkles, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Tip } from '@/design/ui'
import { VerdictChip } from '@/design/media'
import { cn } from '@/lib/utils'
import { FACE_MODEL_INFO, loadModels, useFaceEngine } from '@/media/face'
import { isImageFile, phaseIndex, type XItem } from './session'

/* ---------------- Face engine status ---------------- */

const backendLabel = (b: string | null) => (b === 'webgl' ? 'graphics chip (WebGL)' : b === 'wasm' ? 'WebAssembly' : b === 'cpu' ? 'processor' : 'this browser')

/** Starts loading the models in the background and shows a calm status pill. */
export function EngineStatus({ className }: { className?: string }) {
  const e = useFaceEngine()
  React.useEffect(() => {
    const t = setTimeout(() => void loadModels().catch(() => undefined), 150)
    return () => clearTimeout(t)
  }, [])
  if (e.status === 'error')
    return (
      <div className={cn('inline-flex items-center gap-2 rounded-full border border-risk/25 bg-risk-bg py-1 pl-3 pr-1 text-[12.5px] font-semibold text-risk', className)}>
        <AlertCircle className="size-4" /> Face engine could not start
        <Button size="sm" variant="secondary" className="h-7 rounded-full px-2.5" icon={<RotateCcw className="size-3.5" />}
          onClick={() => void loadModels().then(() => toast.success('Face engine ready')).catch(() => toast.error('Still not starting', { description: 'Try Chrome or Edge on a laptop or desktop.' }))}>
          Try again
        </Button>
      </div>
    )
  if (e.status === 'ready')
    return (
      <Tip content={<span>Runs on this computer’s {backendLabel(e.backend)}. {FACE_MODEL_INFO.detector} finds faces; a 128-point face signature is compared with the roster. Nothing is sent to an outside AI service.</span>}>
        <span className={cn('inline-flex cursor-default items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2', className)}>
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-ok/40" /><span className="relative inline-flex size-2 rounded-full bg-ok" /></span>
          Face engine ready · on this computer
        </span>
      </Tip>
    )
  const pct = Math.round((e.status === 'idle' ? 0.02 : e.progress) * 100)
  return (
    <span className={cn('inline-flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-2.5 pr-3 text-[12.5px] font-semibold text-ink-2', className)} role="status" aria-live="polite">
      <Loader2 className="size-4 animate-spin text-azure" />
      <span>{e.stage || 'Getting the face engine ready'}</span>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-sunken">
        <motion.span className="absolute inset-y-0 left-0 rounded-full bg-azure" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </span>
      <span className="num text-ink-3">{pct}%</span>
    </span>
  )
}

/* ---------------- Drop zone ---------------- */

export interface DropZoneProps {
  onFiles: (files: File[]) => void
  onSamples?: () => void
  samplesLoading?: boolean
  compact?: boolean
  disabled?: boolean
  title?: React.ReactNode
  hint?: React.ReactNode
  extra?: React.ReactNode
  className?: string
}

/** Photos are kept in the browser, so one drop is capped to keep the demo responsive. */
const MAX_PER_DROP = 40

export function DropZone({ onFiles, onSamples, samplesLoading, compact, disabled, title, hint, extra, className }: DropZoneProps) {
  const [over, setOver] = React.useState(false)
  const input = React.useRef<HTMLInputElement>(null)
  const take = (list: FileList | File[] | null | undefined) => {
    if (!list || disabled) return
    const all = [...list]
    const imgs = all.filter(isImageFile)
    if (all.length > imgs.length) toast.message(`Skipped ${all.length - imgs.length} file${all.length - imgs.length === 1 ? '' : 's'} that ${all.length - imgs.length === 1 ? 'is' : 'are'} not a photo`)
    if (imgs.length > MAX_PER_DROP) toast.message(`Added the first ${MAX_PER_DROP} photos`, { description: 'Add the rest once these are checked.' })
    if (imgs.length) onFiles(imgs.slice(0, MAX_PER_DROP))
  }
  const pick = () => input.current?.click()
  const samplesBtn = onSamples && (
    <Button variant="soft" size={compact ? 'sm' : 'md'} icon={samplesLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} onClick={onSamples} disabled={disabled || samplesLoading}>
      Try sample photos
    </Button>
  )
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false) }}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }}
      className={cn('relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300',
        over ? 'scale-[1.005] border-azure bg-azure-50/80' : 'border-line-strong bg-surface', disabled && 'opacity-60', className)}>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden data-testid="upload-input"
        onChange={(e) => { take(e.target.files); e.target.value = '' }} />
      {compact ? (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className={cn('flex size-9 items-center justify-center rounded-xl transition-colors', over ? 'bg-azure text-white' : 'bg-azure-50 text-azure')}><UploadCloud className="size-5" /></span>
          <div className="min-w-[240px] flex-1">
            <div className="text-[14px] font-semibold text-ink">{over ? 'Drop to check these photos' : title ?? 'Add more photos'}</div>
            <div className="text-[12.5px] text-ink-3">{hint ?? 'Drag photos here or choose them.'}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {samplesBtn}
            <Button variant="secondary" size="sm" icon={<ImagePlus className="size-4" />} onClick={pick} disabled={disabled}>Choose photos</Button>
            {extra}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <motion.div animate={over ? { y: -4, scale: 1.06 } : { y: [0, -5, 0] }} transition={over ? { duration: 0.2 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className={cn('mb-4 flex size-16 items-center justify-center rounded-2xl transition-colors', over ? 'bg-azure text-white' : 'bg-azure-50 text-azure')}>
            <UploadCloud className="size-8" strokeWidth={1.75} />
          </motion.div>
          <div className="font-display text-[22px] font-semibold text-ink">{over ? 'Drop to check these photos' : title ?? 'Drop event photos here'}</div>
          <p className="mt-1.5 max-w-md text-[14px] text-ink-2">{hint ?? 'or choose them from this computer. JPG or PNG, as many as you like.'}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button size="lg" icon={<ImagePlus className="size-5" />} onClick={pick} disabled={disabled}>Choose photos</Button>
            {samplesBtn}
            {extra}
          </div>
          <p className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-ink-3"><Lock className="size-3.5" /> Checked on this computer. Photos are not sent to any outside AI service.</p>
        </div>
      )}
    </div>
  )
}

/* ---------------- Filmstrip ---------------- */

const stepLabel: Partial<Record<XItem['phase'], string>> = {
  queued: 'Waiting', reading: 'Opening', faces: 'Finding faces', matching: 'Matching', permissions: 'Permissions', evidence: 'Recording',
}

export function Filmstrip({ items, activeKey, onSelect, anonymous }: { items: XItem[]; activeKey?: string; onSelect: (key: string) => void; anonymous?: boolean }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-3">
      <AnimatePresence initial={false}>
        {items.map((it) => {
          const p = phaseIndex(it.phase)
          const busy = p > 0 && it.phase !== 'done'
          const progress = it.phase === 'done' ? 100 : p <= 0 ? 0 : ((p - 1) / 5) * 100
          return (
            <motion.button key={it.key} type="button" layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25 }} onClick={() => onSelect(it.key)} aria-label={`${it.name}: ${it.phase === 'done' ? 'checked' : stepLabel[it.phase] ?? 'needs attention'}`}
              className={cn('group relative aspect-[4/3] overflow-hidden rounded-xl bg-sunken text-left outline-none ring-offset-2 ring-offset-canvas transition-shadow focus-visible:ring-2 focus-visible:ring-azure',
                activeKey === it.key ? 'ring-2 ring-azure' : 'hover:ring-2 hover:ring-line-strong')}>
              {it.src && <img src={it.src} alt="" className={cn('absolute inset-0 size-full object-cover transition-all duration-500', it.phase === 'queued' && 'opacity-60 saturate-50')} draggable={false} />}
              {it.phase === 'error' && <div className="absolute inset-0 flex items-center justify-center bg-risk-bg/85 text-risk"><AlertCircle className="size-6" /></div>}
              {it.phase === 'queued' && <span className="absolute left-1.5 top-1.5 rounded-full bg-navy/70 px-2 py-0.5 text-[10.5px] font-semibold text-white">Waiting</span>}
              {busy && (
                <>
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold text-azure shadow-sm">
                    <Loader2 className="size-3 animate-spin" />{anonymous && ['matching', 'permissions'].includes(it.phase) ? 'Sending' : stepLabel[it.phase]}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-white/40"><motion.span className="block h-full bg-azure" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} /></span>
                </>
              )}
              {it.phase === 'done' && (
                <>
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-navy/75 px-1.5 py-0.5 text-[10.5px] font-semibold text-white num">{it.faces.length} face{it.faces.length === 1 ? '' : 's'}</span>
                  <span className="absolute bottom-1.5 left-1.5">
                    {anonymous || !it.verdict
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-[10.5px] font-semibold text-ok"><Check className="size-3" strokeWidth={2.5} />Uploaded</span>
                      : <VerdictChip verdict={it.verdict} size="sm" className="shadow-sm" />}
                  </span>
                </>
              )}
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
