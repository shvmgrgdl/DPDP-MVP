import { Routes, Route } from 'react-router'
import { WifiOff, Lock, KeyRound, Users, Clock3, Database, EyeOff, Fingerprint, type LucideIcon } from 'lucide-react'
import { PageHeader, Card, SectionTitle, Chip } from '@/design/ui'
import { useApp } from '@/store/app'
import { LEGAL } from '@/data/reference'
import { ArchitectureDiagram } from './Architecture'
import { PHOTO_STEPS, WEBHOOKS, API_SAMPLE } from './data'

const SECURITY: { ctl: string; icon: LucideIcon; title: string }[] = [
  { ctl: 'CTL-01', icon: Lock, title: 'Encryption in transit & at rest' },
  { ctl: 'CTL-02', icon: KeyRound, title: 'SSO / MFA for staff sign-in' },
  { ctl: 'CTL-03', icon: Users, title: 'Role-based access & masking' },
  { ctl: 'CTL-04', icon: Clock3, title: `Access logs kept ${LEGAL.logRetention}` },
  { ctl: 'CTL-05', icon: Database, title: 'Backups, tested every term' },
  { ctl: 'CTL-07', icon: EyeOff, title: 'Masking in exports' },
]

function TechPage() {
  const controls = useApp((s) => s.controls)
  return (
    <div className="space-y-10 pb-4">
      <PageHeader eyebrow="Under the hood" title="How School DPDP OS works"
        subtitle="For IT heads and technical reviewers — the real architecture behind the calm screens."
        actions={<Chip tone="info" icon={<WifiOff className="size-3.5" />}>This demo runs fully offline in your browser</Chip>} />

      <section>
        <SectionTitle>Architecture</SectionTitle>
        <Card className="p-6 md:p-8"><ArchitectureDiagram /></Card>
      </section>

      <section>
        <SectionTitle>Life of a photo</SectionTitle>
        <Card className="p-6">
          <ol className="space-y-4">
            {PHOTO_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-azure-50 text-[12.5px] font-bold text-azure">{i + 1}</span>
                <div><div className="text-[14px] font-semibold text-ink">{s.title}</div><p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{s.body}</p></div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section>
        <SectionTitle>Security model</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SECURITY.map((s) => {
            const c = controls.find((x) => x.id === s.ctl)
            const Icon = s.icon
            return (
              <Card key={s.ctl} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-azure-50 text-azure"><Icon className="size-[18px]" /></div>
                  {c && <Chip tone={c.status === 'in-place' ? 'ok' : c.status === 'partial' ? 'warn' : 'risk'} size="sm">{c.status}</Chip>}
                </div>
                <div className="mt-3 text-[14px] font-semibold text-ink">{s.title}</div>
                {c && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{c.detail}</p>}
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Face-data policy</SectionTitle>
        <Card className="flex gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-expert-bg text-expert"><Fingerprint className="size-5" /></div>
          <ul className="space-y-2 text-[13.5px] leading-relaxed text-ink-2">
            <li><strong className="text-ink">School-scoped:</strong> face templates are built only from your own roster and never compared against any other school or public database.</li>
            <li><strong className="text-ink">Purpose-limited:</strong> used only to match faces to permission choices — never for attendance, behaviour tracking or profiling.</li>
            <li><strong className="text-ink">Never shared or sold:</strong> templates stay inside the school's own encrypted storage.</li>
            <li><strong className="text-ink">Deleted on exit:</strong> a student's face template is deleted when they leave the school.</li>
            <li><strong className="text-ink">Manual mode available:</strong> schools that prefer not to use face matching can review and tag every photo by hand instead.</li>
          </ul>
        </Card>
      </section>

      <section>
        <SectionTitle>API preview</SectionTitle>
        <Card className="p-6">
          <p className="mb-3 text-[13px] text-ink-2">A read-only decision check, used by Publish Guard before anything is shared.</p>
          <pre className="overflow-x-auto rounded-xl bg-navy p-4 text-[12.5px] leading-relaxed text-[#d7e3ff]"><code>{API_SAMPLE}</code></pre>
          <div className="mt-5">
            <div className="label-caps mb-2">Webhooks</div>
            <div className="space-y-2">
              {WEBHOOKS.map((w) => (
                <div key={w.event} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="rounded-md bg-sunken px-2 py-0.5 font-mono text-[12px] text-ink">{w.event}</span>
                  <span className="text-ink-3">{w.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}

export default function Module() {
  return (
    <Routes>
      <Route path="*" element={<TechPage />} />
    </Routes>
  )
}
