/** Set VITE_WA_NUMBER (digits with country code, e.g. 919XXXXXXXXX) at build time to point the booth QR at the real WhatsApp number. */
export const WA_NUMBER: string = (import.meta.env.VITE_WA_NUMBER as string | undefined)?.replace(/\D/g, '') ?? ''
export const EVENT_TAG = 'DIDAC 2026'
export const waLink = (text: string, to = WA_NUMBER) => `https://wa.me/${to}?text=${encodeURIComponent(text)}`
