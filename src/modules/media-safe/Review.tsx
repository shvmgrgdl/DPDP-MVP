import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, CircleCheck, EyeOff, UserCheck, UserRound } from 'lucide-react'
import type { FaceInstance, MediaAsset, Student } from '@/data/types'
import { Button, Card, Empty, PageHeader, Progress } from '@/design/ui'
import { PhotoFaces } from '@/design/media'
import { useApp } from '@/store/app'
import { pct } from '@/lib/utils'
import { byId, isUnknownFace, photoLabel, useScope, useScopedAssets } from './lib'
import { FaceCrop, FaceOutline, StudentPicker } from './parts'

type Item = { asset: MediaAsset; face: FaceInstance }

export function Review() {
  const scope = useScope()
  const scoped = useScopedAssets()
  const events = useApp((s) => s.events)
  const [done, setDone] = React.useState(0)
  const queue = React.useMemo<Item[]>(
    () => scoped.filter((a) => a.kind === 'photo').sort(byId).flatMap((a) => a.faces.filter(isUnknownFace).map((face) => ({ asset: a, face }))),
    [scoped],
  )
  const total = done + queue.length
  const labels = React.useMemo(() => {
    const m = new Map<string, string>()
    const byEvent = new Map<string, MediaAsset[]>()
    for (const a of scoped) if (a.kind === 'photo') byEvent.set(a.eventId, [...(byEvent.get(a.eventId) ?? []), a])
    for (const list of byEvent.values()) list.sort(byId).forEach((a, i) => m.set(a.id, photoLabel(a, i)))
    return m
  }, [scoped])

  // Close the "check unknown faces" task once the queue is empty.
  React.useEffect(() => {
    if (queue.length || !done) return
    const s = useApp.getState()
    s.tasks.filter((t) => t.status === 'open' && t.link === '/media/review').forEach((t) => s.completeTask(t.id))
  }, [queue.length, done])

  const act = (it: Item, patch: Partial<FaceInstance>, msg: string, description: string) => {
    const before = { studentId: it.face.studentId, review: it.face.review, confidence: it.face.confidence }
    useApp.getState().setFace(it.asset.id, it.face.id, patch)
    setDone((d) => d + 1)
    toast.success(msg, {
      description,
      action: { label: 'Undo', onClick: () => { useApp.getState().setFace(it.asset.id, it.face.id, before); setDone((d) => Math.max(0, d - 1)) } },
    })
  }
  const asStudent = (it: Item, s: Student) =>
    act(it, { studentId: s.id, review: 'confirmed', confidence: 1 }, `Matched to ${s.name}`, `${s.gender === 'F' ? 'Her' : 'His'} parent’s choices now apply to this photo.`)
  const asAdult = (it: Item) => act(it, { studentId: null, review: 'non-student', confidence: 0 }, 'Marked as an adult / visitor', 'No parent choice applies to this face.')
  const asBlur = (it: Item) => act(it, { studentId: null, review: 'always-blur', confidence: 0 }, 'This face will always be blurred', 'Everywhere, whatever the destination.')

  return (
    <div>
      <PageHeader eyebrow="Media Safe" title="Check unknown faces"
        subtitle="We never guess who someone is. Confirm each face once — the right parent’s choices then apply everywhere."
        actions={<Button variant="secondary" to="/media">Back to photos</Button>} />

      {total > 0 && (
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink"><span className="num">{done}</span> of <span className="num">{total}</span> checked</div>
            <div className="text-[13px] text-ink-3">{queue.length ? `${queue.length} left · usually a few seconds each` : 'All done'}</div>
          </div>
          <Progress value={pct(done, total)} tone="ok" className="mt-3" />
        </Card>
      )}

      {!queue.length ? (
        <Card>
          <Empty icon={<CircleCheck className="size-6" />} title={done ? 'All faces checked — thank you' : 'No unknown faces'}
            body="Every face is matched to a student, marked as an adult or visitor, or set to always blur. Parents’ choices now apply to every photo."
            action={<Button to="/media">Back to Media Safe</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {queue.map((it) => {
              const ev = events.find((e) => e.id === it.asset.eventId)
              const others = it.asset.faces.length - 1
              const ca = Math.min(it.asset.w / it.asset.h, 160 / 112)
              return (
                <motion.div key={it.face.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                  className="card overflow-hidden">
                  <div className="flex gap-4 p-4">
                    <FaceCrop asset={it.asset} face={it.face} size={112} />
                    <div className="min-w-0 flex-1">
                      <div className="label-caps truncate">{ev?.name ?? 'Event'}</div>
                      <div className="mt-1 truncate font-semibold text-ink">{labels.get(it.asset.id) ?? photoLabel(it.asset)}</div>
                      <p className="mt-1 text-[13px] text-ink-2">Not matched to any student{others > 0 ? ` · ${others} other ${others === 1 ? 'person' : 'people'} in this photo` : ''}.</p>
                      <Link to={`/media/photos/${it.asset.id}`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-azure hover:underline">Open the photo <ArrowUpRight className="size-3.5" /></Link>
                    </div>
                    <div className="hidden shrink-0 sm:block" style={{ width: Math.round(112 * ca) }}>
                      <PhotoFaces asset={it.asset} aspect={ca} rounded="rounded-lg"><FaceOutline asset={it.asset} face={it.face} aspect={ca} /></PhotoFaces>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-line bg-[#fbfaf7] px-4 py-3">
                    <StudentPicker scope={scope} onPick={(s) => asStudent(it, s)}>
                      <Button size="sm" icon={<UserCheck className="size-4" />}>It’s a student</Button>
                    </StudentPicker>
                    <Button size="sm" variant="secondary" icon={<UserRound className="size-4" />} onClick={() => asAdult(it)}>Adult / visitor</Button>
                    <Button size="sm" variant="secondary" icon={<EyeOff className="size-4" />} onClick={() => asBlur(it)}>Always blur</Button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
