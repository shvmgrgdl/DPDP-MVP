import * as React from 'react'
import { useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import { toast } from 'sonner'
import { Mail, Phone as PhoneIcon, Send, Check, Search, ScrollText, ShieldQuestion } from 'lucide-react'
import { Card, Button, Field, Input, Textarea, Select } from '@/design/ui'
import { useApp } from '@/store/app'
import { LEGAL } from '@/data/reference'
import type { Lang, RequestType, Student } from '@/data/types'
import { addDays, cn, fmtDate } from '@/lib/utils'

function tr(lang: Lang, en: string, hi: string) {
  return lang === 'hi' ? hi : en
}
function Bi({ lang, en, hi }: { lang: Lang; en: React.ReactNode; hi: React.ReactNode }) {
  return lang === 'hi' ? <span lang="hi">{hi}</span> : <>{en}</>
}

const REQUEST_TYPES: { key: RequestType; en: string; hi: string }[] = [
  { key: 'access', en: 'Data summary', hi: 'डेटा सारांश' },
  { key: 'correction', en: 'Correct something', hi: 'सुधार करें' },
  { key: 'erasure', en: 'Delete data', hi: 'डेटा हटाएं' },
  { key: 'nomination', en: 'Nominate someone', hi: 'किसी को नामांकित करें' },
  { key: 'grievance', en: 'Raise a complaint', hi: 'शिकायत दर्ज करें' },
]

const NOTICE_SUMMARY: { en: string; hi: string }[] = [
  { en: 'We use your child’s name, class and your contact details to run the school.', hi: 'हम आपके बच्चे का नाम, कक्षा और आपका संपर्क विवरण स्कूल चलाने के लिए उपयोग करते हैं।' },
  { en: 'Photos and videos are shared only the way the family chooses — private, inside school, or public.', hi: 'तस्वीरें और वीडियो केवल परिवार की पसंद के अनुसार साझा होते हैं — निजी, स्कूल के भीतर, या सार्वजनिक।' },
  { en: 'Parents can change any choice, any time, in the parent app.', hi: 'अभिभावक कोई भी पसंद पेरेंट ऐप में कभी भी बदल सकते हैं।' },
  { en: 'CCTV, attendance and bus tracking are covered as child-safety exemptions — no separate consent form.', hi: 'सीसीटीवी, उपस्थिति और बस ट्रैकिंग बाल-सुरक्षा छूट के अंतर्गत आते हैं — अलग सहमति फ़ॉर्म की आवश्यकता नहीं।' },
  { en: 'Every choice and request is timestamped and kept as verifiable evidence.', hi: 'हर पसंद और अनुरोध समय-मुद्रित है और सत्यापन योग्य प्रमाण के रूप में रखा जाता है।' },
]

function StudentPicker({ students, value, onChange, lang }: { students: Student[]; value: Student | null; onChange: (s: Student | null) => void; lang: Lang }) {
  const [q, setQ] = useState('')
  const fuse = useMemo(() => new Fuse(students, { keys: ['name', 'admissionNo'], threshold: 0.3 }), [students])
  const results = q.trim().length > 1 ? fuse.search(q).slice(0, 6).map((r) => r.item) : []
  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <Input
          className="pl-9"
          placeholder={tr(lang, 'Student name or admission number', 'छात्र का नाम या प्रवेश संख्या')}
          value={value ? `${value.name} · ${value.admissionNo}` : q}
          onChange={(e) => { onChange(null); setQ(e.target.value) }}
        />
      </div>
      {q.trim().length > 1 && !value && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-2.5 text-[13px] text-ink-3">{tr(lang, 'No match — check the spelling or admission number', 'कोई मेल नहीं मिला — वर्तनी या प्रवेश संख्या जांचें')}</div>
          ) : (
            results.map((s) => (
              <button key={s.id} type="button" className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] hover:bg-sunken" onClick={() => { onChange(s); setQ('') }}>
                <span className="text-ink">{s.name}</span>
                <span className="font-mono text-[11px] text-ink-3">{s.admissionNo}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function PublicPrivacyCentre() {
  const school = useApp((s) => s.school)
  const students = useApp((s) => s.students)
  const notices = useApp((s) => s.notices)
  const live = notices.find((n) => n.status === 'live')
  const [lang, setLang] = useState<Lang>('en')

  const [type, setType] = useState<RequestType>('access')
  const [student, setStudent] = useState<Student | null>(null)
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [contact, setContact] = useState('')
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState<{ id: string; dueAt: string } | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!student) {
      toast.error(tr(lang, 'Please select your child from the list', 'कृपया सूची से अपने बच्चे का चयन करें'))
      return
    }
    const guardianId = student.guardianIds[0]
    const at = new Date().toISOString()
    const dueAt = addDays(at, LEGAL.grievanceMaxDays)
    const typeLabel = REQUEST_TYPES.find((t) => t.key === type)!.en
    const id = useApp.getState().addRequest({
      type,
      guardianId,
      studentId: student.id,
      channel: 'privacy-centre',
      receivedAt: at,
      dueAt,
      targetAt: addDays(at, 7),
      ownerId: 'U-OFFICE',
      status: 'new',
      summary: `${details.trim() || typeLabel} — from ${name.trim() || 'a guardian'}${relation.trim() ? ` (${relation.trim()})` : ''}${contact.trim() ? `, contact ${contact.trim()}` : ''}.`,
    })
    setSent({ id, dueAt })
    toast.success(tr(lang, `Request sent · ${id}`, `अनुरोध भेजा गया · ${id}`))
  }

  const resetForm = () => {
    setSent(null)
    setType('access')
    setStudent(null)
    setName('')
    setRelation('')
    setContact('')
    setDetails('')
  }

  return (
    <div className="min-h-full bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          {school.logoDataUrl ? (
            <img src={school.logoDataUrl} alt="" className="size-10 shrink-0 rounded-lg object-contain" />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fdf0d9] font-display text-lg font-bold text-[#8a5300]">{school.shortName[0]}</div>
          )}
          <div className="min-w-0">
            <div className="truncate font-display text-[17px] font-semibold text-ink">{school.name}</div>
            <div className="text-[12px] text-ink-3">{tr(lang, 'Privacy Centre', 'प्राइवेसी सेंटर')} · {school.city}</div>
          </div>
          <div className="ml-auto inline-flex shrink-0 items-center rounded-full bg-sunken p-0.5 text-[12px] font-semibold">
            <button type="button" onClick={() => setLang('en')} className={cn('rounded-full px-2.5 py-1 transition-colors', lang === 'en' ? 'bg-surface text-ink shadow-sm' : 'text-ink-3')}>English</button>
            <button type="button" lang="hi" onClick={() => setLang('hi')} className={cn('rounded-full px-2.5 py-1 transition-colors', lang === 'hi' ? 'bg-surface text-ink shadow-sm' : 'text-ink-3')}>हिन्दी</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <div>
          <div className="label-caps"><Bi lang={lang} en="Privacy Centre" hi="प्राइवेसी सेंटर" /></div>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">
            <Bi lang={lang} en="Your child’s data, in plain English" hi="आपके बच्चे का डेटा, सरल भाषा में" />
          </h1>
          {live && (
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              <Bi lang={lang} en={`Current notice ${live.id} · Published ${fmtDate(live.publishedAt)} · English + Hindi`} hi={`वर्तमान सूचना ${live.id} · प्रकाशित ${fmtDate(live.publishedAt)} · अंग्रेज़ी + हिन्दी`} />
            </p>
          )}
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-ink-3">
            <ScrollText className="size-4" />
            <Bi lang={lang} en="What the notice says, in short" hi="सूचना संक्षेप में" />
          </div>
          <ul className="mt-3 space-y-2.5">
            {NOTICE_SUMMARY.map((b, i) => (
              <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink">
                <Check className="mt-0.5 size-3.5 shrink-0 text-ok" strokeWidth={2.5} />
                <Bi lang={lang} en={b.en} hi={b.hi} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="text-[13px] font-bold uppercase tracking-wide text-ink-3"><Bi lang={lang} en="Privacy contact" hi="प्राइवेसी संपर्क" /></div>
          <div className="mt-2 text-[15px] font-semibold text-ink">{school.privacyContact.name}</div>
          <div className="text-[13px] text-ink-3">{school.privacyContact.role}</div>
          <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-5">
            <a href={`mailto:${school.privacyContact.email}`} className="flex items-center gap-1.5 text-[13.5px] font-medium text-azure"><Mail className="size-4" />{school.privacyContact.email}</a>
            <a href={`tel:${school.privacyContact.phone}`} className="flex items-center gap-1.5 text-[13.5px] font-medium text-azure"><PhoneIcon className="size-4" />{school.privacyContact.phone}</a>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[13px] font-bold uppercase tracking-wide text-ink-3"><Bi lang={lang} en="Make a request" hi="अनुरोध करें" /></div>
          {sent ? (
            <div className="mt-4 flex flex-col items-center py-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-ok-bg text-ok"><Check className="size-6" strokeWidth={2.5} /></div>
              <div className="mt-3 text-[15px] font-semibold text-ink"><Bi lang={lang} en={`Request received · ${sent.id}`} hi={`अनुरोध प्राप्त हुआ · ${sent.id}`} /></div>
              <p className="mt-1.5 max-w-sm text-[13px] text-ink-2">
                <Bi lang={lang} en={`We'll respond by ${fmtDate(sent.dueAt)}, well within the law's ${LEGAL.grievanceMaxDays}-day window.`} hi={`हम ${fmtDate(sent.dueAt)} तक जवाब देंगे, जो कानून की ${LEGAL.grievanceMaxDays}-दिन की सीमा के भीतर है।`} />
              </p>
              <Button variant="secondary" className="mt-4" onClick={resetForm}><Bi lang={lang} en="Submit another request" hi="एक और अनुरोध भेजें" /></Button>
            </div>
          ) : (
            <form className="mt-3 space-y-3.5" onSubmit={submit}>
              <Field label={tr(lang, 'What do you need?', 'आपको क्या चाहिए?')}>
                <Select value={type} onChange={(e) => setType(e.target.value as RequestType)} options={REQUEST_TYPES.map((t) => ({ value: t.key, label: tr(lang, t.en, t.hi) }))} />
              </Field>
              <Field label={tr(lang, 'Your child (name or admission number)', 'आपका बच्चा (नाम या प्रवेश संख्या)')}>
                <StudentPicker students={students} value={student} onChange={setStudent} lang={lang} />
              </Field>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label={tr(lang, 'Your name', 'आपका नाम')}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr(lang, 'e.g. Sunita Patel', 'जैसे सुनीता पटेल')} />
                </Field>
                <Field label={tr(lang, 'Relation to child', 'बच्चे से संबंध')}>
                  <Input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder={tr(lang, 'Mother, father, guardian…', 'माँ, पिता, अभिभावक…')} />
                </Field>
              </div>
              <Field label={tr(lang, 'Email or phone, so we can reply', 'ईमेल या फ़ोन, ताकि हम जवाब दे सकें')}>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={tr(lang, 'you@example.com or +91…', 'you@example.com या +91…')} />
              </Field>
              <Field label={tr(lang, 'Tell us more (optional)', 'हमें और बताएं (वैकल्पिक)')}>
                <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={tr(lang, 'Anything that helps us act faster.', 'कुछ भी जो हमें तेज़ी से कार्य करने में मदद करे।')} />
              </Field>
              <Button type="submit" size="lg" className="w-full sm:w-auto" icon={<Send className="size-4" />}>
                <Bi lang={lang} en="Send request" hi="अनुरोध भेजें" />
              </Button>
            </form>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-ink-3">
            <ShieldQuestion className="size-4" />
            <Bi lang={lang} en="Not satisfied with our response?" hi="हमारे जवाब से संतुष्ट नहीं?" />
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            <Bi
              lang={lang}
              en={`We aim to resolve every request quickly, and always within ${LEGAL.grievanceMaxDays} days. If you're still not satisfied after we've responded, Indian data protection rules let you take the matter to the Data Protection Board of India.`}
              hi={`हम हर अनुरोध को जल्दी हल करने का प्रयास करते हैं, और हमेशा ${LEGAL.grievanceMaxDays} दिनों के भीतर। यदि हमारे जवाब के बाद भी आप संतुष्ट नहीं हैं, तो भारतीय डेटा संरक्षण नियम आपको भारतीय डेटा संरक्षण बोर्ड के पास मामला ले जाने की अनुमति देते हैं।`}
            />
          </p>
        </Card>

        <footer className="pb-10 pt-2 text-center text-[11.5px] leading-relaxed text-ink-3">{LEGAL.disclaimer}</footer>
      </main>
    </div>
  )
}
