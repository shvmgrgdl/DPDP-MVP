import * as React from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { BookOpen, Globe, Lock, Megaphone, Newspaper, Presentation } from 'lucide-react'
import { FacebookIcon, InstagramIcon, WhatsappIcon, YoutubeIcon } from '@/design/brand-icons'
import { DEST, DESTINATIONS, MEDIA_PURPOSES } from '@/data/reference'
import type { Destination, DestinationKey, Student } from '@/data/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'

/* ------------------------------------------------------------------ destinations */

export const DEST_INFO: Record<DestinationKey, { meaning: string; audience: string }> = {
  instagram: { meaning: 'The school’s public Instagram account', audience: 'Anyone online can see, save and reshare' },
  website: { meaning: 'News and gallery pages on the school website', audience: 'Public and found by search engines' },
  facebook: { meaning: 'The school’s Facebook page', audience: 'Parents, alumni and the wider public' },
  youtube: { meaning: 'Thumbnails and stills for the school channel', audience: 'Public, and stays up for years' },
  print: { meaning: 'Admission brochure and prospectus', audience: 'Printed copies can’t be called back' },
  newspaper: { meaning: 'Photos sent to local newspapers', audience: 'Out of the school’s hands once printed' },
  'paid-ads': { meaning: 'Sponsored posts and admission campaigns', audience: 'Shown to strangers. The strictest rule' },
  internal: { meaning: 'Corridor boards, yearbook and newsletters', audience: 'Students, staff and visiting parents' },
  'class-whatsapp': { meaning: 'The class teacher’s parent group', audience: 'Parents of one class only' },
  'private-gallery': { meaning: 'Photos inside the parent app', audience: 'Each family sees their own child' },
}

const GROUP_OF = (d: Destination) =>
  d.audience === 'public' ? 'public' : d.audience === 'promotion' || d.audience === 'paid' ? 'promotion' : d.audience === 'internal' ? 'internal' : 'private'

export const DEST_GROUPS: { key: string; label: string; hint: string; dests: DestinationKey[] }[] = [
  { key: 'public', label: 'Public', hint: 'Anyone can see it' },
  { key: 'promotion', label: 'Promotion', hint: 'Printed or paid for' },
  { key: 'internal', label: 'Inside school', hint: 'On campus only' },
  { key: 'private', label: 'Private', hint: 'Families only' },
].map((g) => ({ ...g, dests: DESTINATIONS.filter((d) => GROUP_OF(d) === g.key).map((d) => d.key) }))

export const isDest = (v: string | null | undefined): v is DestinationKey => !!v && v in DEST

/** The parent choice a destination is checked against, in the parent's own words. */
export const purposeLabel = (dest: DestinationKey) => MEDIA_PURPOSES.find((p) => p.key === DEST[dest].purpose)?.label ?? DEST[dest].purpose

const brandTint: Partial<Record<DestinationKey, string>> = {
  instagram: 'text-[#c13584]',
  facebook: 'text-[#1877f2]',
  youtube: 'text-[#e62117]',
  'class-whatsapp': 'text-[#128c4a]',
}

export function DestIcon({ dest, className, tinted = true }: { dest: DestinationKey; className?: string; tinted?: boolean }) {
  const cls = cn('size-5 shrink-0', tinted && brandTint[dest], className)
  switch (dest) {
    case 'instagram': return <InstagramIcon className={cls} />
    case 'facebook': return <FacebookIcon className={cls} />
    case 'youtube': return <YoutubeIcon className={cls} />
    case 'class-whatsapp': return <WhatsappIcon className={cls} />
    case 'website': return <Globe className={cls} />
    case 'print': return <BookOpen className={cls} />
    case 'newspaper': return <Newspaper className={cls} />
    case 'paid-ads': return <Megaphone className={cls} />
    case 'internal': return <Presentation className={cls} />
    default: return <Lock className={cls} />
  }
}

/* ------------------------------------------------------------------ people */

export const firstName = (name: string) => name.split(' ')[0]

/** "Diya · 5B" for staff who may see names, otherwise "A child in 5B". */
export function childLabel(student: Student | undefined, canNames: boolean, opts: { full?: boolean } = {}) {
  if (!student) return 'Not recognised'
  if (!canNames) return `A child in ${student.classId}`
  return `${opts.full ? student.name : firstName(student.name)} · ${student.classId}`
}

/** Person id used as the evidence actor for the current role. */
export function actorId() {
  const s = useApp.getState()
  return ROLE[s.role].person || s.role
}

/** Where "Check faces" goes: the face review queue, focused on this photo. */
export const reviewLink = (assetId: string) => `/media/review?asset=${encodeURIComponent(assetId)}`

/* ------------------------------------------------------------------ motion */

/** Number that eases to its new value (respects reduced motion). */
export function CountUp({ value, className, duration = 0.7 }: { value: number; className?: string; duration?: number }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = React.useState(reduce ? value : 0)
  const from = React.useRef(reduce ? value : 0)
  React.useEffect(() => {
    if (reduce) {
      from.current = value
      setShown(value)
      return
    }
    const c = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        from.current = v
        setShown(Math.round(v))
      },
    })
    return () => c.stop()
  }, [value, reduce, duration])
  return <span className={cn('num', className)}>{shown}</span>
}

export const fmtBytes = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
