import { useDemo } from './store'

export type Lang = 'en' | 'hi' | 'bn' | 'mr' | 'gu' | 'ta' | 'te' | 'kn' | 'pa' | 'ml'
export const LANGS: { code: Lang; name: string; label: string }[] = [
  { code: 'en', name: 'English', label: 'English' }, { code: 'hi', name: 'हिन्दी', label: 'Hindi' }, { code: 'bn', name: 'বাংলা', label: 'Bengali' },
  { code: 'mr', name: 'मराठी', label: 'Marathi' }, { code: 'gu', name: 'ગુજરાતી', label: 'Gujarati' }, { code: 'ta', name: 'தமிழ்', label: 'Tamil' },
  { code: 'te', name: 'తెలుగు', label: 'Telugu' }, { code: 'kn', name: 'ಕನ್ನಡ', label: 'Kannada' }, { code: 'pa', name: 'ਪੰਜਾਬੀ', label: 'Punjabi' }, { code: 'ml', name: 'മലയാളം', label: 'Malayalam' },
]
type Dict = Record<string, string>
const cache: Partial<Record<Lang, Dict>> = {}
const loaders = import.meta.glob<{ default: Dict }>('./locales/[a-z][a-z].json')
export async function ensureLocale(l: Lang) {
  if (l === 'en' || cache[l]) return
  const f = loaders[`./locales/${l}.json`]; if (f) cache[l] = (await f()).default
}
declare global { interface Window { __missing?: Set<string> } }

/** Translate an English string (the key). `{name}` placeholders are filled from vars. Falls back to English. */
export function t(k: unknown, vars?: Record<string | number, string | number>): string {
  if (k == null) return ''
  const key = String(k)
  const lang = useDemo.getState().lang
  let s = key
  if (lang !== 'en') {
    const hit = cache[lang]?.[key]
    if (hit) s = hit; else if (cache[lang] && typeof window !== 'undefined' && /\p{L}/u.test(key)) (window.__missing ??= new Set()).add(key)
  }
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`)) : s
}

/** Identity marker: tags an English string held in data so the extractor finds it; render it with t(). */
export const tx = <T extends string>(s: T): T => s

/** Audit entries: actors are IDs/roles, details are stored as English plus an optional template for translation. */
export const tActor = (a: string) => (a.startsWith('Guardian ') ? `${t('Guardian')} ${a.slice(9)}` : t(a))
export const tDetail = (e: { detail: string; dt?: string; dv?: (string | number)[] }) => (e.dt ? t(e.dt, Object.fromEntries((e.dv ?? []).map((v, i) => [i, v]))) : e.detail)
