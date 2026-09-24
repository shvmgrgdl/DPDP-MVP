import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { createSeed, DATA_VERSION, pkey, type AppData } from '@/data/seed'
import type {
  CaptureChannel, DestinationKey, Evidence, ExpertRequest, FaceInstance, Incident, IncidentStep, MediaPurposeKey,
  Notification, PermissionStatus, PrivacyRequest, Publication, RequestStep, RoleKey, School, Task, VerificationMethod, Vendor,
} from '@/data/types'
import { affectedPublications } from '@/engine/permission'
import { DEST, MEDIA_PURPOSES } from '@/data/reference'
import { addDays, sha256 } from '@/lib/utils'

const idbStorage: StateStorage = {
  getItem: async (k) => (await idbGet(k)) ?? null,
  setItem: async (k, v) => idbSet(k, v),
  removeItem: async (k) => idbDel(k),
}

/** Demo clock: real time, so new events sort after seed events. */
const now = () => new Date().toISOString()

export interface UIState {
  role: RoleKey
  storyStep: number | null
  techOverlay: boolean
  directorOpen: boolean
  evidenceDrawer: string | null // evidence id
  paletteOpen: boolean
  hydrated: boolean
}

export interface Actions {
  setRole: (r: RoleKey) => void
  setUI: (p: Partial<UIState>) => void
  updateSchool: (p: Partial<School>) => void
  resetDemo: () => void
  addEvidence: (e: Omit<Evidence, 'id' | 'prevHash' | 'hash' | 'at'> & { at?: string }) => string
  setPermission: (studentId: string, purpose: MediaPurposeKey, status: PermissionStatus, o: { via: CaptureChannel; by: string }) => { evidenceId: string; takedowns: Publication[] }
  verifyGuardian: (guardianId: string, method: VerificationMethod) => void
  setFace: (assetId: string, faceId: string, p: Partial<FaceInstance>) => void
  publish: (items: { assetId: string; variant: 'original' | 'blurred' }[], dest: DestinationKey) => string
  requestTakedown: (pubId: string) => void
  addRequest: (r: Omit<PrivacyRequest, 'id' | 'steps'> & { steps?: RequestStep[] }) => string
  updateRequest: (id: string, p: Partial<PrivacyRequest>, step?: string) => void
  updateVendor: (id: string, p: Partial<Vendor>) => void
  addIncident: (i: Omit<Incident, 'id'>) => string
  updateIncident: (id: string, p: Partial<Incident>, step?: Omit<IncidentStep, 'at'>) => void
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'status'>) => string
  completeTask: (id: string) => void
  addExpertRequest: (e: Omit<ExpertRequest, 'id' | 'createdAt' | 'messages'> & { messages?: ExpertRequest['messages'] }) => string
  updateExpert: (id: string, p: Partial<ExpertRequest>, msg?: { from: string; text: string }) => void
  approveNotice: (id: string, by: string) => void
  notify: (n: Omit<Notification, 'id' | 'at' | 'read'>) => void
  markAllRead: () => void
  setObligationStatus: (id: string, status: AppData['obligations'][number]['status']) => void
}

export type AppState = AppData & UIState & Actions

const initialUI: UIState = {
  role: 'chairman', storyStep: null, techOverlay: false, directorOpen: false, evidenceDrawer: null, paletteOpen: false, hydrated: false,
}

let seq = 5000

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const addEvidence: Actions['addEvidence'] = (e) => {
        const at = e.at ?? now()
        const d = new Date(at)
        const id = `EV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${seq++}`
        const evidence = get().evidence
        const prevHash = evidence.length ? evidence[evidence.length - 1].hash : '0'.repeat(64)
        const body = { id, at, type: e.type, title: e.title, actor: e.actor, refs: e.refs, payload: e.payload ?? null }
        const rec: Evidence = { ...body, payload: e.payload, prevHash, hash: sha256(prevHash + JSON.stringify(body)) }
        set({ evidence: [...evidence, rec] })
        return id
      }
      const notify: Actions['notify'] = (n) =>
        set({ notifications: [{ ...n, id: `N-${seq++}`, at: now(), read: false }, ...get().notifications] })

      return {
        ...createSeed(),
        ...initialUI,
        setRole: (role) => set({ role }),
        setUI: (p) => set(p),
        updateSchool: (p) => set({ school: { ...get().school, ...p } }),
        resetDemo: () => {
          const keep = { school: get().school }
          set({ ...createSeed(), ...initialUI, hydrated: true, school: { ...createSeed().school, name: keep.school.name, shortName: keep.school.shortName, city: keep.school.city, logoDataUrl: keep.school.logoDataUrl } })
        },
        addEvidence,
        setPermission: (studentId, purpose, status, o) => {
          const k = pkey(studentId, purpose)
          const cur = get().permissions[k]
          const student = get().students.find((s) => s.id === studentId)!
          const label = MEDIA_PURPOSES.find((p) => p.key === purpose)!.label
          const evidenceId = addEvidence({
            type: 'permission', title: `${status === 'granted' ? 'Allowed' : status === 'withdrawn' ? 'Withdrew' : 'Declined'} “${label}” for ${student.name}`,
            actor: o.by, refs: [studentId, purpose, cur?.noticeVersion ?? 'v2.1'], payload: { via: o.via, from: cur?.status, to: status },
          })
          const at = now()
          const next = {
            ...(cur ?? { studentId, purpose, guardianId: o.by, noticeVersion: 'v2.1', history: [] }),
            status, at, via: o.via, evidenceId,
            history: [...(cur?.history ?? []), { status, at, via: o.via, by: o.by, noticeVersion: cur?.noticeVersion ?? 'v2.1', evidenceId }],
          }
          set({ permissions: { ...get().permissions, [k]: next } })
          // propagation: live posts that now include a blocked child → takedown tasks
          const takedowns = affectedPublications(get(), get().assets, get().publications, studentId)
          if (takedowns.length) {
            set({ publications: get().publications.map((p) => (takedowns.some((t) => t.id === p.id) ? { ...p, status: 'takedown-requested' } : p)) })
            takedowns.forEach((p) => {
              get().addTask({ title: `Take down ${DEST[p.destination].label} post ${p.id} — ${student.name}'s parent withdrew permission`, area: 'media', ownerId: 'U-MKT', dueAt: addDays(at, 2), link: '/publish/live', kind: 'takedown' })
            })
            notify({ text: `${student.name}: permission changed — ${takedowns.length} live post${takedowns.length > 1 ? 's' : ''} flagged for takedown`, link: '/publish/live', roles: ['marketing', 'principal', 'office', 'chairman'] })
            addEvidence({ type: 'publication', title: `Takedown requested for ${takedowns.map((t) => t.id).join(', ')} after permission change`, actor: 'system', refs: takedowns.map((t) => t.id) })
          }
          return { evidenceId, takedowns }
        },
        verifyGuardian: (guardianId, method) => {
          set({ guardians: get().guardians.map((g) => (g.id === guardianId ? { ...g, verification: { method, at: now() }, onboarded: true } : g)) })
          addEvidence({ type: 'permission', title: `Parent verified via ${method.replace('-', ' ')}`, actor: guardianId, refs: [guardianId] })
        },
        setFace: (assetId, faceId, p) => {
          set({ assets: get().assets.map((a) => (a.id !== assetId ? a : { ...a, faces: a.faces.map((f) => (f.id === faceId ? { ...f, ...p } : f)) })) })
          addEvidence({ type: 'review', title: `Face review on ${assetId}: ${p.review ?? 'updated'}${p.studentId ? ` → ${get().students.find((s) => s.id === p.studentId)?.name}` : ''}`, actor: get().role, refs: [assetId, faceId] })
        },
        publish: (items, dest) => {
          const evidenceId = addEvidence({ type: 'publication', title: `Exported ${items.length} item${items.length > 1 ? 's' : ''} for ${DEST[dest].label} via Publish Guard`, actor: 'U-MKT', refs: items.map((i) => i.assetId), payload: { dest, blurred: items.filter((i) => i.variant === 'blurred').length } })
          const at = now()
          const pubs: Publication[] = items.map((i) => ({ id: `PUB-${seq++}`, assetId: i.assetId, destination: dest, variant: i.variant, at, by: 'U-MKT', evidenceId, status: 'live' }))
          set({ publications: [...pubs, ...get().publications] })
          return evidenceId
        },
        requestTakedown: (pubId) => {
          set({ publications: get().publications.map((p) => (p.id === pubId ? { ...p, status: 'removed' } : p)) })
          addEvidence({ type: 'publication', title: `Post ${pubId} taken down`, actor: 'U-MKT', refs: [pubId] })
        },
        addRequest: (r) => {
          const id = `REQ-${1045 + get().requests.filter((x) => x.id >= 'REQ-1045').length}`
          const evidenceId = addEvidence({ type: 'request', title: `Request ${id} received (${r.type})`, actor: r.guardianId, refs: [id, r.studentId] })
          set({ requests: [{ ...r, id, steps: r.steps ?? [{ at: r.receivedAt, by: r.guardianId, text: 'Request received', evidenceId }] }, ...get().requests] })
          notify({ text: `New ${r.type.replace('-', ' ')} request ${id}`, link: `/requests/${id}`, roles: ['principal', 'office', 'desk'] })
          return id
        },
        updateRequest: (id, p, step) => {
          const evidenceId = step ? addEvidence({ type: 'request', title: `${id}: ${step}`, actor: get().role, refs: [id] }) : undefined
          set({ requests: get().requests.map((r) => (r.id !== id ? r : { ...r, ...p, steps: step ? [...r.steps, { at: now(), by: get().role, text: step, evidenceId }] : r.steps })) })
        },
        updateVendor: (id, p) => {
          set({ vendors: get().vendors.map((v) => (v.id === id ? { ...v, ...p } : v)) })
          addEvidence({ type: 'vendor', title: `Vendor ${id} updated`, actor: get().role, refs: [id], payload: p as Record<string, unknown> })
        },
        addIncident: (i) => {
          const id = `INC-2026-${String(4 + get().incidents.length).padStart(2, '0')}`
          set({ incidents: [{ ...i, id }, ...get().incidents] })
          addEvidence({ type: 'incident', title: `Incident ${id} opened: ${i.title}`, actor: get().role, refs: [id] })
          notify({ text: `Incident ${id} opened — Board clock started`, link: `/trust/incidents/${id}`, roles: ['principal', 'chairman', 'it', 'desk', 'office'] })
          return id
        },
        updateIncident: (id, p, step) => {
          if (step) addEvidence({ type: 'incident', title: `${id}: ${step.text}`, actor: step.by, refs: [id] })
          set({ incidents: get().incidents.map((x) => (x.id !== id ? x : { ...x, ...p, steps: step ? [...x.steps, { ...step, at: now() }] : x.steps })) })
        },
        addTask: (t) => {
          const id = `TSK-${seq++}`
          set({ tasks: [{ ...t, id, createdAt: now(), status: 'open' }, ...get().tasks] })
          return id
        },
        completeTask: (id) => {
          const t = get().tasks.find((x) => x.id === id)
          set({ tasks: get().tasks.map((x) => (x.id === id ? { ...x, status: 'done' } : x)) })
          if (t) addEvidence({ type: 'readiness', title: `Task done: ${t.title}`, actor: get().role, refs: [id] })
        },
        addExpertRequest: (e) => {
          const id = `EXP-${seq++}`
          set({ experts: [{ ...e, id, createdAt: now(), messages: e.messages ?? [] }, ...get().experts] })
          addEvidence({ type: 'expert', title: `Expert request ${id}: ${e.title}`, actor: get().role, refs: [id, ...e.attachments] })
          notify({ text: `Expert request sent: ${e.title}`, link: `/experts`, roles: ['principal', 'chairman', 'desk', 'partner'] })
          return id
        },
        updateExpert: (id, p, msg) =>
          set({ experts: get().experts.map((x) => (x.id !== id ? x : { ...x, ...p, messages: msg ? [...x.messages, { ...msg, at: now() }] : x.messages })) }),
        approveNotice: (id, by) => {
          set({
            notices: get().notices.map((n) => (n.id === id ? { ...n, status: 'live', approvedBy: by, publishedAt: now() } : n.status === 'live' ? { ...n, status: 'retired' } : n)),
            tasks: get().tasks.map((t) => (t.kind === 'approval' && t.link === '/privacy/notices' ? { ...t, status: 'done' } : t)),
          })
          addEvidence({ type: 'notice', title: `Notice ${id} approved and published`, actor: by, refs: [id] })
        },
        notify,
        markAllRead: () => set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),
        setObligationStatus: (id, status) => set({ obligations: get().obligations.map((o) => (o.id === id ? { ...o, status } : o)) }),
      }
    },
    {
      name: 'school-dpdp-os',
      version: DATA_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => {
        const { hydrated, paletteOpen, directorOpen, evidenceDrawer, ...rest } = s
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as Partial<AppState>
      },
      migrate: () => ({}) as AppState, // version bump → fresh seed
      onRehydrateStorage: () => (state) => {
        // continue id sequence above anything already persisted (ids must never repeat after reload)
        if (state) {
          const all = [...state.evidence, ...state.tasks, ...state.notifications, ...state.publications, ...state.experts, ...state.requests].map((x) => x.id)
          for (const id of all) { const n = Number(/(\d+)$/.exec(id)?.[1] ?? 0); if (n >= seq && n < 1e7) seq = n + 1 }
        }
        useApp.setState({ hydrated: true })
      },
    },
  ),
)

/** Convenience selectors */
export const usePerson = (id?: string) => useApp((s) => s.people.find((p) => p.id === id))
export const personName = (id: string) => {
  const s = useApp.getState()
  return s.people.find((p) => p.id === id)?.name ?? s.guardians.find((g) => g.id === id)?.name ?? (id === 'system' ? 'System' : id)
}
export { pkey }
