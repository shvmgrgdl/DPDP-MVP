import * as React from 'react'
import { toast } from 'sonner'
import { Home, Images, Inbox as InboxIcon, SlidersHorizontal, Menu, ChevronLeft, Check, X, ShieldCheck, Smartphone, Languages, Download, Link2, Lock, Globe, School, Send, FileText, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemo, type PermInput } from '../store'
import { evaluate, PURPOSES, type Purpose } from '../data'
import { Chip, PhotoView, Switch, fmtD } from '../ui'
import { Zoom } from '../screens/Zoom'
import { PhoneShell } from './PhoneShell'

type Stage = 'welcome' | 'verify' | 'notice' | 'consent' | 'confirm' | 'receipt' | 'app'
type Tab = 'home' | 'photos' | 'inbox' | 'choices' | 'more'
type PubMode = 'no' | 'ask' | 'yes'
const EX = ['media/annual-day-03.jpg', 'media/annual-day-12.jpg', 'media/sports-day-01.jpg']

const Primary = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...p} className={cn('min-h-12 w-full rounded-2xl bg-navy px-4 text-[15px] font-bold text-white transition active:scale-[.99] disabled:opacity-35', p.className)} />
const Ghost = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...p} className={cn('min-h-11 w-full rounded-2xl px-4 text-sm font-semibold text-ink-2', p.className)} />

export function ParentApp() {
  const s = useDemo()
  const child = s.students.find((x) => x.id === s.childId)!
  const hi = s.lang === 'hi'
  const t = (en: string, h: string) => (hi ? h : en)
  const [stage, setStage] = React.useState<Stage>(child.onboarded ? 'app' : 'welcome')
  const [tab, setTab] = React.useState<Tab>('home')
  const [zoom, setZoom] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<{ album?: boolean; internal?: boolean; public?: PubMode }>({})
  const [phone, setPhone] = React.useState('98 7654 3210')
  const [receipt, setReceipt] = React.useState('')
  React.useEffect(() => { s.setViewer('parent') }, [])
  React.useEffect(() => { setStage(child.onboarded ? 'app' : 'welcome'); setDraft({}); setTab('home') }, [child.id])
  React.useEffect(() => { if (child.onboarded && stage !== 'app' && stage !== 'receipt') setStage('app') }, [child.onboarded, stage])
  React.useEffect(() => { const h = (e: Event) => setZoom((e as CustomEvent<string>).detail); window.addEventListener('open-zoom', h); return () => window.removeEventListener('open-zoom', h) }, [])
  React.useEffect(() => { const h = (e: Event) => { setStage('app'); setTab((e as CustomEvent<Tab>).detail) }; window.addEventListener('parent-tab', h); return () => window.removeEventListener('parent-tab', h) }, [])

  const mine = s.photos.filter((p) => p.faces.some((f) => f.studentId === child.id))
  const pending = s.requests.filter((r) => r.studentId === child.id && r.status === 'pending')
  const lang = (
    <button type="button" onClick={() => s.setLang(hi ? 'en' : 'hi')} className="flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-xs font-bold"><Languages className="size-3.5" />{hi ? 'EN' : 'हिन्दी'}</button>
  )

  /* ---------- onboarding ---------- */
  if (stage !== 'app') return (
    <PhoneShell>
      <Onboarding {...{ stage, setStage, draft, setDraft, phone, setPhone, receipt, setReceipt, lang, t, hi }} />
    </PhoneShell>
  )

  /* ---------- app ---------- */
  const tabs: [Tab, string, React.ReactNode, number?][] = [['home', t('Home', 'होम'), <Home key="h" className="size-5" />], ['photos', t('Photos', 'फ़ोटो'), <Images key="p" className="size-5" />], ['inbox', t('Inbox', 'इनबॉक्स'), <InboxIcon key="i" className="size-5" />, pending.length], ['choices', t('Choices', 'पसंद'), <SlidersHorizontal key="c" className="size-5" />], ['more', t('More', 'और'), <Menu key="m" className="size-5" />]]
  return (
    <PhoneShell>
      <header className="flex items-center justify-between gap-2 border-b border-line bg-white px-4 py-2.5">
        <div className="flex items-center gap-2.5"><div className="grid size-9 place-items-center rounded-full bg-gold text-sm font-bold text-white">{child.name[0]}</div><div className="leading-tight"><div className="text-sm font-bold">{child.name}</div><div className="text-[11px] text-ink-3">Class {child.cls} · Sunrise Public School</div></div></div>
        {lang}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'home' && <HomeTab {...{ child, mine, pending, setTab, setZoom, t }} />}
        {tab === 'photos' && <PhotosTab {...{ child, mine, setZoom, t }} />}
        {tab === 'inbox' && <InboxTab {...{ child, t }} />}
        {tab === 'choices' && <ChoicesTab {...{ child, t, hi }} />}
        {tab === 'more' && <MoreTab {...{ child, t, setStage, setDraft }} />}
      </div>
      <nav className="grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]" aria-label="App">
        {tabs.map(([k, l, i, n]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn('relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', tab === k ? 'text-navy' : 'text-ink-3')}>
            {i}{l}{!!n && <span className="absolute right-[26%] top-1.5 grid size-4 place-items-center rounded-full bg-risk text-[10px] font-bold text-white">{n}</span>}
            {tab === k && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gold" />}
          </button>))}
      </nav>
      {zoom && <Zoom photoId={zoom} onClose={() => setZoom(null)} />}
    </PhoneShell>
  )
}

/* =============== onboarding =============== */
function Onboarding({ stage, setStage, draft, setDraft, phone, setPhone, receipt, setReceipt, lang, t, hi }: {
  stage: Stage; setStage: (s: Stage) => void; draft: { album?: boolean; internal?: boolean; public?: PubMode }; setDraft: (d: { album?: boolean; internal?: boolean; public?: PubMode }) => void
  phone: string; setPhone: (v: string) => void; receipt: string; setReceipt: (v: string) => void; lang: React.ReactNode; t: (a: string, b: string) => string; hi: boolean
}) {
  const s = useDemo()
  const child = s.students.find((x) => x.id === s.childId)!
  const [slide, setSlide] = React.useState(0)
  const [otpSent, setOtpSent] = React.useState(false)
  const [otp, setOtp] = React.useState('')
  const [rel, setRel] = React.useState('Mother')
  const [iam, setIam] = React.useState(false)
  const [read, setRead] = React.useState(false)
  const [ci, setCi] = React.useState(0)
  const order: Purpose[] = ['album', 'internal', 'public']
  const steps: Stage[] = ['verify', 'notice', 'consent', 'confirm']
  const back = () => { if (stage === 'consent' && ci > 0) setCi(ci - 1); else { const i = steps.indexOf(stage); setStage(i <= 0 ? 'welcome' : steps[i - 1]) } }
  const header = stage !== 'welcome' && stage !== 'receipt' && (
    <div className="flex items-center justify-between gap-2 px-4 pt-3">
      <button type="button" aria-label="Back" onClick={back} className="grid size-10 place-items-center rounded-full hover:bg-sand"><ChevronLeft className="size-5" /></button>
      <div className="flex flex-1 justify-center gap-1.5">{steps.map((x, i) => <span key={x} className={cn('h-1.5 w-8 rounded-full', i <= steps.indexOf(stage) ? 'bg-gold' : 'bg-sand')} />)}</div>
      {lang}
    </div>)

  if (stage === 'welcome') {
    const slides = [
      { icon: <ShieldCheck className="size-10" />, h: t('Your child’s photos. Your choices.', 'आपके बच्चे की फ़ोटो। आपकी पसंद।'), b: t('Sunrise Public School takes photos at events. This app lets you decide, purpose by purpose, how they are used.', 'सनराइज़ पब्लिक स्कूल कार्यक्रमों में फ़ोटो लेता है। यह ऐप आपको तय करने देता है कि उनका उपयोग कैसे हो।') },
      { icon: <Images className="size-10" />, h: t('See every photo of your child', 'अपने बच्चे की हर फ़ोटो देखें'), b: t('A private album shows photos your child appears in. Other children are blurred for you.', 'एक निजी एल्बम में वे फ़ोटो दिखती हैं जिनमें आपका बच्चा है। दूसरे बच्चे आपके लिए धुंधले रहते हैं।') },
      { icon: <SlidersHorizontal className="size-10" />, h: t('Change your mind any time', 'कभी भी अपना फ़ैसला बदलें'), b: t('Withdrawing is as easy as agreeing. We can restrict future school-managed sharing; copies already shared outside can’t be recalled.', 'वापस लेना उतना ही आसान है जितना सहमति देना। हम आगे की साझेदारी रोक सकते हैं; बाहर जा चुकी प्रतियाँ वापस नहीं ली जा सकतीं।') },
    ]
    const sl = slides[slide]
    return (
      <div className="flex h-full flex-col bg-navy p-6 text-white">
        <div className="flex justify-between">{lang}<span className="rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold text-gold">Prototype · synthetic data</span></div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 grid size-24 place-items-center rounded-3xl bg-white/10 text-gold">{sl.icon}</div>
          <h1 className="text-2xl font-bold leading-tight">{sl.h}</h1>
          <p className="mt-3 max-w-xs text-[15px] text-white/75">{sl.b}</p>
          <div className="mt-6 flex gap-1.5">{slides.map((_, i) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i === slide ? 'w-6 bg-gold' : 'w-1.5 bg-white/30')} />)}</div>
        </div>
        <Primary className="bg-gold" onClick={() => (slide < 2 ? setSlide(slide + 1) : setStage('verify'))}>{slide < 2 ? t('Next', 'आगे') : t('Get started', 'शुरू करें')}</Primary>
        <p className="mt-3 text-center text-[11px] text-white/50">{t('Invite from Sunrise Public School for', 'सनराइज़ पब्लिक स्कूल की ओर से आमंत्रण:')} {child.name}</p>
      </div>)
  }

  if (stage === 'verify') return (
    <div className="flex h-full flex-col">{header}
      <div className="flex-1 overflow-y-auto p-5">
        <h2 className="text-2xl font-bold">{t('Verify it’s you', 'पुष्टि करें कि यह आप हैं')}</h2>
        <p className="mt-1 text-sm text-ink-2">{t('We match your mobile number with the school’s admission records, so only a parent or guardian can set choices for a child.', 'हम आपके मोबाइल नंबर को स्कूल के प्रवेश रिकॉर्ड से मिलाते हैं, ताकि केवल अभिभावक ही बच्चे के लिए पसंद तय कर सकें।')}</p>
        <label className="mt-5 block text-sm font-semibold">{t('Mobile number registered with the school', 'स्कूल में पंजीकृत मोबाइल नंबर')}
          <div className="mt-1.5 flex gap-2"><span className="grid h-12 place-items-center rounded-xl border border-line bg-sand px-3 text-sm">+91</span><input className="h-12 flex-1 rounded-xl border border-[#d6cdb8] bg-white px-3 text-base" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div></label>
        {!otpSent ? <Primary className="mt-4" onClick={() => { setOtpSent(true); setOtp('') }}>{t('Send OTP', 'OTP भेजें')}</Primary> : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold">{t('Enter the 6-digit code', '6 अंकों का कोड दर्ज करें')}<input className="mt-1.5 h-12 w-full rounded-xl border border-[#d6cdb8] bg-white px-3 text-center text-xl tracking-[.5em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" /></label>
            <button type="button" className="text-xs font-semibold text-gold" onClick={() => setOtp('482913')}>Demo: tap to fill code 482913</button>
          </div>)}
        {otp.length === 6 && (
          <div className="pop mt-5 rounded-2xl border border-ok/30 bg-ok-bg p-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-ok"><CheckCircle2 className="size-4" />{t('Found in admission records', 'प्रवेश रिकॉर्ड में मिला')}</div>
            <div className="mt-2 flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-gold text-lg font-bold text-white">{child.name[0]}</div><div><div className="font-bold">{child.name}</div><div className="text-xs text-ink-2">Class {child.cls} · {child.admNo}</div></div></div>
            <label className="mt-3 block text-xs font-semibold">{t('Your relationship', 'आपका संबंध')}<select value={rel} onChange={(e) => setRel(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-2 text-sm">{['Mother', 'Father', 'Legal guardian'].map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="mt-3 flex items-start gap-2 text-xs text-ink-2"><input type="checkbox" className="mt-0.5 size-4" checked={iam} onChange={(e) => setIam(e.target.checked)} />{t(`I confirm I am ${child.name.split(' ')[0]}’s parent or legal guardian.`, `मैं पुष्टि करता/करती हूँ कि मैं ${child.name.split(' ')[0]} का अभिभावक हूँ।`)}</label>
          </div>)}
      </div>
      <div className="space-y-2 p-5 pt-0"><Primary disabled={!(otp.length === 6 && iam)} onClick={() => setStage('notice')}>{t('Continue', 'जारी रखें')}</Primary><p className="text-center text-[11px] text-ink-3">Prototype: how guardian authority is verified in real use is under legal review.</p></div>
    </div>)

  if (stage === 'notice') return (
    <div className="flex h-full flex-col">{header}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-2"><FileText className="size-5 text-gold" /><span className="eyebrow">{t('Notice v1.2 · school photos & video', 'सूचना v1.2 · स्कूल की फ़ोटो व वीडियो')}</span></div>
        <h2 className="mt-1 text-2xl font-bold">{t('How the school uses photos', 'स्कूल फ़ोटो का उपयोग कैसे करता है')}</h2>
        <div className="mt-4 space-y-2.5">
          {[
            [t('What we collect', 'हम क्या लेते हैं'), t('Photos and videos of students at school events, taken by staff or the school’s photographer.', 'स्कूल कार्यक्रमों में छात्रों की फ़ोटो और वीडियो, जो स्टाफ या स्कूल के फ़ोटोग्राफ़र लेते हैं।')],
            [t('Why', 'क्यों'), t('Three separate purposes: a private parent album, inside-school use (notice boards, yearbook), and public use (website, social media). You choose each one.', 'तीन अलग उद्देश्य: निजी अभिभावक एल्बम, स्कूल के अंदर उपयोग, और सार्वजनिक उपयोग (वेबसाइट, सोशल मीडिया)। हर एक आप तय करते हैं।')],
            [t('Who sees it', 'कौन देखता है'), t('Only the people each purpose needs. In your private album, other children are blurred for you.', 'केवल वही लोग जिन्हें हर उद्देश्य के लिए ज़रूरत है। आपके निजी एल्बम में दूसरे बच्चे धुंधले रहते हैं।')],
            [t('How long', 'कितने समय'), t('Until you withdraw, or until the school’s album expiry (set per event).', 'जब तक आप वापस न लें, या स्कूल की एल्बम समाप्ति तक।')],
            [t('Your rights', 'आपके अधिकार'), t('Change or withdraw any time, ask for a copy of what we hold, ask for corrections or deletion, and raise a concern with the school’s privacy contact.', 'कभी भी बदलें या वापस लें, हमारे पास जो है उसकी प्रति माँगें, सुधार या हटाने के लिए कहें, और स्कूल के गोपनीयता संपर्क से शिकायत करें।')],
            [t('Limits', 'सीमाएँ'), t('We can restrict sharing we manage. We can’t recall screenshots or files already downloaded.', 'हम अपने प्रबंधित साझाकरण को रोक सकते हैं। स्क्रीनशॉट या डाउनलोड हो चुकी फ़ाइलें वापस नहीं ली जा सकतीं।')],
          ].map(([h, b]) => <details key={h} className="card group p-3.5" open={h === 'What we collect' || h === 'हम क्या लेते हैं'}><summary className="cursor-pointer list-none text-sm font-bold">{h}</summary><p className="mt-1.5 text-sm text-ink-2">{b}</p></details>)}
        </div>
        <p className="mt-3 text-xs text-ink-3">Privacy contact: privacy@sunrise-school.example (fictional)</p>
        <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-5" checked={read} onChange={(e) => setRead(e.target.checked)} />{t('I have read this notice.', 'मैंने यह सूचना पढ़ ली है।')}</label>
      </div>
      <div className="p-5 pt-0"><Primary disabled={!read} onClick={() => { setCi(0); setStage('consent') }}>{t('Continue to my choices', 'मेरी पसंद पर जाएँ')}</Primary></div>
    </div>)

  if (stage === 'consent') {
    const p = order[ci]; const meta = PURPOSES.find((x) => x.key === p)!
    const chosen = p === 'public' ? draft.public : draft[p]
    const set = (v: boolean | PubMode) => setDraft({ ...draft, [p]: v })
    const Choice = ({ on, label, sub, onClick, tone = 'navy' }: { on: boolean; label: string; sub?: string; onClick: () => void; tone?: 'navy' | 'risk' }) => (
      <button type="button" onClick={onClick} className={cn('flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition', on ? (tone === 'risk' ? 'border-risk bg-risk-bg' : 'border-navy bg-white shadow-sm') : 'border-line bg-white')}>
        <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-navy bg-navy text-white' : 'border-[#cfc8b6]')}>{on && <Check className="size-3" strokeWidth={3} />}</span>
        <span><span className="block text-[15px] font-bold">{label}</span>{sub && <span className="block text-xs text-ink-2">{sub}</span>}</span></button>)
    const bullets: Record<Purpose, string[]> = {
      album: [t('Only guardians of children in the photo can open it', 'फ़ोटो में मौजूद बच्चों के अभिभावक ही खोल सकते हैं'), t('Other children are blurred for you', 'दूसरे बच्चे आपके लिए धुंधले रहते हैं'), t('Download or share a controlled link with family', 'डाउनलोड करें या परिवार के साथ नियंत्रित लिंक साझा करें')],
      internal: [t('Notice boards and corridor displays', 'नोटिस बोर्ड और गलियारे के प्रदर्शन'), t('Yearbook and internal newsletters', 'ईयरबुक और आंतरिक न्यूज़लेटर'), t('Not posted online', 'ऑनलाइन पोस्ट नहीं होता')],
      public: [t('School website, Instagram, Facebook, YouTube', 'स्कूल वेबसाइट, इंस्टाग्राम, फ़ेसबुक, यूट्यूब'), t('Visible to anyone, and can be copied by others', 'कोई भी देख सकता है, और दूसरे प्रतियाँ बना सकते हैं'), t('The school reviews every photo before posting', 'पोस्ट से पहले स्कूल हर फ़ोटो की समीक्षा करता है')],
    }
    return (
      <div className="flex h-full flex-col">{header}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="eyebrow">{t(`Choice ${ci + 1} of 3`, `पसंद ${ci + 1} / 3`)}</div>
          <h2 className="mt-1 text-2xl font-bold leading-tight">{hi ? meta.labelHi : meta.label}</h2>
          <p className="mt-1 text-sm text-ink-2">{meta.example}</p>
          <div className="mt-3 flex gap-2">{EX.map((e) => <img key={e} src={e} alt="" className="size-[72px] rounded-xl object-cover" style={p === 'public' ? undefined : undefined} />)}</div>
          <ul className="mt-3 space-y-1.5 text-sm">{bullets[p].map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{b}</li>)}</ul>
          <div className="mt-4 space-y-2.5">
            {p !== 'public' ? (<>
              <Choice on={chosen === true} label={t('Yes', 'हाँ')} sub={p === 'album' ? t('Show me photos of my child', 'मुझे मेरे बच्चे की फ़ोटो दिखाएँ') : t('Allow inside the school', 'स्कूल के अंदर अनुमति दें')} onClick={() => set(true)} />
              <Choice on={chosen === false} tone="risk" label={t('No', 'नहीं')} sub={t('Don’t use my child’s photos for this', 'इसके लिए मेरे बच्चे की फ़ोटो उपयोग न करें')} onClick={() => set(false)} />
            </>) : (<>
              <Choice on={chosen === 'no'} tone="risk" label={t('No — keep it private', 'नहीं — निजी रखें')} sub={t('My child is never posted publicly', 'मेरे बच्चे को कभी सार्वजनिक रूप से पोस्ट न करें')} onClick={() => set('no')} />
              <Choice on={chosen === 'ask'} label={t('Ask me each time', 'हर बार मुझसे पूछें')} sub={t('The school sends a request for each photo', 'स्कूल हर फ़ोटो के लिए अनुरोध भेजता है')} onClick={() => set('ask')} />
              <Choice on={chosen === 'yes'} label={t('Yes, school-approved posts', 'हाँ, स्कूल द्वारा अनुमोदित पोस्ट')} sub={t('The school may post photos after its own review', 'स्कूल अपनी समीक्षा के बाद फ़ोटो पोस्ट कर सकता है')} onClick={() => set('yes')} />
            </>)}
          </div>
          <p className="mt-3 text-[11px] text-ink-3">{t('Nothing is pre-selected. You can change this any time in Choices.', 'कुछ भी पहले से चुना नहीं है। आप कभी भी ‘पसंद’ में बदल सकते हैं।')}</p>
        </div>
        <div className="p-5 pt-0"><Primary disabled={chosen === undefined} onClick={() => (ci < 2 ? setCi(ci + 1) : setStage('confirm'))}>{ci < 2 ? t('Next', 'आगे') : t('Review my choices', 'मेरी पसंद देखें')}</Primary></div>
      </div>)
  }

  if (stage === 'confirm') {
    const pub = draft.public ?? 'no'
    const rows: [string, string, boolean][] = [[t('Private parent album', 'निजी अभिभावक एल्बम'), draft.album ? t('Yes', 'हाँ') : t('No', 'नहीं'), !!draft.album], [t('Inside school', 'स्कूल के अंदर'), draft.internal ? t('Yes', 'हाँ') : t('No', 'नहीं'), !!draft.internal], [t('Website & social media', 'वेबसाइट व सोशल मीडिया'), pub === 'yes' ? t('Yes, school-approved posts', 'हाँ, अनुमोदित पोस्ट') : pub === 'ask' ? t('Ask me each time', 'हर बार पूछें') : t('No', 'नहीं'), pub === 'yes']]
    return (
      <div className="flex h-full flex-col">{header}
        <div className="flex-1 overflow-y-auto p-5">
          <h2 className="text-2xl font-bold">{t('Confirm your choices', 'अपनी पसंद की पुष्टि करें')}</h2>
          <p className="mt-1 text-sm text-ink-2">{t(`For ${child.name}. Saved with the notice version and time.`, `${child.name} के लिए। सूचना संस्करण और समय के साथ सहेजा जाएगा।`)}</p>
          <div className="mt-4 space-y-2">{rows.map(([l, v, on]) => <div key={l} className="flex items-center justify-between rounded-2xl border border-line bg-white p-3.5"><span className="text-sm font-semibold">{l}</span><Chip tone={on ? 'ok' : 'muted'}>{v}</Chip></div>)}</div>
          <div className="mt-4 rounded-2xl bg-sand p-3.5 text-xs text-ink-2">{t('By confirming, you record these choices as ' + child.guardian + ', guardian of ' + child.name + ', under notice v1.2. You can change them any time.', child.guardian + ', ' + child.name + ' के अभिभावक के रूप में आप ये पसंद सूचना v1.2 के तहत दर्ज कर रहे हैं। आप इन्हें कभी भी बदल सकते हैं।')}</div>
        </div>
        <div className="p-5 pt-0"><Primary onClick={() => {
          const id = s.completeOnboarding(child.id, { album: !!draft.album, internal: !!draft.internal, public: pub === 'yes' }, pub === 'ask', phone)
          setReceipt(id); setStage('receipt'); toast.success(t('Choices saved', 'पसंद सहेजी गई'))
        }}>{t('Confirm and save', 'पुष्टि करें और सहेजें')}</Primary></div>
      </div>)
  }

  // receipt
  return (
    <div className="flex h-full flex-col items-center justify-center bg-paper p-6 text-center">
      <div className="pop mb-4 grid size-20 place-items-center rounded-full bg-ok-bg text-ok"><CheckCircle2 className="size-11" /></div>
      <h2 className="text-2xl font-bold">{t('You’re all set', 'सब तैयार है')}</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-2">{t(`${child.name}’s choices are saved. You’ll see photos of ${child.name.split(' ')[0]} in your private album.`, `${child.name} की पसंद सहेज ली गई। आपको निजी एल्बम में फ़ोटो दिखेंगी।`)}</p>
      <div className="mt-5 w-full max-w-xs rounded-2xl border border-dashed border-[#cdbf9f] bg-white p-4 text-left text-xs">
        <div className="eyebrow mb-1">{t('Receipt', 'रसीद')}</div>
        <div className="flex justify-between"><span className="text-ink-3">Notice</span><b>v1.2 · {hi ? 'हिन्दी' : 'English'}</b></div>
        <div className="flex justify-between"><span className="text-ink-3">Time</span><b>{fmtD(new Date().toISOString())}</b></div>
        <div className="flex justify-between"><span className="text-ink-3">Evidence ID</span><b className="font-mono">{receipt.slice(0, 10)}</b></div>
      </div>
      <Primary className="mt-6 max-w-xs" onClick={() => setStage('app')}>{t('Open my app', 'मेरा ऐप खोलें')}</Primary>
    </div>)
}

/* =============== tabs =============== */
type Child = ReturnType<typeof useDemo.getState>['students'][number]
type T = (a: string, b: string) => string

function HomeTab({ child, mine, pending, setTab, setZoom, t }: { child: Child; mine: ReturnType<typeof useDemo.getState>['photos']; pending: unknown[]; setTab: (t: Tab) => void; setZoom: (id: string) => void; t: T }) {
  const s = useDemo()
  const ids = new Set(mine.map((p) => p.id))
  const feed = s.audit.filter((a) => (a.photoId && ids.has(a.photoId) && !a.actor.startsWith('Guardian')) || a.actor === `Guardian · ${child.guardian}`).slice(-5).reverse()
  const live = mine.filter((p) => s.published[p.id])
  const on = (['album', 'internal', 'public'] as Purpose[]).filter((k) => child.perms[k]).length
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-3xl bg-navy p-4 text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-gold">{t('Today', 'आज')}</div>
        <div className="mt-1 text-lg font-bold">{t(`${mine.length} photos of ${child.name.split(' ')[0]} from Annual Day`, `वार्षिक दिवस से ${child.name.split(' ')[0]} की ${mine.length} फ़ोटो`)}</div>
        <button type="button" onClick={() => setTab('photos')} className="mt-3 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold">{t('Open my album', 'मेरा एल्बम खोलें')}</button>
      </div>
      {pending.length > 0 && <button type="button" onClick={() => setTab('inbox')} className="flex w-full items-center gap-3 rounded-2xl border border-risk/30 bg-risk-bg p-3.5 text-left"><Send className="size-5 text-risk" /><span className="text-sm"><b>{t(`${pending.length} request waiting`, `${pending.length} अनुरोध प्रतीक्षा में`)}</b><br /><span className="text-ink-2">{t('The school asks about a photo of your child.', 'स्कूल आपके बच्चे की एक फ़ोटो के बारे में पूछ रहा है।')}</span></span></button>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setTab('choices')} className="card p-3.5 text-left"><div className="eyebrow">{t('My choices', 'मेरी पसंद')}</div><div className="mt-1 text-2xl font-bold">{on}/3</div><div className="text-xs text-ink-3">{t('uses allowed', 'उपयोग की अनुमति')}</div></button>
        <div className="card p-3.5"><div className="eyebrow">{t('Posted publicly', 'सार्वजनिक पोस्ट')}</div><div className="mt-1 text-2xl font-bold">{live.length}</div><div className="text-xs text-ink-3">{t('photos with my child', 'मेरे बच्चे वाली फ़ोटो')}</div></div>
      </div>
      {live.length > 0 && <div><div className="eyebrow mb-1.5">{t('Where my child appears publicly', 'मेरा बच्चा सार्वजनिक रूप से कहाँ दिखता है')}</div>{live.map((p) => <button key={p.id} type="button" onClick={() => { s.openPhoto(p.id); setZoom(p.id) }} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-2.5 text-left"><img src={p.src} alt="" className="size-14 rounded-xl object-cover" /><span className="text-sm"><b>{p.title.replace('Annual Day · ', '')}</b><br /><span className="text-xs text-ink-3">Website & social media</span></span></button>)}</div>}
      <div><div className="eyebrow mb-1.5">{t('Recent activity', 'हाल की गतिविधि')}</div>
        <div className="space-y-2">{feed.length === 0 && <p className="text-sm text-ink-3">—</p>}{feed.map((a) => <div key={a.n} className="rounded-2xl border border-line bg-white p-3 text-sm"><div className="flex justify-between gap-2"><b>{a.action}</b><span className="shrink-0 text-xs text-ink-3">{fmtD(a.t)}</span></div><div className="text-xs text-ink-3">{a.actor.replace('School admin · ', '')}</div></div>)}</div></div>
    </div>)
}

function PhotosTab({ child, mine, setZoom, t }: { child: Child; mine: ReturnType<typeof useDemo.getState>['photos']; setZoom: (id: string) => void; t: T }) {
  const s = useDemo()
  const [sel, setSel] = React.useState<string[] | null>(null)
  const toggle = (id: string) => setSel((x) => (x ?? []).includes(id) ? (x ?? []).filter((y) => y !== id) : [...(x ?? []), id])
  const can = child.perms.album
  return (
    <div className="p-4 pb-20">
      <div className="mb-3 flex items-center justify-between"><div><div className="text-lg font-bold">{t('My child’s photos', 'मेरे बच्चे की फ़ोटो')}</div><div className="text-xs text-ink-3">Annual Day · {mine.length} {t('photos', 'फ़ोटो')} · {t('others blurred', 'दूसरे धुंधले')}</div></div>
        <button type="button" onClick={() => setSel(sel ? null : [])} className="rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold">{sel ? t('Cancel', 'रद्द') : t('Select', 'चुनें')}</button></div>
      {!can && <div className="mb-3 rounded-2xl bg-warn-bg p-3 text-sm text-warn">{t('Your private album is off. Turn it on in Choices to download or share.', 'आपका निजी एल्बम बंद है। डाउनलोड या साझा करने के लिए ‘पसंद’ में चालू करें।')}</div>}
      <div className="grid grid-cols-2 gap-2.5">
        {mine.map((p) => { const on = sel?.includes(p.id); const live = s.published[p.id]; return (
          <button key={p.id} type="button" onClick={() => (sel ? toggle(p.id) : (s.openPhoto(p.id), setZoom(p.id)))} className={cn('relative overflow-hidden rounded-2xl text-left ring-2', on ? 'ring-gold' : 'ring-transparent')}>
            <div className="max-h-56 overflow-hidden"><PhotoView photo={p} students={s.students} mode="parent" highlightId={child.id} /></div>
            {live && <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-navy/85 px-2 py-0.5 text-[10px] font-bold text-white"><Globe className="size-3" />Public</span>}
            {sel && <span className={cn('absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full border-2 border-white', on ? 'bg-gold text-white' : 'bg-black/30')}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>}
          </button>) })}
      </div>
      {sel && sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-[380px] gap-2 rounded-2xl bg-navy p-2 shadow-2xl md:absolute md:bottom-20">
          <button type="button" disabled={!can} onClick={() => { s.downloadPhotos(sel); toast.success(t(`${sel.length} saved to your device`, `${sel.length} आपके डिवाइस में सहेजी गईं`)); setSel(null) }} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold text-sm font-bold text-white disabled:opacity-40"><Download className="size-4" />{t('Download', 'डाउनलोड')} ({sel.length})</button>
          <button type="button" disabled={!can} onClick={() => { sel.forEach((id) => s.shareLink(id)); toast.success(t('Family link created · expires in 7 days', 'परिवार लिंक बना · 7 दिनों में समाप्त')); setSel(null) }} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-sm font-bold text-white disabled:opacity-40"><Link2 className="size-4" />{t('Share link', 'लिंक साझा करें')}</button>
        </div>)}
      {s.shares.filter((x) => x.studentId === child.id).length > 0 && <div className="mt-5"><div className="eyebrow mb-1.5">{t('Active family links', 'सक्रिय परिवार लिंक')}</div>{s.shares.filter((x) => x.studentId === child.id).slice(0, 3).map((x) => <div key={x.id} className="mb-2 rounded-2xl border border-line bg-white p-3 text-xs"><div className="truncate font-mono">{x.link}</div><div className="text-ink-3">{t('Expires', 'समाप्ति')} {fmtD(x.expires)} · {t('only guardians’ family; downloaded copies can’t be recalled', 'केवल परिवार; डाउनलोड प्रतियाँ वापस नहीं ली जा सकतीं')}</div></div>)}</div>}
    </div>)
}

function InboxTab({ child, t }: { child: Child; t: T }) {
  const s = useDemo()
  const reqs = s.requests.filter((r) => r.studentId === child.id)
  return (
    <div className="space-y-3 p-4">
      <div className="text-lg font-bold">{t('Inbox', 'इनबॉक्स')}</div>
      {reqs.length === 0 && <div className="card p-5 text-center text-sm text-ink-3">{t('No requests. If the school wants to post a photo of your child, it appears here for your approval.', 'कोई अनुरोध नहीं। यदि स्कूल आपके बच्चे की फ़ोटो पोस्ट करना चाहे, तो अनुमोदन के लिए यहाँ दिखेगी।')}</div>}
      {reqs.map((r) => { const p = s.photos.find((x) => x.id === r.photoId)!; return (
        <div key={r.id} className="card overflow-hidden">
          <div className="max-h-52 overflow-hidden"><PhotoView photo={p} students={s.students} mode="parent" highlightId={child.id} className="rounded-none" /></div>
          <div className="p-3.5">
            <div className="flex items-center justify-between"><b className="text-sm">{t('Approval request', 'अनुमोदन अनुरोध')}</b><Chip tone={r.status === 'pending' ? 'warn' : r.status === 'approved' ? 'ok' : 'muted'}>{r.status}</Chip></div>
            <p className="mt-1 text-sm text-ink-2">{t(`Sunrise Public School would like to post this photo on ${r.channel}. Other children are blurred here. Allow it for this photo only?`, `सनराइज़ पब्लिक स्कूल इस फ़ोटो को ${r.channel} पर पोस्ट करना चाहता है। दूसरे बच्चे धुंधले हैं। केवल इस फ़ोटो के लिए अनुमति दें?`)}</p>
            {r.status === 'pending' && <div className="mt-3 flex gap-2"><button type="button" onClick={() => { s.answerRequest(r.id, false); toast(t('Declined — stays private', 'अस्वीकृत — निजी रहेगी')) }} className="min-h-11 flex-1 rounded-xl border border-line text-sm font-bold">{t('Decline', 'अस्वीकार')}</button><button type="button" onClick={() => { s.answerRequest(r.id, true); toast.success(t('Approved for this photo only', 'केवल इस फ़ोटो के लिए अनुमोदित')) }} className="min-h-11 flex-1 rounded-xl bg-navy text-sm font-bold text-white">{t('Allow this photo', 'अनुमति दें')}</button></div>}
          </div>
        </div>) })}
      <div className="card p-3.5 text-sm"><div className="flex items-center gap-2 font-bold"><School className="size-4 text-gold" />{t('Welcome to Sunrise', 'सनराइज़ में स्वागत')}</div><p className="mt-1 text-xs text-ink-2">{t('Notice v1.2 is active. You’ll be told here whenever it changes.', 'सूचना v1.2 सक्रिय है। बदलने पर यहाँ बताया जाएगा।')}</p></div>
    </div>)
}

function ChoicesTab({ child, t, hi }: { child: Child; t: T; hi: boolean }) {
  const s = useDemo()
  const hist = s.audit.filter((a) => a.actor === `Guardian · ${child.guardian}` && /Permission|Choices|approval|declined/i.test(a.action)).slice(-5).reverse()
  const mode: PubMode = child.perms.public ? 'yes' : child.askEach ? 'ask' : 'no'
  const setMode = (m: PubMode) => { s.setPerm(child.id, 'public', m === 'yes'); s.setAskEach(child.id, m === 'ask'); toast(m === 'yes' ? t('Public use allowed', 'सार्वजनिक उपयोग की अनुमति') : m === 'ask' ? t('The school will ask each time', 'स्कूल हर बार पूछेगा') : t('Public use withdrawn', 'सार्वजनिक उपयोग वापस')) }
  return (
    <div className="space-y-3 p-4">
      <div><div className="text-lg font-bold">{t('My choices', 'मेरी पसंद')}</div><p className="text-xs text-ink-3">{t('Change or withdraw any time. Applies to future school-managed sharing.', 'कभी भी बदलें या वापस लें। आगे की साझेदारी पर लागू।')}</p></div>
      {(['album', 'internal'] as Purpose[]).map((k) => { const p = PURPOSES.find((x) => x.key === k)!; return (
        <div key={k} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5"><div className="min-w-0 flex-1"><div className="text-sm font-bold">{hi ? p.labelHi : p.label}</div><div className="text-xs text-ink-3">{p.example}</div></div><Switch checked={child.perms[k]} onChange={(v) => { s.setPerm(child.id, k, v); toast(v ? t('Turned on', 'चालू') : t('Withdrawn', 'वापस')) }} label={p.label} /></div>) })}
      <div className="rounded-2xl border border-line bg-white p-3.5">
        <div className="text-sm font-bold">{hi ? PURPOSES[2].labelHi : PURPOSES[2].label}</div><div className="mb-2 text-xs text-ink-3">{PURPOSES[2].example}</div>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-sand p-1">{([['no', t('No', 'नहीं')], ['ask', t('Ask me', 'पूछें')], ['yes', t('Yes', 'हाँ')]] as [PubMode, string][]).map(([m, l]) => <button key={m} type="button" onClick={() => setMode(m)} className={cn('min-h-10 rounded-lg text-sm font-bold', mode === m ? (m === 'no' ? 'bg-risk text-white' : 'bg-navy text-white') : 'text-ink-2')}>{l}</button>)}</div>
      </div>
      <button type="button" onClick={() => { (['album', 'internal', 'public'] as Purpose[]).forEach((k) => s.setPerm(child.id, k, false)); s.setAskEach(child.id, false); toast(t('All uses withdrawn', 'सभी उपयोग वापस'))}} className="min-h-11 w-full rounded-2xl border border-risk/40 text-sm font-bold text-risk">{t('Withdraw everything', 'सब कुछ वापस लें')}</button>
      <p className="text-[11px] text-ink-3">{t('Copies already shared outside the school can’t be recalled. Live posts are flagged to the school for takedown.', 'स्कूल के बाहर साझा प्रतियाँ वापस नहीं ली जा सकतीं। लाइव पोस्ट हटाने के लिए स्कूल को सूचित किया जाता है।')}</p>
      <div><div className="eyebrow mb-1.5">{t('History', 'इतिहास')}</div>{hist.map((a) => <div key={a.n} className="mb-2 rounded-2xl border border-line bg-white p-3 text-xs"><div className="flex justify-between"><b className="text-sm">{a.action}</b><span className="text-ink-3">{fmtD(a.t)}</span></div><div className="text-ink-3">{a.detail}</div></div>)}</div>
    </div>)
}

function MoreTab({ child, t, setStage, setDraft }: { child: Child; t: T; setStage: (s: Stage) => void; setDraft: (d: object) => void }) {
  const s = useDemo()
  const [kind, setKind] = React.useState<'Access' | 'Correction' | 'Erasure' | 'Grievance'>('Access')
  const [text, setText] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const cases = s.cases.filter((c) => c.studentId === child.id)
  const row = (icon: React.ReactNode, label: string, on: () => void, sub?: string) => <button type="button" onClick={on} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left"><span className="text-gold">{icon}</span><span className="flex-1 text-sm font-bold">{label}{sub && <span className="block text-xs font-normal text-ink-3">{sub}</span>}</span></button>
  return (
    <div className="space-y-3 p-4">
      <div className="text-lg font-bold">{t('Privacy & help', 'गोपनीयता व सहायता')}</div>
      <div className="card p-3.5">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-gold" />{t('Make a privacy request', 'गोपनीयता अनुरोध करें')}</div>
        <div className="grid grid-cols-2 gap-1.5">{(['Access', 'Correction', 'Erasure', 'Grievance'] as const).map((k) => <button key={k} type="button" onClick={() => { setKind(k); setOpen(true) }} className={cn('min-h-10 rounded-xl border text-xs font-bold', open && kind === k ? 'border-navy bg-navy text-white' : 'border-line bg-white')}>{{ Access: t('Get a copy', 'प्रति पाएँ'), Correction: t('Correct something', 'सुधार करें'), Erasure: t('Delete photos', 'फ़ोटो हटाएँ'), Grievance: t('Raise a concern', 'शिकायत करें') }[k]}</button>)}</div>
        {open && <div className="pop mt-3 space-y-2"><textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t('Tell us what you need', 'बताइए आपको क्या चाहिए')} className="w-full rounded-xl border border-[#d6cdb8] bg-white p-3 text-sm" /><Primary disabled={text.trim().length < 3} onClick={() => { const id = s.fileCase({ kind, studentId: child.id, text }); setText(''); setOpen(false); toast.success(`${t('Request filed', 'अनुरोध दर्ज')} · ${id}`) }}>{t('Send to school', 'स्कूल को भेजें')}</Primary></div>}
        {cases.length > 0 && <div className="mt-3 space-y-2">{cases.map((c) => <div key={c.id} className="rounded-xl bg-sand p-2.5 text-xs"><div className="flex justify-between"><b>{c.id} · {c.kind}</b><Chip tone={c.status === 'open' ? 'warn' : 'ok'}>{c.status}</Chip></div><div className="text-ink-3">{c.text.slice(0, 70)} · {t('reply by', 'उत्तर तक')} {fmtD(c.due)}</div></div>)}</div>}
      </div>
      {row(<FileText className="size-5" />, t('Read the notice again', 'सूचना फिर पढ़ें'), () => { toast(t('Notice v1.2 · opened', 'सूचना v1.2 खुली')) ; }, 'v1.2 · English / हिन्दी')}
      <div className="flex items-center gap-2 px-1 pt-1 text-xs font-bold uppercase tracking-wider text-ink-3"><ArrowLeftRight className="size-3.5" />{t('Demo: sign in as another parent', 'डेमो: दूसरे अभिभावक के रूप में')}</div>
      <select aria-label="Switch child" value={child.id} onChange={(e) => { s.setChild(e.target.value); setDraft({}) }} className="h-12 w-full rounded-2xl border border-line bg-white px-3 text-sm">{s.students.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.guardian}{x.onboarded ? '' : ' (not set up)'}</option>)}</select>
      {row(<Smartphone className="size-5" />, t('Replay onboarding', 'ऑनबोर्डिंग फिर चलाएँ'), () => setStage('welcome'))}
      {row(<Lock className="size-5" />, t('Switch app', 'ऐप बदलें'), () => s.setRole(null))}
      <p className="pt-2 text-center text-[11px] text-ink-3"><X className="mr-1 inline size-3" />Prototype with synthetic data · not legal advice</p>
    </div>)
}
