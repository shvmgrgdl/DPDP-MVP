import type { EngineCtx } from '@/engine/permission'
import { getPermission } from '@/engine/permission'
import type { MediaAsset } from '@/data/types'

/** Faces to blur in a child's private gallery: any classmate whose family hasn't granted the private-gallery purpose (or an unmatched face). Never blurs the active child's own face. */
export function galleryBlurIds(ctx: EngineCtx, asset: MediaAsset, activeStudentId: string): Set<string> {
  const ids = new Set<string>()
  for (const f of asset.faces) {
    if (!f.studentId || f.studentId === activeStudentId) continue
    const p = getPermission(ctx, f.studentId, 'private-gallery')
    if (p?.status !== 'granted') ids.add(f.id)
  }
  return ids
}

/** Draws the asset onto a canvas, blurs the given faces, stamps a watermark, and triggers a download. */
export async function downloadWatermarkedPhoto(asset: MediaAsset, blurIds: Set<string>, watermark: string) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = asset.src
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('image failed to load'))
  })
  const canvas = document.createElement('canvas')
  canvas.width = asset.w
  canvas.height = asset.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(img, 0, 0, asset.w, asset.h)

  for (const f of asset.faces) {
    if (!blurIds.has(f.id)) continue
    const [x, y, w, h] = f.box
    const pad = 0.35
    const sx = (x - w * pad) * asset.w
    const sy = (y - h * pad) * asset.h
    const sw = w * (1 + pad * 2) * asset.w
    const sh = h * (1 + pad * 2) * asset.h
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 1.9, sh / 1.9, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.filter = 'blur(18px)'
    ctx.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh)
    ctx.restore()
  }
  ctx.filter = 'none'

  const fontSize = Math.max(14, Math.round(asset.w * 0.03))
  ctx.font = `600 ${fontSize}px "Public Sans", sans-serif`
  const pad = asset.w * 0.025
  ctx.textBaseline = 'bottom'
  ctx.lineWidth = Math.max(2, asset.w * 0.0035)
  ctx.strokeStyle = 'rgba(11,28,48,0.55)'
  ctx.strokeText(watermark, pad, asset.h - pad)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(watermark, pad, asset.h - pad)

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${asset.id}-private.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
      }
      resolve()
    }, 'image/png')
  })
}
