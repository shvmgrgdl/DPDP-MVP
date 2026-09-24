import * as React from 'react'
import { useApp } from '@/store/app'
import { DEMO_NOW } from '@/lib/utils'
import type { Vendor } from '@/data/types'
import { ROLE } from '@/roles/roles'

/** The photographer vendor whose time-bound link powers the portal. */
export const PHOTO_VENDOR_ID = 'VEN-05'

/** Demo clock: starts at DEMO_NOW and ticks in real time, so countdowns are stable across rehearsals. */
const T0 = Date.now()
export const demoNowMs = () => new Date(DEMO_NOW).getTime() + (Date.now() - T0)

export function useTicker(ms = 1000) {
  const [t, setT] = React.useState(demoNowMs)
  React.useEffect(() => {
    const id = setInterval(() => setT(demoNowMs()), ms)
    return () => clearInterval(id)
  }, [ms])
  return t
}

export type AccessState = 'active' | 'revoked' | 'expired' | 'missing'

export function accessState(v: Vendor | undefined, now: number): AccessState {
  if (!v?.access) return 'missing'
  if (v.access.revoked) return 'revoked'
  if (new Date(v.access.expiresAt).getTime() <= now) return 'expired'
  return 'active'
}

export function usePhotoVendor() {
  return useApp((s) => s.vendors.find((v) => v.id === PHOTO_VENDOR_ID))
}

/** "3d 13h 29m 12s" style parts. */
export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** The event the photographer link is scoped to (Annual Day in the seed). */
export function scopedEventId(v: Vendor | undefined) {
  const events = useApp.getState().events
  const scope = v?.access?.scope ?? ''
  return events.find((e) => scope.includes(e.name))?.id ?? events.find((e) => e.photographerIds.includes('U-PHOTO') && e.uploadWindow)?.id ?? events[0]?.id
}

const actorOf = () => {
  const role = useApp.getState().role
  return ROLE[role].person || role
}

/** Revoke the link now (school side). */
export function revokePhotographerLink() {
  const s = useApp.getState()
  const v = s.vendors.find((x) => x.id === PHOTO_VENDOR_ID)
  if (!v?.access) return
  useApp.setState({ vendors: s.vendors.map((x) => (x.id === PHOTO_VENDOR_ID && x.access ? { ...x, access: { ...x.access, revoked: true } } : x)) })
  return s.addEvidence({ type: 'access', title: `Photographer upload link ${v.access.token} revoked for ${v.name}`, actor: actorOf(), refs: [PHOTO_VENDOR_ID, v.access.token] })
}

/** Issue a fresh 3-day link (school side). */
export function issuePhotographerLink() {
  const s = useApp.getState()
  const v = s.vendors.find((x) => x.id === PHOTO_VENDOR_ID)
  if (!v) return
  const token = `PH-${(v.access?.token.split('-')[1] ?? 'EVENT')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  // end of the day, three days from now, school time (IST)
  const ymd = new Date(demoNowMs() + 3 * 86400000 + 5.5 * 3600000).toISOString().slice(0, 10)
  const access = { token, expiresAt: new Date(`${ymd}T23:59:00+05:30`).toISOString(), scope: v.access?.scope ?? 'Upload only · no downloads · no names', revoked: false }
  useApp.setState({ vendors: s.vendors.map((x) => (x.id === PHOTO_VENDOR_ID ? { ...x, access, status: 'active' as const } : x)) })
  return s.addEvidence({ type: 'access', title: `New photographer upload link ${token} issued to ${v.name} (valid 3 days)`, actor: actorOf(), refs: [PHOTO_VENDOR_ID, token] })
}
