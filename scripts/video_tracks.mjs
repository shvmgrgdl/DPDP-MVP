// Precompute face tracks for every clip in public/media/video (offline; the app never detects live).
// Usage: node scripts/video_tracks.mjs   (dev server must be running)
import { createRequire } from 'node:module'; import { execSync } from 'node:child_process'
import fs from 'node:fs'; import path from 'node:path'
const require = createRequire(execSync('npm root -g').toString().trim() + '/'); const { chromium } = require('playwright')
const FFMPEG = execSync(`python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`).toString().trim()
const FPS = 4, BASE = 'http://localhost:5173', MAN = 'src/data/media-manifest.json'
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'))
const b = await chromium.launch()
const pages = await Promise.all([0, 1, 2, 3].map(async () => {
  const p = await b.newPage(); await p.goto(`${BASE}/models/face-api/ssd_mobilenetv1_model-weights_manifest.json`)
  await p.addScriptTag({ path: 'node_modules/@vladmandic/face-api/dist/face-api.js' })
  await p.evaluate(async (u) => { const f = window.faceapi; await f.tf.setBackend('webgl').catch(() => f.tf.setBackend('cpu')); await f.tf.ready()
    await Promise.all([f.nets.ssdMobilenetv1.loadFromUri(u), f.nets.ageGenderNet.loadFromUri(u)]) }, `${BASE}/models/face-api/`)
  return p
}))
const iou = (a, c) => { const x1 = Math.max(a[0], c[0]), y1 = Math.max(a[1], c[1]), x2 = Math.min(a[0] + a[2], c[0] + c[2]), y2 = Math.min(a[1] + a[3], c[1] + c[3]); const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); return i / (a[2] * a[3] + c[2] * c[3] - i) }
for (const v of man.videos) {
  const src = path.join('public', v.src); const dir = `/tmp/vf/${v.id}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  execSync(`"${FFMPEG}" -loglevel error -i "${src}" -vf "fps=${FPS},scale=960:-2" -q:v 3 ${dir}/f%04d.jpg`)
  const files = fs.readdirSync(dir).sort(); const dets = new Array(files.length); let next = 0; let W = 0, H = 0
  await Promise.all(pages.map(async (p) => { while (next < files.length) { const i = next++
    const data = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(dir, files[i])).toString('base64')
    const r = await p.evaluate(async (d) => { const im = new Image(); im.src = d; await im.decode()
      const res = await window.faceapi.detectAllFaces(im, new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })).withAgeAndGender()
      return { w: im.naturalWidth, h: im.naturalHeight, f: res.map((x) => ({ b: [x.detection.box.x / im.naturalWidth, x.detection.box.y / im.naturalHeight, x.detection.box.width / im.naturalWidth, x.detection.box.height / im.naturalHeight], g: x.gender })) } }, data)
    dets[i] = r.f.filter((f) => f.b[2] >= 0.018); W = r.w; H = r.h } }))
  const tracks = []
  dets.forEach((fs_, i) => { const t = i / FPS; const used = new Set()
    for (const f of fs_) { let best = null, bi = 0
      for (const tr of tracks) { if (used.has(tr) || i - tr.last > 3) continue; const s = iou(tr.frames.at(-1).slice(1), f.b); if (s > bi && s >= 0.15) { bi = s; best = tr } }
      if (!best) { best = { frames: [], last: i, gF: 0 }; tracks.push(best) }
      used.add(best); best.last = i; best.gF += f.g === 'female' ? 1 : -1
      best.frames.push([+t.toFixed(2), ...f.b.map((n) => +n.toFixed(4))]) } })
  const keep = tracks.filter((tr) => tr.frames.length >= 3)
  v.w = W * 4 / 3 > 0 ? v.w : v.w
  v.tracks = keep.map((tr, k) => ({ trackId: `${v.id}-t${k + 1}`, person: null, g: tr.gF >= 0 ? 'F' : 'M', frames: tr.frames }))
  v.fps = FPS
  console.log(v.id, files.length, 'frames', v.tracks.length, 'tracks')
}
fs.writeFileSync(MAN, JSON.stringify(man)); await b.close(); fs.rmSync('/tmp/vf', { recursive: true, force: true })
