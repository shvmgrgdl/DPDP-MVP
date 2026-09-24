import * as React from 'react'

/** Sample photos for the live-upload demo, discovered from /media/upload-samples/index.json (if present). */
export interface SampleRef {
  src: string
  event?: string
}

const BASE = '/media/upload-samples/'
let cache: Promise<SampleRef[]> | null = null

const resolve = (p: string) => (/^(https?:)?\//.test(p) ? p : BASE + p.replace(/^\.\//, ''))

export function discoverSamples(): Promise<SampleRef[]> {
  if (!cache) {
    cache = (async () => {
      try {
        const res = await fetch(`${BASE}index.json`, { cache: 'no-cache' })
        if (!res.ok) return []
        const text = await res.text()
        if (!text.trim() || text.trimStart().startsWith('<')) return [] // dev-server HTML fallback: no samples yet
        const raw = JSON.parse(text) as unknown
        const obj = raw as Record<string, unknown>
        const list = (Array.isArray(raw) ? raw : obj.files ?? obj.samples ?? obj.items ?? obj.photos ?? obj.images ?? []) as unknown[]
        const out: SampleRef[] = []
        for (const x of list) {
          if (typeof x === 'string') out.push({ src: resolve(x) })
          else if (x && typeof x === 'object') {
            const o = x as Record<string, unknown>
            const p = [o.src, o.file, o.path, o.url, o.name].find((v) => typeof v === 'string') as string | undefined
            if (p) out.push({ src: resolve(p), event: typeof o.event === 'string' ? o.event : undefined })
          }
        }
        return out.filter((s) => /\.(jpe?g|png|webp)$/i.test(s.src))
      } catch {
        return []
      }
    })()
  }
  return cache
}

/** Samples for an event: the ones tagged for it, else all of them. */
export function useSamples(eventId: string) {
  const [all, setAll] = React.useState<SampleRef[] | null>(null)
  React.useEffect(() => {
    let live = true
    void discoverSamples().then((s) => live && setAll(s))
    return () => { live = false }
  }, [])
  const list = React.useMemo(() => {
    if (!all) return []
    const tagged = all.filter((s) => s.event === eventId)
    return tagged.length ? tagged : all.filter((s) => !s.event || s.event === eventId).length ? all.filter((s) => !s.event || s.event === eventId) : all
  }, [all, eventId])
  return { ready: all !== null, samples: list }
}

export async function fetchSampleFiles(samples: SampleRef[]): Promise<File[]> {
  const files = await Promise.all(
    samples.map(async (s) => {
      try {
        const res = await fetch(s.src)
        if (!res.ok) return null
        const blob = await res.blob()
        if (!blob.type.startsWith('image/')) return null
        const name = decodeURIComponent(s.src.split('/').pop() ?? 'sample.jpg')
        return new File([blob], name, { type: blob.type, lastModified: Date.now() })
      } catch {
        return null
      }
    }),
  )
  return files.filter((f): f is File => !!f)
}
