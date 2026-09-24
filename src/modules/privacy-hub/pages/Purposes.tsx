import { Card, SectionTitle, Chip, type Tone } from '@/design/ui'
import { MEDIA_PURPOSES, CORE_PURPOSES } from '@/data/reference'
import type { LegalBasis } from '@/data/types'

const BASIS_META: Record<LegalBasis, { label: string; tone: Tone }> = {
  consent: { label: 'Consent', tone: 'azure' },
  'legitimate-use': { label: 'Legitimate use', tone: 'info' },
  'school-exemption': { label: 'School exemption', tone: 'muted' },
}

export default function Purposes() {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Photos & media</SectionTitle>
        <p className="mb-3 -mt-1 text-[13px] text-ink-2">Every media purpose runs on consent — parents choose it, purpose by purpose, and can withdraw any time.</p>
        <div className="space-y-2.5">
          {MEDIA_PURPOSES.map((p) => (
            <Card key={p.key} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{p.label}</div>
                  <div className="mt-1 text-[13px] text-ink-2">{p.example}</div>
                  {p.labelHi && <div className="mt-1.5 text-[12px] text-ink-3" lang="hi">{p.labelHi}</div>}
                </div>
                <Chip tone={BASIS_META[p.basis].tone} size="sm" className="shrink-0">{BASIS_META[p.basis].label}</Chip>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Other school purposes</SectionTitle>
        <p className="mb-3 -mt-1 text-[13px] text-ink-2">Some processing runs on legitimate use or a Fourth Schedule school exemption instead of a consent form — the note explains why.</p>
        <div className="space-y-2.5">
          {CORE_PURPOSES.map((p) => (
            <Card key={p.key} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{p.label}</div>
                  <div className="mt-1 text-[13px] text-ink-2">{p.example}</div>
                  {p.note && (
                    <div className="mt-2 rounded-lg bg-sunken px-3 py-2 text-[12px] leading-snug text-ink-2">
                      <span className="font-semibold text-ink">Why no separate consent form: </span>
                      {p.note}
                    </div>
                  )}
                </div>
                <Chip tone={BASIS_META[p.basis].tone} size="sm" className="shrink-0">{BASIS_META[p.basis].label}</Chip>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
