import { useApp } from '@/store/app'
import { getPermission, summarize } from '@/engine/permission'
import { LEGAL, MEDIA_PURPOSES, CORE_PURPOSES } from '@/data/reference'
import { ROLES } from '@/roles/roles'
import { addDays, DEMO_NOW, fmtDate, fmtNum, pct, relDays } from '@/lib/utils'

export interface AskSource { label: string; to: string }
export interface AskAnswer { lines: string[]; sources: AskSource[] }
export interface Intent { id: string; examples: string[]; run: () => AskAnswer }

/** Fresh live snapshot of the store + a matching engine context, read at answer time (never cached). */
function live() {
  const s = useApp.getState()
  const e = { students: s.students, guardians: s.guardians, permissions: s.permissions, notices: s.notices }
  return { s, e }
}

export const INTENTS: Intent[] = [
  {
    id: 'instagram-annual-day',
    examples: ['Can we post Annual Day on Instagram?', 'Is it safe to share Annual Day photos on social media?', 'Can we share Annual Day pictures on Instagram'],
    run: () => {
      const { s, e } = live()
      const assets = s.assets.filter((a) => a.eventId === 'annual-day')
      const sum = summarize(e, assets, 'instagram')
      return {
        lines: [
          `${sum.total} Annual Day photos and clips have been checked against Instagram's rules.`,
          `${sum.ready} are ready to post as-is, ${sum['needs-blur']} need an automatic blur first, ${sum['keep-private']} must stay private, and ${sum['check-faces']} still need a quick face check.`,
          'Nothing goes live until marketing confirms it in Publish Guard.',
        ],
        sources: [{ label: 'Open Publish Guard', to: '/publish' }, { label: 'Annual Day event', to: '/media/events/annual-day' }],
      }
    },
  },
  {
    id: 'class-5b-restricted',
    examples: ["Which Class 5B children can't be on social media?", 'Who in 5B is not allowed on social media', 'Class 5B social media restrictions'],
    run: () => {
      const { s, e } = live()
      const kids = s.students.filter((st) => st.classId === '5B')
      const blocked = kids.filter((st) => getPermission(e, st.id, 'public-digital')?.status !== 'granted')
      return {
        lines: [
          `${blocked.length} of ${kids.length} children in Class 5B are not cleared for the school website & social media.`,
          ...(blocked.length
            ? blocked.slice(0, 10).map((st) => `• ${st.name} — ${getPermission(e, st.id, 'public-digital')?.status ?? 'no choice yet'}`)
            : ['Everyone in 5B is cleared for this purpose.']),
        ],
        sources: [{ label: 'Open Media Safe', to: '/media' }],
      }
    },
  },
  {
    id: 'need-dpo',
    examples: ['Do we need a DPO?', 'Do we need a Data Protection Officer', 'Is a DPO required for us'],
    run: () => {
      const { s } = live()
      const c = s.school.privacyContact
      return {
        lines: [
          s.school.sdfStatus === 'not-notified'
            ? `No. ${s.school.shortName} has not been notified as a Significant Data Fiduciary, so a statutory DPO isn't required yet.`
            : `Your school's status is "${s.school.sdfStatus}" — confirm current DPO requirements with the privacy desk.`,
          `${c.name} (${c.role}) is your day-to-day privacy contact today. A DPO service is available any time you'd like one voluntarily.`,
        ],
        sources: [{ label: 'DPO service in Experts', to: '/experts' }],
      }
    },
  },
  {
    id: 'withdraw-effect',
    examples: ['What happens if a parent withdraws?', 'What happens when a parent withdraws permission', 'A parent withdrew consent, now what?'],
    run: () => {
      const { s } = live()
      const flagged = s.publications.filter((p) => p.status === 'takedown-requested').length
      return {
        lines: [
          'Their choice updates everywhere immediately.',
          'Any live post that now includes that child without permission is flagged for takedown within 2 days, a task is created for marketing, and the change is recorded as evidence.',
          flagged ? `${flagged} live post${flagged > 1 ? 's are' : ' is'} flagged for takedown right now.` : 'No live posts are affected right now.',
        ],
        sources: [{ label: 'Live posts in Publish Guard', to: '/publish/live' }],
      }
    },
  },
  {
    id: 'due-this-week',
    examples: ["What's due this week?", 'What is due this week', 'Show me what is due soon'],
    run: () => {
      const { s } = live()
      const in7 = addDays(DEMO_NOW, 7)
      const tasks = s.tasks.filter((t) => t.status === 'open' && t.dueAt <= in7).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      return {
        lines: [
          tasks.length ? `${tasks.length} item${tasks.length > 1 ? 's are' : ' is'} due in the next 7 days:` : 'Nothing is due in the next 7 days.',
          ...tasks.slice(0, 6).map((t) => `• ${t.title} — ${relDays(t.dueAt)}`),
        ],
        sources: tasks.slice(0, 4).map((t) => ({ label: t.title.length > 40 ? t.title.slice(0, 40) + '…' : t.title, to: t.link ?? '/home' })),
      }
    },
  },
  {
    id: 'kabir-permissions',
    examples: ["Show Kabir's permissions", "What are Kabir Singh's permissions", 'Kabir permissions'],
    run: () => {
      const { s, e } = live()
      const kabir = s.students.find((st) => st.name === 'Kabir Singh')
      if (!kabir) return { lines: ['Kabir Singh was not found in the roster.'], sources: [] }
      return {
        lines: [`${kabir.name}'s current choices, set by his family:`, ...MEDIA_PURPOSES.map((p) => `• ${p.label}: ${getPermission(e, kabir.id, p.key)?.status ?? 'no choice yet'}`)],
        sources: [{ label: `Open ${kabir.name}`, to: `/media/students/${kabir.id}` }],
      }
    },
  },
  {
    id: 'cctv-retention',
    examples: ['How long do we keep CCTV?', 'How long is CCTV footage kept', 'CCTV retention period'],
    run: () => {
      const { s } = live()
      const rule = s.retention.find((r) => r.category.toLowerCase().includes('cctv'))
      return {
        lines: rule ? [`${rule.retention}.`, `Basis: ${rule.basis}.`] : ['CCTV retention has not been set yet.'],
        sources: [{ label: 'Retention schedule', to: '/trust/retention' }],
      }
    },
  },
  {
    id: 'who-sees-data',
    examples: ['Who can see student data?', 'Who has access to student data', 'Who can see student names and photos'],
    run: () => {
      const withNames = ROLES.filter((r) => r.abilities.includes('view-names'))
      return {
        lines: ['These roles can see student names and photos; everyone else sees masked or no data:', ...withNames.map((r) => `• ${r.label} — ${r.blurb}`)],
        sources: [{ label: 'How access is controlled', to: '/tech' }],
      }
    },
  },
  {
    id: 'last-incident',
    examples: ['What did we do after the last incident?', 'Tell me about the last incident', 'Last data incident'],
    run: () => {
      const { s } = live()
      const inc = s.incidents[0]
      if (!inc) return { lines: ['No incidents have been recorded — good sign.'], sources: [] }
      return {
        lines: [`Last recorded: “${inc.title}” (${inc.id}) — ${inc.status}.`, ...inc.steps.map((st) => `• ${fmtDate(st.at)} — ${st.text}`)],
        sources: [{ label: 'Open in Trust Centre', to: `/trust/incidents/${inc.id}` }],
      }
    },
  },
  {
    id: 'parents-set-choices',
    examples: ['How many parents have set choices?', 'How many families have completed permissions', 'Parent onboarding status'],
    run: () => {
      const { s } = live()
      const total = s.guardians.length
      const done = s.guardians.filter((g) => g.onboarded).length
      return {
        lines: [`${fmtNum(done)} of ${fmtNum(total)} families (${pct(done, total)}%) have set their choices.`, `${fmtNum(total - done)} still need a nudge.`],
        sources: [{ label: 'Remind families', to: '/privacy/permissions' }],
      }
    },
  },
  {
    id: 'vendors-covered',
    examples: ['Are our vendors covered?', 'Are our vendor contracts complete', 'Vendor contract status'],
    run: () => {
      const { s } = live()
      const missing = s.vendors.filter((v) => !v.contract.dpa || !v.contract.securityClause || !v.contract.deletionClause || !v.contract.breachNoticeClause || !v.contract.subProcessorClause)
      return {
        lines: [
          `${s.vendors.length - missing.length} of ${s.vendors.length} vendors have every required contract clause.`,
          missing.length ? `Still missing clauses: ${missing.map((v) => v.name).join(', ')}.` : 'All vendor contracts are complete.',
        ],
        sources: [{ label: 'Vendor register', to: '/trust/vendors' }],
      }
    },
  },
  {
    id: 'school-exemption',
    examples: ['What is a school exemption?', 'What does school exemption mean', 'Explain school exemption'],
    run: () => {
      const ex = CORE_PURPOSES.filter((p) => p.basis === 'school-exemption')
      return {
        lines: [
          'A school exemption lets schools run certain child-safety and education activities without asking for consent each time — it still has to be documented and kept to its purpose.',
          ...ex.map((p) => `• ${p.label}: ${p.note ?? p.example}`),
        ],
        sources: [{ label: 'School exemptions', to: '/privacy' }],
      }
    },
  },
  {
    id: 'dpdp-full-date',
    examples: ['When does DPDP fully apply?', 'When do the DPDP rules fully apply', 'DPDP full effect date'],
    run: () => ({
      lines: [
        `The DPDP Rules were notified on ${fmtDate(LEGAL.rulesNotified)}. Most obligations — including the Significant Data Fiduciary regime — take full effect from ${LEGAL.fullObligationsLabel}.`,
        "Core duties such as notice, consent, security and children's data protections already apply now.",
      ],
      sources: [{ label: 'Readiness timeline', to: '/readiness' }],
    }),
  },
  {
    id: 'whatsapp-class',
    examples: ['Can we share photos in the class WhatsApp group?', 'Can we post photos to the class WhatsApp group', 'Is class WhatsApp safe for photos'],
    run: () => ({
      lines: [
        "Yes, for children whose family allowed “Private gallery for me and my child's class” — the class WhatsApp group follows the same rule as the private parent gallery.",
        'Children without that permission are softly blurred automatically.',
      ],
      sources: [{ label: 'Private gallery purpose', to: '/privacy' }],
    }),
  },
  {
    id: 'newspaper-annual-day',
    examples: ['Can we send Annual Day photos to the newspaper?', 'Is it OK to give Annual Day photos to the press', 'Newspaper photos of Annual Day'],
    run: () => {
      const { s, e } = live()
      const assets = s.assets.filter((a) => a.eventId === 'annual-day')
      const sum = summarize(e, assets, 'newspaper')
      return {
        lines: [
          'Newspapers never use blurring, so every child in the photo needs explicit permission for “Brochures, prospectus & newspapers”.',
          `Of ${sum.total} Annual Day photos, ${sum.ready} are safe to send as-is; ${sum['keep-private'] + sum['needs-blur'] + sum['check-faces']} need a different photo or a parent's permission first.`,
        ],
        sources: [{ label: 'Open Publish Guard', to: '/publish' }],
      }
    },
  },
  {
    id: 'how-withdraw',
    examples: ['How does a parent withdraw permission?', 'How can parents change their choices', 'How do parents opt out'],
    run: () => ({
      lines: [
        "From the parent app, under their child's permissions — switching a purpose off takes effect immediately.",
        "They can also ask the school office, or use the public Privacy Centre if they don't have the app.",
      ],
      sources: [{ label: 'Parent app', to: '/parent' }, { label: 'Public Privacy Centre', to: '/privacy-centre' }],
    }),
  },
  {
    id: 'grievance-deadline',
    examples: ["What's the deadline to answer a grievance?", 'Grievance response deadline', 'How fast must we answer a grievance'],
    run: () => {
      const { s } = live()
      const open = s.requests.filter((r) => r.type === 'grievance' && !['resolved', 'closed'].includes(r.status)).length
      return {
        lines: [
          `The law allows up to ${LEGAL.grievanceMaxDays} days; we target 7 internally.`,
          open ? `${open} grievance${open > 1 ? 's are' : ' is'} open right now.` : 'No grievances are open right now.',
        ],
        sources: [{ label: 'Requests', to: '/requests' }],
      }
    },
  },
  {
    id: 'privacy-contact',
    examples: ['Who is our privacy contact?', 'Who is the privacy contact', 'Who do parents contact about privacy'],
    run: () => {
      const { s } = live()
      const c = s.school.privacyContact
      return { lines: [`${c.name}, ${c.role} — ${c.email} · ${c.phone}.`, 'Published in the notice, the app and the school website.'], sources: [{ label: 'School profile', to: '/settings' }] }
    },
  },
  {
    id: 'data-in-india',
    examples: ['Is our data stored in India?', 'Where is student data stored', 'Data storage location'],
    run: () => {
      const { s } = live()
      const abroad = s.vendors.filter((v) => !v.storageLocation.toLowerCase().includes('india'))
      return {
        lines: [
          abroad.length
            ? `Most vendors store data in India. ${abroad.length} also use global infrastructure: ${abroad.map((v) => `${v.name} (${v.storageLocation})`).join(', ')}.`
            : 'All vendors store data in India.',
          'Media and core records are encrypted at rest in an India-region data centre.',
        ],
        sources: [{ label: 'Under the hood', to: '/tech' }, { label: 'Vendor register', to: '/trust/vendors' }],
      }
    },
  },
  {
    id: 'breach-steps',
    examples: ["What do we do if there's a data breach?", 'What happens after a breach', 'Data breach process'],
    run: () => ({
      lines: [
        'Detect → contain → assess → tell affected parents → notify the Data Protection Board within 72 hours → file the detailed report → close with a fix.',
        'Breach support pairs privacy counsel with an incident responder to run this with you.',
      ],
      sources: [{ label: 'Breach support in Experts', to: '/experts' }, { label: 'Incident response', to: '/trust' }],
    }),
  },
]
