import { tx } from './i18n'
export type Route = 'home' | 'story' | 'demo' | 'law' | 'security' | 'faq' | 'pilot' | 'onepager' | 'team' | 'cinema'
const ALL = ['home', 'story', 'demo', 'law', 'security', 'faq', 'pilot', 'onepager', 'team', 'cinema']
export const ROUTES: { key: Route; label: string }[] = [
  { key: 'home', label: tx("Pitch") }, { key: 'story', label: tx("Story") }, { key: 'demo', label: tx("Live demo") }, { key: 'law', label: tx("DPDP map") },
  { key: 'security', label: tx("Security") }, { key: 'faq', label: tx("FAQs") }, { key: 'pilot', label: tx("Pilot & QR") }, { key: 'onepager', label: tx("One-pager") },
]
export const go = (r: Route) => { location.hash = '#/' + r; window.scrollTo({ top: 0 }) }
export const current = (): Route => { const h = location.hash.replace(/^#\/?/, '').split('?')[0]; return ALL.includes(h) ? (h as Route) : 'home' }
