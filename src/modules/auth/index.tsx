import * as React from 'react'
import { Link, useNavigate } from 'react-router'
import * as Pop from '@radix-ui/react-popover'
import { motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { Check, ChevronDown, FileCheck, LoaderCircle, ScanFace, ShieldCheck, Smartphone } from 'lucide-react'
import { LEGAL } from '@/data/reference'
import { Button, inputCls } from '@/design/ui'
import { BrandMark } from '@/shell/AppShell'
import { useApp } from '@/store/app'
import { ROLE, ROLES } from '@/roles/roles'
import { cn, fmtDate, fmtNum } from '@/lib/utils'
import { callName, statusLine, summarizeAreas } from '@/modules/coverage/lib'

const EASE = [0.22, 1, 0.36, 1] as const
const DEMO_CODE = '246810'

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}

function MicrosoftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className} aria-hidden>
      <rect x="1" y="1" width="9.5" height="9.5" fill="#F25022" />
      <rect x="11.5" y="1" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="1" y="11.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="11.5" y="11.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  )
}

function SchoolBadge({ size = 36 }: { size?: number }) {
  const school = useApp((s) => s.school)
  return school.logoDataUrl
    ? <img src={school.logoDataUrl} alt="" className="shrink-0 rounded-lg object-contain" style={{ width: size, height: size }} />
    : <span className="flex shrink-0 items-center justify-center rounded-lg bg-[#fdf0d9] font-display font-bold text-[#8a5300]" style={{ width: size, height: size, fontSize: size * 0.46 }}>{school.shortName[0]}</span>
}

function SchoolPicker() {
  const school = useApp((s) => s.school)
  const [open, setOpen] = React.useState(false)
  return (
    <Pop.Root open={open} onOpenChange={setOpen}>
      <Pop.Trigger className="mt-1.5 flex w-full items-center gap-3 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-left transition-colors hover:border-ink-3/60 data-[state=open]:border-azure data-[state=open]:ring-2 data-[state=open]:ring-azure/15">
        <SchoolBadge />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{school.name}</span>
          <span className="block truncate text-[12.5px] text-ink-3">{school.city}, {school.state} · {school.board}</span>
        </span>
        <ChevronDown className="size-4 text-ink-3" />
      </Pop.Trigger>
      <Pop.Portal>
        <Pop.Content align="start" sideOffset={6} className="z-50 w-[var(--radix-popover-trigger-width)] rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
          <button type="button" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-xl bg-azure-50 px-3 py-2.5 text-left">
            <SchoolBadge size={32} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[14px] font-semibold text-ink">{school.name}</span>
              <span className="block truncate text-[12px] text-ink-3">{school.city} · {school.campuses} campus{school.campuses > 1 ? 'es' : ''}</span>
            </span>
            <Check className="size-4 text-azure" />
          </button>
          <p className="px-3 pb-1.5 pt-2.5 text-[12px] leading-snug text-ink-3">Your account has access to one school. Running more than one? Your privacy desk can link them.</p>
        </Pop.Content>
      </Pop.Portal>
    </Pop.Root>
  )
}

function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([])
  const set = (i: number, ch: string) => {
    const arr = value.padEnd(6, ' ').split('')
    arr[i] = ch || ' '
    onChange(arr.join('').trimEnd())
  }
  return (
    <div className="mt-3 flex gap-2" onPaste={(e) => {
      const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
      if (digits) { e.preventDefault(); onChange(digits); refs.current[Math.min(digits.length, 5)]?.focus() }
    }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el }} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1}
          aria-label={`Digit ${i + 1}`} value={value[i]?.trim() ?? ''}
          onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(-1); set(i, d); if (d) refs.current[i + 1]?.focus() }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !value[i]?.trim()) refs.current[i - 1]?.focus() }}
          className="h-12 w-full min-w-0 rounded-xl border border-line-strong bg-surface text-center font-display text-[22px] font-semibold text-ink focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/20" />
      ))}
    </div>
  )
}

function BrandPanel() {
  const reduce = useReducedMotion()
  const obligations = useApp((s) => s.obligations)
  const guardians = useApp((s) => s.guardians)
  const line = statusLine(summarizeAreas(obligations))
  const onboarded = guardians.filter((g) => g.onboarded).length
  const float = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: 0.35 + i * 0.12, ease: EASE },
  })
  return (
    <aside className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(180deg,black,transparent_85%)]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[560px] rounded-full bg-[#2f6bff]/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-24 size-[460px] rounded-full bg-marigold/10 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <BrandMark size={38} />
        <div className="leading-tight">
          <div className="font-display text-[20px] font-semibold">School DPDP OS</div>
          <div className="text-[12px] text-white/55">Privacy, handled.</div>
        </div>
      </div>

      <div className="relative max-w-[520px]">
        <motion.h1 {...float(0)} className="font-display text-[46px] font-semibold leading-[1.06] tracking-[-0.02em]">
          Every child’s data, handled with care.
        </motion.h1>
        <motion.p {...float(1)} className="mt-5 max-w-md text-[16.5px] leading-relaxed text-white/75">
          Parents choose purpose by purpose. Every photo is checked before it’s shared. A named privacy desk is on call.
        </motion.p>

        <div className="relative mt-10 h-[196px]">
          <motion.div {...float(2)} className="absolute left-0 top-0 w-[330px] rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white/55"><ShieldCheck className="size-3.5 text-[#7FB3FF]" />Coverage</div>
            <div className="mt-2 font-display text-[22px] font-semibold leading-tight">Covered in {line.covered} of {line.total} areas</div>
            <div className="mt-2.5 flex gap-1">
              {Array.from({ length: line.total }, (_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < line.covered ? 'bg-[#4ade80]' : 'bg-marigold')} />)}
            </div>
          </motion.div>
          <motion.div {...float(3)} className="absolute left-[230px] top-[92px] w-[300px] rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white/55"><ScanFace className="size-3.5 text-[#7FB3FF]" />Parent choices</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[26px] font-semibold leading-none">{fmtNum(onboarded)}</span>
              <span className="text-[13px] text-white/65">families have set their choices</span>
            </div>
          </motion.div>
        </div>

        <ul className="mt-6 space-y-3 text-[14px] text-white/75">
          <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-[#7FB3FF]" />Built around India’s DPDP Act and Rules</li>
          <li className="flex items-center gap-3"><FileCheck className="size-4 text-[#7FB3FF]" />Every decision leaves a tamper-evident record</li>
        </ul>
      </div>

      <div className="relative text-[12px] text-white/45">
        DPDP Rules notified {fmtDate(LEGAL.rulesNotified)} · Full obligations from {LEGAL.fullObligationsLabel}
      </div>
    </aside>
  )
}

export default function AuthModule() {
  const role = useApp((s) => s.role)
  const setRole = useApp((s) => s.setRole)
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [busy, setBusy] = React.useState<null | 'google' | 'microsoft' | 'send' | 'verify'>(null)
  const [step, setStep] = React.useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = React.useState('')
  const [code, setCode] = React.useState('')
  const [autoRead, setAutoRead] = React.useState(false)
  const timers = React.useRef<number[]>([])
  React.useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }

  const digits = phone.replace(/\D/g, '')
  const finish = (method: string) => {
    const s = useApp.getState()
    const def = ROLE[s.role]
    const person = s.people.find((p) => p.id === def.person)
    s.addEvidence({ type: 'access', title: `${person?.name ?? `A ${def.label.toLowerCase()}`} signed in with ${method}`, actor: def.person || 'system', refs: [] })
    toast.success(person ? `Welcome back, ${callName(person.name)}` : 'Welcome back', { description: `Signed in to ${s.school.name}` })
    navigate(def.home, { replace: true })
  }
  const sso = (p: 'google' | 'microsoft') => {
    if (busy) return
    setBusy(p)
    later(() => finish(p === 'google' ? 'Google Workspace' : 'Microsoft 365'), 900)
  }
  const sendCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (digits.length !== 10 || busy) return
    setBusy('send')
    later(() => {
      setBusy(null)
      setStep('code')
      setCode('')
      toast('Code sent', { description: `A 6-digit code was sent to +91 ${digits.slice(0, 5)} ${digits.slice(5)}.` })
      // Simulated SMS auto-read
      later(() => { setAutoRead(true); DEMO_CODE.split('').forEach((_, i) => later(() => setCode(DEMO_CODE.slice(0, i + 1)), i * 110)) }, 1300)
    }, 700)
  }
  const verify = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6 || busy) return
    if (code !== DEMO_CODE) { toast.error('That code doesn’t match', { description: 'Check the SMS and try again.' }); return }
    setBusy('verify')
    later(() => finish('phone OTP'), 600)
  }

  const spin = <LoaderCircle className="size-[18px] animate-spin" />
  return (
    <div className="grid min-h-full bg-canvas lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <BrandPanel />
      <main className="flex min-h-full flex-col">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="w-full max-w-[420px]">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <BrandMark size={34} />
              <span className="font-display text-[19px] font-semibold text-ink">School DPDP OS</span>
            </div>
            <h2 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.015em] text-ink">Sign in</h2>
            <p className="mt-1.5 text-[15px] text-ink-2">Welcome back. Pick your school, then sign in the way your school set up.</p>

            <div className="mt-8">
              <span className="label-caps">School</span>
              <SchoolPicker />
            </div>

            <div className="mt-6 space-y-3">
              <Button variant="secondary" size="lg" className="w-full" disabled={!!busy && busy !== 'google'} onClick={() => sso('google')}
                icon={busy === 'google' ? spin : <GoogleG className="size-[18px]" />}>
                {busy === 'google' ? 'Connecting to Google…' : 'Continue with Google Workspace'}
              </Button>
              <Button variant="secondary" size="lg" className="w-full" disabled={!!busy && busy !== 'microsoft'} onClick={() => sso('microsoft')}
                icon={busy === 'microsoft' ? spin : <MicrosoftMark className="size-4" />}>
                {busy === 'microsoft' ? 'Connecting to Microsoft…' : 'Continue with Microsoft 365'}
              </Button>
            </div>

            <div className="my-7 flex items-center gap-3 text-[12px] font-medium text-ink-3">
              <span className="h-px flex-1 bg-line-strong/70" />or use your phone<span className="h-px flex-1 bg-line-strong/70" />
            </div>

            {step === 'phone' ? (
              <form onSubmit={sendCode}>
                <label htmlFor="phone" className="label-caps">Mobile number</label>
                <div className="mt-1.5 flex">
                  <span className="inline-flex items-center gap-1.5 rounded-l-lg border border-r-0 border-line-strong bg-sunken px-3 text-[14px] font-medium text-ink-2">
                    <Smartphone className="size-4 text-ink-3" />+91
                  </span>
                  <input id="phone" inputMode="numeric" autoComplete="tel-national" placeholder="98290 41217" value={phone}
                    onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 10); setPhone(d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d) }}
                    className={cn(inputCls, 'h-12 rounded-l-none text-[15px] tracking-wide')} />
                </div>
                <Button type="submit" variant="navy" size="lg" className="mt-3 w-full" disabled={digits.length !== 10 || (!!busy && busy !== 'send')} icon={busy === 'send' ? spin : undefined}>
                  {busy === 'send' ? 'Sending code…' : 'Send code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={verify}>
                <div className="flex items-center justify-between">
                  <span className="label-caps">6-digit code</span>
                  <button type="button" onClick={() => { setStep('phone'); setCode(''); setAutoRead(false) }} className="text-[12.5px] font-semibold text-azure hover:underline">Change number</button>
                </div>
                <p className="mt-1.5 text-[13px] text-ink-2">
                  Sent to +91 {phone}. {autoRead ? <span className="text-ok">Code read from SMS.</span> : <>Demo code <span className="font-mono text-ink">{DEMO_CODE}</span></>}
                </p>
                <OtpBoxes value={code} onChange={(v) => { setAutoRead(false); setCode(v) }} />
                <Button type="submit" size="lg" className="mt-4 w-full" disabled={code.length !== 6 || (!!busy && busy !== 'verify')} icon={busy === 'verify' ? spin : undefined}>
                  {busy === 'verify' ? 'Signing in…' : 'Verify and sign in'}
                </Button>
              </form>
            )}

            <div className="mt-8 flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3">
              <label htmlFor="demo-role" className="text-[12.5px] text-ink-3">Demo · sign in as</label>
              <select id="demo-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}
                className="min-w-0 max-w-[230px] truncate rounded-lg border-0 bg-transparent py-1 pr-1 text-right text-[13px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-azure/20">
                {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
          </motion.div>
        </div>
        <footer className="px-6 pb-7 text-center text-[11.5px] leading-relaxed text-ink-3">
          <p className="mx-auto max-w-md">{LEGAL.disclaimer}</p>
          <p className="mt-2"><Link to="/privacy-centre" className="font-medium text-ink-2 hover:text-ink">Privacy centre</Link></p>
        </footer>
      </main>
    </div>
  )
}
