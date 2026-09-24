/**
 * Publish Guard canvas helpers: real pixel-level face protection, so the preview in the studio is
 * exactly the JPEG that leaves school (no CSS overlays in the exported file).
 *
 *   renderBlurred(img, faces, style, strength, opts?) → HTMLCanvasElement
 *     img       HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap
 *     faces     normalised boxes [x, y, w, h] (0..1), or { box, shape: 'face' | 'area' }
 *               'face' = feathered ellipse sized from the face box (padded to cover hair and chin)
 *               'area' = the exact rectangle (hand-drawn "Add blur area")
 *     style     'soft' | 'pixel' | 'sticker' | 'solid'
 *     strength  1..10 (soft: blur radius, pixel: block size)
 *     opts      { maxSide?: number, watermark?: string | null, canvas?: reuse this canvas }
 *
 * Soft blur uses ctx.filter = 'blur(Npx)' inside an elliptical mask per face, drawn from a margin
 * around the face so edges stay solid (falls back to a downscale/upscale blur where ctx.filter
 * is unsupported). Pixelate is a real downscale–upscale. Everything else is plain canvas paths.
 */
import type { Box } from '@/data/types'
import type { BlurStyle } from '@/design/media'

export type { BlurStyle }
export type Drawable = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap

export interface BlurTarget {
  box: Box
  shape?: 'face' | 'area'
}
export type BlurInput = Box | BlurTarget

export interface RenderOptions {
  /** Longest side of the output in px. Default: full source resolution. */
  maxSide?: number
  /** Small label drawn bottom-right, e.g. "Cleared for Instagram · 24 Sept 2026". */
  watermark?: string | null
  /** Draw into this canvas instead of allocating a new one (it is resized as needed). */
  canvas?: HTMLCanvasElement
}

export const STRENGTH = { min: 1, max: 10, default: 6 } as const

export const BLUR_STYLES: { key: BlurStyle; label: string; hint: string }[] = [
  { key: 'soft', label: 'Soft blur', hint: 'A gentle frosted blur. Best for social posts.' },
  { key: 'pixel', label: 'Pixelate', hint: 'Mosaic blocks, the classic news look.' },
  { key: 'sticker', label: 'Sticker', hint: 'A friendly star sticker over each face.' },
  { key: 'solid', label: 'Solid', hint: 'An opaque shape. The strongest cover.' },
]

/** Padding around a detected face box (fractions of the box) so hair, ears and chin are covered too. */
const FACE_PAD = { x: 0.26, top: 0.36, bottom: 0.22 }
const STICKER_BG = '#fcd34d'
const STICKER_FG = '#8a5300'
const SOLID = '#2b3445'

/* ------------------------------------------------------------------ basics */

export function sourceSize(src: Drawable): { w: number; h: number } {
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height }
  if (src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight }
  return { w: src.width, h: src.height }
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

let filterSupport: boolean | null = null
/** True when CanvasRenderingContext2D.filter really blurs (checked by drawing, not by feature name). */
export function canvasFilterSupported() {
  if (filterSupport !== null) return filterSupport
  try {
    const c = makeCanvas(9, 9)
    const x = c.getContext('2d', { willReadFrequently: true })!
    x.filter = 'blur(2px)'
    x.fillStyle = '#fff'
    x.fillRect(4, 4, 1, 1)
    filterSupport = x.getImageData(2, 4, 1, 1).data[3] > 0
  } catch {
    filterSupport = false
  }
  return filterSupport
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()
/** Load (and cache) an image for canvas use. Same-origin and data: URLs keep the canvas exportable. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src)
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => {
        imageCache.delete(src)
        reject(new Error(`Could not load ${src.startsWith('data:') ? 'the uploaded photo' : src}`))
      }
      img.src = src
    })
    imageCache.set(src, p)
  }
  return p
}

const baseCache = new WeakMap<object, Map<string, HTMLCanvasElement>>()
/** The untouched photo drawn at output size (cached for images, fresh for video frames). */
export function baseCanvas(img: Drawable, maxSide?: number): HTMLCanvasElement {
  const { w, h } = sourceSize(img)
  const k = maxSide ? Math.min(1, maxSide / Math.max(w, h)) : 1
  const W = Math.max(1, Math.round(w * k))
  const H = Math.max(1, Math.round(h * k))
  const cacheable = img instanceof HTMLImageElement || (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap)
  const key = `${W}x${H}`
  if (cacheable) {
    const hit = baseCache.get(img)?.get(key)
    if (hit) return hit
  }
  const c = makeCanvas(W, H)
  const x = c.getContext('2d')!
  x.imageSmoothingQuality = 'high'
  x.drawImage(img, 0, 0, W, H)
  if (cacheable) {
    let m = baseCache.get(img)
    if (!m) baseCache.set(img, (m = new Map()))
    m.set(key, c)
  }
  return c
}

interface Rect { x: number; y: number; w: number; h: number }

const toTarget = (f: BlurInput): BlurTarget => (Array.isArray(f) ? { box: f as Box, shape: 'face' } : { shape: 'face', ...f })

/** Pixel rectangle covered by a target on a W×H canvas (face boxes are padded; areas are exact). */
export function regionFor(t: BlurTarget, W: number, H: number): Rect {
  const [bx, by, bw, bh] = t.box
  if (t.shape === 'area') return { x: bx * W, y: by * H, w: bw * W, h: bh * H }
  const w = bw * W
  const h = bh * H
  return { x: bx * W - w * FACE_PAD.x, y: by * H - h * FACE_PAD.top, w: w * (1 + 2 * FACE_PAD.x), h: h * (1 + FACE_PAD.top + FACE_PAD.bottom) }
}

/** Same region in normalised units — handy for DOM overlays (hit targets, outlines). */
export function regionNorm(t: BlurInput): Box {
  const r = regionFor(toTarget(t), 1, 1)
  return [r.x, r.y, r.w, r.h]
}

function roundRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  c.beginPath()
  c.moveTo(x + rr, y)
  c.arcTo(x + w, y, x + w, y + h, rr)
  c.arcTo(x + w, y + h, x, y + h, rr)
  c.arcTo(x, y + h, x, y, rr)
  c.arcTo(x, y, x + w, y, rr)
  c.closePath()
}

function ellipsePath(c: CanvasRenderingContext2D, r: Rect) {
  c.beginPath()
  c.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2)
}

/** Average colour of a region (8×8 sample), used as an opaque underlay so blur never leaks detail at photo edges. */
function averageColor(src: HTMLCanvasElement, r: Rect) {
  const sx = clamp(Math.floor(r.x), 0, src.width - 1)
  const sy = clamp(Math.floor(r.y), 0, src.height - 1)
  const sw = clamp(Math.ceil(r.w), 1, src.width - sx)
  const sh = clamp(Math.ceil(r.h), 1, src.height - sy)
  const c = makeCanvas(8, 8)
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.imageSmoothingQuality = 'high'
  x.drawImage(src, sx, sy, sw, sh, 0, 0, 8, 8)
  const d = x.getImageData(0, 0, 8, 8).data
  let R = 0, G = 0, B = 0
  for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2] }
  const n = d.length / 4
  return `rgb(${Math.round(R / n)},${Math.round(G / n)},${Math.round(B / n)})`
}

/** Blur without ctx.filter: repeated downscale → upscale (smooth, no detail survives). */
function scaleBlur(o: CanvasRenderingContext2D, src: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, sigma: number) {
  const k = Math.max(2, sigma / 1.6)
  const tw = Math.max(1, Math.round(sw / k))
  const th = Math.max(1, Math.round(sh / k))
  const t1 = makeCanvas(tw, th)
  const a = t1.getContext('2d')!
  a.imageSmoothingQuality = 'high'
  a.drawImage(src, sx, sy, sw, sh, 0, 0, tw, th)
  const t2 = makeCanvas(Math.max(1, Math.round(tw / 1.6)), Math.max(1, Math.round(th / 1.6)))
  const b = t2.getContext('2d')!
  b.imageSmoothingQuality = 'high'
  b.drawImage(t1, 0, 0, t2.width, t2.height)
  a.clearRect(0, 0, tw, th)
  a.drawImage(t2, 0, 0, tw, th)
  o.imageSmoothingEnabled = true
  o.imageSmoothingQuality = 'high'
  o.drawImage(t1, 0, 0, tw, th, dx, dy, sw, sh)
}

/* ------------------------------------------------------------------ styles */

function softRegion(out: CanvasRenderingContext2D, base: HTMLCanvasElement, r: Rect, sigma: number, shape: 'face' | 'area') {
  const rx = Math.floor(r.x)
  const ry = Math.floor(r.y)
  const rw = Math.ceil(r.w + (r.x - rx))
  const rh = Math.ceil(r.h + (r.y - ry))
  const off = makeCanvas(rw, rh)
  const o = off.getContext('2d')!
  // 1. opaque underlay: at the photo border the blur has nothing to sample, never let the original show through
  o.fillStyle = averageColor(base, r)
  o.fillRect(0, 0, rw, rh)
  // 2. blurred pixels, sampled with a margin so the blur edge is solid inside the mask
  const m = Math.ceil(sigma * 3)
  const sx = Math.max(0, rx - m)
  const sy = Math.max(0, ry - m)
  const ex = Math.min(base.width, rx + rw + m)
  const ey = Math.min(base.height, ry + rh + m)
  if (ex > sx && ey > sy) {
    if (canvasFilterSupported()) {
      o.filter = `blur(${sigma.toFixed(1)}px)`
      o.drawImage(base, sx, sy, ex - sx, ey - sy, sx - rx, sy - ry, ex - sx, ey - sy)
      o.filter = 'none'
    } else {
      scaleBlur(o, base, sx, sy, ex - sx, ey - sy, sx - rx, sy - ry, sigma)
    }
  }
  // 3. keep only the elliptical face region (feathered edge) or the drawn rectangle
  o.globalCompositeOperation = 'destination-in'
  if (shape === 'face') {
    o.save()
    o.translate(rw / 2, rh / 2)
    o.scale(rw / 2, rh / 2)
    const g = o.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, '#000')
    g.addColorStop(0.82, '#000')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    o.fillStyle = g
    o.beginPath()
    o.arc(0, 0, 1, 0, Math.PI * 2)
    o.fill()
    o.restore()
  } else {
    o.fillStyle = '#000'
    roundRectPath(o, r.x - rx, r.y - ry, r.w, r.h, Math.min(r.w, r.h) * 0.08)
    o.fill()
  }
  out.drawImage(off, rx, ry)
}

function pixelRegion(out: CanvasRenderingContext2D, base: HTMLCanvasElement, r0: Rect, block: number, shape: 'face' | 'area') {
  // clamp to the photo so no half-transparent blocks let the original through at the edge
  const x0 = clamp(Math.floor(r0.x), 0, base.width)
  const y0 = clamp(Math.floor(r0.y), 0, base.height)
  const x1 = clamp(Math.ceil(r0.x + r0.w), 0, base.width)
  const y1 = clamp(Math.ceil(r0.y + r0.h), 0, base.height)
  const r = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  if (r.w < 2 || r.h < 2) return
  const cols = Math.max(2, Math.round(r.w / block))
  const rows = Math.max(2, Math.round(r.h / block))
  const tiny = makeCanvas(cols, rows)
  const t = tiny.getContext('2d')!
  t.imageSmoothingEnabled = true
  t.imageSmoothingQuality = 'high'
  t.drawImage(base, r.x, r.y, r.w, r.h, 0, 0, cols, rows)
  out.save()
  roundRectPath(out, r.x, r.y, r.w, r.h, Math.min(r.w, r.h) * (shape === 'face' ? 0.2 : 0.06))
  out.clip()
  out.imageSmoothingEnabled = false
  out.drawImage(tiny, 0, 0, cols, rows, r.x, r.y, r.w, r.h)
  out.restore()
}

function starPath(c: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad
    if (i === 0) c.moveTo(x, y)
    else c.lineTo(x, y)
  }
  c.closePath()
}

function stickerRegion(out: CanvasRenderingContext2D, r: Rect) {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  const R = Math.max(r.w, r.h) / 2
  out.save()
  out.shadowColor = 'rgba(11,28,48,0.28)'
  out.shadowBlur = R * 0.2
  out.shadowOffsetY = R * 0.05
  out.fillStyle = STICKER_BG
  out.beginPath()
  out.arc(cx, cy, R, 0, Math.PI * 2)
  out.fill()
  out.restore()
  out.save()
  out.lineWidth = Math.max(1.5, R * 0.07)
  out.strokeStyle = 'rgba(255,255,255,0.92)'
  out.beginPath()
  out.arc(cx, cy, R - out.lineWidth / 2, 0, Math.PI * 2)
  out.stroke()
  out.fillStyle = STICKER_FG
  starPath(out, cx, cy + R * 0.04, R * 0.6, R * 0.25)
  out.fill()
  out.restore()
}

function solidRegion(out: CanvasRenderingContext2D, r: Rect, shape: 'face' | 'area') {
  out.save()
  out.fillStyle = SOLID
  if (shape === 'face') ellipsePath(out, r)
  else roundRectPath(out, r.x, r.y, r.w, r.h, Math.min(r.w, r.h) * 0.08)
  out.fill()
  out.restore()
}

/** Watermark pill, bottom-right: green check + text. Scales with the photo. */
export function drawWatermark(c: CanvasRenderingContext2D, text: string, W: number, H: number) {
  const fs = Math.max(11, Math.round(Math.min(W, H) * 0.026))
  c.save()
  c.font = `600 ${fs}px "Public Sans", system-ui, sans-serif`
  const tw = c.measureText(text).width
  const padX = fs * 0.75
  const padY = fs * 0.55
  const icon = fs * 1.1
  const gap = fs * 0.45
  const bw = padX * 2 + icon + gap + tw
  const bh = Math.max(icon, fs) + padY * 2
  const x = W - bw - fs
  const y = H - bh - fs
  c.fillStyle = 'rgba(19,27,46,0.74)'
  roundRectPath(c, x, y, bw, bh, bh / 2)
  c.fill()
  const cx = x + padX + icon / 2
  const cy = y + bh / 2
  c.fillStyle = '#34d399'
  c.beginPath()
  c.arc(cx, cy, icon / 2, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = '#0b1c30'
  c.lineWidth = Math.max(1.2, fs * 0.15)
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.beginPath()
  c.moveTo(cx - icon * 0.22, cy + icon * 0.02)
  c.lineTo(cx - icon * 0.06, cy + icon * 0.18)
  c.lineTo(cx + icon * 0.24, cy - icon * 0.16)
  c.stroke()
  c.fillStyle = '#ffffff'
  c.textBaseline = 'middle'
  c.fillText(text, x + padX + icon + gap, cy + fs * 0.05)
  c.restore()
}

/* ------------------------------------------------------------------ main entry */

/**
 * Render a protected copy of a photo: every target is covered in the chosen style.
 * Returns a canvas at full resolution (or `opts.maxSide`), ready for preview or `canvasToJpeg`.
 */
export function renderBlurred(
  img: Drawable,
  faces: BlurInput[],
  style: BlurStyle = 'soft',
  strength: number = STRENGTH.default,
  opts: RenderOptions = {},
): HTMLCanvasElement {
  const base = baseCanvas(img, opts.maxSide)
  const W = base.width
  const H = base.height
  const out = opts.canvas ?? makeCanvas(W, H)
  if (out.width !== W) out.width = W
  if (out.height !== H) out.height = H
  const c = out.getContext('2d')!
  c.save()
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
  c.clearRect(0, 0, W, H)
  c.drawImage(base, 0, 0)
  const s = clamp(strength, STRENGTH.min, STRENGTH.max)
  for (const f of faces.map(toTarget)) {
    const shape = f.shape ?? 'face'
    const r = regionFor(f, W, H)
    if (r.w < 1 || r.h < 1) continue
    // size effects from the face itself (not the padded region), so small faces in group shots are covered as firmly
    const ref = shape === 'face' ? Math.min(f.box[2] * W, f.box[3] * H * 1.2) : Math.min(r.w, r.h)
    if (style === 'soft') softRegion(c, base, r, clamp(ref * (0.04 + 0.014 * s), 4, 120), shape)
    else if (style === 'pixel') pixelRegion(c, base, r, Math.max(2, ref / (15 - s)), shape)
    else if (style === 'sticker') stickerRegion(c, r)
    else solidRegion(c, r, shape)
  }
  if (opts.watermark) drawWatermark(c, opts.watermark, W, H)
  c.restore()
  return out
}

/* ------------------------------------------------------------------ export helpers */

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the JPEG'))), 'image/jpeg', quality),
  )
}

export async function blobBytes(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await b.arrayBuffer())
}

/** The original file bytes, untouched (works for /media/... and data: URLs). */
export async function fetchBytes(src: string): Promise<Uint8Array> {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`Could not read ${src} (${res.status})`)
  return new Uint8Array(await res.arrayBuffer())
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** "annual-day-03" from "/media/events/annual-day/annual-day-03.jpg"; falls back to the asset id for data: URLs. */
export function fileStem(src: string, fallback: string) {
  if (src.startsWith('data:') || src.startsWith('blob:')) return fallback
  const name = src.split('?')[0].split('/').pop() ?? fallback
  return name.replace(/\.[a-z0-9]+$/i, '') || fallback
}

export function fileExt(src: string) {
  const m = /^data:image\/(\w+)/.exec(src)
  if (m) return m[1] === 'jpeg' ? 'jpg' : m[1]
  const e = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(src)
  return e ? e[1].toLowerCase() : 'jpg'
}
