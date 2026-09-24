import type { Box } from '@/data/types'
import type { BlurStyle } from '@/design/media'

export type FaceTone = 'ok' | 'blocked' | 'unknown'

export interface DrawFace {
  id: string
  box: Box
  blur: boolean
  tone: FaceTone
  label: string
  selected: boolean
}

export interface RenderParams {
  facesAt: (t: number) => DrawFace[]
  style: BlurStyle
  outlines: boolean
  /** Split compare: left of this fraction shows the original. null = off. */
  compare: number | null
  /** While exporting, the frame is always fully protected. */
  exporting: boolean
}

/** Canvas filters (ctx.filter) are missing in older Safari; there the downsampled base alone does the blurring. */
const FILTER_OK = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype

let patchCv: HTMLCanvasElement | null = null
let tinyCv: HTMLCanvasElement | null = null
function scratch(which: 'patch' | 'tiny', w: number, h: number) {
  let c = which === 'patch' ? patchCv : tinyCv
  if (!c) {
    c = document.createElement('canvas')
    if (which === 'patch') patchCv = c
    else tinyCv = c
  }
  if (c.width < w || c.height < h) {
    c.width = Math.max(c.width, Math.ceil(w))
    c.height = Math.max(c.height, Math.ceil(h))
  }
  return c.getContext('2d')!
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Blur region around a detector box: wider for ears and taller for hair, so tracking jitter never exposes an edge. */
export function region(box: Box, W: number, H: number) {
  const [x, y, w, h] = box
  return {
    cx: (x + w / 2) * W,
    cy: (y + h / 2 - h * 0.05) * H,
    rx: Math.max(4, w * W * 0.5 * 1.38),
    ry: Math.max(4, h * H * 0.5 * 1.52),
  }
}

/** Draw one protected video frame: the full picture, then every face to hide, changed in the pixels. */
export function drawProtectedFrame(ctx: CanvasRenderingContext2D, src: CanvasImageSource, W: number, H: number, faces: DrawFace[], style: BlurStyle, compare: number | null) {
  ctx.globalCompositeOperation = 'source-over'
  ctx.filter = 'none'
  ctx.drawImage(src, 0, 0, W, H)
  for (const f of faces) if (f.blur) hideFace(ctx, f.box, W, H, style)
  if (compare !== null && compare > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, compare * W, H)
    ctx.clip()
    ctx.drawImage(src, 0, 0, W, H)
    ctx.restore()
  }
}

export function hideFace(ctx: CanvasRenderingContext2D, box: Box, W: number, H: number, style: BlurStyle) {
  if (style === 'pixel') return pixelate(ctx, box, W, H)
  if (style === 'sticker') return sticker(ctx, box, W, H)
  if (style === 'solid') return solid(ctx, box, W, H)
  return softBlur(ctx, box, W, H)
}

function softBlur(ctx: CanvasRenderingContext2D, box: Box, W: number, H: number) {
  const r = region(box, W, H)
  const radius = clamp(r.rx * 0.42, 6, 64)
  const m = radius * 2
  const sx = Math.max(0, Math.floor(r.cx - r.rx - m))
  const sy = Math.max(0, Math.floor(r.cy - r.ry - m))
  const ex = Math.min(W, Math.ceil(r.cx + r.rx + m))
  const ey = Math.min(H, Math.ceil(r.cy + r.ry + m))
  const sw = ex - sx
  const sh = ey - sy
  if (sw < 2 || sh < 2) return
  const p = scratch('patch', sw, sh)
  p.globalCompositeOperation = 'source-over'
  p.filter = 'none'
  p.clearRect(0, 0, p.canvas.width, p.canvas.height)
  // 1. Opaque base: the region squeezed to a few pixels and stretched back. Nothing sharp survives this,
  //    and it backs the filter layer where the blur fades out at the frame edge.
  const tw = clamp(Math.round(sw / (radius * 0.9)), 2, 32)
  const th = clamp(Math.round(sh / (radius * 0.9)), 2, 32)
  const t = scratch('tiny', tw, th)
  t.imageSmoothingEnabled = true
  t.imageSmoothingQuality = 'high'
  t.clearRect(0, 0, t.canvas.width, t.canvas.height)
  t.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, tw, th)
  p.imageSmoothingEnabled = true
  p.imageSmoothingQuality = 'high'
  p.drawImage(t.canvas, 0, 0, tw, th, 0, 0, sw, sh)
  // 2. A real Gaussian blur of the region on top.
  if (FILTER_OK) {
    p.filter = `blur(${radius.toFixed(1)}px)`
    p.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh)
    p.filter = 'none'
  }
  // 3. Keep only a soft-edged ellipse around the face.
  p.globalCompositeOperation = 'destination-in'
  p.save()
  p.translate(r.cx - sx, r.cy - sy)
  p.scale(1, r.ry / r.rx)
  const g = p.createRadialGradient(0, 0, 0, 0, 0, r.rx)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.8, 'rgba(0,0,0,1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  p.fillStyle = g
  // cover the whole scratch canvas: beyond the ellipse the gradient is transparent, so everything outside is cleared
  p.fillRect(-1e5, -1e5, 2e5, 2e5)
  p.restore()
  p.globalCompositeOperation = 'source-over'
  ctx.drawImage(p.canvas, 0, 0, sw, sh, sx, sy, sw, sh)
}

function pixelate(ctx: CanvasRenderingContext2D, box: Box, W: number, H: number) {
  const r = region(box, W, H)
  const x = Math.max(0, Math.floor(r.cx - r.rx))
  const y = Math.max(0, Math.floor(r.cy - r.ry))
  const w = Math.min(W, Math.ceil(r.cx + r.rx)) - x
  const h = Math.min(H, Math.ceil(r.cy + r.ry)) - y
  if (w < 2 || h < 2) return
  const block = Math.max(6, (box[2] * W) / 6)
  const tw = Math.max(2, Math.round(w / block))
  const th = Math.max(2, Math.round(h / block))
  const t = scratch('tiny', tw, th)
  t.imageSmoothingEnabled = true
  t.clearRect(0, 0, t.canvas.width, t.canvas.height)
  t.drawImage(ctx.canvas, x, y, w, h, 0, 0, tw, th)
  ctx.save()
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.2)
  ctx.clip()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(t.canvas, 0, 0, tw, th, x, y, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.restore()
}

function sticker(ctx: CanvasRenderingContext2D, box: Box, W: number, H: number) {
  const r = region(box, W, H)
  const R = Math.max(r.rx, r.ry) * 0.92
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = R * 0.25
  ctx.shadowOffsetY = R * 0.06
  ctx.fillStyle = '#fcd34d'
  ctx.beginPath()
  ctx.arc(r.cx, r.cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = '#8a5300'
  ctx.beginPath()
  const outer = R * 0.56
  const inner = outer * 0.45
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rad = i % 2 === 0 ? outer : inner
    const px = r.cx + Math.cos(a) * rad
    const py = r.cy + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function solid(ctx: CanvasRenderingContext2D, box: Box, W: number, H: number) {
  const r = region(box, W, H)
  ctx.save()
  ctx.fillStyle = '#2b3445'
  ctx.beginPath()
  ctx.ellipse(r.cx, r.cy, r.rx * 0.94, r.ry * 0.94, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, rad)
  else ctx.rect(x, y, w, h)
}

const STROKE: Record<FaceTone | 'blur', string> = { ok: '#34d399', blocked: '#fb923c', unknown: '#93c5fd', blur: '#fb923c' }
const TEXT: Record<FaceTone | 'blur', string> = { ok: '#0e6b4b', blocked: '#8a5300', unknown: '#1d4ed8', blur: '#8a5300' }

/** Soft rounded outlines with first names, drawn on a separate layer that is never exported. */
export function drawOverlay(o: CanvasRenderingContext2D, W: number, H: number, faces: DrawFace[], show: boolean) {
  o.clearRect(0, 0, W, H)
  if (!show) return
  const lw = Math.max(2, W / 420)
  const fs = Math.max(12, Math.round(W / 85))
  for (const f of faces) {
    const r = region(f.box, W, H)
    const key = f.blur ? 'blur' : f.tone
    o.save()
    o.lineWidth = f.selected ? lw * 1.9 : lw
    o.strokeStyle = f.selected ? '#ffffff' : STROKE[key]
    o.shadowColor = 'rgba(0,0,0,0.35)'
    o.shadowBlur = lw * 3
    o.beginPath()
    o.ellipse(r.cx, r.cy, r.rx * 0.9, r.ry * 0.9, 0, 0, Math.PI * 2)
    o.stroke()
    o.font = `600 ${fs}px "Public Sans", system-ui, sans-serif`
    const tw = o.measureText(f.label).width
    const px = fs * 0.65
    const ph = fs * 1.7
    const lx = clamp(r.cx - tw / 2 - px, 2, W - tw - px * 2 - 2)
    const ly = clamp(r.cy + r.ry * 0.9 + fs * 0.45, 2, H - ph - 2)
    o.shadowBlur = 8
    o.fillStyle = 'rgba(255,255,255,0.96)'
    o.beginPath()
    roundRect(o, lx, ly, tw + px * 2, ph, ph / 2)
    o.fill()
    o.shadowColor = 'transparent'
    o.fillStyle = TEXT[key]
    o.textBaseline = 'middle'
    o.fillText(f.label, lx + px, ly + ph / 2 + 0.5)
    o.restore()
  }
}
