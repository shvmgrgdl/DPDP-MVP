// Re-runnable media annotator for School DPDP OS.
//
// Usage:  node scripts/annotate.mjs        (dev server must be running: npm run dev)
// Env:    SKIP_VIDEO=1   skip video transcode/tracking (fast photo-only iteration)
//         LIMIT=N        only process the first N photos (debugging)
//
// Regenerates:
//   src/data/media-manifest.json        (photo + video manifest consumed by src/data/seed)
//   public/media/descriptors.json       (personId -> mean 128-d face descriptor)
//   public/media/video/index.json       (same videos array as the manifest)
//   public/media/upload-samples/**      (4 held-back demo photos + index.json)
//   public/media/video/*.webm           (transcoded clips)
//   public/models/face-api/age_gender_model*  (copied in from node_modules once)
// and bumps DATA_VERSION by one line in src/data/seed/index.ts.
//
// Re-running is safe: it re-reads public/media/events/** from scratch, reuses whatever
// is already in public/media/upload-samples/ instead of picking a new hold-back set,
// and always re-derives person clustering / manifest / descriptors from what's on disk.

import { createRequire } from 'node:module'
import { execSync, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(execSync('npm root -g').toString().trim() + '/')
const { chromium } = require('playwright')

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const BASE = process.env.BASE ?? 'http://localhost:5173'
const SKIP_VIDEO = process.env.SKIP_VIDEO === '1'
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity

const EVENTS_DIR = path.join(ROOT, 'public/media/events')
const SAMPLES_DIR = path.join(ROOT, 'public/media/upload-samples')
const VIDEO_DIR = path.join(ROOT, 'public/media/video')
const MODELS_DIR = path.join(ROOT, 'public/models/face-api')
const MANIFEST_PATH = path.join(ROOT, 'src/data/media-manifest.json')
const DESCRIPTORS_PATH = path.join(ROOT, 'public/media/descriptors.json')
const VIDEO_INDEX_PATH = path.join(ROOT, 'public/media/video/index.json')
const SEED_INDEX_PATH = path.join(ROOT, 'src/data/seed/index.ts')

const MIN_FACE_WIDTH_FRAC = 0.022 // faces narrower than this (fraction of image width) are dropped
// age >= this => adult. Raised from the naive 19: face-api's age model runs consistently high on
// this dataset's children in stage makeup/costume (visually-confirmed kids scored 21-24.9 in
// annual-day dance photos) and even in plain uniforms under motion blur (a confirmed all-children
// group photo scored up to 33.4). 25 clears every visually-verified child in the sampled photos
// while still catching a clearly-adult face; there's no clean threshold that catches every motion
// outlier without also swallowing genuine adults, so this is the practical balance.
const ADULT_AGE = 25
const MAIN_AREA_RATIO = 1.6 // largest face must be >= this x the runner-up to be "main"
const CLUSTER_DIST = 0.5 // euclidean descriptor distance for "same person" (face-api same-person is typically < 0.55)
const HOLD_BACK_COUNT = 4
const TRACK_IOU = 0.3
const TRACK_DIST = 0.5
const MIN_TRACK_SEC = 1.0
const FRAME_FPS = 5
const MAX_TRACK_GAP_FRAMES = 2 // allow a couple of missed frames before closing a track

const EVENT_LABELS = { 'annual-day': 'Annual Day', 'sports-day': 'Sports Day', 'science-fair': 'Science Fair', classroom: 'Classroom' }
const KNOWN_EVENTS = Object.keys(EVENT_LABELS)
const TITLE_POOL = {
  'annual-day': [
    'stage dance', 'opening ceremony', 'prize distribution', 'choir performance', 'backstage moment',
    'felicitation', 'drama act', 'guest address', 'closing bow', 'audience view', 'welcome song',
    'ribbon cutting', 'trophy moment', 'group photo', 'curtain call', 'encore',
  ],
  'sports-day': ['relay race', 'tug of war', 'kabaddi match', 'long jump', 'march past', 'medal ceremony', 'cheering squad', 'obstacle race', 'victory lap'],
  'science-fair': ['volcano model', 'robotics demo', 'poster presentation', 'judges round', 'circuit project', 'chemistry booth', 'award moment'],
  classroom: ['group activity', 'art class', 'reading corner', 'science lab', 'library time', 'morning assembly', 'craft session', 'quiz time', 'storytelling'],
}
// Coordinator-confirmed mapping for the three source clips (kabaddi -> sports-day, playground -> classroom, assembly -> annual-day).
const VIDEO_EVENT_MAP = { 'sports-day-kabaddi': 'sports-day', 'playground-running': 'classroom', 'school-ceremony-assembly': 'annual-day' }
const VIDEO_TITLES = {
  'sports-day-kabaddi': 'Sports Day · kabaddi match',
  'playground-running': 'Classroom · playground dash',
  'school-ceremony-assembly': 'Annual Day · opening ceremony',
}

const round4 = (n) => Math.round((n + Number.EPSILON) * 1e4) / 1e4
const titleCase = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
const labelFor = (event) => EVENT_LABELS[event] ?? titleCase(event)
function titleFor(event, idxInEvent) {
  const pool = TITLE_POOL[event]
  const label = labelFor(event)
  if (pool && pool.length) return `${label} · ${pool[idxInEvent % pool.length]}`
  return `${label} · moment ${idxInEvent + 1}`
}
function guessVideoEvent(id) {
  return KNOWN_EVENTS.find((e) => id.includes(e)) ?? 'annual-day'
}

function euclid(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d }
  return Math.sqrt(s)
}
function meanVec(vecs) {
  const out = new Array(vecs[0].length).fill(0)
  for (const v of vecs) for (let i = 0; i < v.length; i++) out[i] += v[i]
  return out.map((v) => v / vecs.length)
}
function iouBox(a, b) {
  const ax2 = a[0] + a[2], ay2 = a[1] + a[3], bx2 = b[0] + b[2], by2 = b[1] + b[3]
  const ix1 = Math.max(a[0], b[0]), iy1 = Math.max(a[1], b[1])
  const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2)
  const iw = Math.max(0, ix2 - ix1), ih = Math.max(0, iy2 - iy1)
  const inter = iw * ih
  const union = a[2] * a[3] + b[2] * b[3] - inter
  return union <= 0 ? 0 : inter / union
}

// ---------------------------------------------------------------------------
// ffmpeg resolution (no system ffmpeg here; imageio-ffmpeg first, ffmpeg-static fallback)
// ---------------------------------------------------------------------------
function resolveFfmpeg() {
  const probe = () => {
    try {
      const out = execSync(`python3 -c "import imageio_ffmpeg,sys; sys.stdout.write(imageio_ffmpeg.get_ffmpeg_exe())"`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
      if (out && fs.existsSync(out)) return out
    } catch {}
    return null
  }
  let bin = probe()
  if (bin) return bin
  console.log('imageio-ffmpeg not found, installing via pip...')
  try {
    execSync('pip install --user --quiet imageio-ffmpeg', { stdio: 'inherit' })
    bin = probe()
    if (bin) return bin
  } catch (e) {
    console.warn('pip install imageio-ffmpeg failed:', e.message)
  }
  console.log('Falling back to npx ffmpeg-static (not added to package.json)...')
  try {
    const out = execSync(`npx --yes -p ffmpeg-static node -e "process.stdout.write(require('ffmpeg-static'))"`, { cwd: ROOT }).toString().trim()
    if (out && fs.existsSync(out)) return out
  } catch (e) {
    console.warn('ffmpeg-static fallback failed:', e.message)
  }
  throw new Error('No ffmpeg binary available (tried imageio-ffmpeg and ffmpeg-static).')
}

function probeVideo(ffmpeg, file) {
  let stderr = ''
  try {
    execFileSync(ffmpeg, ['-i', file], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  } catch (e) {
    stderr = e.stderr || ''
  }
  const durM = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
  const resM = stderr.match(/Video:.*?(\d{2,5})x(\d{2,5})/)
  return {
    duration: durM ? Number(durM[1]) * 3600 + Number(durM[2]) * 60 + Number(durM[3]) : null,
    width: resM ? Number(resM[1]) : null,
    height: resM ? Number(resM[2]) : null,
    hasAudio: /Stream #0:\d+.*Audio:/.test(stderr),
  }
}

function transcodeToWebm(ffmpeg, srcPath, destPath) {
  const audio = probeVideo(ffmpeg, srcPath).hasAudio
  const build = (vArgs) => [
    '-y', '-i', srcPath, '-t', '20',
    '-vf', 'scale=-2:720', '-r', '30',
    '-c:v', 'libvpx-vp9', ...vArgs, '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
    ...(audio ? ['-c:a', 'libopus', '-b:a', '48k'] : ['-an']),
    destPath,
  ]
  execFileSync(ffmpeg, build(['-crf', '32', '-b:v', '0']), { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  let size = fs.statSync(destPath).size
  const budget = 12 * 1024 * 1024
  if (size > budget) {
    const probe = probeVideo(ffmpeg, destPath)
    const dur = Math.min(probe.duration ?? 20, 20)
    const vBitrate = Math.max(300_000, Math.floor((budget * 8 * 0.9) / dur))
    execFileSync(ffmpeg, build(['-b:v', String(vBitrate)]), { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
    size = fs.statSync(destPath).size
  }
  return size
}

function extractFrames(ffmpeg, webmPath, outDir, fps) {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  execFileSync(ffmpeg, ['-y', '-i', webmPath, '-vf', `fps=${fps}`, '-q:v', '3', path.join(outDir, 'frame-%04d.jpg')], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  return fs.readdirSync(outDir).filter((f) => /\.jpg$/i.test(f)).sort().map((f) => path.join(outDir, f))
}

function toDataUrl(filePath) {
  return `data:image/jpeg;base64,${fs.readFileSync(filePath).toString('base64')}`
}

// ---------------------------------------------------------------------------
// Filesystem discovery
// ---------------------------------------------------------------------------
function eventFromFilename(file) {
  return file.replace(/\.(jpe?g)$/i, '').replace(/-\d+$/, '')
}

function listEventPhotos() {
  const out = []
  if (!fs.existsSync(EVENTS_DIR)) return out
  for (const event of fs.readdirSync(EVENTS_DIR)) {
    const dir = path.join(EVENTS_DIR, event)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const file of fs.readdirSync(dir)) {
      if (!/\.(jpe?g)$/i.test(file)) continue
      out.push({
        file, event, origin: 'event',
        id: path.basename(file, path.extname(file)),
        abs: path.join(dir, file),
        url: `${BASE}/media/events/${event}/${file}`,
      })
    }
  }
  return out.sort((a, b) => (a.event + a.file).localeCompare(b.event + b.file))
}

function listHeldBackPhotos() {
  if (!fs.existsSync(SAMPLES_DIR)) return []
  return fs.readdirSync(SAMPLES_DIR)
    .filter((f) => /\.(jpe?g)$/i.test(f))
    .sort()
    .map((file) => ({
      file, event: eventFromFilename(file), origin: 'held-back',
      id: path.basename(file, path.extname(file)),
      abs: path.join(SAMPLES_DIR, file),
      url: `${BASE}/media/upload-samples/${file}`,
    }))
}

function ensureAgeGenderModel() {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
  const srcDir = path.join(ROOT, 'node_modules/@vladmandic/face-api/model')
  const files = fs.readdirSync(srcDir).filter((f) => f.startsWith('age_gender_model'))
  for (const f of files) fs.copyFileSync(path.join(srcDir, f), path.join(MODELS_DIR, f))
  return files
}

// ---------------------------------------------------------------------------
// In-page detection
// ---------------------------------------------------------------------------
async function loadModels(page) {
  const backend = await page.evaluate(async (modelUrl) => {
    const tf = window.faceapi.tf
    let backend = 'webgl'
    try {
      await tf.setBackend('webgl')
      await tf.ready()
    } catch {
      backend = 'cpu'
      await tf.setBackend('cpu')
      await tf.ready()
    }
    await Promise.all([
      window.faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
      window.faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      window.faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
      window.faceapi.nets.ageGenderNet.loadFromUri(modelUrl),
    ])
    return backend
  }, `${BASE}/models/face-api/`)
  console.log('  tfjs backend:', backend)
}

async function detectOnSrc(page, src) {
  return page.evaluate(async (imgSrc) => {
    const img = await new Promise((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('image load failed'))
      im.src = imgSrc
    })
    const opts = new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
    const dets = await window.faceapi.detectAllFaces(img, opts).withFaceLandmarks().withFaceDescriptors().withAgeAndGender()
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      faces: dets.map((d) => ({
        x: d.detection.box.x, y: d.detection.box.y, w: d.detection.box.width, h: d.detection.box.height,
        score: d.detection.score, age: d.age, gender: d.gender,
        descriptor: Array.from(d.descriptor),
      })),
    }
  }, src)
}

function markMain(faces) {
  if (!faces.length) return
  if (faces.length === 1) { faces[0].main = true; return }
  const areas = faces.map((f) => f.w * f.h)
  let maxI = 0
  areas.forEach((a, i) => { if (a > areas[maxI]) maxI = i })
  const sortedDesc = [...areas].sort((a, b) => b - a)
  if (sortedDesc[0] >= MAIN_AREA_RATIO * sortedDesc[1]) faces[maxI].main = true
}

// ---------------------------------------------------------------------------
// Clustering (photos) + tracking (video)
// ---------------------------------------------------------------------------
function clusterChildFaces(entries, threshold) {
  const clusters = []
  for (const entry of entries) {
    for (const f of entry.faces) {
      if (f.adult) continue
      let best = -1, bestDist = Infinity
      for (let ci = 0; ci < clusters.length; ci++) {
        const c = clusters[ci]
        const centroid = c.sum.map((v) => v / c.count)
        const d = euclid(centroid, f.descriptor)
        if (d < bestDist) { bestDist = d; best = ci }
      }
      if (best !== -1 && bestDist < threshold) {
        const c = clusters[best]
        c.sum = c.sum.map((v, i) => v + f.descriptor[i])
        c.count++
        f.clusterIdx = best
      } else {
        clusters.push({ sum: [...f.descriptor], count: 1 })
        f.clusterIdx = clusters.length - 1
      }
    }
  }
  return clusters
}

function rankAndAssignPersonIds(entries, clusters) {
  const order = clusters.map((_, i) => i).sort((a, b) => clusters[b].count - clusters[a].count || a - b)
  const personIdOf = new Array(clusters.length)
  order.forEach((ci, rank) => { personIdOf[ci] = `p${String(rank + 1).padStart(3, '0')}` })
  for (const entry of entries) for (const f of entry.faces) f.person = f.adult ? null : personIdOf[f.clusterIdx]
  return personIdOf
}

// Prefers photos whose faces belong to the highest-frequency clusters (the strongest
// recurring-children series), while guaranteeing every reserved cluster keeps >=1
// occurrence outside the hold-back set so live-upload matching always has something to match against.
function selectHoldBack(entries, clusters, count) {
  const candidates = entries.filter((e) => e.origin === 'event')
  const reserved = new Map()
  const remaining = (ci) => clusters[ci].count - (reserved.get(ci) ?? 0)
  const bestFreq = (e) => {
    let best = 0
    for (const f of e.faces) if (!f.adult && remaining(f.clusterIdx) >= 2) best = Math.max(best, clusters[f.clusterIdx].count)
    return best
  }
  const chosen = []
  const chosenEvents = new Set()
  while (chosen.length < count) {
    const pool = candidates.filter((e) => !chosen.includes(e) && bestFreq(e) >= 2)
    if (!pool.length) break
    pool.sort((a, b) => {
      const fa = bestFreq(a), fb = bestFreq(b)
      if (fa !== fb) return fb - fa // highest recurring frequency first
      const ea = chosenEvents.has(a.event) ? 1 : 0, eb = chosenEvents.has(b.event) ? 1 : 0
      if (ea !== eb) return ea - eb // then prefer spreading across events
      return (a.event + a.file).localeCompare(b.event + b.file) // deterministic tie-break
    })
    const pick = pool[0]
    chosen.push(pick)
    chosenEvents.add(pick.event)
    const seen = new Set()
    for (const f of pick.faces) if (!f.adult) seen.add(f.clusterIdx)
    for (const ci of seen) reserved.set(ci, (reserved.get(ci) ?? 0) + 1)
  }
  return chosen
}

function trackFrames(frameDetections, iouThresh, distThresh, fps, maxGapFrames) {
  const active = []
  const finished = []
  frameDetections.forEach((dets, fi) => {
    const t = fi / fps
    const usedDet = new Set(), usedActive = new Set()
    const candidates = []
    active.forEach((tr, ai) => {
      if (fi - tr.lastFrame > maxGapFrames) return
      dets.forEach((d, di) => {
        const iou = iouBox(tr.lastBox, [d.x, d.y, d.w, d.h])
        if (iou < iouThresh) return
        if (euclid(tr.lastDescriptor, d.descriptor) >= distThresh) return
        candidates.push({ ai, di, iou })
      })
    })
    candidates.sort((a, b) => b.iou - a.iou)
    for (const c of candidates) {
      if (usedActive.has(c.ai) || usedDet.has(c.di)) continue
      usedActive.add(c.ai); usedDet.add(c.di)
      const tr = active[c.ai], d = dets[c.di]
      tr.lastFrame = fi
      tr.lastBox = [d.x, d.y, d.w, d.h]
      tr.lastDescriptor = d.descriptor
      tr.frames.push([t, d.x, d.y, d.w, d.h])
      tr.descriptors.push(d.descriptor)
    }
    dets.forEach((d, di) => {
      if (usedDet.has(di)) return
      active.push({ lastFrame: fi, lastBox: [d.x, d.y, d.w, d.h], lastDescriptor: d.descriptor, frames: [[t, d.x, d.y, d.w, d.h]], descriptors: [d.descriptor] })
    })
    for (let ai = active.length - 1; ai >= 0; ai--) {
      if (fi - active[ai].lastFrame > maxGapFrames) finished.push(active.splice(ai, 1)[0])
    }
  })
  finished.push(...active)
  return finished
}

async function renderDebugImage(page, items, outPath) {
  const dataUrl = await page.evaluate(async (items) => {
    const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src })
    const imgs = await Promise.all(items.map((it) => loadImg(it.src)))
    const targetW = 640
    const scales = imgs.map((im) => targetW / im.naturalWidth)
    const heights = imgs.map((im, i) => im.naturalHeight * scales[i])
    const gap = 12
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = Math.round(heights.reduce((s, h) => s + h, 0) + gap * (imgs.length - 1))
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    let y = 0
    items.forEach((it, i) => {
      const im = imgs[i]
      const dw = targetW, dh = heights[i]
      ctx.drawImage(im, 0, y, dw, dh)
      for (const f of it.faces) {
        const [bx, by, bw, bh] = f.box
        const rx = bx * dw, ry = y + by * dh, rw = bw * dw, rh = bh * dh
        ctx.strokeStyle = f.adult ? '#38bdf8' : f.main ? '#22c55e' : '#f43f5e'
        ctx.lineWidth = 2
        ctx.strokeRect(rx, ry, rw, rh)
        ctx.font = '11px sans-serif'
        ctx.fillStyle = ctx.strokeStyle
        ctx.fillText(`${f.person ?? 'adult'}${f.main ? ' *' : ''}`, rx + 2, ry > y + 10 ? ry - 3 : ry + rh + 12)
      }
      y += dh + gap
    })
    return canvas.toDataURL('image/png')
  }, items)
  fs.writeFileSync(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'))
  return outPath
}

function bumpDataVersion() {
  const src = fs.readFileSync(SEED_INDEX_PATH, 'utf8')
  const m = src.match(/export const DATA_VERSION = (\d+)/)
  if (!m) throw new Error('DATA_VERSION line not found in ' + SEED_INDEX_PATH)
  const next = Number(m[1]) + 1
  fs.writeFileSync(SEED_INDEX_PATH, src.replace(/export const DATA_VERSION = \d+/, `export const DATA_VERSION = ${next}`))
  return next
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  try {
    const res = await fetch(BASE + '/')
    if (!res.ok) throw new Error(`status ${res.status}`)
  } catch (e) {
    console.error(`Dev server not reachable at ${BASE}. Start it with \`npm run dev\`. (${e.message})`)
    process.exit(1)
  }

  console.log('Copying age_gender model into', MODELS_DIR)
  ensureAgeGenderModel()

  const ffmpeg = SKIP_VIDEO ? null : resolveFfmpeg()
  if (ffmpeg) console.log('Using ffmpeg at', ffmpeg)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (e) => console.error('[page error]', e.message))

  try {
    // Anchor on a real static file (served as-is by Vite) rather than the app's index page:
    // the app route loads the Vite/React HMR client, which can force an unrelated full-page
    // reload mid-run (dependency re-optimization, src/ edits from other agents) and kill a
    // long detection pass. A static asset under public/ bypasses the SPA/HMR pipeline entirely.
    await page.goto(`${BASE}/models/face-api/ssd_mobilenetv1_model-weights_manifest.json`, { waitUntil: 'domcontentloaded' })
    await page.addScriptTag({ path: path.join(ROOT, 'node_modules/@vladmandic/face-api/dist/face-api.js') })
    console.log('Loading face-api models...')
    await loadModels(page)

    // ---------------- Photos ----------------
    const eventPhotos = listEventPhotos()
    const heldBackPhotos = listHeldBackPhotos()
    let allPhotoEntries = [...eventPhotos, ...heldBackPhotos]
    if (Number.isFinite(LIMIT)) allPhotoEntries = allPhotoEntries.slice(0, LIMIT)

    console.log(`Detecting faces in ${allPhotoEntries.length} photos (${eventPhotos.length} in events/, ${heldBackPhotos.length} already held back)...`)
    for (const [idx, entry] of allPhotoEntries.entries()) {
      try {
        const det = await detectOnSrc(page, entry.url)
        const kept = det.faces.filter((f) => f.w / det.width >= MIN_FACE_WIDTH_FRAC)
        kept.forEach((f) => { f.adult = f.age >= ADULT_AGE })
        markMain(kept)
        entry.w = det.width; entry.h = det.height; entry.faces = kept
        console.log(`  [${idx + 1}/${allPhotoEntries.length}] ${entry.file}: ${kept.length}/${det.faces.length} kept faces`)
      } catch (e) {
        console.warn(`  ! ${entry.file} failed: ${e.message}`)
        entry.w = 0; entry.h = 0; entry.faces = []
      }
    }

    console.log('Clustering child faces across all photos...')
    const clusters = clusterChildFaces(allPhotoEntries, CLUSTER_DIST)
    rankAndAssignPersonIds(allPhotoEntries, clusters)
    console.log(`  ${clusters.length} person cluster(s) from ${clusters.reduce((s, c) => s + c.count, 0)} child faces`)

    const existingHeldBackFiles = new Set(heldBackPhotos.map((p) => p.file))
    let heldBackEntries
    if (existingHeldBackFiles.size > 0) {
      heldBackEntries = allPhotoEntries.filter((e) => existingHeldBackFiles.has(e.file))
      console.log(`Reusing ${heldBackEntries.length} existing hold-back photo(s): ${[...existingHeldBackFiles].join(', ')}`)
    } else {
      heldBackEntries = selectHoldBack(allPhotoEntries, clusters, HOLD_BACK_COUNT)
      console.log(`Selected ${heldBackEntries.length} new hold-back photo(s): ${heldBackEntries.map((e) => e.file).join(', ')}`)
    }
    const holdBackFiles = new Set(heldBackEntries.map((e) => e.file))

    fs.mkdirSync(SAMPLES_DIR, { recursive: true })
    for (const e of allPhotoEntries) {
      if (holdBackFiles.has(e.file) && e.origin === 'event') {
        const dest = path.join(SAMPLES_DIR, e.file)
        fs.copyFileSync(e.abs, dest)
        fs.unlinkSync(e.abs)
        e.origin = 'held-back'; e.abs = dest; e.url = `${BASE}/media/upload-samples/${e.file}`
      }
    }
    fs.writeFileSync(path.join(SAMPLES_DIR, 'index.json'), JSON.stringify([...holdBackFiles].sort().map((f) => `/media/upload-samples/${f}`)) + '\n')

    const manifestPhotoEntries = allPhotoEntries.filter((e) => !holdBackFiles.has(e.file)).sort((a, b) => (a.event + a.id).localeCompare(b.event + b.id))
    const perEventIdx = new Map()
    const manifestAssets = manifestPhotoEntries.map((e) => {
      const idx = perEventIdx.get(e.event) ?? 0
      perEventIdx.set(e.event, idx + 1)
      return {
        id: e.id, event: e.event, src: `/media/events/${e.event}/${e.file}`, w: e.w, h: e.h,
        title: titleFor(e.event, idx),
        faces: e.faces.map((f) => {
          const out = { box: [round4(f.x / e.w), round4(f.y / e.h), round4(f.w / e.w), round4(f.h / e.h)], person: f.person, score: round4(f.score) }
          if (f.main) out.main = true
          if (f.adult) out.adult = true
          return out
        }),
      }
    })

    // Mean descriptor per person, from manifest (non-held-back) photo faces only —
    // this is the "known" reference set the live-upload demo matches new uploads against.
    const photoPersonMeans = new Map()
    for (const e of manifestPhotoEntries) for (const f of e.faces) {
      if (f.adult || !f.person) continue
      if (!photoPersonMeans.has(f.person)) photoPersonMeans.set(f.person, { sum: new Array(128).fill(0), count: 0 })
      const m = photoPersonMeans.get(f.person)
      for (let i = 0; i < 128; i++) m.sum[i] += f.descriptor[i]
      m.count++
    }
    const photoPersonMeanVec = new Map([...photoPersonMeans].map(([pid, m]) => [pid, m.sum.map((v) => v / m.count)]))

    // ---------------- Videos ----------------
    const manifestVideos = []
    const rawTrackSamples = [] // {person, descriptors} for the final descriptors.json aggregation
    let nextPersonNum = clusters.length + 1

    if (!SKIP_VIDEO) {
      const videoFiles = fs.existsSync(VIDEO_DIR) ? fs.readdirSync(VIDEO_DIR).filter((f) => /\.mp4$/i.test(f)).sort() : []
      for (const file of videoFiles) {
        const id = path.basename(file, '.mp4')
        const srcPath = path.join(VIDEO_DIR, file)
        const webmPath = path.join(VIDEO_DIR, `${id}.webm`)
        console.log(`Transcoding ${file} -> ${id}.webm ...`)
        const size = transcodeToWebm(ffmpeg, srcPath, webmPath)
        const probe = probeVideo(ffmpeg, webmPath)
        console.log(`  ${id}.webm: ${(size / 1024 / 1024).toFixed(2)}MB, ${probe.width}x${probe.height}, ${probe.duration?.toFixed(2)}s`)

        const frameDir = path.join(os.tmpdir(), `annotate-frames-${id}`)
        const frameFiles = extractFrames(ffmpeg, webmPath, frameDir, FRAME_FPS)
        console.log(`  extracted ${frameFiles.length} frames @ ${FRAME_FPS}fps`)

        const frameDetections = []
        for (const [fi, ff] of frameFiles.entries()) {
          try {
            const det = await detectOnSrc(page, toDataUrl(ff))
            const kept = det.faces.filter((f) => f.w / det.width >= MIN_FACE_WIDTH_FRAC)
            kept.forEach((f) => {
              f.adult = f.age >= ADULT_AGE
              f.x /= det.width; f.y /= det.height; f.w /= det.width; f.h /= det.height
            })
            frameDetections.push(kept.filter((f) => !f.adult))
          } catch (e) {
            console.warn(`   ! frame ${fi} failed: ${e.message}`)
            frameDetections.push([])
          }
        }
        fs.rmSync(frameDir, { recursive: true, force: true })

        const tracks = trackFrames(frameDetections, TRACK_IOU, TRACK_DIST, FRAME_FPS, MAX_TRACK_GAP_FRAMES)
          .filter((tr) => tr.frames.length && tr.frames[tr.frames.length - 1][0] - tr.frames[0][0] >= MIN_TRACK_SEC - 1e-9)

        for (const tr of tracks) {
          const meanD = meanVec(tr.descriptors)
          let bestPid = null, bestDist = Infinity
          for (const [pid, vec] of photoPersonMeanVec) {
            const d = euclid(meanD, vec)
            if (d < bestDist) { bestDist = d; bestPid = pid }
          }
          tr.person = bestPid !== null && bestDist < TRACK_DIST ? bestPid : `p${String(nextPersonNum++).padStart(3, '0')}`
        }
        rawTrackSamples.push(...tracks.map((tr) => ({ person: tr.person, descriptors: tr.descriptors })))

        const event = VIDEO_EVENT_MAP[id] ?? guessVideoEvent(id)
        manifestVideos.push({
          id, event, src: `/media/video/${id}.webm`,
          w: probe.width, h: probe.height, duration: round4(probe.duration ?? 0), fps: FRAME_FPS,
          title: VIDEO_TITLES[id] ?? `${labelFor(event)} · clip`,
          tracks: tracks.map((tr, i) => ({
            trackId: `${id}-t${i + 1}`, person: tr.person,
            frames: tr.frames.map(([t, x, y, w, h]) => [round4(t), round4(x), round4(y), round4(w), round4(h)]),
          })),
        })
        console.log(`  ${tracks.length} track(s) kept (>= ${MIN_TRACK_SEC}s)`)
      }
    } else {
      console.log('SKIP_VIDEO=1 set — leaving public/media/video/*.webm and index.json untouched.')
    }

    // ---------------- descriptors.json (final person set: photos + video tracks) ----------------
    const finalAgg = new Map()
    const addDescriptor = (pid, vec) => {
      if (!pid) return
      let m = finalAgg.get(pid)
      if (!m) { m = { sum: new Array(128).fill(0), count: 0 }; finalAgg.set(pid, m) }
      for (let i = 0; i < 128; i++) m.sum[i] += vec[i]
      m.count++
    }
    for (const e of manifestPhotoEntries) for (const f of e.faces) if (!f.adult && f.person) addDescriptor(f.person, f.descriptor)
    for (const s of rawTrackSamples) for (const d of s.descriptors) addDescriptor(s.person, d)
    const descriptorsOut = {}
    for (const [pid, m] of finalAgg) descriptorsOut[pid] = m.sum.map((v) => round4(v / m.count))

    // ---------------- Write outputs ----------------
    if (!SKIP_VIDEO) {
      fs.writeFileSync(VIDEO_INDEX_PATH, JSON.stringify(manifestVideos))
    }
    const manifest = { version: 1, generatedAt: new Date().toISOString(), assets: manifestAssets, videos: SKIP_VIDEO ? JSON.parse(fs.existsSync(VIDEO_INDEX_PATH) ? fs.readFileSync(VIDEO_INDEX_PATH, 'utf8') : '[]') : manifestVideos }
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest))
    fs.writeFileSync(DESCRIPTORS_PATH, JSON.stringify(descriptorsOut))

    // ---------------- Stats ----------------
    const appearance = new Map()
    for (const a of manifestAssets) for (const f of a.faces) if (!f.adult && f.person) appearance.set(f.person, (appearance.get(f.person) ?? 0) + 1)
    for (const v of manifest.videos) for (const t of v.tracks) if (t.person) appearance.set(t.person, (appearance.get(t.person) ?? 0) + 1)
    const stats = {
      photos: manifestAssets.length,
      faces: manifestAssets.reduce((s, a) => s + a.faces.length, 0),
      adults: manifestAssets.reduce((s, a) => s + a.faces.filter((f) => f.adult).length, 0),
      persons: appearance.size,
      personsWithMultipleAppearances: [...appearance.values()].filter((c) => c >= 2).length,
      videos: manifest.videos.length,
      tracks: manifest.videos.reduce((s, v) => s + v.tracks.length, 0),
      heldBackPhotos: holdBackFiles.size,
    }
    console.log('\nSTATS', JSON.stringify(stats, null, 2))

    // ---------------- Debug image ----------------
    const debugCandidates = [...manifestAssets].filter((a) => a.faces.length > 0).sort((a, b) => b.faces.length - a.faces.length).slice(0, 2)
    if (debugCandidates.length) {
      const items = debugCandidates.map((a) => ({ src: `${BASE}${a.src}`, faces: a.faces }))
      const outPath = await renderDebugImage(page, items, path.join(os.tmpdir(), 'annotate-debug.png'))
      console.log('Debug image:', outPath, 'for', debugCandidates.map((a) => a.id).join(', '))
    }

    const nextVersion = bumpDataVersion()
    console.log(`DATA_VERSION bumped to ${nextVersion}`)
  } finally {
    await browser.close()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
