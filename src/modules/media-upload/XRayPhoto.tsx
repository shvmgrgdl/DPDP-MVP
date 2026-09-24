import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { phaseIndex, type XFace, type XItem } from './session'

type RingTone = 'found' | 'named' | 'unknown' | 'ok' | 'blocked'

const ringCls: Record<RingTone, string> = {
  found: 'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.18),0_0_18px_rgba(255,255,255,0.35)]',
  named: 'border-[#9cc3ff] shadow-[0_0_0_3px_rgba(156,195,255,0.22)]',
  unknown: 'border-dashed border-[#bfdbfe] shadow-[0_0_0_3px_rgba(147,197,253,0.18)]',
  ok: 'border-[#34d399] shadow-[0_0_0_3px_rgba(52,211,153,0.22)]',
  blocked: 'border-[#fb923c] shadow-[0_0_0_3px_rgba(251,146,60,0.22)]',
}
const labelCls: Record<RingTone, string> = {
  found: 'text-ink', named: 'text-azure', unknown: 'text-info', ok: 'text-ok', blocked: 'text-warn',
}

/** hoverFace value that highlights every unknown face at once */
export const UNKNOWN_GROUP = '__unknown'

export function ringTone(item: XItem, f: XFace, anonymous: boolean): RingTone {
  if (anonymous) return 'found'
  const p = phaseIndex(item.phase)
  if (p >= phaseIndex('permissions') && f.state) return f.state === 'ok' ? 'ok' : f.state === 'blocked' ? 'blocked' : 'unknown'
  if (item.matched) return f.studentId ? 'named' : 'unknown'
  return 'found'
}

export interface XRayPhotoProps {
  item: XItem
  /** Photographer view: soft white rings, never names. */
  anonymous?: boolean
  maxHeight?: number
  names?: Map<string, string>
  hoverFace?: string | null
  onHoverFace?: (id: string | null) => void
  labels?: 'auto' | 'always' | 'never'
  className?: string
  rounded?: string
}

export function XRayPhoto({ item, anonymous, maxHeight = 460, names, hoverFace, onHoverFace, labels = 'auto', className, rounded = 'rounded-xl' }: XRayPhotoProps) {
  const reduce = useReducedMotion()
  const aspect = item.w && item.h ? item.w / item.h : 4 / 3
  const scanning = item.phase === 'reading' || (item.phase === 'faces' && !item.faces.length)
  const matchedPhase = !!item.matched
  const hot = (f: XFace) => hoverFace === f.id || (hoverFace === UNKNOWN_GROUP && !f.studentId)
  const showLabel = (f: XFace) => {
    if (anonymous || labels === 'never' || !matchedPhase) return false
    if (labels === 'always' || hot(f)) return true
    return item.faces.length <= 6 && f.box[2] >= 0.045 // small faces: names live in the chips (hover to see)
  }
  return (
    <div className={cn('relative mx-auto', className)} style={{ aspectRatio: String(aspect), width: `min(100%, ${Math.round(maxHeight * aspect)}px)` }}>
      <div className={cn('absolute inset-0 overflow-hidden bg-navy-2', rounded)}>
        {item.src && (
          <img src={item.src} alt={item.name} draggable={false}
            className={cn('absolute inset-0 size-full object-cover transition-[filter] duration-700', scanning || item.phase === 'queued' ? 'brightness-[.78] saturate-[.85]' : 'brightness-100')} />
        )}
        {scanning && !reduce && (
          <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 h-1/3"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(173,205,255,0.3) 55%, rgba(255,255,255,0) 100%)' }}
            initial={{ top: '-35%' }} animate={{ top: ['-35%', '100%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        )}
      </div>
      <AnimatePresence>
        {item.faces.map((f, i) => {
          const tone = ringTone(item, f, !!anonymous)
          const pad = 0.16
          const [x, y, w, h] = f.box
          // centred on the face, never smaller than 22px so rings on distant faces stay visible
          const style = { left: `${(x + w / 2) * 100}%`, top: `${(y + h / 2) * 100}%`, width: `max(${w * (1 + pad * 2) * 100}%, 22px)`, height: `max(${h * (1 + pad * 2) * 100}%, 22px)`, x: '-50%', y: '-50%' }
          const name = f.studentId ? names?.get(f.studentId) : undefined
          const hovered = hot(f)
          return (
            <motion.div key={f.id} className="absolute" style={style}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={reduce ? { duration: 0.2 } : { delay: Math.min(i, 14) * 0.075, type: 'spring', stiffness: 240, damping: 20 }}
              onMouseEnter={onHoverFace ? () => onHoverFace(f.id) : undefined} onMouseLeave={onHoverFace ? () => onHoverFace(null) : undefined}>
              {!reduce && (
                <motion.span aria-hidden className="absolute inset-0 rounded-[46%] border border-white/70"
                  initial={{ opacity: 0.7, scale: 1 }} animate={{ opacity: 0, scale: 1.55 }} transition={{ delay: Math.min(i, 14) * 0.075 + 0.1, duration: 0.9, ease: 'easeOut' }} />
              )}
              <span className={cn('absolute inset-0 rounded-[46%] border-2 transition-[border-color,box-shadow] duration-500', ringCls[tone], hovered && 'ring-4 ring-white/60')} />
              <AnimatePresence>
                {showLabel(f) && (
                  <motion.span initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, delay: labels === 'auto' && !hovered ? Math.min(i, 8) * 0.06 : 0 }}
                    className={cn('pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold shadow-sm', labelCls[tone])}>
                    {name ? name.split(' ')[0] : 'Unknown'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/** Round face crop used in chips. */
export function FaceCrop({ src, size = 28, tone, className }: { src?: string; size?: number; tone?: RingTone; className?: string }) {
  const border = tone ? { found: 'ring-white', named: 'ring-[#9cc3ff]', unknown: 'ring-[#93c5fd]', ok: 'ring-[#34d399]', blocked: 'ring-[#fb923c]' }[tone] : 'ring-line'
  return src ? (
    <img src={src} alt="" className={cn('shrink-0 rounded-full object-cover ring-2', border, className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn('shrink-0 rounded-full bg-sunken ring-2', border, className)} style={{ width: size, height: size }} />
  )
}
