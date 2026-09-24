import * as React from 'react'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { X, Check, ChevronDown, ChevronRight, Smartphone, ShieldCheck, Loader2 } from 'lucide-react'
import { Card, Button, Chip, Switch } from '@/design/ui'
import { EvidenceLink } from '@/design/media'
import { useApp } from '@/store/app'
import { pkey } from '@/data/seed'
import { MEDIA_PURPOSES } from '@/data/reference'
import type { Guardian, MediaPurposeKey, NoticeVersion, PermissionStatus, Student, VerificationMethod } from '@/data/types'
import { fmtDate, fmtDateTime, cn } from '@/lib/utils'
import { useActiveFamily } from '../family'
import { Bi, LangToggle } from '../i18n'
import { NOTICE_SECTIONS, NOTICE_SUMMARY } from '../noticeContent'

function StepDots({ step }: { step: number }) {
  return (
    <div className="mx-auto flex items-center gap-1.5">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={cn('h-1.5 rounded-full transition-all', n === step ? 'w-6 bg-azure' : n < step ? 'w-1.5 bg-azure/50' : 'w-1.5 bg-line-strong')} />
      ))}
    </div>
  )
}

const DEMO_OTP = '482913'

function Step1Verify({ guardian, schoolShort, onVerified }: { guardian: Guardian; schoolShort: string; onVerified: (m: VerificationMethod) => void }) {
  const [mode, setMode] = useState<'otp' | 'digilocker'>('otp')
  const [phase, setPhase] = useState<'idle' | 'sending' | 'filling' | 'connecting' | 'matched'>('idle')
  const [filled, setFilled] = useState(0)

  useEffect(() => {
    if (phase !== 'filling') return
    if (filled >= 6) {
      setPhase('matched')
      onVerified('otp')
      return
    }
    const t = setTimeout(() => setFilled((f) => f + 1), 160)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, filled])

  useEffect(() => {
    if (phase !== 'connecting') return
    const t = setTimeout(() => {
      setPhase('matched')
      onVerified('digilocker-token')
    }, 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div className="space-y-3">
      {mode === 'otp' && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Smartphone className="size-4 text-azure" />
            <Bi en="Phone OTP" hi="फ़ोन OTP" />
          </div>
          <p className="mt-1 text-[12.5px] text-ink-3">
            <Bi en={`One-time code sent to ${guardian.phone}`} hi={`एकबारी कोड ${guardian.phone} पर भेजा गया`} />
          </p>

          {phase === 'idle' && (
            <Button className="mt-3 w-full" onClick={() => { setPhase('sending'); setTimeout(() => setPhase('filling'), 500) }}>
              <Bi en="Send OTP" hi="OTP भेजें" />
            </Button>
          )}

          {phase !== 'idle' && (
            <div className="mt-3 flex justify-center gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={cn('flex size-9 items-center justify-center rounded-lg border text-[15px] font-semibold num', i < filled ? 'border-azure bg-azure-50 text-ink' : 'border-line-strong text-ink-3')}>
                  {i < filled ? DEMO_OTP[i] : ''}
                </div>
              ))}
            </div>
          )}
          {phase === 'sending' && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-ink-3">
              <Loader2 className="size-3.5 animate-spin" /> <Bi en="Sending…" hi="भेजा जा रहा है…" />
            </p>
          )}
          {phase === 'filling' && <p className="mt-2 text-center text-[12px] text-ink-3"><Bi en="Reading the code automatically…" hi="कोड स्वतः पढ़ा जा रहा है…" /></p>}
          {phase === 'matched' && (
            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-ok-bg px-3 py-2 text-[12.5px] font-medium text-ok">
              <Check className="size-4 shrink-0" strokeWidth={2.5} />
              <Bi en={`Matched to ${schoolShort} admission records ✓`} hi={`${schoolShort} प्रवेश रिकॉर्ड से मिलान हुआ ✓`} />
            </div>
          )}
        </Card>
      )}

      {mode === 'otp' && phase === 'idle' && (
        <button type="button" onClick={() => { setMode('digilocker'); setPhase('connecting') }} className="w-full py-1 text-center text-[13px] font-semibold text-azure">
          <Bi en="Or verify with DigiLocker instead" hi="या इसके बजाय DigiLocker से सत्यापित करें" />
        </button>
      )}

      {mode === 'digilocker' && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <ShieldCheck className="size-4 text-azure" />
            <Bi en="DigiLocker token" hi="DigiLocker टोकन" />
          </div>
          {phase === 'connecting' && (
            <p className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-3">
              <Loader2 className="size-4 animate-spin" /> <Bi en="Connecting to DigiLocker (simulated)…" hi="DigiLocker से जुड़ रहे हैं (सिम्युलेटेड)…" />
            </p>
          )}
          {phase === 'matched' && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-ok-bg px-3 py-2 text-[12.5px] font-medium text-ok">
              <Check className="size-4 shrink-0" strokeWidth={2.5} />
              <Bi en={`Matched to ${schoolShort} admission records ✓`} hi={`${schoolShort} प्रवेश रिकॉर्ड से मिलान हुआ ✓`} />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function Step2Notice({ notice }: { notice?: NoticeVersion }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Chip tone="azure" size="sm">Notice {notice?.id ?? 'v2.1'}</Chip>
        {notice && (
          <span className="text-[11.5px] text-ink-3">
            <Bi en={`Published ${fmtDate(notice.publishedAt)}`} hi={`प्रकाशित ${fmtDate(notice.publishedAt)}`} />
          </span>
        )}
      </div>

      <Card className="p-4">
        <div className="text-[12px] font-bold uppercase tracking-wide text-ink-3"><Bi en="In short" hi="संक्षेप में" /></div>
        <ul className="mt-2.5 space-y-2.5">
          {NOTICE_SUMMARY.map((b, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink">
              <Check className="mt-0.5 size-3.5 shrink-0 text-ok" strokeWidth={2.5} />
              <Bi en={b.en} hi={b.hi} />
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-2">
        {NOTICE_SECTIONS.map((sec) => {
          const isOpen = open.has(sec.key)
          return (
            <Card key={sec.key} className="overflow-hidden p-0">
              <button type="button" onClick={() => toggle(sec.key)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-[13px] font-semibold text-ink"><Bi en={sec.title.en} hi={sec.title.hi} /></span>
                <ChevronDown className={cn('size-4 shrink-0 text-ink-3 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-[13px] leading-relaxed text-ink-2">
                  <Bi en={sec.body.en} hi={sec.body.hi} />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

type Choices = Record<string, Record<MediaPurposeKey, boolean>>

function Step3Choices({ children, choices, setChoices }: { children: Student[]; choices: Choices; setChoices: React.Dispatch<React.SetStateAction<Choices>> }) {
  return (
    <div className="space-y-5">
      <p className="text-[13.5px] text-ink-2"><Bi en="You can change any of these later, any time." hi="आप इनमें से किसी को भी बाद में, किसी भी समय बदल सकते हैं।" /></p>
      {children.map((child) => (
        <div key={child.id} className="space-y-2.5">
          {children.length > 1 && <div className="text-[12.5px] font-semibold text-ink-2">{child.name}</div>}
          {MEDIA_PURPOSES.map((p) => (
            <Card key={p.key} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink"><Bi en={p.label} hi={p.labelHi ?? p.label} /></div>
                  <div className="mt-0.5 text-[12px] leading-snug text-ink-3"><Bi en={p.example} hi={p.exampleHi ?? p.example} /></div>
                </div>
                <Switch
                  checked={!!choices[child.id]?.[p.key]}
                  onCheckedChange={(v) => setChoices((c) => ({ ...c, [child.id]: { ...c[child.id], [p.key]: v } }))}
                  label={p.label}
                />
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}

interface ReceiptRow { studentId: string; purpose: MediaPurposeKey; status: PermissionStatus; evidenceId: string }
interface Receipt { at: string; rows: ReceiptRow[]; takedowns: number }

export default function Setup() {
  const navigate = useNavigate()
  const { guardian, children } = useActiveFamily()
  const school = useApp((s) => s.school)
  const notices = useApp((s) => s.notices)
  const permissions = useApp((s) => s.permissions)

  const [step, setStep] = useState(1)
  const [verified, setVerified] = useState(false)
  const [choices, setChoices] = useState<Choices>({})
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  useEffect(() => {
    const init: Choices = {}
    for (const child of children) {
      const row = {} as Record<MediaPurposeKey, boolean>
      for (const p of MEDIA_PURPOSES) {
        const perm = permissions[pkey(child.id, p.key)]
        row[p.key] = perm ? perm.status === 'granted' : !!p.defaultOn
      }
      init[child.id] = row
    }
    setChoices(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardian.id])

  const finishSetup = () => {
    const rows: ReceiptRow[] = []
    let takedowns = 0
    for (const child of children) {
      for (const p of MEDIA_PURPOSES) {
        const status: PermissionStatus = choices[child.id]?.[p.key] ? 'granted' : 'denied'
        const res = useApp.getState().setPermission(child.id, p.key, status, { via: 'parent-app', by: guardian.id })
        rows.push({ studentId: child.id, purpose: p.key, status, evidenceId: res.evidenceId })
        takedowns += res.takedowns.length
      }
    }
    setReceipt({ at: new Date().toISOString(), rows, takedowns })
    setStep(4)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <Link to="/parent" aria-label="Close setup" className="rounded-lg p-1.5 text-ink-3 hover:bg-sunken"><X className="size-5" /></Link>
        <div className="flex-1"><StepDots step={step} /></div>
        <LangToggle />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {step === 1 && (
          <>
            <div className="mb-4">
              <div className="label-caps"><Bi en="Step 1 of 4" hi="चरण 1 / 4" /></div>
              <h2 className="mt-1 font-display text-[22px] font-semibold text-ink"><Bi en="Verify it's you" hi="पुष्टि करें कि यह आप हैं" /></h2>
              <p className="mt-1.5 text-[13.5px] text-ink-2"><Bi en="So only you can set choices for your child." hi="ताकि केवल आप ही अपने बच्चे के लिए विकल्प तय कर सकें।" /></p>
            </div>
            <Step1Verify guardian={guardian} schoolShort={school.shortName} onVerified={() => setVerified(true)} />
            <Button size="lg" className="mt-5 w-full" disabled={!verified} onClick={() => setStep(2)} icon={<ChevronRight className="size-4" />}>
              <Bi en="Continue" hi="जारी रखें" />
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-4">
              <div className="label-caps"><Bi en="Step 2 of 4" hi="चरण 2 / 4" /></div>
              <h2 className="mt-1 font-display text-[22px] font-semibold text-ink"><Bi en="Our privacy notice" hi="हमारी प्राइवेसी सूचना" /></h2>
            </div>
            <Step2Notice notice={notices.find((n) => n.id === 'v2.1')} />
            <Button size="lg" className="mt-5 w-full" onClick={() => setStep(3)} icon={<ChevronRight className="size-4" />}>
              <Bi en="I understand, continue" hi="मैं समझता/समझती हूं, जारी रखें" />
            </Button>
            <button type="button" className="mt-2 w-full py-1 text-center text-[13px] font-semibold text-ink-3" onClick={() => setStep(1)}>
              <Bi en="Back" hi="वापस" />
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mb-4">
              <div className="label-caps"><Bi en="Step 3 of 4" hi="चरण 3 / 4" /></div>
              <h2 className="mt-1 font-display text-[22px] font-semibold text-ink"><Bi en="Your choices" hi="आपकी पसंद" /></h2>
            </div>
            <Step3Choices children={children} choices={choices} setChoices={setChoices} />
            <Button size="lg" className="mt-5 w-full" onClick={finishSetup} icon={<ChevronRight className="size-4" />}>
              <Bi en="Save choices" hi="पसंद सहेजें" />
            </Button>
            <button type="button" className="mt-2 w-full py-1 text-center text-[13px] font-semibold text-ink-3" onClick={() => setStep(2)}>
              <Bi en="Back" hi="वापस" />
            </button>
          </>
        )}

        {step === 4 && receipt && (
          <div className="space-y-5">
            <div className="flex flex-col items-center py-2 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-ok-bg text-ok"><Check className="size-7" strokeWidth={2.5} /></div>
              <h2 className="mt-3 font-display text-[22px] font-semibold text-ink"><Bi en="All set" hi="सब तैयार है" /></h2>
              <p className="mt-1 text-[13.5px] text-ink-2"><Bi en={`Saved ${fmtDateTime(receipt.at)}`} hi={`सहेजा गया ${fmtDateTime(receipt.at)}`} /></p>
            </div>
            <Card className="divide-y divide-line p-0">
              {receipt.rows.map((row) => {
                const purpose = MEDIA_PURPOSES.find((p) => p.key === row.purpose)!
                const child = children.find((c) => c.id === row.studentId)
                return (
                  <div key={`${row.studentId}-${row.purpose}`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-ink"><Bi en={purpose.label} hi={purpose.labelHi ?? purpose.label} /></div>
                      {children.length > 1 && <div className="text-[11px] text-ink-3">{child?.name}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Chip tone={row.status === 'granted' ? 'ok' : 'muted'} size="sm" icon={false}>
                        {row.status === 'granted' ? <Bi en="On" hi="चालू" /> : <Bi en="Off" hi="बंद" />}
                      </Chip>
                      <EvidenceLink id={row.evidenceId} />
                    </div>
                  </div>
                )
              })}
            </Card>
            {receipt.takedowns > 0 && (
              <div className="rounded-lg bg-warn-bg px-3 py-2.5 text-[12.5px] font-medium text-warn">
                <Bi
                  en={`We've asked the school to take down ${receipt.takedowns} post${receipt.takedowns > 1 ? 's' : ''}.`}
                  hi={`हमने स्कूल से ${receipt.takedowns} पोस्ट हटाने का अनुरोध किया है।`}
                />
              </div>
            )}
            <Button size="lg" className="w-full" onClick={() => navigate('/parent', { replace: true })}>
              <Bi en="Done" hi="पूर्ण" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
