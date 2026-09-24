import * as React from 'react'
import { ShieldCheck, Clock3, Fingerprint, FileCheck2, Smartphone } from 'lucide-react'
import { Card, Kpi, SectionTitle, Progress } from '@/design/ui'
import { useApp } from '@/store/app'
import type { VerificationMethod } from '@/data/types'
import { fmtNum, pct } from '@/lib/utils'
import { verificationBreakdown } from '../data'

const METHOD_META: Record<VerificationMethod, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  'school-records': { label: 'Matched to admission records', icon: FileCheck2, desc: 'Guardian matched automatically against the student’s admission file — no extra step for the parent.' },
  otp: { label: 'Phone OTP', icon: Smartphone, desc: 'A one-time code is sent to the guardian’s phone on file and confirmed in the app.' },
  'digilocker-token': { label: 'DigiLocker token', icon: ShieldCheck, desc: 'Guardian identity confirmed via a DigiLocker share token instead of a phone step.' },
}

export default function Verification() {
  const guardians = useApp((s) => s.guardians)
  const { counts, onboarded } = verificationBreakdown(guardians)
  const pendingCount = guardians.length - onboarded

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Verified guardians" value={fmtNum(onboarded)} tone="ok" icon={<ShieldCheck className="size-4" />} />
        <Kpi label="Not yet verified" value={fmtNum(pendingCount)} tone={pendingCount > 0 ? 'warn' : 'ok'} icon={<Clock3 className="size-4" />} />
        <Kpi label="Methods offered" value="3" sub="Records · OTP · DigiLocker" tone="azure" icon={<Fingerprint className="size-4" />} />
      </div>

      <Card className="p-5">
        <SectionTitle>How guardians are verified</SectionTitle>
        <div className="space-y-5">
          {(Object.keys(counts) as VerificationMethod[]).map((m) => {
            const meta = METHOD_META[m]
            const c = counts[m]
            const p = pct(c, onboarded)
            const Icon = meta.icon
            return (
              <div key={m}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 font-medium text-ink"><Icon className="size-4 text-azure" />{meta.label}</span>
                  <span className="text-ink-3 num">{fmtNum(c)} · {p}%</span>
                </div>
                <Progress value={p} className="mt-1.5" />
                <p className="mt-1.5 text-[12px] text-ink-3">{meta.desc}</p>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>Why verification matters for children’s data</SectionTitle>
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          Because the choices being recorded are for a child, School DPDP OS only counts a choice once the guardian is verified — against admission records, a one-time
          phone OTP, or a DigiLocker token — so a stranger with a link can never set or change a child’s permissions.
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
          This is what the DPDP Rules mean by verifiable parental consent (Sec 9(1) · Rule 10): consent from an unverified contact is never recorded as a parent’s
          choice, and every verification is timestamped with an evidence ID.
        </p>
      </Card>
    </div>
  )
}
