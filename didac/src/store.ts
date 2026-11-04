import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { sha256 } from '@/lib/utils'
import { sessionId, traceId } from './lib/fake'
import type { Lang } from './i18n'
import { ACCOUNTS0, PHOTOS0, STUDENTS0, UPLOAD_PHOTO, type Photo, type Purpose, type Student } from './data'

export type Viewer = 'admin' | 'parent' | 'gallery'
export type AppRole = 'parent' | 'admin' | 'photographer' | 'gallery' | 'booth' | null
export interface AuditEntry { n: number; t: string; actor: string; action: string; photoId?: string; detail: string; dt?: string; dv?: (string | number)[]; app: string; lang: string; sid: string; trace?: string; prev: string; hash: string }
export interface Lead {
  id: string; at: string; name: string; school: string; role: string; city: string; phone: string
  q1: string; q2: string; q3: 'yes' | 'maybe' | 'no' | ''; optIn: boolean; source: string
  stage: 'new' | 'qualified' | 'demo' | 'proposal' | 'paid'
  owner: string; nextMeeting: string; notes: string
}
export interface Settings { waNumber: string; eventTag: string; contactEmail: string; contactPhone: string; owners: string }
export interface GuardianRequest { id: string; photoId: string; studentId: string; status: 'pending' | 'approved' | 'declined'; at: string; channel: string }
export interface Case { id: string; kind: 'Access' | 'Correction' | 'Erasure' | 'Takedown' | 'Wrong face' | 'Grievance'; studentId: string; photoId?: string; text: string; status: 'open' | 'resolved'; at: string; due: string }
export interface Share { id: string; photoId: string; link: string; expires: string; studentId: string }
export type Account = (typeof ACCOUNTS0)[string]
export type PermInput = Record<Purpose, boolean>

interface State {
  students: Student[]; photos: Photo[]; published: Record<string, boolean>
  audit: AuditEntry[]; leads: Lead[]; visitors: number
  requests: GuardianRequest[]; cases: Case[]; shares: Share[]
  accounts: Record<string, Account>; session: string | null
  role: AppRole; viewer: Viewer; childId: string; lang: Lang
  setRole: (r: AppRole) => void
  logEvent: (action: string, detail: string, dv?: (string | number)[], photoId?: string, trace?: string) => void
  login: (id: string, pw: string) => 'ok' | 'bad' | 'locked'
  signOut: () => void
  signInAs: (sid: string) => void
  changePassword: (sid: string, pw: string) => void
  resetPassword: (sid: string) => string
  setViewer: (v: Viewer) => void; setChild: (id: string) => void; setLang: (l: Lang) => void
  setPerm: (sid: string, p: Purpose, v: boolean) => void
  setAskEach: (sid: string, v: boolean) => void
  completeOnboarding: (sid: string, perms: PermInput, askEach: boolean) => string
  assignFace: (photoId: string, idx: number, to: string | 'adult') => void
  approve: (photoId: string) => void
  albumOnly: (photoId: string) => void
  askGuardian: (photoId: string, studentId: string) => void
  answerRequest: (id: string, approve: boolean) => void
  upload: () => void
  openPhoto: (photoId: string) => void
  downloadPhotos: (photoIds: string[]) => void
  shareLink: (photoId: string) => Share
  fileCase: (c: Omit<Case, 'id' | 'at' | 'due' | 'status'>) => string
  resolveCase: (id: string) => void
  resetDemo: () => void
  settings: Settings
  setSettings: (p: Partial<Settings>) => void
  markTakenDown: (photoId: string) => void
  addLead: (l: Omit<Lead, 'id' | 'at' | 'stage' | 'owner' | 'nextMeeting' | 'notes'>) => void
  updateLead: (id: string, p: Partial<Lead>) => void
  setStage: (id: string, s: Lead['stage']) => void
  addVisitor: () => void
  resetLeads: () => void
}

const D = (dt: string, dv: (string | number)[] = []) => ({ detail: dt.replace(/\{(\d+)\}/g, (_, i) => String(dv[+i])), dt, dv })
const genesis = '0'.repeat(64)
const now = () => new Date().toISOString()
const addDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString()
const rid = (p: string) => p + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
const PN: Record<Purpose, string> = { album: 'private parent album', internal: 'inside school', public: 'website & social' }

function append(audit: AuditEntry[], e: Omit<AuditEntry, 'n' | 't' | 'prev' | 'hash' | 'app' | 'lang' | 'sid'>): AuditEntry[] {
  const prev = audit.length ? audit[audit.length - 1].hash : genesis
  const t = now()
  let g: ReturnType<typeof useDemo.getState> | undefined
  try { g = useDemo.getState() } catch { /* store not created yet (seed) */ }
  const ctx = { app: g?.role ?? 'launcher', lang: g?.lang ?? 'en', sid: sessionId }
  const full = { ...e, ...ctx }
  const hash = sha256(prev + JSON.stringify({ ...full, t }))
  return [...audit, { ...full, n: audit.length + 1, t, prev, hash }]
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
const seedAudit = () => append(append([], { actor: 'System', action: 'Workspace created', ...D("Annual Day event workspace with synthetic roster (4 students).") }), { actor: 'Photographer · Studio Lens', action: 'Uploaded 5 photos', ...D("Faces detected and matched to roster; unmatched faces held for review.") })
const initial = () => ({ students: STUDENTS0, photos: PHOTOS0, published: {} as Record<string, boolean>, audit: seedAudit(), requests: [] as GuardianRequest[], cases: [] as Case[], shares: [] as Share[], accounts: ACCOUNTS0, session: null as string | null })
const actorNow = (s: { role: AppRole; viewer: Viewer; session: string | null; childId: string; accounts: Record<string, Account> }) => s.role === 'photographer' ? 'Photographer · Studio Lens' : s.viewer === 'parent' || s.role === 'parent' ? `Guardian ${s.accounts[s.session ?? s.childId]?.id ?? ''}`.trim() : s.viewer === 'admin' || s.role === 'admin' ? 'School admin · Principal’s office' : 'Gallery viewer'
const guardianOf = (s: { students: Student[] }, sid: string) => { const st = s.students.find((x) => x.id === sid)!; return { st, actor: `Guardian ${st.guardian}` } }

export const useDemo = create<State>()(
  persist(
    (set, get) => ({
      ...initial(), leads: [], visitors: 0, settings: { waNumber: (import.meta.env.VITE_WA_NUMBER as string | undefined)?.replace(/\D/g, '') ?? '', eventTag: 'DIDAC 2026', contactEmail: '', contactPhone: '', owners: 'Shivam, Additya' }, role: null, viewer: 'admin', childId: 'S2', lang: 'en',
      setRole: (role) => set({ role }),
      logEvent: (action, dt, dv = [], photoId, trace) => set((s) => ({ audit: append(s.audit, { actor: actorNow(s), action, ...D(dt, dv), photoId, trace }) })),
      setViewer: (viewer) => set({ viewer }),
      setChild: (childId) => set({ childId }),
      setLang: (lang) => set((s) => (s.lang === lang ? {} : { lang, audit: append(s.audit, { actor: actorNow(s), action: 'Language changed', ...D("Interface language set to {0}.", [lang]) }) })),
      setPerm: (sid, p, v) => set((s) => {
        const { st, actor } = guardianOf(s, sid)
        if (st.perms[p] === v) return {}
        const students = s.students.map((x) => (x.id === sid ? { ...x, perms: { ...x.perms, [p]: v }, askEach: p === 'public' && v ? false : x.askEach } : x))
        let audit = append(s.audit, { actor, action: v ? 'Permission granted' : 'Permission withdrawn', ...D("{0} · {1} · notice v1.2 ({2})", [st.name, PN[p], s.lang === 'hi' ? 'Hindi' : 'English']) })
        if (!v && p === 'public') s.photos.filter((ph) => s.published[ph.id] && ph.faces.some((f) => f.studentId === sid)).forEach((ph) => { audit = append(audit, { actor: 'System', action: 'Takedown task created', photoId: ph.id, ...D("Live post includes {0}, whose guardian withdrew public use.", [st.name]) }) })
        return { students, audit }
      }),
      setAskEach: (sid, v) => set((s) => ({ students: s.students.map((x) => (x.id === sid ? { ...x, askEach: v } : x)) })),
      login: (id, pw) => {
        const s = get(); const sid = Object.keys(s.accounts).find((k) => s.accounts[k].id === id.trim().toUpperCase())
        if (!sid) { set({ audit: append(s.audit, { actor: 'Unknown ID', action: 'Sign-in failed', ...D("ID not recognised.") }) }); return 'bad' }
        const a = s.accounts[sid]
        if (a.failed >= 5) { set({ audit: append(s.audit, { actor: `Guardian ${a.id}`, action: 'Sign-in blocked', ...D("Account is locked after repeated failures.") }) }); return 'locked' }
        if (a.password !== pw) { set({ accounts: { ...s.accounts, [sid]: { ...a, failed: a.failed + 1 } }, audit: append(s.audit, { actor: `Guardian ${a.id}`, action: a.failed + 1 >= 5 ? 'Account locked' : 'Sign-in failed', ...D("Wrong password (attempt {0} of 5).", [a.failed + 1]) }) }); return a.failed + 1 >= 5 ? 'locked' : 'bad' }
        set({ accounts: { ...s.accounts, [sid]: { ...a, failed: 0 } }, session: sid, childId: sid, audit: append(s.audit, { actor: `Guardian ${a.id}`, action: 'Signed in', ...D("School-issued ID. No name or phone number is held by this app.") }) })
        return 'ok'
      },
      signOut: () => set((s) => ({ session: null, audit: s.session ? append(s.audit, { actor: `Guardian ${s.accounts[s.session].id}`, action: 'Signed out', ...D("Session ended.") }) : s.audit })),
      signInAs: (sid) => set((s) => ({ session: sid, childId: sid, accounts: { ...s.accounts, [sid]: { ...s.accounts[sid], mustChange: false } } })),
      changePassword: (sid, pw) => set((s) => ({ accounts: { ...s.accounts, [sid]: { ...s.accounts[sid], password: pw, mustChange: false } }, audit: append(s.audit, { actor: `Guardian ${s.accounts[sid].id}`, action: 'Password changed', ...D("Temporary password replaced at first sign-in.") }) })),
      resetPassword: (sid) => { const s = get(); const w = ['maple', 'river', 'cedar', 'lamp', 'olive', 'moon', 'coral', 'bell', 'amber', 'pine']; const temp = `${w[Math.floor(Math.random() * 10)]}-${w[Math.floor(Math.random() * 10)]}-${100 + Math.floor(Math.random() * 900)}`; set({ accounts: { ...s.accounts, [sid]: { ...s.accounts[sid], temp, password: temp, mustChange: true, failed: 0, resets: s.accounts[sid].resets + 1 } }, audit: append(s.audit, { actor: 'School admin · Principal’s office', action: 'Login reissued', ...D("New temporary password issued for {0}; guardian must change it at next sign-in.", [s.accounts[sid].id]) }) }); return temp },
      completeOnboarding: (sid, perms, askEach) => {
        const s = get(); const { st, actor } = guardianOf(s, sid)
        const t = now()
        let audit = append(s.audit, { actor, action: 'Guardian confirmed', ...D("School-issued ID {0} linked to student record {1} by the school.", [st.guardian, st.admNo]) })
        audit = append(audit, { actor, action: 'Choices saved', ...D("{0} · {1} · notice v1.2 ({2})", [st.name, (Object.keys(perms) as Purpose[]).map((k) => `${PN[k]}: ${perms[k] ? 'yes' : askEach && k === 'public' ? 'ask each time' : 'no'}`).join(' · '), s.lang === 'hi' ? 'Hindi' : 'English']) })
        set({ students: s.students.map((x) => (x.id === sid ? { ...x, perms, askEach, onboarded: true, consentAt: t } : x)), audit })
        return audit[audit.length - 1].hash
      },
      assignFace: (photoId, idx, to) => set((s) => {
        const photos = s.photos.map((p) => p.id !== photoId ? p : { ...p, faces: p.faces.map((f, i) => i !== idx ? f : to === 'adult' ? { ...f, studentId: null, adult: true } : { ...f, studentId: to, adult: false }) })
        const who = to === 'adult' ? 'marked as not a student (adult)' : `matched to ${s.students.find((x) => x.id === to)?.name}`
        return { photos, audit: append(s.audit, { actor: 'School admin · Principal’s office', action: 'Face reviewed', photoId, ...D("Face {0} {1}.", [idx + 1, who]) }) }
      }),
      approve: (photoId) => set((s) => ({ published: { ...s.published, [photoId]: true }, audit: append(s.audit, { actor: 'School admin · Principal’s office', action: 'Approved for website & social', photoId, ...D("All depicted students permitted; decision recorded.") }) })),
      albumOnly: (photoId) => set((s) => ({ audit: append(s.audit, { actor: 'School admin · Principal’s office', action: 'Kept to private parent album', photoId, ...D("Public use withheld; visible only to guardians of children in the photo.") }) })),
      askGuardian: (photoId, studentId) => set((s) => {
        if (s.requests.some((r) => r.photoId === photoId && r.studentId === studentId && r.status === 'pending')) return {}
        const { st } = guardianOf(s, studentId)
        return { requests: [{ id: rid('REQ'), photoId, studentId, status: 'pending', at: now(), channel: 'Instagram & school website' }, ...s.requests], audit: append(s.audit, { actor: 'School admin · Principal’s office', action: 'Asked guardian to approve', photoId, ...D("Request sent to {0} for one-time public use.", [st.guardian]) }) }
      }),
      answerRequest: (id, ok) => set((s) => {
        const r = s.requests.find((x) => x.id === id); if (!r || r.status !== 'pending') return {}
        const { st, actor } = guardianOf(s, r.studentId)
        const students = ok ? s.students.map((x) => (x.id === r.studentId ? { ...x, approvals: [...x.approvals, r.photoId] } : x)) : s.students
        return { students, requests: s.requests.map((x) => (x.id === id ? { ...x, status: ok ? 'approved' : 'declined' } : x)), audit: append(s.audit, { actor, action: ok ? 'One-time approval given' : 'Request declined', photoId: r.photoId, detail: `${st.name} · ${ok ? 'allowed for this photo only' : 'public use stays off'}.` }) }
      }),
      upload: () => set((s) => s.photos.some((p) => p.id === UPLOAD_PHOTO.id) ? {} : ({ photos: [...s.photos, UPLOAD_PHOTO], audit: append(s.audit, { actor: 'Photographer · Studio Lens', action: 'Uploaded 1 photo', photoId: UPLOAD_PHOTO.id, ...D("One face detected, no confident roster match — sent to review.") }) })),
      openPhoto: (photoId) => set((s) => {
        const who = s.viewer === 'parent' ? guardianOf(s, s.childId).actor : s.viewer === 'admin' ? 'School admin · Principal’s office' : 'Gallery viewer'
        return { audit: append(s.audit, { actor: who, action: 'Opened photo', photoId, ...D("Viewed in {0}.", [s.viewer === 'parent' ? 'parent app' : s.viewer === 'admin' ? 'admin console' : 'school gallery']) }) }
      }),
      downloadPhotos: (ids) => set((s) => { const { actor } = guardianOf(s, s.childId); let audit = s.audit; ids.forEach((id) => { const tr = traceId(actor, id); audit = append(audit, { actor, action: 'Downloaded photo', photoId: id, trace: tr, ...D("Watermarked copy saved to the guardian’s device (trace {0}). Copies outside the app cannot be recalled.", [tr]) }) }); return { audit } }),
      shareLink: (photoId) => {
        const s = get(); const { actor } = guardianOf(s, s.childId)
        const sh: Share = { id: rid('SH'), photoId, link: `https://media.school.example/s/${Math.random().toString(36).slice(2, 8)}`, expires: addDays(7), studentId: s.childId }
        set({ shares: [sh, ...s.shares], audit: append(s.audit, { actor, action: 'Created family share link', photoId, ...D("Controlled link, expires in 7 days; can be revoked while active.") }) })
        return sh
      },
      fileCase: (c) => {
        const id = rid('CASE'); const s = get(); const { actor } = guardianOf(s, c.studentId)
        set({ cases: [{ ...c, id, status: 'open', at: now(), due: addDays(30) }, ...s.cases], audit: append(s.audit, { actor, action: `${c.kind} request`, photoId: c.photoId, detail: `${id} · ${c.text.slice(0, 80)}` }) })
        return id
      },
      resolveCase: (id) => set((s) => ({ cases: s.cases.map((c) => (c.id === id ? { ...c, status: 'resolved' } : c)), audit: append(s.audit, { actor: 'School admin · Principal’s office', action: 'Request resolved', detail: id }) })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      markTakenDown: (photoId) => set((s) => ({ published: { ...s.published, [photoId]: false }, audit: append(s.audit, { actor: 'School admin · Principal’s office', action: 'Taken down', photoId, ...D("Live post removed after a guardian withdrew public use.") }) })),
      updateLead: (id, p) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...p } : l)) })),
      resetDemo: () => set({ ...initial(), viewer: 'admin', childId: 'S2' }),
      addLead: (l) => set((s) => {
        const qualified = l.q3 !== 'no' && l.q3 !== '' && /principal|owner|chair|director|head|management|trustee|admin/i.test(l.role)
        return { leads: [{ ...l, id: 'L' + Date.now().toString(36).toUpperCase(), at: now(), stage: qualified ? 'qualified' : 'new', owner: s.settings.owners.split(',')[0].trim(), nextMeeting: '', notes: '' }, ...s.leads], visitors: Math.max(s.visitors, s.leads.length + 1) }
      }),
      setStage: (id, stage) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, stage } : l)) })),
      addVisitor: () => set((s) => ({ visitors: s.visitors + 1 })),
      resetLeads: () => set({ leads: [], visitors: 0 }),
    }),
    { name: 'didac-demo-v4', storage: createJSONStorage(() => localStorage), version: 4 },
  ),
)
export const getState = useDemo.getState
