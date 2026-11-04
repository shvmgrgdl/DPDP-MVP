import { tx, tActor, tDetail } from '../i18n'
import * as React from 'react'
import { toast } from 'sonner'
import { Home, Images, Inbox as InboxIcon, SlidersHorizontal, Menu, ChevronLeft, Check, X, ShieldCheck, Smartphone, Languages, Download, Link2, Lock, Globe, School, Send, FileText, CheckCircle2, Eye, EyeOff, KeyRound, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemo, type PermInput } from '../store'
import { evaluate, PURPOSES, type Purpose } from '../data'
import { Chip, LangPicker, PhotoView, Switch, WmImg, fmtD } from '../ui'
import { LANGS } from '../i18n'
import { Zoom } from '../screens/Zoom'
import { PhoneShell } from './PhoneShell'
import { saveCopies } from '../lib/actions'
import { t } from '../i18n'

type Stage = 'welcome' | 'login' | 'password' | 'notice' | 'consent' | 'confirm' | 'receipt' | 'app'
type Tab = 'home' | 'photos' | 'inbox' | 'choices' | 'more'
type PubMode = 'no' | 'ask' | 'yes'
const EX = ["media/annual-day-03.jpg", "media/annual-day-12.jpg", "media/sports-day-01.jpg"]

const Primary = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...p} className={cn('min-h-12 w-full rounded-2xl bg-navy px-4 text-[15px] font-bold text-white transition active:scale-[.99] disabled:opacity-35', p.className)} />
const Ghost = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...p} className={cn('min-h-11 w-full rounded-2xl px-4 text-sm font-semibold text-ink-2', p.className)} />

export function ParentApp() {
  const s = useDemo()
  const child = s.students.find((x) => x.id === s.childId)!
    const after = (sid: string): Stage => { const g = useDemo.getState(); return g.accounts[sid].mustChange ? 'password' : g.students.find((x) => x.id === sid)!.onboarded ? 'app' : 'notice' }
  const [stage, setStage] = React.useState<Stage>(s.session ? after(s.session) : 'welcome')
  const [tab, setTab] = React.useState<Tab>('home')
  const [zoom, setZoom] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<{ album?: boolean; internal?: boolean; public?: PubMode }>({})
  const [receipt, setReceipt] = React.useState('')
  React.useEffect(() => { s.setViewer('parent') }, [])
  const first = React.useRef(true)
  React.useEffect(() => {
    if (first.current) { first.current = false; return }
    setDraft({}); setTab('home')
    if (!s.session) setStage('login'); else if (stage === 'welcome' || stage === 'login') setStage(after(s.session))
  }, [s.session])
  React.useEffect(() => { if (s.session && child.onboarded && !s.accounts[s.session].mustChange && ["welcome", "login", "notice", "consent", "confirm"].includes(stage)) setStage('app') }, [child.onboarded, stage, s.session])
  React.useEffect(() => { const h = (e: Event) => setZoom((e as CustomEvent<string>).detail); window.addEventListener('open-zoom', h); return () => window.removeEventListener('open-zoom', h) }, [])
  React.useEffect(() => { const h = (e: Event) => { setStage('app'); setTab((e as CustomEvent<Tab>).detail) }; window.addEventListener('parent-tab', h); return () => window.removeEventListener('parent-tab', h) }, [])

  const mine = s.photos.filter((p) => p.faces.some((f) => f.studentId === child.id))
  const pending = s.requests.filter((r) => r.studentId === child.id && r.status === 'pending')
  const lang = <LangPicker compact />

  /* ---------- onboarding ---------- */
  if (stage !== 'app') return (
    <PhoneShell>
      <Onboarding {...{ stage, setStage, draft, setDraft, receipt, setReceipt, lang, t, after }} />
    </PhoneShell>
  )

  /* ---------- app ---------- */
  const tabs: [Tab, string, React.ReactNode, number?][] = [["home", t("Home"), <Home key="h" className="size-5" />], ["photos", t("Photos"), <Images key="p" className="size-5" />], ["inbox", t("Inbox"), <InboxIcon key="i" className="size-5" />, pending.length], ["choices", t("Choices"), <SlidersHorizontal key="c" className="size-5" />], ["more", t("More"), <Menu key="m" className="size-5" />]]
  return (
    <PhoneShell>
      <header className="flex items-center justify-between gap-2 border-b border-line bg-white px-4 py-2.5">
        <div className="flex items-center gap-2.5"><div className="grid size-9 place-items-center rounded-full bg-gold text-sm font-bold text-white">{child.name[0]}</div><div className="leading-tight"><div className="text-sm font-bold">{child.name}</div><div className="text-[11px] text-ink-3">{t("Class")} {child.cls} {t("· Sunrise Public School")}</div></div></div>
        {lang}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'home' && <HomeTab {...{ child, mine, pending, setTab, setZoom, t }} />}
        {tab === 'photos' && <PhotosTab {...{ child, mine, setZoom, t }} />}
        {tab === 'inbox' && <InboxTab {...{ child, t }} />}
        {tab === 'choices' && <ChoicesTab {...{ child, t }} />}
        {tab === 'more' && <MoreTab {...{ child, t, setStage }} />}
      </div>
      <nav className="grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]" aria-label={t("App")}>
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
function Onboarding({ stage, setStage, draft, setDraft, receipt, setReceipt, lang, t, after }: {
  stage: Stage; setStage: (s: Stage) => void; draft: { album?: boolean; internal?: boolean; public?: PubMode }; setDraft: (d: { album?: boolean; internal?: boolean; public?: PubMode }) => void
  after: (sid: string) => Stage; receipt: string; setReceipt: (v: string) => void; lang: React.ReactNode; t: TFn
}) {
  const s = useDemo()
  const child = s.students.find((x) => x.id === s.childId)!
  const [slide, setSlide] = React.useState(0)
  const [uid, setUid] = React.useState('')
  const [pw, setPw] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [err, setErr] = React.useState<'' | 'bad' | 'locked'>('')
  const [np, setNp] = React.useState('')
  const [np2, setNp2] = React.useState('')
  const [iam, setIam] = React.useState(false)
  const [read, setRead] = React.useState(false)
  const [ci, setCi] = React.useState(0)
  const order: Purpose[] = ["album", "internal", "public"]
  const steps: Stage[] = ["login", "notice", "consent", "confirm"]
  const idx = stage === 'password' ? 0 : steps.indexOf(stage)
  const back = () => { if (stage === 'consent' && ci > 0) setCi(ci - 1); else if (stage === 'login') setStage('welcome'); else if (stage === 'password') { s.signOut(); setStage('login') } else { const i = steps.indexOf(stage); setStage(steps[i - 1]) } }
  const header = stage !== 'welcome' && stage !== 'receipt' && (
    <div className="flex items-center justify-between gap-2 px-4 pt-3">
      {stage === 'notice' ? <span className="size-10" /> : <button type="button" aria-label={t("Back")} onClick={back} className="grid size-10 place-items-center rounded-full hover:bg-sand"><ChevronLeft className="size-5" /></button>}
      <div className="flex flex-1 justify-center gap-1.5">{steps.map((x, i) => <span key={x} className={cn('h-1.5 w-8 rounded-full', i <= idx ? 'bg-gold' : 'bg-sand')} />)}</div>
      {lang}
    </div>)

  if (stage === 'welcome') {
    const slides = [
      { icon: <ShieldCheck className="size-10" />, h: t("Your child’s photos. Your choices."), b: t("Sunrise Public School takes photos at events. This app lets you decide, purpose by purpose, how they are used.") },
      { icon: <Images className="size-10" />, h: t("See every photo of your child"), b: t("A private album shows photos your child appears in. Other children are blurred for you.") },
      { icon: <SlidersHorizontal className="size-10" />, h: t("Change your mind any time"), b: t("Withdrawing is as easy as agreeing. We can restrict future school-managed sharing; copies already shared outside can’t be recalled.") },
    ]
    const sl = slides[slide]
    return (
      <div className="flex h-full flex-col bg-navy p-6 text-white">
        <div className="flex justify-between">{lang}<span className="rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold text-gold">{t("Prototype · synthetic data")}</span></div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 grid size-24 place-items-center rounded-3xl bg-white/10 text-gold">{sl.icon}</div>
          <h1 className="text-2xl font-bold leading-tight">{sl.h}</h1>
          <p className="mt-3 max-w-xs text-[15px] text-white/75">{sl.b}</p>
          <div className="mt-6 flex gap-1.5">{slides.map((_, i) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i === slide ? 'w-6 bg-gold' : 'w-1.5 bg-white/30')} />)}</div>
        </div>
        <Primary className="bg-gold" onClick={() => (slide < 2 ? setSlide(slide + 1) : setStage(s.session ? after(s.session) : 'login'))}>{slide < 2 ? t("Next") : t("Get started")}</Primary>
        <p className="mt-3 text-center text-[11px] text-white/50">{t("Invite from Sunrise Public School for")} {child.name}</p>
      </div>)
  }

  if (stage === 'login') {
    const demo = [['S2', tx("first sign-in · onboarding")], ['S1', tx("returning parent")], ['S3', tx("returning parent")], ['S4', tx("returning parent")]] as const
    const submit = () => { const r = s.login(uid, pw); setErr(r === 'ok' ? '' : r); if (r === 'ok') { const sid = useDemo.getState().session!; setStage(after(sid)); setPw('') } }
    return (
      <div className="flex h-full flex-col">{header}
        <div className="flex-1 overflow-y-auto p-5">
          <h2 className="text-2xl font-bold">{t("Sign in")}</h2>
          <p className="mt-1 text-sm text-ink-2">{t("Use the ID and password on the login slip the school gave you.")}</p>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-[#cdbf9f] bg-white p-3 text-xs"><div className="eyebrow mb-1">{t("Login slip · from your school")}</div><div className="flex justify-between font-mono"><span>{t("ID: G-••••")}</span><span>{t("Password: ••••-••••-•••")}</span></div></div>
          <label className="mt-4 block text-sm font-semibold">{t("School ID")}<input className="mt-1.5 h-12 w-full rounded-xl border border-[#d6cdb8] bg-white px-3 font-mono text-base uppercase tracking-wider" autoCapitalize="characters" autoComplete="username" placeholder={t("G-4K7Q")} value={uid} onChange={(e) => { setUid(e.target.value); setErr('') }} /></label>
          <label className="mt-3 block text-sm font-semibold">{t("Password")}
            <div className="relative mt-1.5"><input className="h-12 w-full rounded-xl border border-[#d6cdb8] bg-white pl-3 pr-12 font-mono text-base" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && uid && pw && submit()} /><button type="button" aria-label={t(show ? 'Hide password' : 'Show password')} onClick={() => setShow(!show)} className="absolute right-1 top-1 grid size-10 place-items-center text-ink-3">{show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div></label>
          {err === 'bad' && <p className="mt-2 text-sm font-semibold text-risk">{t("That ID or password isn’t right. Check your slip, or ask the school office for a new one.")}</p>}
          {err === 'locked' && <p className="mt-2 text-sm font-semibold text-risk">{t("Too many tries. Ask the school office to reissue your login.")}</p>}
          <Primary className="mt-4" disabled={!uid || !pw} onClick={submit}>{t("Sign in")}</Primary>
          <p className="mt-3 text-xs text-ink-2"><KeyRound className="mr-1 inline size-3.5 text-gold" />{t("Forgot it? The school office can issue a new slip. We don’t hold your phone number or email, so it can’t be reset here.")}</p>
          <div className="mt-4 rounded-2xl bg-sand p-3 text-xs text-ink-2"><b>{t("Your privacy")}</b><br />{t("Your ID is random. This app doesn’t store your name or phone number — the school alone keeps the link between your ID and your family. Your child’s name is partly hidden on screen.")}</div>
          <details className="mt-3 rounded-2xl border border-line bg-white p-3 text-xs"><summary className="cursor-pointer font-bold">{t("Demo logins (booth only)")}</summary>
            <div className="mt-2 space-y-1.5">{demo.map(([sid, note]) => <button key={sid} type="button" onClick={() => { setUid(s.accounts[sid].id); setPw(s.accounts[sid].password); setErr('') }} className="flex w-full justify-between rounded-xl bg-sand px-3 py-2.5 text-left font-mono"><span>{s.accounts[sid].id}</span><span className="font-sans text-ink-3">{note}</span></button>)}</div></details>
        </div>
      </div>)
  }

  if (stage === 'password') {
    const ok = np.length >= 8 && /\d/.test(np) && np === np2 && np !== s.accounts[s.session!]?.temp
    const strength = Math.min(4, (np.length >= 8 ? 1 : 0) + (/\d/.test(np) ? 1 : 0) + (/[A-Z]/.test(np) ? 1 : 0) + (/[^A-Za-z0-9]/.test(np) || np.length >= 12 ? 1 : 0))
    return (
      <div className="flex h-full flex-col">{header}
        <div className="flex-1 overflow-y-auto p-5">
          <h2 className="text-2xl font-bold">{t("Set your own password")}</h2>
          <p className="mt-1 text-sm text-ink-2">{t("The password on your slip is temporary. Choose one only you know — the school can’t see it.")}</p>
          <label className="mt-4 block text-sm font-semibold">{t("New password")}<input type={show ? 'text' : 'password'} className="mt-1.5 h-12 w-full rounded-xl border border-[#d6cdb8] bg-white px-3 text-base" value={np} onChange={(e) => setNp(e.target.value)} autoComplete="new-password" /></label>
          <div className="mt-2 flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < strength ? (strength < 3 ? 'bg-warn' : 'bg-ok') : 'bg-sand')} />)}</div>
          <label className="mt-3 block text-sm font-semibold">{t("Confirm password")}<input type={show ? 'text' : 'password'} className="mt-1.5 h-12 w-full rounded-xl border border-[#d6cdb8] bg-white px-3 text-base" value={np2} onChange={(e) => setNp2(e.target.value)} autoComplete="new-password" /></label>
          <button type="button" onClick={() => setShow(!show)} className="mt-2 text-xs font-semibold text-gold">{show ? t("Hide") : t("Show")}</button>
          <ul className="mt-3 space-y-1 text-xs text-ink-2">{[[np.length >= 8, t("At least 8 characters")], [/\d/.test(np), t("Includes a number")], [!!np2 && np === np2, t("Both match")]].map(([on, l]) => <li key={String(l)} className={on ? 'text-ok' : ''}>{on ? '✓' : '○'} {l as string}</li>)}</ul>
        </div>
        <div className="p-5 pt-0"><Primary disabled={!ok} onClick={() => { s.changePassword(s.session!, np); setNp(''); setNp2(''); setStage(after(s.session!)) }}>{t("Save and continue")}</Primary></div>
      </div>)
  }

  if (stage === 'notice') return (
    <div className="flex h-full flex-col">{header}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-3"><div className="grid size-10 place-items-center rounded-full bg-gold text-sm font-bold text-white">{child.name[0]}</div><div className="text-sm"><b>{child.name}</b><div className="text-xs text-ink-3">{t("Class")} {child.cls} · {child.admNo} · {t("ID")} {child.guardian}</div></div></div>
        <div className="flex items-center gap-2"><FileText className="size-5 text-gold" /><span className="eyebrow">{t("Notice v1.2 · school photos & video")}</span></div>
        <h2 className="mt-1 text-2xl font-bold">{t("How the school uses photos")}</h2>
        <div className="mt-4 space-y-2.5">
          {[
            [t("What we collect"), t("Photos and videos of students at school events, taken by staff or the school’s photographer.")],
            [t("Why"), t("Three separate purposes: a private parent album, inside-school use (notice boards, yearbook), and public use (website, social media). You choose each one.")],
            [t("Who sees it"), t("Only the people each purpose needs. In your private album, other children are blurred for you.")],
            [t("How long"), t("Until you withdraw, or until the school’s album expiry (set per event).")],
            [t("Your rights"), t("Change or withdraw any time, ask for a copy of what we hold, ask for corrections or deletion, and raise a concern with the school’s privacy contact.")],
            [t("Limits"), t("We can restrict sharing we manage. We can’t recall screenshots or files already downloaded.")],
          ].map(([h, b]) => <details key={h} className="card group p-3.5" open={h === 'What we collect' || h === 'हम क्या लेते हैं'}><summary className="cursor-pointer list-none text-sm font-bold">{h}</summary><p className="mt-1.5 text-sm text-ink-2">{b}</p></details>)}
        </div>
        <p className="mt-3 text-xs text-ink-3">{t("Privacy contact: privacy@sunrise-school.example (fictional)")}</p>
        <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-5" checked={read} onChange={(e) => setRead(e.target.checked)} />{t("I have read this notice.")}</label>
      </div>
      <div className="p-5 pt-0"><Primary disabled={!read} onClick={() => { s.logEvent('Notice read', 'Notice v1.2 read in {0}.', [s.lang]); setCi(0); setStage('consent') }}>{t("Continue to my choices")}</Primary></div>
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
      album: [t("Only guardians of children in the photo can open it"), t("Other children are blurred for you"), t("Download or share a controlled link with family")],
      internal: [t("Notice boards and corridor displays"), t("Yearbook and internal newsletters"), t("Not posted online")],
      public: [t("School website, Instagram, Facebook, YouTube"), t("Visible to anyone, and can be copied by others"), t("The school reviews every photo before posting")],
    }
    return (
      <div className="flex h-full flex-col">{header}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="eyebrow">{t("Choice {0} of 3", { 0: ci + 1 })}</div>
          <h2 className="mt-1 text-2xl font-bold leading-tight">{t(meta.label)}</h2>
          <p className="mt-1 text-sm text-ink-2">{t(meta.example)}</p>
          <div className="mt-3 flex gap-2">{EX.map((e) => <WmImg key={e} src={e} id={e} className="size-[72px] rounded-xl" />)}</div>
          <ul className="mt-3 space-y-1.5 text-sm">{bullets[p].map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{b}</li>)}</ul>
          <div className="mt-4 space-y-2.5">
            {p !== 'public' ? (<>
              <Choice on={chosen === true} label={t("Yes")} sub={p === 'album' ? t("Show me photos of my child") : t("Allow inside the school")} onClick={() => set(true)} />
              <Choice on={chosen === false} tone="risk" label={t("No")} sub={t("Don’t use my child’s photos for this")} onClick={() => set(false)} />
            </>) : (<>
              <Choice on={chosen === 'no'} tone="risk" label={t("No — keep it private")} sub={t("My child is never posted publicly")} onClick={() => set('no')} />
              <Choice on={chosen === 'ask'} label={t("Ask me each time")} sub={t("The school sends a request for each photo")} onClick={() => set('ask')} />
              <Choice on={chosen === 'yes'} label={t("Yes, school-approved posts")} sub={t("The school may post photos after its own review")} onClick={() => set('yes')} />
            </>)}
          </div>
          <p className="mt-3 text-[11px] text-ink-3">{t("Nothing is pre-selected. You can change this any time in Choices.")}</p>
        </div>
        <div className="p-5 pt-0"><Primary disabled={chosen === undefined} onClick={() => (ci < 2 ? setCi(ci + 1) : setStage('confirm'))}>{ci < 2 ? t("Next") : t("Review my choices")}</Primary></div>
      </div>)
  }

  if (stage === 'confirm') {
    const pub = draft.public ?? 'no'
    const rows: [string, string, boolean][] = [[t("Private parent album"), draft.album ? t("Yes") : t("No"), !!draft.album], [t("Inside school"), draft.internal ? t("Yes") : t("No"), !!draft.internal], [t("Website & social media"), pub === 'yes' ? t("Yes, school-approved posts") : pub === 'ask' ? t("Ask me each time") : t("No"), pub === 'yes']]
    return (
      <div className="flex h-full flex-col">{header}
        <div className="flex-1 overflow-y-auto p-5">
          <h2 className="text-2xl font-bold">{t("Confirm your choices")}</h2>
          <p className="mt-1 text-sm text-ink-2">{t("For {0}. Saved with the notice version and time.", { 0: child.name })}</p>
          <div className="mt-4 space-y-2">{rows.map(([l, v, on]) => <div key={l} className="flex items-center justify-between rounded-2xl border border-line bg-white p-3.5"><span className="text-sm font-semibold">{l}</span><Chip tone={on ? 'ok' : 'muted'}>{v}</Chip></div>)}</div>
          <div className="mt-4 rounded-2xl bg-sand p-3.5 text-xs text-ink-2">{t("You record these choices under ID {0}, for {1}, under notice v1.2. You can change them any time.", { 0: child.guardian, 1: child.name })}</div>
        </div>
        <div className="space-y-3 p-5 pt-0"><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-5" checked={iam} onChange={(e) => setIam(e.target.checked)} />{t("I confirm I am the parent or legal guardian of this child.")}</label><Primary disabled={!iam} onClick={() => {
          const id = s.completeOnboarding(child.id, { album: !!draft.album, internal: !!draft.internal, public: pub === 'yes' }, pub === 'ask')
          setReceipt(id); setStage('receipt'); toast.success(t("Choices saved"))
        }}>{t("Confirm and save")}</Primary></div>
      </div>)
  }

  // receipt
  return (
    <div className="flex h-full flex-col items-center justify-center bg-paper p-6 text-center">
      <div className="pop mb-4 grid size-20 place-items-center rounded-full bg-ok-bg text-ok"><CheckCircle2 className="size-11" /></div>
      <h2 className="text-2xl font-bold">{t("You’re all set")}</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-2">{t("{0}’s choices are saved. You’ll see photos of {1} in your private album.", { 0: child.name, 1: child.name.split(' ')[0] })}</p>
      <div className="mt-5 w-full max-w-xs rounded-2xl border border-dashed border-[#cdbf9f] bg-white p-4 text-left text-xs">
        <div className="eyebrow mb-1">{t("Receipt")}</div>
        <div className="flex justify-between"><span className="text-ink-3">{t("Notice")}</span><b>{t("v1.2 ·")} {LANGS.find((l) => l.code === s.lang)?.name}</b></div>
        <div className="flex justify-between"><span className="text-ink-3">{t("Time")}</span><b>{fmtD(new Date().toISOString())}</b></div>
        <div className="flex justify-between"><span className="text-ink-3">{t("Evidence ID")}</span><b className="font-mono">{receipt.slice(0, 10)}</b></div>
      </div>
      <Primary className="mt-6 max-w-xs" onClick={() => setStage('app')}>{t("Open my app")}</Primary>
    </div>)
}

/* =============== tabs =============== */
type Child = ReturnType<typeof useDemo.getState>['students'][number]
type TFn = typeof t
type T = TFn

function HomeTab({ child, mine, pending, setTab, setZoom, t }: { child: Child; mine: ReturnType<typeof useDemo.getState>['photos']; pending: unknown[]; setTab: (t: Tab) => void; setZoom: (id: string) => void; t: T }) {
  const s = useDemo()
  const ids = new Set(mine.map((p) => p.id))
  const feed = s.audit.filter((a) => (a.photoId && ids.has(a.photoId) && !a.actor.startsWith('Guardian')) || a.actor === `Guardian ${child.guardian}`).slice(-5).reverse()
  const live = mine.filter((p) => s.published[p.id])
  const on = (["album", "internal", "public"] as Purpose[]).filter((k) => child.perms[k]).length
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-3xl bg-navy p-4 text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-gold">{t("Today")}</div>
        <div className="mt-1 text-lg font-bold">{t("{0} photos of {1} from Annual Day", { 0: mine.length, 1: child.name.split(' ')[0] })}</div>
        <button type="button" onClick={() => setTab('photos')} className="mt-3 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold">{t("Open my album")}</button>
      </div>
      {pending.length > 0 && <button type="button" onClick={() => setTab('inbox')} className="flex w-full items-center gap-3 rounded-2xl border border-risk/30 bg-risk-bg p-3.5 text-left"><Send className="size-5 text-risk" /><span className="text-sm"><b>{t("{0} request waiting", { 0: pending.length })}</b><br /><span className="text-ink-2">{t("The school asks about a photo of your child.")}</span></span></button>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setTab('choices')} className="card p-3.5 text-left"><div className="eyebrow">{t("My choices")}</div><div className="mt-1 text-2xl font-bold">{on}/3</div><div className="text-xs text-ink-3">{t("uses allowed")}</div></button>
        <div className="card p-3.5"><div className="eyebrow">{t("Posted publicly")}</div><div className="mt-1 text-2xl font-bold">{live.length}</div><div className="text-xs text-ink-3">{t("photos with my child")}</div></div>
      </div>
      {live.length > 0 && <div><div className="eyebrow mb-1.5">{t("Where my child appears publicly")}</div>{live.map((p) => <button key={p.id} type="button" onClick={() => { s.openPhoto(p.id); setZoom(p.id) }} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-2.5 text-left"><WmImg src={p.src} id={p.id} className="size-14 rounded-xl" /><span className="text-sm"><b>{p.title.replace('Annual Day · ', '')}</b><br /><span className="text-xs text-ink-3">{t("Website & social media")}</span></span></button>)}</div>}
      <div><div className="eyebrow mb-1.5">{t("Recent activity")}</div>
        <div className="space-y-2">{feed.length === 0 && <p className="text-sm text-ink-3">—</p>}{feed.map((a) => <div key={a.n} className="rounded-2xl border border-line bg-white p-3 text-sm"><div className="flex justify-between gap-2"><b>{t(a.action)}</b><span className="shrink-0 text-xs text-ink-3">{fmtD(a.t)}</span></div><div className="text-xs text-ink-3">{tActor(a.actor)}</div></div>)}</div></div>
    </div>)
}

function PhotosTab({ child, mine, setZoom, t }: { child: Child; mine: ReturnType<typeof useDemo.getState>['photos']; setZoom: (id: string) => void; t: T }) {
  const s = useDemo()
  const [sel, setSel] = React.useState<string[] | null>(null)
  const toggle = (id: string) => setSel((x) => (x ?? []).includes(id) ? (x ?? []).filter((y) => y !== id) : [...(x ?? []), id])
  const can = child.perms.album
  return (
    <div className="p-4 pb-20">
      <div className="mb-3 flex items-center justify-between"><div><div className="text-lg font-bold">{t("My child’s photos")}</div><div className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-[10px] font-bold text-ok"><Lock className="size-3" />{t("Encrypted · watermarked")}</div><div className="text-xs text-ink-3">{t("Annual Day ·")} {mine.length} {t("photos")} · {t("others blurred")}</div></div>
        <button type="button" onClick={() => setSel(sel ? null : [])} className="rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold">{sel ? t("Cancel") : t("Select")}</button></div>
      {!can && <div className="mb-3 rounded-2xl bg-warn-bg p-3 text-sm text-warn">{t("Your private album is off. Turn it on in Choices to download or share.")}</div>}
      <div className="grid grid-cols-2 gap-2.5">
        {mine.map((p) => { const on = sel?.includes(p.id); const live = s.published[p.id]; return (
          <button key={p.id} type="button" onClick={() => (sel ? toggle(p.id) : (s.openPhoto(p.id), setZoom(p.id)))} className={cn('relative overflow-hidden rounded-2xl text-left ring-2', on ? 'ring-gold' : 'ring-transparent')}>
            <div className="max-h-56 overflow-hidden"><PhotoView photo={p} students={s.students} mode="parent" highlightId={child.id} /></div>
            {live && <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-navy/85 px-2 py-0.5 text-[10px] font-bold text-white"><Globe className="size-3" />{t("Public")}</span>}
            {sel && <span className={cn('absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full border-2 border-white', on ? 'bg-gold text-white' : 'bg-black/30')}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>}
          </button>) })}
      </div>
      {sel && sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-[380px] gap-2 rounded-2xl bg-navy p-2 shadow-2xl md:absolute md:bottom-20">
          <button type="button" disabled={!can} onClick={() => { void saveCopies(sel); toast.success(t("{0} saved to your device", { 0: sel.length })); setSel(null) }} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold text-sm font-bold text-white disabled:opacity-40"><Download className="size-4" />{t("Download")} ({sel.length})</button>
          <button type="button" disabled={!can} onClick={() => { sel.forEach((id) => s.shareLink(id)); toast.success(t("Family link created · expires in 7 days")); setSel(null) }} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-sm font-bold text-white disabled:opacity-40"><Link2 className="size-4" />{t("Share link")}</button>
        </div>)}
      {s.shares.filter((x) => x.studentId === child.id).length > 0 && <div className="mt-5"><div className="eyebrow mb-1.5">{t("Active family links")}</div>{s.shares.filter((x) => x.studentId === child.id).slice(0, 3).map((x) => <div key={x.id} className="mb-2 rounded-2xl border border-line bg-white p-3 text-xs"><div className="truncate font-mono">{x.link}</div><div className="text-ink-3">{t("Expires")} {fmtD(x.expires)} · {t("only guardians’ family; downloaded copies can’t be recalled")}</div></div>)}</div>}
    </div>)
}

function InboxTab({ child, t }: { child: Child; t: T }) {
  const s = useDemo()
  const reqs = s.requests.filter((r) => r.studentId === child.id)
  return (
    <div className="space-y-3 p-4">
      <div className="text-lg font-bold">{t("Inbox")}</div>
      {reqs.length === 0 && <div className="card p-5 text-center text-sm text-ink-3">{t("No requests. If the school wants to post a photo of your child, it appears here for your approval.")}</div>}
      {reqs.map((r) => { const p = s.photos.find((x) => x.id === r.photoId)!; return (
        <div key={r.id} className="card overflow-hidden">
          <div className="max-h-52 overflow-hidden"><PhotoView photo={p} students={s.students} mode="parent" highlightId={child.id} className="rounded-none" /></div>
          <div className="p-3.5">
            <div className="flex items-center justify-between"><b className="text-sm">{t("Approval request")}</b><Chip tone={r.status === 'pending' ? 'warn' : r.status === 'approved' ? 'ok' : 'muted'}>{t(r.status)}</Chip></div>
            <p className="mt-1 text-sm text-ink-2">{t("Sunrise Public School would like to post this photo on {0}. Other children are blurred here. Allow it for this photo only?", { 0: t(r.channel) })}</p>
            {r.status === 'pending' && <div className="mt-3 flex gap-2"><button type="button" onClick={() => { s.answerRequest(r.id, false); toast(t("Declined — stays private")) }} className="min-h-11 flex-1 rounded-xl border border-line text-sm font-bold">{t("Decline")}</button><button type="button" onClick={() => { s.answerRequest(r.id, true); toast.success(t("Approved for this photo only")) }} className="min-h-11 flex-1 rounded-xl bg-navy text-sm font-bold text-white">{t("Allow this photo")}</button></div>}
          </div>
        </div>) })}
      <div className="card p-3.5 text-sm"><div className="flex items-center gap-2 font-bold"><School className="size-4 text-gold" />{t("Welcome to Sunrise")}</div><p className="mt-1 text-xs text-ink-2">{t("Notice v1.2 is active. You’ll be told here whenever it changes.")}</p></div>
    </div>)
}

function ChoicesTab({ child, t }: { child: Child; t: T }) {
  const s = useDemo()
  const hist = s.audit.filter((a) => a.actor === `Guardian ${child.guardian}` && /Permission|Choices|approval|declined/i.test(a.action)).slice(-5).reverse()
  const mode: PubMode = child.perms.public ? 'yes' : child.askEach ? 'ask' : 'no'
  const setMode = (m: PubMode) => { s.setPerm(child.id, 'public', m === 'yes'); s.setAskEach(child.id, m === 'ask'); toast(m === 'yes' ? t("Public use allowed") : m === 'ask' ? t("The school will ask each time") : t("Public use withdrawn")) }
  return (
    <div className="space-y-3 p-4">
      <div><div className="text-lg font-bold">{t("My choices")}</div><p className="text-xs text-ink-3">{t("Change or withdraw any time. Applies to future school-managed sharing.")}</p></div>
      {(["album", "internal"] as Purpose[]).map((k) => { const p = PURPOSES.find((x) => x.key === k)!; return (
        <div key={k} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5"><div className="min-w-0 flex-1"><div className="text-sm font-bold">{t(p.label)}</div><div className="text-xs text-ink-3">{t(p.example)}</div></div><Switch checked={child.perms[k]} onChange={(v) => { s.setPerm(child.id, k, v); toast(v ? t("Turned on") : t("Withdrawn")) }} label={t(p.label)} /></div>) })}
      <div className="rounded-2xl border border-line bg-white p-3.5">
        <div className="text-sm font-bold">{t(PURPOSES[2].label)}</div><div className="mb-2 text-xs text-ink-3">{t(PURPOSES[2].example)}</div>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-sand p-1">{([['no', t("No")], ["ask", t("Ask me")], ["yes", t("Yes")]] as [PubMode, string][]).map(([m, l]) => <button key={m} type="button" onClick={() => setMode(m)} className={cn('min-h-10 rounded-lg text-sm font-bold', mode === m ? (m === 'no' ? 'bg-risk text-white' : 'bg-navy text-white') : 'text-ink-2')}>{l}</button>)}</div>
      </div>
      <button type="button" onClick={() => { (["album", "internal", "public"] as Purpose[]).forEach((k) => s.setPerm(child.id, k, false)); s.setAskEach(child.id, false); toast(t("All uses withdrawn"))}} className="min-h-11 w-full rounded-2xl border border-risk/40 text-sm font-bold text-risk">{t("Withdraw everything")}</button>
      <p className="text-[11px] text-ink-3">{t("Copies already shared outside the school can’t be recalled. Live posts are flagged to the school for takedown.")}</p>
      <div><div className="eyebrow mb-1.5">{t("History")}</div>{hist.map((a) => <div key={a.n} className="mb-2 rounded-2xl border border-line bg-white p-3 text-xs"><div className="flex justify-between"><b className="text-sm">{t(a.action)}</b><span className="text-ink-3">{fmtD(a.t)}</span></div><div className="text-ink-3">{tDetail(a)}</div></div>)}</div>
    </div>)
}

function MoreTab({ child, t, setStage }: { child: Child; t: T; setStage: (s: Stage) => void }) {
  const s = useDemo()
  const [kind, setKind] = React.useState<'Access' | 'Correction' | 'Erasure' | 'Grievance'>('Access')
  const [text, setText] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const cases = s.cases.filter((c) => c.studentId === child.id)
  const [protect, setProtect] = React.useState(false)
  const row = (icon: React.ReactNode, label: string, on: () => void, sub?: string) => <button type="button" onClick={on} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left"><span className="text-gold">{icon}</span><span className="flex-1 text-sm font-bold">{label}{sub && <span className="block text-xs font-normal text-ink-3">{sub}</span>}</span></button>
  return (
    <div className="space-y-3 p-4">
      <div className="text-lg font-bold">{t("Privacy & help")}</div>
      <div className="card p-3.5">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-gold" />{t("Make a privacy request")}</div>
        <div className="grid grid-cols-2 gap-1.5">{([tx("Access"), tx("Correction"), tx("Erasure"), tx("Grievance")] as const).map((k) => <button key={k} type="button" onClick={() => { setKind(k); setOpen(true) }} className={cn('min-h-10 rounded-xl border text-xs font-bold', open && kind === k ? 'border-navy bg-navy text-white' : 'border-line bg-white')}>{{ Access: t("Get a copy"), Correction: t("Correct something"), Erasure: t("Delete photos"), Grievance: t("Raise a concern") }[k]}</button>)}</div>
        {open && <div className="pop mt-3 space-y-2"><textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("Tell us what you need")} className="w-full rounded-xl border border-[#d6cdb8] bg-white p-3 text-sm" /><Primary disabled={text.trim().length < 3} onClick={() => { const id = s.fileCase({ kind, studentId: child.id, text }); setText(''); setOpen(false); toast.success(`${t("Request filed")} · ${id}`) }}>{t("Send to school")}</Primary></div>}
        {cases.length > 0 && <div className="mt-3 space-y-2">{cases.map((c) => <div key={c.id} className="rounded-xl bg-sand p-2.5 text-xs"><div className="flex justify-between"><b>{c.id} · {t(c.kind)}</b><Chip tone={c.status === 'open' ? 'warn' : 'ok'}>{t(c.status)}</Chip></div><div className="text-ink-3">{c.text.slice(0, 70)} · {t("reply by")} {fmtD(c.due)}</div></div>)}</div>}
      </div>
      {row(<FileText className="size-5" />, t("Read the notice again"), () => { toast(t("Notice v1.2 · opened")) ; }, 'v1.2 · English / हिन्दी')}
      <div className="card p-3.5 text-xs text-ink-2"><div className="mb-1 flex items-center gap-2 text-sm font-bold text-ink"><KeyRound className="size-4 text-gold" />{t("About your login")}</div>{t("Signed in as ID {0}. This ID is random and was issued by the school. The app doesn’t store your name or phone number; the school keeps the link to your family. Your child’s name is partly hidden.", { 0: child.guardian })}</div>
      {row(<ShieldCheck className="size-5" />, t('How your data is protected'), () => setProtect(true), t('Encryption · watermarks · audit log'))}
      {row(<Smartphone className="size-5" />, t("Replay onboarding"), () => setStage('welcome'))}
      {row(<LogOut className="size-5" />, t("Sign out"), () => { s.signOut(); toast(t("Signed out")) })}
      {row(<Lock className="size-5" />, t("Switch app"), () => s.setRole(null))}
      {protect && <div className="fixed inset-0 z-50 flex items-end bg-navy/60 md:absolute" onClick={() => setProtect(false)}><div className="pop max-h-[85%] w-full overflow-y-auto rounded-t-3xl bg-paper p-5" onClick={(e) => e.stopPropagation()}><div className="mb-2 flex items-center justify-between"><div className="text-lg font-bold">{t("How your data is protected")}</div><button type="button" aria-label={t("Close")} onClick={() => setProtect(false)} className="grid size-9 place-items-center rounded-full hover:bg-sand"><X className="size-5" /></button></div>
        <ul className="space-y-3 text-sm text-ink-2">{[[Lock, tx("Encrypted"), tx("Photos and records are encrypted when stored (AES-256) and when sent (TLS).")], [ShieldCheck, tx("Watermarked"), tx("Every photo you open shows your school ID and the time, so a leaked copy can be traced.")], [KeyRound, tx("Anonymous login"), tx("Your ID is random. The app holds no name or phone number; only the school can link the ID to your family.")], [FileText, tx("Fully logged"), tx("Every sign-in, view, download and change is recorded in a tamper-evident log the school can audit.")]].map(([I, h, b]) => { const Ic = I as typeof Lock; return <li key={h as string} className="flex gap-3"><Ic className="mt-0.5 size-5 shrink-0 text-gold" /><span><b className="text-ink">{t(h)}</b><br />{t(b)}</span></li> })}</ul>
        <p className="mt-3 text-[11px] text-ink-3">{t("Prototype: shows the design of the production protections. Watermarks make leaks traceable; they can’t stop a screenshot.")}</p></div></div>}
      <p className="pt-2 text-center text-[11px] text-ink-3"><X className="mr-1 inline size-3" />{t("Prototype with synthetic data · not legal advice")}</p>
    </div>)
}
