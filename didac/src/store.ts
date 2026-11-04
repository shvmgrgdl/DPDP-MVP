import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { sha256 } from '@/lib/utils'
import { PHOTOS0, STUDENTS0, UPLOAD_PHOTO, type Photo, type Purpose, type Student } from './data'

export type Viewer = 'admin' | 'parent' | 'gallery'
export interface AuditEntry { n: number; t: string; actor: string; action: string; photoId?: string; detail: string; prev: string; hash: string }
export interface Lead {
  id: string; at: string; name: string; school: string; role: string; city: string; phone: string
  q1: string; q2: string; q3: 'yes' | 'maybe' | 'no' | ''; optIn: boolean; source: string
  stage: 'new' | 'qualified' | 'demo' | 'proposal' | 'paid'
}

interface State {
  students: Student[]; photos: Photo[]; published: Record<string, boolean>
  audit: AuditEntry[]; leads: Lead[]; visitors: number
  viewer: Viewer; childId: string; lang: 'en' | 'hi'
  setViewer: (v: Viewer) => void; setChild: (id: string) => void; setLang: (l: 'en' | 'hi') => void
  setPerm: (sid: string, p: Purpose, v: boolean) => void
  assignFace: (photoId: string, idx: number, to: string | 'adult') => void
  approve: (photoId: string) => void
  albumOnly: (photoId: string) => void
  upload: () => void
  openPhoto: (photoId: string) => void
  resetDemo: () => void
  addLead: (l: Omit<Lead, 'id' | 'at' | 'stage'>) => void
  setStage: (id: string, s: Lead['stage']) => void
  addVisitor: () => void
  resetLeads: () => void
}

const ACTORS: Record<Viewer, string> = { admin: 'School admin · Principal’s office', parent: 'Guardian', gallery: 'Gallery viewer' }
const genesis = '0'.repeat(64)
const now = () => new Date().toISOString()

function append(audit: AuditEntry[], e: Omit<AuditEntry, 'n' | 't' | 'prev' | 'hash'>): AuditEntry[] {
  const prev = audit.length ? audit[audit.length - 1].hash : genesis
  const t = now()
  const hash = sha256(prev + JSON.stringify({ ...e, t }))
  return [...audit, { ...e, n: audit.length + 1, t, prev, hash }]
}
export function verifyChain(audit: AuditEntry[]) {
  let prev = genesis
  for (const e of audit) {
    const { n, t, prev: p, hash, ...rest } = e
    if (p !== prev || sha256(prev + JSON.stringify({ ...rest, t })) !== hash) return false
    prev = hash
  }
  return true
}
const seedAudit = () => append(append([], { actor: 'System', action: 'Workspace created', detail: 'Annual Day event workspace with synthetic roster (4 students).' }), { actor: 'Photographer · Studio Lens', action: 'Uploaded 3 photos', detail: 'Faces detected and matched to roster; unmatched faces held for review.' })
const initial = () => ({ students: STUDENTS0, photos: PHOTOS0, published: {} as Record<string, boolean>, audit: seedAudit() })

export const useDemo = create<State>()(
  persist(
    (set, get) => ({
      ...initial(), leads: [], visitors: 0, viewer: 'admin', childId: 'S2', lang: 'en',
      setViewer: (viewer) => set({ viewer }),
      setChild: (childId) => set({ childId }),
      setLang: (lang) => set({ lang }),
      setPerm: (sid, p, v) => set((s) => {
        const st = s.students.find((x) => x.id === sid)!
        if (st.perms[p] === v) return {}
        const students = s.students.map((x) => (x.id === sid ? { ...x, perms: { ...x.perms, [p]: v } } : x))
        let audit = append(s.audit, { actor: `Guardian · ${st.guardian}`, action: v ? 'Permission granted' : 'Permission withdrawn', detail: `${st.name} · ${p === 'album' ? 'private parent album' : p === 'internal' ? 'inside school' : 'website & social'} · notice v1.2 (${s.lang === 'hi' ? 'Hindi' : 'English'})` })
        if (!v && p === 'public') {
          s.photos.filter((ph) => s.published[ph.id] && ph.faces.some((f) => f.studentId === sid)).forEach((ph) => {
            audit = append(audit, { actor: 'System', action: 'Takedown task created', photoId: ph.id, detail: `Live post includes ${st.name}, whose guardian withdrew public use.` })
          })
        }
        return { students, audit }
      }),
      assignFace: (photoId, idx, to) => set((s) => {
        const photos = s.photos.map((p) => p.id !== photoId ? p : { ...p, faces: p.faces.map((f, i) => i !== idx ? f : to === 'adult' ? { ...f, studentId: null, adult: true } : { ...f, studentId: to, adult: false }) })
        const who = to === 'adult' ? 'marked as not a student (adult)' : `matched to ${s.students.find((x) => x.id === to)?.name}`
        return { photos, audit: append(s.audit, { actor: ACTORS.admin, action: 'Face reviewed', photoId, detail: `Face ${idx + 1} ${who}.` }) }
      }),
      approve: (photoId) => set((s) => ({ published: { ...s.published, [photoId]: true }, audit: append(s.audit, { actor: ACTORS.admin, action: 'Approved for website & social', photoId, detail: 'All depicted students permitted; decision recorded.' }) })),
      albumOnly: (photoId) => set((s) => ({ audit: append(s.audit, { actor: ACTORS.admin, action: 'Kept to private parent album', photoId, detail: 'Public use withheld; visible only to guardians of children in the photo.' }) })),
      upload: () => set((s) => s.photos.some((p) => p.id === UPLOAD_PHOTO.id) ? {} : ({ photos: [...s.photos, UPLOAD_PHOTO], audit: append(s.audit, { actor: 'Photographer · Studio Lens', action: 'Uploaded 1 photo', photoId: UPLOAD_PHOTO.id, detail: 'One face detected, no confident roster match — sent to review.' }) })),
      openPhoto: (photoId) => set((s) => ({ audit: append(s.audit, { actor: ACTORS[s.viewer] === 'Guardian' ? `Guardian · ${s.students.find((x) => x.id === s.childId)?.guardian}` : ACTORS[s.viewer], action: 'Opened photo', photoId, detail: `Viewed in ${s.viewer === 'parent' ? 'parent app' : s.viewer === 'admin' ? 'admin console' : 'school gallery'}.` }) })),
      resetDemo: () => set({ ...initial(), viewer: 'admin', childId: 'S2' }),
      addLead: (l) => set((s) => {
        const qualified = l.q3 !== 'no' && l.q3 !== '' && /principal|owner|chair|director|head|management|trustee|admin/i.test(l.role)
        return { leads: [{ ...l, id: 'L' + Date.now().toString(36).toUpperCase(), at: now(), stage: qualified ? 'qualified' : 'new' }, ...s.leads], visitors: Math.max(s.visitors, s.leads.length + 1) }
      }),
      setStage: (id, stage) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, stage } : l)) })),
      addVisitor: () => set((s) => ({ visitors: s.visitors + 1 })),
      resetLeads: () => set({ leads: [], visitors: 0 }),
    }),
    { name: 'didac-demo-v1', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
)
export const getState = useDemo.getState
