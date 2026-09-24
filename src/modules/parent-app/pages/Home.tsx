import * as React from 'react'
import { Link } from 'react-router'
import { Check, SlidersHorizontal, Images, Inbox, History as HistoryIcon, RotateCcw } from 'lucide-react'
import { Card, Avatar, Button } from '@/design/ui'
import { useApp } from '@/store/app'
import { pkey } from '@/data/seed'
import { MEDIA_PURPOSES } from '@/data/reference'
import { fmtDate, DEMO_NOW } from '@/lib/utils'
import { useActiveFamily } from '../family'
import { Bi } from '../i18n'

function HomeTile({ to, icon, title, sub, badge }: { to: string; icon: React.ReactNode; title: React.ReactNode; sub: React.ReactNode; badge?: number }) {
  return (
    <Link to={to} className="block">
      <Card className="relative h-full p-4">
        {!!badge && (
          <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-risk text-[11px] font-bold text-white">{badge}</span>
        )}
        <div className="flex size-9 items-center justify-center rounded-lg bg-azure-50 text-azure">{icon}</div>
        <div className="mt-2.5 text-[13.5px] font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{sub}</div>
      </Card>
    </Link>
  )
}

export default function Home() {
  const { guardian, children } = useActiveFamily()
  const classes = useApp((s) => s.classes)
  const permissions = useApp((s) => s.permissions)
  const requests = useApp((s) => s.requests)

  const firstChild = children[0]
  const grantedCount = firstChild ? MEDIA_PURPOSES.filter((p) => permissions[pkey(firstChild.id, p.key)]?.status === 'granted').length : 0
  const openRequests = requests.filter((r) => r.guardianId === guardian.id && !['resolved', 'closed'].includes(r.status))

  return (
    <div className="space-y-5">
      <div>
        <div className="label-caps"><Bi en="Parent app" hi="अभिभावक ऐप" /></div>
        <h1 className="mt-1 font-display text-[25px] font-semibold leading-tight text-ink">
          <Bi en={`Hello, ${guardian.name.split(' ')[0]}`} hi={`नमस्ते, ${guardian.name.split(' ')[0]}`} />
        </h1>
        <p className="mt-1 text-[13px] text-ink-2">{fmtDate(DEMO_NOW)}</p>
      </div>

      <div className="space-y-3">
        {children.map((child) => {
          const cls = classes.find((c) => c.id === child.classId)
          const dates = MEDIA_PURPOSES.map((p) => permissions[pkey(child.id, p.key)]?.at).filter(Boolean) as string[]
          const updated = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : undefined
          return (
            <Card key={child.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={child.name} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15.5px] font-semibold text-ink">{child.name}</div>
                  <div className="text-[12px] text-ink-3">{cls?.label ?? child.classId}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-ok-bg px-2.5 py-2 text-[12px] font-medium text-ok">
                <Check className="size-3.5 shrink-0" strokeWidth={2.5} />
                <Bi
                  en={`Your choices are saved · updated ${updated ? fmtDate(updated) : '—'}`}
                  hi={`आपकी पसंद सहेजी गई है · अपडेट ${updated ? fmtDate(updated) : '—'}`}
                />
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HomeTile
          to="/parent/choices"
          icon={<SlidersHorizontal className="size-[18px]" />}
          title={<Bi en="Your choices" hi="आपकी पसंद" />}
          sub={<Bi en={`${grantedCount} of ${MEDIA_PURPOSES.length} shared`} hi={`${MEDIA_PURPOSES.length} में से ${grantedCount} साझा`} />}
        />
        <HomeTile
          to="/parent/photos"
          icon={<Images className="size-[18px]" />}
          title={<Bi en="Private photos" hi="निजी तस्वीरें" />}
          sub={<Bi en="Only your family sees these" hi="केवल आपका परिवार इन्हें देखता है" />}
        />
        <HomeTile
          to="/parent/requests"
          icon={<Inbox className="size-[18px]" />}
          title={<Bi en="Requests" hi="अनुरोध" />}
          sub={<Bi en="Ask the school something" hi="स्कूल से कुछ पूछें" />}
          badge={openRequests.length}
        />
        <HomeTile
          to="/parent/history"
          icon={<HistoryIcon className="size-[18px]" />}
          title={<Bi en="History" hi="इतिहास" />}
          sub={<Bi en="Every change, timestamped" hi="हर बदलाव, समय के साथ" />}
        />
      </div>

      <Button variant="secondary" size="lg" to="/parent/setup" className="w-full" icon={<RotateCcw className="size-4" />}>
        <Bi en="Replay first-time setup" hi="पहली बार का सेटअप फिर देखें" />
      </Button>
    </div>
  )
}
