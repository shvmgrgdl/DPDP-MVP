import * as React from 'react'
const subs = new Set<() => void>(); let t: ReturnType<typeof setInterval> | null = null; let snap = Date.now()
const sub = (f: () => void) => { subs.add(f); if (!t) t = setInterval(() => { snap = Date.now(); subs.forEach((x) => x()) }, 1000); return () => { subs.delete(f); if (!subs.size && t) { clearInterval(t); t = null } } }
/** One shared 1-second clock for every watermark on screen. */
export const useNow = () => React.useSyncExternalStore(sub, () => snap)
