import { Check } from 'lucide-react'
import type { ExpertRequest } from '@/data/types'
import { cn } from '@/lib/utils'
import { STATUS_STEPS } from './data'

/** Compact horizontal status stepper: requested → scheduled → in review → report shared → closed. */
export function StatusStepper({ status, className }: { status: ExpertRequest['status']; className?: string }) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status)
  return (
    <div className={cn('flex flex-wrap items-center gap-y-2', className)}>
      {STATUS_STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={cn('flex items-center gap-1.5 rounded-full px-2 py-1', i === idx && 'bg-azure-50')}>
            <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
              i < idx ? 'bg-ok text-white' : i === idx ? 'bg-azure text-white' : 'bg-sunken text-ink-3')}>
              {i < idx ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn('whitespace-nowrap text-[12px] font-semibold', i === idx ? 'text-azure' : i < idx ? 'text-ok' : 'text-ink-3')}>{s.label}</span>
          </div>
          {i < STATUS_STEPS.length - 1 && <div className={cn('mx-0.5 h-px w-4 sm:w-6', i < idx ? 'bg-ok' : 'bg-line-strong')} />}
        </div>
      ))}
    </div>
  )
}
