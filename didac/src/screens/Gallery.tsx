import * as React from 'react'
import { useDemo } from '../store'
import { evaluate } from '../data'
import { Chip, PhotoView } from '../ui'
import { Zoom } from './Zoom'
import { Lock, Globe } from 'lucide-react'

/** Private school gallery: everyone sees thumbnails; what is released publicly is decided by the gate. */
export function Gallery() {
  const s = useDemo()
  const [zoom, setZoom] = React.useState<string | null>(null)
  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><div className="eyebrow">School gallery · web app</div><div className="font-bold">Sunrise Public School · Annual Day</div></div>
        <Chip tone="muted"><Lock className="size-3" /> Private to school</Chip>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {s.photos.map((p) => { const e = evaluate(p, s.students, !!s.published[p.id]); return (
          <button key={p.id} type="button" onClick={() => { s.openPhoto(p.id); setZoom(p.id) }} className="text-left">
            <PhotoView photo={p} students={s.students} />
            <div className="mt-1.5 text-xs font-semibold">{p.title.replace('Annual Day · ', '')}</div>
            <div className="mt-1">{e.state === 'published' ? <Chip tone="ok"><Globe className="size-3" /> Public</Chip> : <Chip tone="muted"><Lock className="size-3" /> Private</Chip>}</div>
          </button>) })}
      </div>
      <p className="mt-3 text-xs text-ink-3">Tap a photo to open it — each open is recorded with who and when. The gallery base exists today; school-specific restrictions shown here are prototype.</p>
      {zoom && <Zoom photoId={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}
