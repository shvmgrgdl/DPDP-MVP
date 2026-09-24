/**
 * Shared in-browser face AI for School DPDP OS (owned by the media-upload module; other modules may import).
 * Runs @vladmandic/face-api on TensorFlow.js in the browser: photos never leave the device.
 * The library (~1.3 MB) loads lazily on the first loadModels()/detectFaces() call, so importing a light
 * helper such as personToStudent() or downscaleToDataUrl() costs nothing.
 *
 * STABLE API
 *   loadModels(): Promise<FaceEngineInfo>
 *       Idempotent. SSD MobileNet v1 + 68-point landmarks + 128-d recognition from /models/face-api/,
 *       TF.js backend webgl → software webgl → wasm → cpu, then a warm-up. Progress is published on useFaceEngine.
 *   useFaceEngine: zustand hook → { status: 'idle'|'loading'|'ready'|'error', progress 0..1, stage, backend, error? }
 *   modelsReady(): boolean · getBackend(): string | null
 *   detectFaces(input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, opts?) → Promise<DetectedFace[]>
 *       opts: { minConfidence = 0.35, descriptors = true, maxResults = 100, tiles = 'auto', detector = 'ssd', inputSize = 416 }
 *       DetectedFace = { box: [x, y, w, h] normalised 0..1, score, descriptor?: Float32Array }, sorted largest first.
 *       tiles 'auto' adds overlapping close-up passes on large photos so small faces in group shots are found.
 *       detector 'tiny' (lazy-loaded, no descriptors, no tiles) is for fast video loops.
 *   loadDescriptors(force?): Promise<DescriptorIndex>   /media/descriptors.json fetched once ({ [personId]: number[] });
 *       a missing file (404 or the dev server's HTML fallback) resolves to an empty index.
 *   matchDescriptor(desc, threshold = 0.5): Promise<{ personId, distance } | null>   best match below threshold
 *   matchFaces(descs, threshold = 0.5): Promise<(FaceMatch | null)[]>  one photo at once; no person used twice
 *   personToStudent(personId): string | null             via useApp.getState().faceIndex
 *   matchConfidence(distance): number 0..1               friendly confidence for UI
 *   downscaleToDataUrl(file: Blob | string, max = 1600): Promise<string>   JPEG data URL, long edge ≤ max
 *   downscaleImage(file: Blob | string, max = 1600, quality = 0.86): Promise<{ dataUrl, w, h, canvas }>
 *   loadImage(src): Promise<HTMLImageElement> · fingerprint(blob): Promise<string> (SHA-256 hex)
 *   getFaceApi(): Promise<typeof import('@vladmandic/face-api')>   raw library (lazy), for advanced use
 *   MATCH_THRESHOLD, MODEL_URL, DESCRIPTORS_URL, FACE_MODEL_INFO
 */
import { create } from 'zustand'
import type * as FaceApiNS from '@vladmandic/face-api'
import { useApp } from '@/store/app'

type FaceApi = typeof FaceApiNS
export type NormBox = [number, number, number, number]

export interface DetectedFace {
  /** Normalised [x, y, w, h] in 0..1 image space (same convention as MediaAsset faces). */
  box: NormBox
  /** Detector confidence 0..1. */
  score: number
  /** 128-d face descriptor (only when descriptors: true). */
  descriptor?: Float32Array
}

export interface DetectOptions {
  minConfidence?: number
  descriptors?: boolean
  maxResults?: number
  /** Extra close-up passes for small faces: 'auto' = on for large inputs when a GPU/WASM backend is active. */
  tiles?: boolean | 'auto'
  /** 'ssd' (default, accurate) or 'tiny' (fast, for video; no descriptors). */
  detector?: 'ssd' | 'tiny'
  /** Tiny detector input size (multiple of 32). */
  inputSize?: number
}

export interface FaceMatch {
  personId: string
  distance: number
}

export type DescriptorIndex = Map<string, Float32Array[]>

export type FaceEngineStatus = 'idle' | 'loading' | 'ready' | 'error'
export interface FaceEngineState {
  status: FaceEngineStatus
  progress: number
  stage: string
  backend: string | null
  error?: string
}
export interface FaceEngineInfo {
  backend: string
  loadMs: number
}

export const MODEL_URL = '/models/face-api'
export const DESCRIPTORS_URL = '/media/descriptors.json'
export const MATCH_THRESHOLD = 0.5
export const FACE_MODEL_INFO = {
  detector: 'SSD MobileNet v1',
  landmarks: '68-point face landmarks',
  recognition: 'ResNet-34 face recognition (128-d descriptor)',
  threshold: MATCH_THRESHOLD,
  runsOn: 'This browser (TensorFlow.js)',
} as const

/** Engine status for friendly loading UI. */
export const useFaceEngine = create<FaceEngineState>(() => ({ status: 'idle', progress: 0, stage: '', backend: null }))
const setEngine = (p: Partial<FaceEngineState>) => useFaceEngine.setState(p)

/* ------------------------------------------------------------------ */
/* Library + backend                                                    */
/* ------------------------------------------------------------------ */

/** Runtime tf functions that exist in the bundled TF.js but are not in face-api's narrowed typings. */
interface TfRuntime {
  setBackend(name: string): Promise<boolean>
  ready(): Promise<void>
  getBackend(): string
  findBackendFactory(name: string): unknown
  setWasmPaths?(prefix: string): void
  env(): { set(flag: string, value: unknown): void }
  scalar(v: number): { add(o: unknown): { dataSync(): ArrayLike<number>; dispose(): void }; dispose(): void }
}

let lib: FaceApi | null = null
let libPromise: Promise<FaceApi> | null = null
/** Raw @vladmandic/face-api namespace (lazy), for advanced use. */
export function getFaceApi(): Promise<FaceApi> {
  return getLib()
}
function getLib(): Promise<FaceApi> {
  if (lib) return Promise.resolve(lib)
  if (!libPromise) {
    libPromise = import('@vladmandic/face-api').then((m) => {
      const mod = m as unknown as FaceApi & { default?: FaceApi }
      lib = mod.nets ? mod : (mod.default as FaceApi)
      return lib
    })
    libPromise.catch(() => { libPromise = null })
  }
  return libPromise
}

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/'

/** 'hw' = GPU-accelerated WebGL, 'sw' = software WebGL only (e.g. no GPU), 'none' = no WebGL. */
function webglSupport(): 'hw' | 'sw' | 'none' {
  const probe = (attrs?: WebGLContextAttributes) => {
    try {
      const a = document.createElement('canvas')
      if (a.getContext('webgl2', attrs)) return true
      const b = document.createElement('canvas')
      return !!b.getContext('webgl', attrs)
    } catch {
      return false
    }
  }
  if (probe({ failIfMajorPerformanceCaveat: true })) return 'hw'
  return probe() ? 'sw' : 'none'
}

async function reachable(url: string, ms = 3000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctl.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}

async function tryBackend(tf: TfRuntime, name: string): Promise<boolean> {
  try {
    if (!tf.findBackendFactory(name)) return false
    const ok = await tf.setBackend(name)
    if (!ok) return false
    await tf.ready()
    // sanity check: a tiny op must run on this backend
    const a = tf.scalar(1)
    const b = a.add(tf.scalar(2))
    const v = b.dataSync()[0]
    a.dispose(); b.dispose()
    return v === 3
  } catch {
    return false
  }
}

/** GPU WebGL first; software WebGL; WASM (from CDN, only if reachable); plain CPU last. */
async function initBackend(fa: FaceApi): Promise<string> {
  const tf = fa.tf as unknown as TfRuntime
  const gl = webglSupport()
  if (gl === 'hw' && (await tryBackend(tf, 'webgl'))) return 'webgl'
  if (gl === 'sw') {
    // must be set before TF.js first probes WebGL (it caches the result)
    try { tf.env().set('SOFTWARE_WEBGL_ENABLED', true) } catch { /* older tfjs */ }
    if (await tryBackend(tf, 'webgl')) return 'webgl'
  }
  if (tf.setWasmPaths && tf.findBackendFactory('wasm') && (await reachable(`${WASM_CDN}tfjs-backend-wasm-simd.wasm`))) {
    tf.setWasmPaths(WASM_CDN)
    if (await tryBackend(tf, 'wasm')) return 'wasm'
  }
  if (await tryBackend(tf, 'cpu')) return 'cpu'
  throw new Error('No TensorFlow.js backend is available in this browser')
}

/* ------------------------------------------------------------------ */
/* Models                                                               */
/* ------------------------------------------------------------------ */

let modelsPromise: Promise<FaceEngineInfo> | null = null
let engineInfo: FaceEngineInfo | null = null

export function modelsReady() {
  return !!engineInfo
}
export function getBackend() {
  return engineInfo?.backend ?? null
}

/** Idempotent: load backend + SSD detector + landmarks + recognition, then warm up. */
export function loadModels(): Promise<FaceEngineInfo> {
  if (engineInfo) return Promise.resolve(engineInfo)
  if (!modelsPromise) {
    modelsPromise = doLoadModels().catch((e: unknown) => {
      modelsPromise = null
      const msg = e instanceof Error ? e.message : String(e)
      setEngine({ status: 'error', stage: 'The face engine could not start', error: msg })
      throw e
    })
  }
  return modelsPromise
}

async function doLoadModels(): Promise<FaceEngineInfo> {
  const t0 = performance.now()
  let progress = 0.03
  const bump = (d: number, stage?: string) => {
    progress = Math.min(0.97, progress + d)
    setEngine(stage ? { progress, stage } : { progress })
  }
  setEngine({ status: 'loading', progress, stage: 'Loading the face engine', error: undefined })
  const fa = await getLib()
  bump(0.09, 'Starting TensorFlow in your browser')
  const backend = await initBackend(fa)
  setEngine({ backend })
  bump(0.06, 'Loading face models')
  const nets = fa.nets
  // Weighted by model size: detector 5.6 MB, landmarks 0.35 MB, recognition 6.4 MB.
  await Promise.all([
    nets.ssdMobilenetv1.isLoaded ? bump(0.3) : nets.ssdMobilenetv1.loadFromUri(MODEL_URL).then(() => bump(0.3, 'Face finder ready')),
    nets.faceLandmark68Net.isLoaded ? bump(0.05) : nets.faceLandmark68Net.loadFromUri(MODEL_URL).then(() => bump(0.05)),
    nets.faceRecognitionNet.isLoaded ? bump(0.3) : nets.faceRecognitionNet.loadFromUri(MODEL_URL).then(() => bump(0.3, 'Face matcher ready')),
  ])
  bump(0.02, 'Warming up')
  await warmUp(fa)
  engineInfo = { backend, loadMs: Math.round(performance.now() - t0) }
  setEngine({ status: 'ready', progress: 1, stage: 'Ready', backend })
  return engineInfo
}

/** Compile shaders once so the first real photo is quick. */
async function warmUp(fa: FaceApi) {
  try {
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 160
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = '#d9c8b4'
      g.fillRect(0, 0, 160, 160)
    }
    await fa.nets.ssdMobilenetv1.locateFaces(c, new fa.SsdMobilenetv1Options({ minConfidence: 0.9 }))
    await fa.nets.faceLandmark68Net.detectLandmarks(c)
    await fa.nets.faceRecognitionNet.computeFaceDescriptor(c)
  } catch {
    /* warm-up is best effort */
  }
}

let tinyPromise: Promise<void> | null = null
function loadTiny(fa: FaceApi) {
  if (fa.nets.tinyFaceDetector.isLoaded) return Promise.resolve()
  if (!tinyPromise) {
    tinyPromise = fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
    tinyPromise.catch(() => { tinyPromise = null })
  }
  return tinyPromise
}

/* ------------------------------------------------------------------ */
/* Detection                                                            */
/* ------------------------------------------------------------------ */

type MediaInput = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
interface PxBox { x: number; y: number; w: number; h: number; score: number }

function mediaDims(input: MediaInput) {
  if (input instanceof HTMLImageElement) return { w: input.naturalWidth || input.width, h: input.naturalHeight || input.height }
  if (input instanceof HTMLVideoElement) return { w: input.videoWidth, h: input.videoHeight }
  return { w: input.width, h: input.height }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
function normBox(b: { x: number; y: number; width: number; height: number }, w: number, h: number): NormBox {
  const x = clamp01(b.x / w)
  const y = clamp01(b.y / h)
  const r = clamp01((b.x + b.width) / w)
  const btm = clamp01((b.y + b.height) / h)
  const q = (v: number) => Math.round(v * 10000) / 10000
  return [q(x), q(y), q(r - x), q(btm - y)]
}

// Serialise model calls: one photo at a time keeps GPU memory calm.
let lane: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = lane.then(fn, fn)
  lane = run.catch(() => undefined)
  return run
}

const TILE_MIN_SIDE = 900 // below this the single 512px pass already sees faces well
function tileGrid(w: number, h: number) {
  const T = Math.round(Math.max(480, Math.min(900, Math.max(w, h) * 0.52)))
  const ov = Math.round(T * 0.28)
  const axis = (len: number) => {
    if (len <= T) return [0]
    const n = Math.ceil((len - ov) / (T - ov))
    return Array.from({ length: n }, (_, i) => Math.round((i * (len - T)) / (n - 1)))
  }
  const tiles: { x: number; y: number; w: number; h: number }[] = []
  for (const y of axis(h)) for (const x of axis(w)) tiles.push({ x, y, w: Math.min(T, w), h: Math.min(T, h) })
  return tiles
}

function toCanvas(input: MediaInput, w: number, h: number): HTMLCanvasElement {
  if (input instanceof HTMLCanvasElement) return input
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')?.drawImage(input, 0, 0, w, h)
  return c
}

function iou(a: PxBox, b: PxBox) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const inter = ix * iy
  const small = Math.min(a.w * a.h, b.w * b.h)
  return { iou: inter / (a.w * a.h + b.w * b.h - inter), contain: small ? inter / small : 0 }
}

/** Non-maximum suppression that also folds boxes nested inside a stronger one. */
function mergeBoxes(boxes: PxBox[]) {
  const sorted = [...boxes].sort((a, b) => b.score - a.score)
  const keep: PxBox[] = []
  for (const b of sorted) if (!keep.some((k) => { const o = iou(k, b); return o.iou > 0.3 || o.contain > 0.6 })) keep.push(b)
  return keep
}

async function locate(fa: FaceApi, input: MediaInput, w: number, h: number, minConfidence: number, maxResults: number, tiles: boolean): Promise<PxBox[]> {
  const opts = new fa.SsdMobilenetv1Options({ minConfidence, maxResults })
  const full = await fa.nets.ssdMobilenetv1.locateFaces(input, opts)
  const out: PxBox[] = full.map((d) => ({ x: d.box.x, y: d.box.y, w: d.box.width, h: d.box.height, score: d.score }))
  if (!tiles) return out
  const src = toCanvas(input, w, h)
  // Close-up passes are stricter: more pixels also means more look-alike textures.
  const tileOpts = new fa.SsdMobilenetv1Options({ minConfidence: Math.max(minConfidence, 0.5), maxResults })
  const crop = document.createElement('canvas')
  for (const t of tileGrid(w, h)) {
    crop.width = t.w
    crop.height = t.h
    const g = crop.getContext('2d')
    if (!g) break
    g.drawImage(src, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h)
    const dets = await fa.nets.ssdMobilenetv1.locateFaces(crop, tileOpts)
    for (const d of dets) {
      const b = d.box
      // a face cut by an inner tile edge is seen whole by the neighbouring tile or the full pass
      const cut = (t.x > 0 && b.x <= 2) || (t.y > 0 && b.y <= 2) || (t.x + t.w < w && b.x + b.width >= t.w - 2) || (t.y + t.h < h && b.y + b.height >= t.h - 2)
      if (cut) continue
      // tiles are for small faces; large ones are the full pass's job
      if (b.width > t.w * 0.45) continue
      out.push({ x: b.x + t.x, y: b.y + t.y, w: b.width, h: b.height, score: d.score })
    }
  }
  return mergeBoxes(out)
}

/** Find faces. Boxes are normalised to the input's natural size; results are sorted largest first. */
export async function detectFaces(input: MediaInput, opts: DetectOptions = {}): Promise<DetectedFace[]> {
  const { minConfidence = 0.35, descriptors = true, maxResults = 100, detector = 'ssd', inputSize = 416, tiles = 'auto' } = opts
  const { w, h } = mediaDims(input)
  if (!w || !h) return []
  const fa = await getLib()
  if (detector === 'tiny') {
    await loadTiny(fa)
    const dets = await serial(async () => await fa.detectAllFaces(input, new fa.TinyFaceDetectorOptions({ inputSize, scoreThreshold: minConfidence })))
    return sortBySize(dets.map((d) => ({ box: normBox(d.box, w, h), score: d.score })))
  }
  const info = await loadModels()
  const useTiles = tiles === 'auto' ? Math.max(w, h) >= TILE_MIN_SIDE && info.backend !== 'cpu' : tiles
  return serial(async () => {
    const boxes = await locate(fa, input, w, h, minConfidence, maxResults, useTiles)
    if (!boxes.length) return []
    if (!descriptors) return sortBySize(boxes.map((b) => ({ box: normBox({ x: b.x, y: b.y, width: b.w, height: b.h }, w, h), score: b.score })))
    const dims = { width: w, height: h }
    const src = boxes.map((b) => fa.extendWithFaceDetection({}, new fa.FaceDetection(b.score, new fa.Rect(b.x / w, b.y / h, b.w / w, b.h / h), dims)))
    const res = await new fa.DetectAllFaceLandmarksTask(Promise.resolve(src), input, false).withFaceDescriptors()
    return sortBySize(res.map((r) => ({ box: normBox(r.detection.box, w, h), score: r.detection.score, descriptor: r.descriptor })))
  })
}

const sortBySize = (faces: DetectedFace[]) => faces.sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3])

/* ------------------------------------------------------------------ */
/* Matching                                                             */
/* ------------------------------------------------------------------ */

let descriptorsPromise: Promise<DescriptorIndex> | null = null

/** Fetch /media/descriptors.json once. Missing or malformed → empty index (every face stays "Unknown"). */
export function loadDescriptors(force = false): Promise<DescriptorIndex> {
  if (!descriptorsPromise || force) descriptorsPromise = fetchDescriptors()
  return descriptorsPromise
}

async function fetchDescriptors(): Promise<DescriptorIndex> {
  const index: DescriptorIndex = new Map()
  try {
    const res = await fetch(DESCRIPTORS_URL, { cache: 'no-cache' })
    if (!res.ok) return index
    const text = await res.text()
    if (!text.trim() || text.trimStart().startsWith('<')) return index // dev-server HTML fallback = file not there yet
    const raw = JSON.parse(text) as Record<string, unknown>
    const toVec = (v: unknown): Float32Array | null =>
      Array.isArray(v) && v.length >= 64 && typeof v[0] === 'number' ? Float32Array.from(v as number[]) : null
    for (const [personId, v] of Object.entries(raw ?? {})) {
      const list: Float32Array[] = []
      const one = toVec(v)
      if (one) list.push(one)
      else if (Array.isArray(v)) for (const x of v) { const d = toVec(x); if (d) list.push(d) }
      else if (v && typeof v === 'object') {
        const o = v as { descriptor?: unknown; descriptors?: unknown[] }
        const d = toVec(o.descriptor)
        if (d) list.push(d)
        for (const x of o.descriptors ?? []) { const dd = toVec(x); if (dd) list.push(dd) }
      }
      if (list.length) index.set(personId, list)
    }
  } catch {
    /* no descriptors yet: matching simply finds nobody */
  }
  return index
}

function euclidean(a: ArrayLike<number>, b: ArrayLike<number>) {
  const n = Math.min(a.length, b.length)
  let s = 0
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i]
    s += d * d
  }
  return Math.sqrt(s)
}

function rank(index: DescriptorIndex, desc: ArrayLike<number>) {
  const out: FaceMatch[] = []
  for (const [personId, refs] of index) {
    let min = Infinity
    for (const r of refs) min = Math.min(min, euclidean(desc, r))
    out.push({ personId, distance: min })
  }
  return out.sort((a, b) => a.distance - b.distance)
}

const round3 = (v: number) => Math.round(v * 1000) / 1000

/** Closest known person below the threshold, else null. */
export async function matchDescriptor(desc: Float32Array | number[], threshold = MATCH_THRESHOLD): Promise<FaceMatch | null> {
  const index = await loadDescriptors()
  if (!index.size) return null
  const best = rank(index, desc)[0]
  return best && best.distance < threshold ? { personId: best.personId, distance: round3(best.distance) } : null
}

/** Match all faces of one photo at once, never assigning the same person twice (closest pair wins). */
export async function matchFaces(descs: (Float32Array | number[] | undefined)[], threshold = MATCH_THRESHOLD): Promise<(FaceMatch | null)[]> {
  const index = await loadDescriptors()
  const out: (FaceMatch | null)[] = descs.map(() => null)
  if (!index.size) return out
  const pairs: { face: number; personId: string; distance: number }[] = []
  descs.forEach((d, face) => {
    if (!d) return
    for (const m of rank(index, d)) if (m.distance < threshold) pairs.push({ face, ...m })
  })
  pairs.sort((a, b) => a.distance - b.distance)
  const usedPeople = new Set<string>()
  for (const p of pairs) {
    if (out[p.face] || usedPeople.has(p.personId)) continue
    out[p.face] = { personId: p.personId, distance: round3(p.distance) }
    usedPeople.add(p.personId)
  }
  return out
}

/** Manifest person → student id (null = stays unknown). */
export function personToStudent(personId: string | null | undefined): string | null {
  if (!personId) return null
  return useApp.getState().faceIndex?.[personId] ?? null
}

/** Friendly 0..1 confidence from a descriptor distance (0.5 threshold ≈ 0.70, 0.35 ≈ 0.82, 0.2 ≈ 0.94). */
export function matchConfidence(distance: number) {
  return Math.max(0, Math.min(0.99, 1.1 - distance * 0.8))
}

/* ------------------------------------------------------------------ */
/* Images                                                               */
/* ------------------------------------------------------------------ */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load image ${src.slice(0, 80)}`))
    img.src = src
  })
}

async function toBlob(src: Blob | string): Promise<Blob> {
  if (typeof src !== 'string') return src
  const res = await fetch(src)
  if (!res.ok) throw new Error(`Could not fetch ${src}`)
  return res.blob()
}

/** Downscale so the long edge is ≤ max; returns a JPEG data URL plus the drawn canvas (handy as detector input). */
export async function downscaleImage(src: Blob | string, max = 1600, quality = 0.86): Promise<{ dataUrl: string; w: number; h: number; canvas: HTMLCanvasElement }> {
  const blob = await toBlob(src)
  let source: CanvasImageSource
  let sw: number
  let sh: number
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    source = bitmap
    sw = bitmap.width
    sh = bitmap.height
  } catch {
    const url = URL.createObjectURL(blob)
    try {
      const img = await loadImage(url)
      source = img
      sw = img.naturalWidth
      sh = img.naturalHeight
    } catch {
      throw new Error('This file is not a readable image')
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }
  if (!sw || !sh) throw new Error('This file is not a readable image')
  const k = Math.min(1, max / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * k))
  const h = Math.max(1, Math.round(sh * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')
  if (!g) throw new Error('Canvas is not available')
  g.fillStyle = '#ffffff' // transparent PNGs → white, not black
  g.fillRect(0, 0, w, h)
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(source, 0, 0, w, h)
  bitmap?.close()
  const dataUrl = await canvasToDataUrl(canvas, quality)
  return { dataUrl, w, h, canvas }
}

/** Long edge ≤ max, JPEG data URL. */
export async function downscaleToDataUrl(file: Blob | string, max = 1600): Promise<string> {
  return (await downscaleImage(file, max)).dataUrl
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (b) => {
        if (!b) return resolve(canvas.toDataURL('image/jpeg', quality))
        const fr = new FileReader()
        fr.onload = () => resolve(String(fr.result))
        fr.onerror = () => resolve(canvas.toDataURL('image/jpeg', quality))
        fr.readAsDataURL(b)
      },
      'image/jpeg',
      quality,
    )
  })
}

/** SHA-256 (hex) of the original bytes, for the evidence record. */
export async function fingerprint(blob: Blob): Promise<string> {
  try {
    const buf = await blob.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-256', buf)
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return ''
  }
}
