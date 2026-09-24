import * as React from 'react'
import { Check, HelpCircle, Lock, EyeOff, Globe, Printer } from 'lucide-react'
import { InstagramIcon as Instagram, YoutubeIcon as Youtube } from './brand-icons'
import type { DestinationKey, MediaAsset, Verdict } from '@/data/types'
import type { FaceEval } from '@/engine/permission'
import { VERDICT_META } from '@/data/reference'
import { cn } from '@/lib/utils'
import { Chip, type Tone } from './ui'
import { useApp } from '@/store/app'

export const verdictTone = (v: Verdict): Tone => VERDICT_META[v].tone as Tone
export function VerdictChip({ verdict, size = 'md', className }: { verdict: Verdict; size?: 'sm' | 'md'; className?: string }) {
  const t = verdictTone(verdict)
  const icon = verdict === 'ready' ? <Check className="size-3.5" strokeWidth={2.5} /> : verdict === 'needs-blur' ? <EyeOff className="size-3.5" /> : verdict === 'keep-private' ? <Lock className="size-3.5" /> : <HelpCircle className="size-3.5" />
  return <Chip tone={t} icon={icon} size={size} className={className}>{VERDICT_META[verdict].label}</Chip>
}

/** Map a normalised face box into container % for object-fit: cover with a given container aspect. */
export function coverBox(box: [number, number, number, number], imgAspect: number, containerAspect: number, pad = 0) {
  let [x, y, w, h] = box
  x -= w * pad; y -= h * pad; w *= 1 + pad * 2; h *= 1 + pad * 2
  if (imgAspect > containerAspect) {
    const k = imgAspect / containerAspect
    const off = (1 - k) / 2
    return { left: (off + x * k) * 100, top: y * 100, width: w * k * 100, height: h * 100 }
  }
  const k = containerAspect / imgAspect
  const off = (1 - k) / 2
  return { left: x * 100, top: (off + y * k) * 100, width: w * 100, height: h * k * 100 }
}

export type BlurStyle = 'soft' | 'pixel' | 'sticker' | 'solid'

export interface PhotoFacesProps {
  asset: MediaAsset
  evals?: FaceEval[]
  aspect?: number // container aspect (w/h); default = image aspect
  rings?: boolean
  names?: boolean
  blurBlocked?: boolean
  blurUnknown?: boolean
  blurStyle?: BlurStyle
  blurIds?: Set<string> // explicit face ids to blur (overrides evals)
  selectedFaceId?: string | null
  onFaceClick?: (faceId: string) => void
  className?: string
  rounded?: string
  children?: React.ReactNode
  loading?: 'lazy' | 'eager'
}

const ringCls = { ok: 'border-[#34d399]', blocked: 'border-[#fb923c]', unknown: 'border-[#93c5fd]', adult: 'border-white/80' } as const

export function PhotoFaces({ asset, evals, aspect, rings, names, blurBlocked, blurUnknown, blurStyle = 'soft', blurIds, selectedFaceId, onFaceClick, className, rounded = 'rounded-xl', children, loading = 'lazy' }: PhotoFacesProps) {
  const imgAspect = asset.w / asset.h
  const ca = aspect ?? imgAspect
  const students = useApp((s) => s.students)
  return (
    <div className={cn('relative overflow-hidden bg-sunken', rounded, className)} style={{ aspectRatio: String(ca) }}>
      <img src={asset.src} alt={asset.title ?? ''} loading={loading} className="absolute inset-0 size-full object-cover" draggable={false} />
      {asset.faces.map((f) => {
        const e = evals?.find((x) => x.face.id === f.id)
        const state = e?.state ?? (f.studentId ? 'ok' : 'unknown')
        const adult = f.review === 'non-student'
        const doBlur = blurIds ? blurIds.has(f.id) : (blurBlocked && state === 'blocked') || (blurUnknown && state === 'unknown')
        const pos = coverBox(f.box, imgAspect, ca, doBlur ? 0.18 : 0.08)
        const st = students.find((s) => s.id === f.studentId)
        const style: React.CSSProperties = { left: `${pos.left}%`, top: `${pos.top}%`, width: `${pos.width}%`, height: `${pos.height}%` }
        return (
          <React.Fragment key={f.id}>
            {doBlur && <BlurPatch style={style} kind={blurStyle} />}
            {rings && (
              <button type="button" onClick={onFaceClick ? () => onFaceClick(f.id) : undefined} aria-label={st ? `Face: ${st.name}` : 'Unknown face'}
                className={cn('absolute rounded-[40%] border-2 transition-all', adult ? ringCls.adult : ringCls[state], onFaceClick ? 'cursor-pointer hover:scale-105' : 'pointer-events-none', selectedFaceId === f.id && 'ring-4 ring-white/70')}
                style={style}>
                {names && (
                  <span className={cn('absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold shadow',
                    adult ? 'bg-white text-ink-2' : state === 'ok' ? 'bg-white text-ok' : state === 'blocked' ? 'bg-white text-warn' : 'bg-white text-info')}>
                    {st ? st.name.split(' ')[0] : adult ? 'Adult' : 'Unknown'}
                  </span>
                )}
              </button>
            )}
          </React.Fragment>
        )
      })}
      {children}
    </div>
  )
}

export function BlurPatch({ style, kind = 'soft' }: { style: React.CSSProperties; kind?: BlurStyle }) {
  if (kind === 'solid') return <div className="absolute rounded-[42%] bg-[#2b3445]" style={style} />
  if (kind === 'sticker')
    return (
      <div className="absolute flex items-center justify-center rounded-full bg-[#fcd34d] shadow" style={style}>
        <svg viewBox="0 0 24 24" className="size-[70%] text-[#8a5300]" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2z" /></svg>
      </div>
    )
  if (kind === 'pixel')
    return (
      <div className="absolute overflow-hidden rounded-md" style={{ ...style, backdropFilter: 'blur(6px) contrast(1.2)', WebkitBackdropFilter: 'blur(6px)',
        backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,.06) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.06) 75%), linear-gradient(45deg, rgba(0,0,0,.06) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.06) 75%)',
        backgroundSize: '12px 12px', backgroundPosition: '0 0, 6px 6px' }} />
    )
  return <div className="absolute rounded-[45%] face-frost" style={{ ...style, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }} />
}

const channelIcon: Partial<Record<DestinationKey, React.ReactNode>> = {
  instagram: <Instagram className="size-3.5" />, website: <Globe className="size-3.5" />, print: <Printer className="size-3.5" />, youtube: <Youtube className="size-3.5" />,
}
export function ChannelDots({ items }: { items: { key: DestinationKey; verdict: Verdict }[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {items.map((i) => (
        <span key={i.key} title={`${i.key}: ${VERDICT_META[i.verdict].label}`}
          className={cn('inline-flex size-6 items-center justify-center rounded-md',
            i.verdict === 'ready' ? 'bg-ok-bg text-ok' : i.verdict === 'needs-blur' ? 'bg-warn-bg text-warn' : i.verdict === 'check-faces' ? 'bg-info-bg text-info' : 'bg-risk-bg text-risk')}>
          {channelIcon[i.key]}
        </span>
      ))}
    </div>
  )
}

export function MediaCaption({ className }: { className?: string }) {
  const cap = useApp((s) => s.school.mediaCaption)
  return <p className={cn('text-[11px] text-ink-3', className)}>{cap}</p>
}

/** Phone frame used for the parent app on desktop. */
export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative mx-auto w-[390px] h-[800px] rounded-[48px] bg-[#0b1220] p-3 shadow-[0_30px_80px_rgba(11,28,48,.25)]', className)}>
      <div className="absolute left-1/2 top-3 z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[#0b1220]" />
      <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-canvas">
        <div className="h-full overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  )
}

export function EvidenceLink({ id, className, children }: { id: string; className?: string; children?: React.ReactNode }) {
  const setUI = useApp((s) => s.setUI)
  return (
    <button type="button" onClick={() => setUI({ evidenceDrawer: id })} className={cn('font-mono text-[12px] text-azure hover:underline', className)}>
      {children ?? id}
    </button>
  )
}
