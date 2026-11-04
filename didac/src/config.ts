import { useDemo } from './store'
/** Runtime settings (Team → Settings) override the build-time VITE_WA_NUMBER, so the booth QR can be set without a rebuild. */
export const useWa = () => { const s = useDemo((x) => x.settings); return { number: s.waNumber, tag: s.eventTag } }
export const waLink = (text: string, to: string) => `https://wa.me/${to}?text=${encodeURIComponent(text)}`
