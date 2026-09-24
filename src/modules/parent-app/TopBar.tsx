import * as DD from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Check } from 'lucide-react'
import { Avatar } from '@/design/ui'
import { cn } from '@/lib/utils'
import { useActiveFamily } from './family'
import { useParentUI } from './state'
import { LangToggle } from './i18n'

export function TopBar() {
  const { guardian, options } = useActiveFamily()
  const setGuardian = useParentUI((s) => s.setGuardian)
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur">
      <DD.Root>
        <DD.Trigger className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line-strong bg-surface px-2.5 py-1.5 text-left hover:bg-sunken">
          <Avatar name={guardian.name} size={30} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-ink">{guardian.name}</span>
            <span className="block text-[11px] text-ink-3">{guardian.relation}</span>
          </span>
          <ChevronDown className="ml-auto size-4 shrink-0 text-ink-3" />
        </DD.Trigger>
        <DD.Portal>
          <DD.Content align="start" sideOffset={6} className="z-50 w-[280px] rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]">
            <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Switch family</div>
            {options.map((o) => (
              <DD.Item
                key={o.guardian.id}
                onSelect={() => setGuardian(o.guardian.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 outline-none data-[highlighted]:bg-sunken',
                  o.guardian.id === guardian.id && 'bg-azure-50',
                )}
              >
                <Avatar name={o.guardian.name} size={32} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">{o.guardian.name}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {o.guardian.relation} of {o.student.name}
                  </span>
                </span>
                {o.guardian.id === guardian.id && <Check className="ml-auto size-4 shrink-0 text-azure" />}
              </DD.Item>
            ))}
          </DD.Content>
        </DD.Portal>
      </DD.Root>
      <LangToggle />
    </div>
  )
}
