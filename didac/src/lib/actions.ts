import { useDemo } from '../store'
import { viewerLabelOf, wmTime } from '../ui'
import { downloadWatermarked, traceId } from './fake'

/** Save watermarked copies and log each download with its trace ID. */
export async function saveCopies(ids: string[]) {
  const st = useDemo.getState(); st.downloadPhotos(ids)
  const who = viewerLabelOf(st)
  for (const id of ids) {
    const p = st.photos.find((x) => x.id === id); if (!p) continue
    const tr = traceId(who, id)
    try { await downloadWatermarked(p.src, `${who} · ${wmTime(Date.now())} · ${tr}`, `${p.id}-${tr}.jpg`) } catch { /* image unavailable offline */ }
  }
}
