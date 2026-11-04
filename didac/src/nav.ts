export type Route = 'home' | 'story' | 'demo' | 'law' | 'security' | 'faq' | 'pilot' | 'onepager' | 'team' | 'cinema'
const ALL = ['home', 'story', 'demo', 'law', 'security', 'faq', 'pilot', 'onepager', 'team', 'cinema']
export const ROUTES: { key: Route; label: string }[] = [
  { key: 'home', label: 'Pitch' }, { key: 'story', label: 'Story' }, { key: 'demo', label: 'Live demo' }, { key: 'law', label: 'DPDP map' },
  { key: 'security', label: 'Security' }, { key: 'faq', label: 'FAQs' }, { key: 'pilot', label: 'Pilot & QR' }, { key: 'onepager', label: 'One-pager' },
]
export const go = (r: Route) => { location.hash = '#/' + r; window.scrollTo({ top: 0 }) }
export const current = (): Route => { const h = location.hash.replace(/^#\/?/, '').split('?')[0]; return ALL.includes(h) ? (h as Route) : 'home' }
