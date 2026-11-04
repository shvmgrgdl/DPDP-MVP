export type Route = 'home' | 'story' | 'demo' | 'law' | 'compare' | 'faq' | 'pilot' | 'onepager' | 'team' | 'cinema'
const ALL = ['home', 'story', 'demo', 'law', 'compare', 'faq', 'pilot', 'onepager', 'team', 'cinema']
export const ROUTES: { key: Route; label: string }[] = [
  { key: 'home', label: 'Pitch' }, { key: 'story', label: 'Story' }, { key: 'demo', label: 'Live demo' }, { key: 'law', label: 'DPDP map' },
  { key: 'compare', label: 'vs Pixevety' }, { key: 'faq', label: 'FAQs' }, { key: 'pilot', label: 'Pilot & QR' }, { key: 'onepager', label: 'One-pager' },
]
export const go = (r: Route) => { location.hash = '#/' + r; window.scrollTo({ top: 0 }) }
export const current = (): Route => { const h = location.hash.replace(/^#\/?/, '').split('?')[0]; return ALL.includes(h) ? (h as Route) : 'home' }
