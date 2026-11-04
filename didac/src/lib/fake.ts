import { sha256 } from '@/lib/utils'
/** Appearance helpers for the security demo: deterministic, so the same object always shows the same "ciphertext". */
export const SESSION = Date.now()
export const traceId = (viewer: string, photoId: string) => 'TR-' + sha256(`${viewer}|${photoId}|${SESSION}`).slice(0, 6).toUpperCase()
export const sessionId = 'SX-' + sha256(String(SESSION)).slice(0, 4).toUpperCase()
export const fakeHex = (seed: string, bytes: number) => { let h = ''; let i = 0; while (h.length < bytes * 2) h += sha256(seed + i++); return h.slice(0, bytes * 2).match(/.{2}/g)!.join(' ') }
export const KEY_ID = sha256('school-key-2026').slice(0, 12).toUpperCase().match(/.{4}/g)!.join('·')
export const kb = (n: number) => (n > 1024 * 1024 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')

/** Real, simple: burn the visible watermark into a downloaded copy so it can be traced to the viewer. */
export async function downloadWatermarked(src: string, label: string, name: string) {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
  const g = c.getContext('2d')!; g.drawImage(img, 0, 0)
  // faint pattern (crop resistance) + one small corner stamp
  g.save(); g.rotate(-0.42); g.font = `500 ${Math.max(12, c.width / 52)}px sans-serif`; g.fillStyle = 'rgba(255,255,255,.14)'
  const step = c.width / 4.2; const w = g.measureText(label).width
  for (let y = -c.height; y < c.height * 1.6; y += step) for (let x = -c.width; x < c.width * 1.6; x += w + step * 0.9) g.fillText(label, x, y)
  g.restore()
  g.font = `500 ${Math.max(11, c.width / 56)}px sans-serif`; const pad = c.width / 110
  const w2 = g.measureText(label).width + pad * 2; const h2 = c.width / 56 + pad * 1.4
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.roundRect(c.width - w2 - pad, c.height - h2 - pad, w2, h2, h2 / 2); g.fill()
  g.fillStyle = 'rgba(255,255,255,.85)'; g.textBaseline = 'middle'; g.fillText(label, c.width - w2, c.height - h2 / 2 - pad)
  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.9))
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
