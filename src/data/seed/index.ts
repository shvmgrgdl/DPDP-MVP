import manifest from '../media-manifest.json'
import type {
  ClassSection, Control, Evidence, ExpertRequest, Guardian, Incident, MediaAsset, MediaPurposeKey, NoticeVersion,
  Notification, Obligation, Permission, PermissionStatus, Person, PrivacyRequest, Publication, RetentionRule, School,
  SchoolEvent, Student, Task, TrainingModule, Vendor,
} from '../types'
import { MEDIA_PURPOSES } from '../reference'
import { FIRST_F, FIRST_M, HOUSES, PARENT_F, PARENT_M, SURNAMES } from './names'
import { addDays, addHours, DEMO_NOW, pick, pub, rng, sha256 } from '@/lib/utils'

export interface ManifestFace { box: [number, number, number, number]; person: string | null; score: number; main?: boolean; adult?: boolean }
export interface ManifestAsset { id: string; event: string; src: string; w: number; h: number; faces: ManifestFace[]; title?: string }
export interface ManifestVideo {
  id: string; event: string; src: string; w: number; h: number; duration: number; fps: number; title?: string
  tracks: { trackId: string; person: string | null; frames: [number, number, number, number, number][] }[]
}
export interface Manifest { version: number; generatedAt: string | null; assets: ManifestAsset[]; videos: ManifestVideo[] }

export interface AppData {
  version: number
  school: School
  people: Person[]
  classes: ClassSection[]
  students: Student[]
  guardians: Guardian[]
  permissions: Record<string, Permission>
  notices: NoticeVersion[]
  events: SchoolEvent[]
  assets: MediaAsset[]
  publications: Publication[]
  requests: PrivacyRequest[]
  vendors: Vendor[]
  obligations: Obligation[]
  controls: Control[]
  incidents: Incident[]
  retention: RetentionRule[]
  tasks: Task[]
  experts: ExpertRequest[]
  evidence: Evidence[]
  training: TrainingModule[]
  notifications: Notification[]
  /** manifest personId → studentId (null = stays unknown). Used by live upload matching. */
  faceIndex: Record<string, string | null>
}

export const DATA_VERSION = 7
export const pkey = (studentId: string, purpose: MediaPurposeKey) => `${studentId}|${purpose}`

/** Hero students in Class 5B. Order = assignment priority onto the most frequent faces in the media manifest. */
export const HEROES = [
  { name: 'Diya Patel', g: 'F', profile: 'all-public', guardian: ['Sunita Patel', 'Mother'] },
  { name: 'Kabir Singh', g: 'M', profile: 'school-and-parents', guardian: ['Harpreet Singh', 'Father'] },
  { name: 'Aarav Sharma', g: 'M', profile: 'all-public', guardian: ['Neha Sharma', 'Mother'] },
  { name: 'Ananya Reddy', g: 'F', profile: 'all-public', guardian: ['Srinivas Reddy', 'Father'] },
  { name: 'Vihaan Gupta', g: 'M', profile: 'no-promotion', guardian: ['Amit Gupta', 'Father'] },
  { name: 'Ishita Nair', g: 'F', profile: 'all-public', guardian: ['Deepa Nair', 'Mother'] },
  { name: 'Zoya Qureshi', g: 'F', profile: 'protected', guardian: ['Farah Qureshi', 'Mother'] },
  { name: 'Arjun Mehta', g: 'M', profile: 'pending', guardian: ['Rohit Mehta', 'Father'] },
  { name: 'Saanvi Joshi', g: 'F', profile: 'school-and-parents', guardian: ['Kavita Joshi', 'Mother'] },
  { name: 'Reyansh Khan', g: 'M', profile: 'all-public', guardian: ['Imran Khan', 'Father'] },
] as const

type Profile = (typeof HEROES)[number]['profile'] | 'random'

const GRADES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const gradeLabel = (g: string) => (/^\d+$/.test(g) ? `Class ${g}` : g)

export function createSeed(): AppData {
  const r = rng(20260924)
  const T = (iso: string) => new Date(iso).toISOString()
  const now = T(DEMO_NOW)

  // ---------- evidence chain ----------
  const evidence: Evidence[] = []
  let evSeq = 1000
  const ev = (e: Omit<Evidence, 'id' | 'prevHash' | 'hash'> & { id?: string }): string => {
    const d = new Date(e.at)
    const id = e.id ?? `EV-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}-${evSeq++}`
    const prevHash = evidence.length ? evidence[evidence.length - 1].hash : '0'.repeat(64)
    const body = { id, at: e.at, type: e.type, title: e.title, actor: e.actor, refs: e.refs, payload: e.payload ?? null }
    evidence.push({ ...body, payload: e.payload, prevHash, hash: sha256(prevHash + JSON.stringify(body)) })
    return id
  }

  // ---------- school & people ----------
  const school: School = {
    name: 'Amaltas International School',
    shortName: 'Amaltas',
    city: 'Jaipur',
    state: 'Rajasthan',
    board: 'CBSE',
    campuses: 1,
    privacyContact: { name: 'Anil Verma', role: 'Privacy coordinator', email: 'privacy@amaltas.edu.in', phone: '+91 141 400 2210' },
    sdfStatus: 'not-notified',
    mediaCaption: 'Demo images · licensed stock',
  }
  const people: Person[] = [
    { id: 'U-CHAIR', name: 'Rajiv Malhotra', role: 'chairman', title: 'Chairman', email: 'chairman@amaltas.edu.in' },
    { id: 'U-PRIN', name: 'Dr. Meera Iyer', role: 'principal', title: 'Principal', email: 'principal@amaltas.edu.in' },
    { id: 'U-OFFICE', name: 'Anil Verma', role: 'office', title: 'Privacy coordinator', email: 'privacy@amaltas.edu.in' },
    { id: 'U-MKT', name: 'Ritu Sharma', role: 'marketing', title: 'Marketing & communications', email: 'ritu.s@amaltas.edu.in' },
    { id: 'U-TEACH', name: 'Neha Kapoor', role: 'teacher', title: 'Class teacher, 5B', email: 'neha.k@amaltas.edu.in', scope: '5B' },
    { id: 'U-PHOTO', name: 'Rohan Das', role: 'photographer', title: 'SnapStory Photography (guest)', email: 'rohan@snapstory.in' },
    { id: 'U-IT', name: 'Sandeep Rao', role: 'it', title: 'IT head', email: 'it@amaltas.edu.in' },
    { id: 'U-DESK', name: 'Priya Nair', role: 'desk', title: 'Privacy desk lead, School DPDP OS', email: 'desk@schooldpdpos.in' },
    { id: 'U-PARTNER', name: 'Adv. Kavita Menon', role: 'partner', title: 'Privacy counsel, Menon & Associates', email: 'kavita@menonlaw.in' },
  ]

  // ---------- classes & students ----------
  const classes: ClassSection[] = []
  const students: Student[] = []
  const guardians: Guardian[] = []
  const sectionsFor = (g: string) => (['Nursery', 'LKG', 'UKG'].includes(g) ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'])
  for (const g of GRADES) for (const s of sectionsFor(g)) {
    const id = `${/^\d+$/.test(g) ? g : g.slice(0, 3).toUpperCase()}${s}`
    classes.push({ id, grade: g, section: s, label: `${gradeLabel(g)}${/^\d+$/.test(g) ? s : ` ${s}`}`, teacherId: id === '5B' ? 'U-TEACH' : undefined })
  }
  const TOTAL = 1512
  const perClass = Math.floor(TOTAL / classes.length)
  let extra = TOTAL - perClass * classes.length
  let sid = 1
  let gid = 1
  const newGuardian = (name: string, relation: Guardian['relation'], lang: 'en' | 'hi'): Guardian => {
    const g: Guardian = {
      id: `G-${String(gid++).padStart(4, '0')}`, name, relation,
      phone: `+91 9${Math.floor(r() * 9)}XXX XX${String(Math.floor(r() * 100)).padStart(2, '0')}`,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@gmail.com`, lang, studentIds: [], onboarded: true,
    }
    guardians.push(g)
    return g
  }
  const heroStudentIds: string[] = []
  for (const c of classes) {
    let n = perClass + (extra-- > 0 ? 1 : 0)
    const heroesHere = c.id === '5B' ? [...HEROES] : []
    for (let i = 0; i < n; i++) {
      const hero = heroesHere[i]
      const gender: 'F' | 'M' = hero ? (hero.g as 'F' | 'M') : r() < 0.49 ? 'F' : 'M'
      const name = hero ? hero.name : `${pick(r, gender === 'F' ? FIRST_F : FIRST_M)} ${pick(r, SURNAMES)}`
      const surname = name.split(' ').slice(1).join(' ')
      const id = hero ? `STU-5B${String(i + 1).padStart(2, '0')}` : `STU-${String(sid++).padStart(4, '0')}`
      // siblings: ~9% share an existing guardian with same surname
      let g: Guardian | undefined
      if (!g) {
        if (hero) g = newGuardian(hero.guardian[0], hero.guardian[1] as Guardian['relation'], 'en')
        else {
          const mom = r() < 0.55
          g = newGuardian(`${pick(r, mom ? PARENT_F : PARENT_M)} ${surname}`, mom ? 'Mother' : 'Father', r() < 0.28 ? 'hi' : 'en')
        }
      }
      const grade = c.grade
      const age = /^\d+$/.test(grade) ? 5 + Number(grade) : grade === 'UKG' ? 5 : grade === 'LKG' ? 4 : 3
      const st: Student = {
        id, admissionNo: `AIS/${2026 - (age - 3)}/${String(1000 + students.length).slice(-4)}`, name, classId: c.id, gender,
        dob: `${2026 - age - 1}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`,
        guardianIds: [g.id], house: pick(r, HOUSES), hero: !!hero, protected: hero?.profile === 'protected',
      }
      g.studentIds.push(st.id)
      students.push(st)
      if (hero) heroStudentIds.push(st.id)
    }
  }
  // siblings: merge families (same surname, different classes) until exactly TARGET_FAMILIES remain
  const TARGET_FAMILIES = 1388
  {
    const bySurname = new Map<string, Student[]>()
    for (const st of students) if (!st.hero) {
      const sn = st.name.split(' ').slice(1).join(' ')
      bySurname.set(sn, [...(bySurname.get(sn) ?? []), st])
    }
    let merges = guardians.length - TARGET_FAMILIES
    const removed = new Set<string>()
    outer: for (const group of bySurname.values()) {
      for (let i = 0; i + 1 < group.length; i += 2) {
        if (merges <= 0) break outer
        const [a, b] = [group[i], group[i + 1]]
        if (a.classId === b.classId) continue
        const ga = guardians.find((x) => x.id === a.guardianIds[0])!
        const gb = guardians.find((x) => x.id === b.guardianIds[0])!
        if (ga === gb || ga.studentIds.length > 1 || gb.studentIds.length > 1) continue
        ga.studentIds.push(b.id)
        b.guardianIds = [ga.id]
        removed.add(gb.id)
        merges--
      }
    }
    for (let i = guardians.length - 1; i >= 0; i--) if (removed.has(guardians[i].id)) guardians.splice(i, 1)
  }

  // extra protected (safeguarding) children across school: 5 more (6 total)
  students.filter((s) => !s.hero).filter((_, i) => i % 257 === 13).slice(0, 5).forEach((s) => (s.protected = true))
  const heroByName = (n: string) => students.find((s) => s.name === n && s.hero)!

  // ---------- families onboarding: 1,271 of families set up ----------
  const nonHeroFamilies = guardians.filter((g) => !g.studentIds.some((id) => heroStudentIds.includes(id)))
  const targetOnboarded = 1271
  const heroFamiliesOnboarded = HEROES.filter((h) => h.profile !== 'pending').length
  const notOnboardedCount = guardians.length - targetOnboarded
  // mark the needed number of non-hero families as not yet onboarded (+ Arjun's family)
  const arjunG = guardians.find((g) => g.studentIds.includes(heroByName('Arjun Mehta').id))!
  arjunG.onboarded = false
  let toMark = notOnboardedCount - 1
  for (const g of nonHeroFamilies) {
    if (toMark <= 0) break
    if (r() < 0.12) { g.onboarded = false; toMark-- }
  }
  for (const g of nonHeroFamilies) { if (toMark <= 0) break; if (g.onboarded) { g.onboarded = false; toMark-- } }
  void heroFamiliesOnboarded

  // verification
  for (const g of guardians) if (g.onboarded) {
    const m = r()
    g.verification = { method: (m < 0.72 ? 'school-records' : m < 0.9 ? 'otp' : 'digilocker-token') as Guardian['verification'] extends infer V ? V extends { method: infer M } ? M : never : never, at: T(`2026-08-${String(4 + Math.floor(r() * 24)).padStart(2, '0')}T${10 + Math.floor(r() * 10)}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00+05:30`) }
  }

  // ---------- notices ----------
  const notices: NoticeVersion[] = [
    { id: 'v1.0', publishedAt: T('2025-12-01T09:00:00+05:30'), approvedBy: 'U-PRIN', languages: ['en'], material: true, status: 'retired', summary: 'First DPDP notice after the Rules were notified.' },
    { id: 'v2.1', publishedAt: T('2026-08-01T09:00:00+05:30'), approvedBy: 'U-PRIN', languages: ['en', 'hi'], material: true, status: 'live', summary: 'Purpose-by-purpose media choices, Hindi version, privacy contact and request channels.' },
    { id: 'v2.2', publishedAt: T('2026-09-22T17:00:00+05:30'), approvedBy: '', languages: ['en', 'hi'], material: false, status: 'draft', summary: 'Adds the new transport app, clarifies CCTV retention (30 days) and photographer access rules.' },
  ]
  const onboardEv = ev({ at: T('2026-08-14T20:00:00+05:30'), type: 'notice', title: 'Notice v2.1 delivered to 1,388 families (English + Hindi)', actor: 'U-OFFICE', refs: ['v2.1'] })

  // ---------- permissions ----------
  const permissions: Record<string, Permission> = {}
  const setP = (s: Student, purpose: MediaPurposeKey, status: PermissionStatus, g: Guardian, at: string, evidenceId: string, via: Permission['via'] = 'parent-app') => {
    permissions[pkey(s.id, purpose)] = {
      studentId: s.id, purpose, status, guardianId: g.id, noticeVersion: 'v2.1', via, at, evidenceId,
      history: [{ status, at, via, by: g.id, noticeVersion: 'v2.1', evidenceId }],
    }
  }
  const profileStatuses = (p: Profile): Record<MediaPurposeKey, PermissionStatus> => {
    switch (p) {
      case 'all-public': return { 'private-gallery': 'granted', internal: 'granted', 'public-digital': 'granted', promotion: 'granted', 'paid-ads': 'denied' }
      case 'school-and-parents': return { 'private-gallery': 'granted', internal: 'granted', 'public-digital': 'denied', promotion: 'denied', 'paid-ads': 'denied' }
      case 'no-promotion': return { 'private-gallery': 'granted', internal: 'granted', 'public-digital': 'granted', promotion: 'denied', 'paid-ads': 'denied' }
      case 'protected': return { 'private-gallery': 'granted', internal: 'denied', 'public-digital': 'denied', promotion: 'denied', 'paid-ads': 'denied' }
      case 'pending': return { 'private-gallery': 'pending', internal: 'pending', 'public-digital': 'pending', promotion: 'pending', 'paid-ads': 'pending' }
      default: {
        const pub = r() < 0.78
        return {
          'private-gallery': r() < 0.97 ? 'granted' : 'denied', internal: r() < 0.93 ? 'granted' : 'denied',
          'public-digital': pub ? 'granted' : 'denied', promotion: pub && r() < 0.8 ? 'granted' : 'denied', 'paid-ads': pub && r() < 0.12 ? 'granted' : 'denied',
        }
      }
    }
  }
  for (const s of students) {
    const g = guardians.find((x) => x.id === s.guardianIds[0])!
    const hero = HEROES.find((h) => h.name === s.name && s.hero)
    let prof: Profile = hero ? hero.profile : 'random'
    if (!hero && s.protected) prof = 'protected'
    if (!g.onboarded) prof = 'pending'
    const st = profileStatuses(prof)
    const at = g.verification?.at ?? T('2026-08-14T20:00:00+05:30')
    for (const p of MEDIA_PURPOSES) {
      let evidenceId = onboardEv
      if (hero && prof !== 'pending') {
        evidenceId = ev({
          at: hero.name === 'Kabir Singh' ? T('2026-08-14T19:42:00+05:30') : at, type: 'permission',
          title: `${g.name} set “${p.label}” to ${st[p.key]} for ${s.name}`, actor: g.id, refs: [s.id, p.key, 'v2.1'],
          payload: { via: 'parent-app', verification: g.verification?.method ?? 'school-records' },
          id: hero.name === 'Kabir Singh' && p.key === 'public-digital' ? 'EV-2026-0814-2041' : undefined,
        })
      }
      setP(s, p.key, st[p.key], g, hero?.name === 'Kabir Singh' ? T('2026-08-14T19:42:00+05:30') : at, evidenceId, prof === 'pending' ? 'office' : 'parent-app')
    }
  }
  // Kabir's father verified via school admission records
  const kabirG = guardians.find((g) => g.studentIds.includes(heroByName('Kabir Singh').id))!
  kabirG.verification = { method: 'school-records', at: T('2026-08-14T19:38:00+05:30') }

  // ---------- events ----------
  const events: SchoolEvent[] = [
    { id: 'annual-day', name: 'Annual Day 2026', date: T('2026-09-20T17:00:00+05:30'), type: 'stage', location: 'Main auditorium', photographerIds: ['U-PHOTO'], uploadWindow: { from: T('2026-09-20T15:00:00+05:30'), to: T('2026-09-27T23:59:00+05:30') }, retentionUntil: T('2029-09-20T00:00:00+05:30'), status: 'reviewing' },
    { id: 'sports-day', name: 'Inter-house Sports Meet', date: T('2026-08-22T08:00:00+05:30'), type: 'sports', location: 'School grounds', photographerIds: ['U-PHOTO'], retentionUntil: T('2029-08-22T00:00:00+05:30'), status: 'published' },
    { id: 'science-fair', name: 'Science Fair', date: T('2026-08-01T10:00:00+05:30'), type: 'academic', location: 'Labs & atrium', photographerIds: [], retentionUntil: T('2029-08-01T00:00:00+05:30'), status: 'published' },
    { id: 'classroom', name: 'Term 1 classroom moments', date: T('2026-07-15T10:00:00+05:30'), type: 'classroom', location: 'Classrooms', photographerIds: [], retentionUntil: T('2027-07-15T00:00:00+05:30'), status: 'published' },
  ]

  // ---------- media from manifest ----------
  const m = manifest as unknown as Manifest
  const freq = new Map<string, number>()
  for (const a of m.assets) for (const f of a.faces) if (f.person && !f.adult) freq.set(f.person, (freq.get(f.person) ?? 0) + 1)
  for (const v of m.videos) for (const t of v.tracks) if (t.person) freq.set(t.person, (freq.get(t.person) ?? 0) + 1)
  const persons = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p)
  const personToStudent = new Map<string, string | null>()
  const pool = students.filter((s) => !s.hero && !s.protected && ['3', '4', '5', '6', '7', '8'].includes(classes.find((c) => c.id === s.classId)!.grade))
  let poolIdx = 0
  persons.forEach((p, i) => {
    if (i < heroStudentIds.length) personToStudent.set(p, heroStudentIds[i])
    else if ((freq.get(p) ?? 0) <= 1 && i % 6 === 5) personToStudent.set(p, null) // some one-off faces stay unknown
    else personToStudent.set(p, pool[(poolIdx++ * 37) % pool.length].id)
  })
  const assets: MediaAsset[] = []
  for (const a of m.assets) {
    const ev0 = events.find((e) => e.id === a.event) ?? events[0]
    assets.push({
      id: a.id, eventId: ev0.id, kind: 'photo', src: pub(a.src), w: a.w, h: a.h, title: a.title,
      capturedAt: addHours(ev0.date, Math.floor(r() * 3)), uploadedBy: ev0.photographerIds[0] ?? 'U-MKT',
      faces: a.faces.map((f, i) => {
        if (f.adult) return { id: `${a.id}-f${i}`, box: f.box, studentId: null, confidence: 0, review: 'non-student' as const, main: !!f.main }
        const sidm = f.person ? personToStudent.get(f.person) ?? null : null
        return { id: `${a.id}-f${i}`, box: f.box, studentId: sidm, confidence: sidm ? Math.min(0.99, 0.9 + f.score * 0.09) : 0, review: sidm ? ('auto' as const) : ('unknown' as const), main: !!f.main }
      }),
    })
  }
  for (const v of m.videos) {
    const ev0 = events.find((e) => e.id === v.event) ?? events[0]
    const tracks = v.tracks.map((t) => ({ trackId: t.trackId, studentId: t.person ? personToStudent.get(t.person) ?? null : null, frames: t.frames }))
    assets.push({
      id: v.id, eventId: ev0.id, kind: 'video', src: pub(v.src), w: v.w, h: v.h, duration: v.duration, title: v.title,
      capturedAt: ev0.date, uploadedBy: 'U-PHOTO', tracks,
      faces: tracks.map((t, i) => ({ id: `${v.id}-f${i}`, box: [t.frames[0]?.[1] ?? 0, t.frames[0]?.[2] ?? 0, t.frames[0]?.[3] ?? 0, t.frames[0]?.[4] ?? 0], studentId: t.studentId, confidence: t.studentId ? 0.95 : 0, review: t.studentId ? 'auto' : 'unknown', main: false })),
    })
  }

  // ---------- publications: earlier posts, incl. 2 live posts featuring Diya ----------
  const publications: Publication[] = []
  const diya = heroByName('Diya Patel').id
  const studentMap = new Map(students.map((s) => [s.id, s]))
  /** Seed-time check (no engine import): every face is a known, unprotected student allowed for public digital use, or an adult. */
  const publicReady = (a: MediaAsset) => a.faces.length > 0 && a.faces.every((f) => {
    if (f.review === 'non-student') return true
    if (!f.studentId) return false
    const st = studentMap.get(f.studentId)
    return !!st && !st.protected && permissions[pkey(f.studentId, 'public-digital')]?.status === 'granted'
  })
  const earlier = assets.filter((a) => a.kind === 'photo' && a.eventId !== 'annual-day' && publicReady(a))
  const diyaEarlier = earlier.filter((a) => a.faces.some((f) => f.studentId === diya))
  const publishables = [...diyaEarlier.slice(0, 2), ...earlier.filter((a) => !diyaEarlier.slice(0, 2).includes(a)).slice(0, 6)]
  publishables.forEach((a, i) => {
    const dest = (['instagram', 'website', 'instagram', 'facebook', 'website', 'instagram', 'website', 'instagram'] as const)[i % 8]
    const evDate = events.find((e) => e.id === a.eventId)!.date
    const at = addDays(evDate, 2 + i)
    const e = ev({ at, type: 'publication', title: `Published ${a.id} to ${dest} via Publish Guard`, actor: 'U-MKT', refs: [a.id, dest] })
    publications.push({ id: `PUB-${300 + i}`, assetId: a.id, destination: dest, variant: 'original', at, by: 'U-MKT', evidenceId: e, status: 'live', url: `https://instagram.com/p/amaltas${300 + i}` })
  })

  // ---------- requests ----------
  const g = (studentName: string) => guardians.find((x) => x.studentIds.includes(heroByName(studentName).id))!
  const requests: PrivacyRequest[] = [
    {
      id: 'REQ-1042', type: 'photo-removal', guardianId: g('Ishita Nair').id, studentId: heroByName('Ishita Nair').id, channel: 'parent-app',
      receivedAt: T('2026-09-22T21:14:00+05:30'), dueAt: addDays(T('2026-09-22T21:14:00+05:30'), 90), targetAt: addDays(T('2026-09-22T21:14:00+05:30'), 7),
      ownerId: 'U-OFFICE', status: 'in-progress', summary: 'Remove Ishita from the Sports Meet relay photo on the website.',
      steps: [{ at: T('2026-09-22T21:14:00+05:30'), by: g('Ishita Nair').id, text: 'Request raised in parent app' }, { at: T('2026-09-23T09:05:00+05:30'), by: 'U-OFFICE', text: 'Identity matched to school records; website team asked to take down photo' }],
    },
    {
      id: 'REQ-1043', type: 'correction', guardianId: g('Aarav Sharma').id, studentId: heroByName('Aarav Sharma').id, channel: 'privacy-centre',
      receivedAt: T('2026-09-23T11:40:00+05:30'), dueAt: addDays(T('2026-09-23T11:40:00+05:30'), 90), targetAt: addDays(T('2026-09-23T11:40:00+05:30'), 7),
      ownerId: 'U-OFFICE', status: 'verifying', summary: 'Correct date of birth in ERP (shows 12 Mar, should be 21 Mar).',
      steps: [{ at: T('2026-09-23T11:40:00+05:30'), by: g('Aarav Sharma').id, text: 'Request submitted via public Privacy Centre' }],
    },
    {
      id: 'REQ-1044', type: 'access', guardianId: g('Reyansh Khan').id, studentId: heroByName('Reyansh Khan').id, channel: 'email',
      receivedAt: T('2026-09-24T08:10:00+05:30'), dueAt: addDays(T('2026-09-24T08:10:00+05:30'), 90), targetAt: addDays(T('2026-09-24T08:10:00+05:30'), 7),
      ownerId: 'U-OFFICE', status: 'new', summary: 'Summary of personal data the school holds about Reyansh and who it is shared with.',
      steps: [{ at: T('2026-09-24T08:10:00+05:30'), by: g('Reyansh Khan').id, text: 'Email received at privacy@ and logged' }],
    },
  ]
  const closedTypes: PrivacyRequest['type'][] = ['correction', 'photo-removal', 'access', 'grievance', 'withdrawal', 'correction']
  closedTypes.forEach((t, i) => {
    const s = students[40 + i * 97]
    const at = addDays(T('2026-08-05T10:00:00+05:30'), i * 6)
    requests.push({
      id: `REQ-10${30 + i}`, type: t, guardianId: s.guardianIds[0], studentId: s.id, channel: i % 2 ? 'parent-app' : 'office',
      receivedAt: at, dueAt: addDays(at, 90), targetAt: addDays(at, 7), ownerId: 'U-OFFICE', status: 'closed',
      summary: { correction: 'Correct spelling of guardian name', 'photo-removal': 'Remove photo from yearbook draft', access: 'Data summary requested', grievance: 'Complaint about class WhatsApp photo', withdrawal: 'Withdraw website & social media permission', erasure: '', nomination: '' }[t] || 'Request',
      steps: [{ at, by: s.guardianIds[0], text: 'Request received' }, { at: addDays(at, 2 + (i % 3)), by: 'U-OFFICE', text: 'Resolved and parent informed', evidenceId: ev({ at: addDays(at, 2 + (i % 3)), type: 'request', title: `Request REQ-10${30 + i} resolved in ${2 + (i % 3)} days`, actor: 'U-OFFICE', refs: [`REQ-10${30 + i}`] }) }],
    })
  })

  // ---------- vendors ----------
  const V = (id: string, name: string, category: Vendor['category'], service: string, dataShared: string[], riskTier: Vendor['riskTier'], c: boolean[], storage = 'India', extra: Partial<Vendor> = {}): Vendor => ({
    id, name, category, service, dataShared, purposes: [service], riskTier,
    contract: { dpa: c[0], securityClause: c[1], deletionClause: c[2], breachNoticeClause: c[3], subProcessorClause: c[4] },
    reviewDue: addDays(now, 30 + Math.floor(r() * 200)), storageLocation: storage, status: 'active', ...extra,
  })
  const vendors: Vendor[] = [
    V('VEN-01', 'CampusCore ERP', 'ERP', 'Admissions, fees, attendance, report cards', ['Student profile', 'Parent contacts', 'Marks', 'Attendance', 'Fees'], 'high', [true, true, true, true, true]),
    V('VEN-02', 'Google Workspace for Education', 'Productivity', 'Email, Drive, Classroom', ['Staff & student accounts', 'Assignments'], 'medium', [true, true, true, true, true], 'India / global'),
    V('VEN-03', 'SafeRide Bus Tracking', 'Transport', 'Live bus location for parents', ['Student name', 'Stop', 'Live location during travel'], 'high', [true, true, false, true, false]),
    V('VEN-04', 'ClearView CCTV Services', 'CCTV', 'Campus cameras and 30-day storage', ['Video footage'], 'high', [true, true, true, true, true]),
    V('VEN-05', 'SnapStory Photography', 'Photography', 'Event photos and videos', ['Event photos', 'Event videos'], 'medium', [true, true, true, true, true], 'India', {
      access: { token: 'PH-ANNUAL-7Q2K', expiresAt: T('2026-09-27T23:59:00+05:30'), scope: 'Upload to Annual Day 2026 only · no downloads · no names' },
    }),
    V('VEN-06', 'LearnSphere LMS', 'LMS', 'Homework and practice tests', ['Student name', 'Class', 'Scores'], 'medium', [true, false, false, true, false]),
    V('VEN-07', 'PayEasy Fee Gateway', 'Payments', 'Online fee payments', ['Parent name', 'Payment reference'], 'medium', [true, true, true, true, true]),
    V('VEN-08', 'WhatsApp Business (school number)', 'Communication', 'Parent broadcasts', ['Parent phone numbers'], 'medium', [true, true, true, true, true], 'Global'),
    V('VEN-09', 'BioAttend Biometric Staff Attendance', 'Biometric', 'Staff attendance', ['Staff fingerprint templates'], 'high', [true, true, true, true, true]),
    V('VEN-10', 'SiteSprout Web Hosting', 'Website', 'School website', ['Published photos', 'Enquiry forms'], 'low', [true, true, true, true, true]),
    V('VEN-11', 'HealthFirst School Clinic', 'Health', 'Nurse visits and medical records', ['Health conditions', 'Allergies'], 'high', [true, true, true, true, true]),
    V('VEN-12', 'MarkWise Assessments', 'Assessment', 'Olympiad and assessment tests', ['Student name', 'Class', 'Scores'], 'medium', [false, true, false, false, true]),
  ]

  // ---------- obligations ----------
  const O = (id: string, area: Obligation['area'], title: string, plain: string, status: Obligation['status'], ownerId: string, legalRef: string, n = 2, dueAt?: string): Obligation => ({
    id, area, title, plain, status, ownerId, legalRef, dueAt,
    evidenceIds: Array.from({ length: n }, (_, i) => ev({ at: addDays(T('2026-08-01T10:00:00+05:30'), Math.floor(r() * 50)), type: 'readiness', title: `${title} — evidence ${i + 1}`, actor: ownerId, refs: [id] })),
  })
  const obligations: Obligation[] = [
    O('OB-01', 'governance', 'Privacy contact published', 'Parents can see who answers privacy questions — on the website, notice and app.', 'covered', 'U-PRIN', 'Sec 8(9) · Rule 9'),
    O('OB-02', 'governance', 'Processing register', 'A living list of what data the school uses, why, and where it goes.', 'covered', 'U-OFFICE', 'Sec 8 · Rule 6', 3),
    O('OB-03', 'governance', 'Significant Data Fiduciary status checked', 'Your school has not been notified as an SDF, so a statutory DPO and independent audit are not required today.', 'covered', 'U-DESK', 'Sec 10 · Rule 13', 1),
    O('OB-04', 'notices', 'Clear notice in English and Hindi', 'Every family received a plain-language notice explaining each purpose.', 'covered', 'U-OFFICE', 'Sec 5 · Rule 3', 3),
    O('OB-05', 'notices', 'Verified parental consent', 'Parents are verified against admission records before their choices count.', 'covered', 'U-OFFICE', 'Sec 9(1) · Rule 10', 2),
    O('OB-06', 'notices', 'Easy withdrawal', 'Parents can change or withdraw a choice as easily as they gave it.', 'covered', 'U-OFFICE', 'Sec 6(4)', 1),
    O('OB-07', 'notices', 'School exemptions documented', 'Attendance, safety CCTV and bus tracking are recorded as school exemptions — no extra consent forms.', 'exempt', 'U-DESK', 'Rule 12 · Fourth Schedule', 2),
    O('OB-08', 'media', 'Photo & video choices enforced', 'Every photo is checked against parents’ choices before it is shared.', 'covered', 'U-MKT', 'Sec 9 · Sec 6', 4),
    O('OB-09', 'media', 'Photographer access controlled', 'Photographers upload through time-bound links and never keep copies.', 'covered', 'U-OFFICE', 'Rule 6', 2),
    O('OB-10', 'media', 'No detrimental use of children’s data', 'No tracking or targeted advertising aimed at children.', 'covered', 'U-PRIN', 'Sec 9(2)–(3)', 1),
    O('OB-11', 'rights', 'Request channel live', 'Parents can ask for a data summary, corrections or deletion from the app, website or office.', 'covered', 'U-OFFICE', 'Sec 11–14 · Rule 14', 2),
    O('OB-12', 'rights', 'Grievances answered on time', 'Every grievance has an owner and due date, well inside the legal window.', 'covered', 'U-OFFICE', 'Sec 13 · Rule 14', 2),
    O('OB-13', 'vendors', 'Data clauses in vendor contracts', '3 vendor contracts are missing deletion or sub-processor clauses.', 'action-due', 'U-OFFICE', 'Sec 8(2) · Rule 6', 1, addDays(now, 12)),
    O('OB-14', 'vendors', 'Vendor register complete', '12 vendors that touch student data are listed with what they receive.', 'covered', 'U-OFFICE', 'Sec 8(2)', 2),
    O('OB-15', 'security', 'Reasonable security safeguards', 'Encryption, access control, logs, backups and staff training are in place.', 'covered', 'U-IT', 'Sec 8(5) · Rule 6', 5),
    O('OB-16', 'security', 'Breach response ready', 'A tested plan to inform parents and the Data Protection Board quickly.', 'covered', 'U-IT', 'Sec 8(6) · Rule 7', 2),
    O('OB-17', 'security', 'Access logs kept for a year', 'Who opened what is logged and kept for at least a year.', 'covered', 'U-IT', 'Rule 6', 1),
    O('OB-18', 'retention', 'Retention schedule', 'How long each kind of record is kept, and why.', 'covered', 'U-OFFICE', 'Sec 8(7)', 2),
    O('OB-19', 'retention', 'Class of 2023 media review', 'Event photos of the Class of 2023 are past their review date — keep, archive or delete.', 'action-due', 'U-MKT', 'Sec 8(7)', 1, addDays(now, 9)),
    O('OB-20', 'assurance', 'Managed privacy desk', 'A named privacy coordinator handles queries, requests and monthly reviews.', 'covered', 'U-DESK', 'Service', 2),
    O('OB-21', 'assurance', 'Counsel review of notices', 'Notices and templates reviewed by empanelled privacy counsel.', 'covered', 'U-PARTNER', 'Service', 1),
  ]

  // ---------- controls (Rule 6) ----------
  const C = (id: string, title: string, detail: string, status: Control['status'], ownerId = 'U-IT'): Control => ({
    id, title, detail, ruleRef: 'Rule 6', status, ownerId,
    evidenceIds: [ev({ at: addDays(T('2026-07-20T10:00:00+05:30'), Math.floor(r() * 60)), type: 'control', title: `${title} — verified`, actor: ownerId, refs: [id] })],
  })
  const controls: Control[] = [
    C('CTL-01', 'Encryption of stored data', 'ERP, Drive and media library encrypted at rest; laptops use BitLocker/FileVault.', 'in-place'),
    C('CTL-02', 'Multi-factor sign-in for staff', 'MFA enforced on staff email and ERP admin accounts.', 'in-place'),
    C('CTL-03', 'Role-based access', 'Staff see only what their role needs; teachers see their own class.', 'in-place'),
    C('CTL-04', 'Access logs kept ≥ 1 year', 'Sign-ins and record access logged, reviewed monthly, kept for a year.', 'in-place'),
    C('CTL-05', 'Backups tested', 'Nightly backups; restore tested every term.', 'in-place'),
    C('CTL-06', 'Photographer device rule', 'Event media uploaded via time-bound link; card wiped after upload, confirmed in app.', 'in-place', 'U-OFFICE'),
    C('CTL-07', 'Masking in exports', 'Phone numbers and IDs masked in reports and exports.', 'in-place'),
    C('CTL-08', 'CCTV footage access', 'Footage viewed only by the admin office, logged, auto-deleted after 30 days.', 'in-place', 'U-OFFICE'),
    C('CTL-09', 'Staff privacy training', '84% of staff completed this term’s 5-minute module.', 'partial', 'U-OFFICE'),
    C('CTL-10', 'Incident response plan', 'Breach Room playbook tested in a tabletop drill.', 'in-place'),
    C('CTL-11', 'Vendor security clauses', 'Security and breach-notice clauses in vendor contracts.', 'partial', 'U-OFFICE'),
    C('CTL-12', 'Secure deletion', 'Deletion tasks produce a certificate stored as evidence.', 'in-place'),
  ]

  // ---------- incidents (one closed past drill) ----------
  const incidents: Incident[] = [
    {
      id: 'INC-2026-03', title: 'Marks sheet emailed to wrong parent group', kind: 'misdirected-email', detectedAt: T('2026-06-11T14:20:00+05:30'), status: 'closed',
      affectedData: ['Student names', 'Unit test marks (Class 7C)'], affectedCount: 38, boardDetailedDueAt: addHours(T('2026-06-11T14:20:00+05:30'), 72),
      steps: [
        { at: T('2026-06-11T14:20:00+05:30'), text: 'Teacher reported wrong recipients', by: 'U-TEACH', kind: 'detect' },
        { at: T('2026-06-11T15:05:00+05:30'), text: 'Recall requested; recipients asked to delete', by: 'U-OFFICE', kind: 'contain' },
        { at: T('2026-06-11T18:00:00+05:30'), text: 'Parents of 38 students informed', by: 'U-PRIN', kind: 'notify-parents' },
        { at: T('2026-06-11T19:30:00+05:30'), text: 'Initial intimation filed with the Board', by: 'U-DESK', kind: 'notify-board' },
        { at: T('2026-06-13T17:00:00+05:30'), text: 'Detailed report filed within 72 hours', by: 'U-DESK', kind: 'report' },
        { at: T('2026-06-20T12:00:00+05:30'), text: 'Closed; email groups locked to class teachers', by: 'U-IT', kind: 'close' },
      ],
    },
  ]

  // ---------- retention ----------
  const retention: RetentionRule[] = [
    { id: 'RET-01', category: 'Admission & academic records', retention: 'Permanent (transfer certificate, marks)', basis: 'CBSE / state education rules', ownerId: 'U-OFFICE', nextReview: T('2027-04-01T00:00:00+05:30'), exception: 'Legal retention overrides deletion requests' },
    { id: 'RET-02', category: 'Event photos & videos', retention: '3 years after the event, then archive or delete', basis: 'Purpose: school memories & communication', ownerId: 'U-MKT', nextReview: addDays(now, 9) },
    { id: 'RET-03', category: 'CCTV footage', retention: '30 days, unless an incident is under review', basis: 'Child safety', ownerId: 'U-OFFICE', nextReview: addDays(now, 30) },
    { id: 'RET-04', category: 'Bus location history', retention: '7 days', basis: 'Child safety during travel', ownerId: 'U-IT', nextReview: addDays(now, 60) },
    { id: 'RET-05', category: 'Fee & payment records', retention: '8 years', basis: 'Tax and accounting law', ownerId: 'U-OFFICE', nextReview: T('2027-04-01T00:00:00+05:30'), exception: 'Statutory retention' },
    { id: 'RET-06', category: 'Health records', retention: 'While enrolled + 1 year', basis: 'Care of the child', ownerId: 'U-OFFICE', nextReview: addDays(now, 120) },
    { id: 'RET-07', category: 'Access & security logs', retention: 'At least 1 year', basis: 'DPDP Rules — security safeguards', ownerId: 'U-IT', nextReview: addDays(now, 200) },
    { id: 'RET-08', category: 'Admission enquiries (not joined)', retention: '12 months', basis: 'Admissions follow-up', ownerId: 'U-OFFICE', nextReview: addDays(now, 45) },
  ]

  // ---------- tasks ----------
  const tasks: Task[] = [
    { id: 'TSK-01', title: 'Approve privacy notice v2.2 (English + Hindi)', area: 'notices', ownerId: 'U-PRIN', dueAt: addDays(now, 5), status: 'open', link: '/privacy/notices', createdAt: T('2026-09-22T17:00:00+05:30'), kind: 'approval' },
    { id: 'TSK-02', title: 'Add deletion & sub-processor clauses: SafeRide, LearnSphere, MarkWise', area: 'vendors', ownerId: 'U-OFFICE', dueAt: addDays(now, 12), status: 'open', link: '/trust/vendors', createdAt: T('2026-09-10T10:00:00+05:30'), kind: 'contract' },
    { id: 'TSK-03', title: 'Review Class of 2023 event media (412 items)', area: 'retention', ownerId: 'U-MKT', dueAt: addDays(now, 9), status: 'open', link: '/trust/retention', createdAt: T('2026-09-15T10:00:00+05:30'), kind: 'deletion' },
    { id: 'TSK-04', title: 'Check unknown faces in Annual Day photos', area: 'media', ownerId: 'U-MKT', dueAt: addDays(now, 2), status: 'open', link: '/media/review', createdAt: T('2026-09-21T10:00:00+05:30'), kind: 'review' },
    { id: 'TSK-05', title: 'Remind 117 families to set photo choices', area: 'notices', ownerId: 'U-OFFICE', dueAt: addDays(now, 3), status: 'open', link: '/privacy/permissions', createdAt: T('2026-09-20T10:00:00+05:30'), kind: 'general' },
    { id: 'TSK-06', title: 'Staff training: 14 teachers pending', area: 'security', ownerId: 'U-OFFICE', dueAt: addDays(now, 14), status: 'open', link: '/trust/training', createdAt: T('2026-09-01T10:00:00+05:30'), kind: 'training' },
  ]

  // ---------- experts ----------
  const experts: ExpertRequest[] = [
    {
      id: 'EXP-201', kind: 'privacy-review', title: 'Counsel review of notice v2.2 (Hindi + English)', status: 'in-review', partner: 'Menon & Associates', createdAt: T('2026-09-22T17:30:00+05:30'),
      attachments: [evidence[evidence.length - 1].id], messages: [{ at: T('2026-09-23T12:10:00+05:30'), from: 'U-PARTNER', text: 'Reviewing the CCTV retention wording; will share comments by Friday.' }],
    },
    {
      id: 'EXP-188', kind: 'cyber', title: 'Annual cyber assessment (ERP, Drive, website)', status: 'report-shared', partner: 'SecureNest Labs', createdAt: T('2026-07-02T10:00:00+05:30'),
      attachments: [], messages: [{ at: T('2026-07-28T16:00:00+05:30'), from: 'SecureNest Labs', text: 'Report shared. 2 medium findings, both fixed and verified.' }],
    },
  ]

  const training: TrainingModule[] = [
    { id: 'TR-01', title: 'Photos, videos & parent choices', minutes: 5, audience: 'All teachers', completed: 71, total: 85 },
    { id: 'TR-02', title: 'Handling parent requests', minutes: 6, audience: 'Office & admin', completed: 12, total: 12 },
    { id: 'TR-03', title: 'Spotting and reporting a breach', minutes: 5, audience: 'All staff', completed: 118, total: 140 },
    { id: 'TR-04', title: 'Photographer rules at school events', minutes: 4, audience: 'Photographers & vendors', completed: 3, total: 3 },
  ]

  const notifications: Notification[] = [
    { id: 'N-1', at: T('2026-09-24T08:10:00+05:30'), text: 'New data summary request from Imran Khan', link: '/requests', read: false, roles: ['principal', 'office', 'desk'] },
    { id: 'N-2', at: T('2026-09-23T18:00:00+05:30'), text: 'Annual Day: 148 photos analysed — 9 faces need a quick check', link: '/media/review', read: false, roles: ['marketing', 'principal', 'office'] },
    { id: 'N-3', at: T('2026-09-22T17:05:00+05:30'), text: 'Notice v2.2 is ready for your approval', link: '/privacy/notices', read: false, roles: ['principal', 'chairman'] },
    { id: 'N-4', at: T('2026-09-21T10:00:00+05:30'), text: 'Photographer link for Annual Day expires on 27 Sep', link: '/trust/vendors', read: true, roles: ['office', 'it'] },
  ]

  // a few access log events for realism
  for (let i = 0; i < 40; i++) {
    const who = pick(r, ['U-OFFICE', 'U-MKT', 'U-PRIN', 'U-IT', 'U-TEACH'])
    ev({ at: addHours(T('2026-09-01T09:00:00+05:30'), i * 13), type: 'access', title: `${people.find((p) => p.id === who)!.name} ${pick(r, ['opened the consent ledger', 'exported a masked class list', 'viewed Annual Day gallery', 'updated a vendor record', 'reviewed access logs'])}`, actor: who, refs: [] })
  }

  return {
    version: DATA_VERSION, school, people, classes, students, guardians, permissions, notices, events, assets, publications,
    requests, vendors, obligations, controls, incidents, retention, tasks, experts, evidence, training, notifications,
    faceIndex: Object.fromEntries(personToStudent),
  }
}
