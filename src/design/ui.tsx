import * as React from 'react'
import * as DialogP from '@radix-ui/react-dialog'
import * as SwitchP from '@radix-ui/react-switch'
import * as TabsP from '@radix-ui/react-tabs'
import * as TooltipP from '@radix-ui/react-tooltip'
import { X, Check, AlertTriangle, Lock, HelpCircle, Sparkles, Minus, ShieldCheck, Clock3 } from 'lucide-react'
import { Link } from 'react-router'
import { cn, initials } from '@/lib/utils'

/* ---------------- Buttons ---------------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'navy'
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap focus-visible:outline-2'
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-azure text-white hover:bg-azure-600 shadow-sm',
  navy: 'bg-navy text-white hover:bg-navy-2 shadow-sm',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken',
  ghost: 'text-azure hover:bg-azure-50',
  soft: 'bg-azure-50 text-azure hover:bg-azure-100',
  danger: 'bg-surface text-risk border border-risk/30 hover:bg-risk-bg',
}
const btnSizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-[15px]' }

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: keyof typeof btnSizes
  icon?: React.ReactNode
  to?: string
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className, children, to, ...rest }, ref,
) {
  const cls = cn(btnBase, btnVariants[variant], btnSizes[size], className)
  if (to) return (<Link to={to} className={cls}>{icon}{children}</Link>)
  return (<button ref={ref} className={cls} {...rest}>{icon}{children}</button>)
})

/* ---------------- Cards & layout ---------------- */
export function Card({ className, children, as: As = 'div', ...rest }: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (<As className={cn('card', className)} {...rest}>{children}</As>)
}

export function PageHeader({ eyebrow, title, subtitle, actions, className }: { eyebrow?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="label-caps mb-2">{eyebrow}</div>}
        <h1 className="font-display text-[30px] leading-tight font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <h2 className="text-[15px] font-semibold text-ink">{children}</h2>
      {action}
    </div>
  )
}

/* ---------------- Status chips ---------------- */
export type Tone = 'ok' | 'warn' | 'risk' | 'info' | 'expert' | 'muted' | 'azure'
const toneCls: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  risk: 'bg-risk-bg text-risk',
  info: 'bg-info-bg text-info',
  expert: 'bg-expert-bg text-expert',
  muted: 'bg-muted-bg text-ink-2',
  azure: 'bg-azure-50 text-azure',
}
const toneIcon: Record<Tone, React.ReactNode> = {
  ok: <Check className="size-3.5" strokeWidth={2.5} />,
  warn: <AlertTriangle className="size-3.5" strokeWidth={2.25} />,
  risk: <Lock className="size-3.5" strokeWidth={2.25} />,
  info: <HelpCircle className="size-3.5" strokeWidth={2.25} />,
  expert: <Sparkles className="size-3.5" strokeWidth={2.25} />,
  muted: <Minus className="size-3.5" strokeWidth={2.25} />,
  azure: <ShieldCheck className="size-3.5" strokeWidth={2.25} />,
}
export function Chip({ tone = 'muted', icon, children, className, size = 'md' }: { tone?: Tone; icon?: React.ReactNode | false; children: React.ReactNode; className?: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap', size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs', toneCls[tone], className)}>
      {icon === false ? null : icon ?? toneIcon[tone]}
      {children}
    </span>
  )
}
export const toneText: Record<Tone, string> = { ok: 'text-ok', warn: 'text-warn', risk: 'text-risk', info: 'text-info', expert: 'text-expert', muted: 'text-ink-3', azure: 'text-azure' }
export const toneBg: Record<Tone, string> = { ok: 'bg-ok', warn: 'bg-warn', risk: 'bg-risk', info: 'bg-info', expert: 'bg-expert', muted: 'bg-ink-3', azure: 'bg-azure' }

/* ---------------- Avatar ---------------- */
const avatarColors = ['bg-[#e8eefc] text-[#1d3a8a]', 'bg-[#fdebd3] text-[#8a4b00]', 'bg-[#e3f3eb] text-[#0e6b4b]', 'bg-[#f3e8fd] text-[#5b34c9]', 'bg-[#fde7e4] text-[#9a2a1f]', 'bg-[#e6f4f7] text-[#0f5f6e]']
export function Avatar({ name, src, size = 32, className }: { name: string; src?: string; size?: number; className?: string }) {
  const c = avatarColors[(name.charCodeAt(0) + name.length) % avatarColors.length]
  return src ? (
    <img src={src} alt="" className={cn('rounded-full object-cover shrink-0', className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn('inline-flex items-center justify-center rounded-full font-semibold shrink-0', c, className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}

/* ---------------- KPI ---------------- */
export function Kpi({ label, value, sub, tone, icon, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: Tone; icon?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center gap-2 text-[13px] text-ink-2 font-medium">{icon}{label}</div>
      <div className={cn('mt-2 font-display text-[34px] leading-none font-semibold num', tone ? toneText[tone] : 'text-ink')}>{value}</div>
      {sub && <div className="mt-2 text-[13px] text-ink-3">{sub}</div>}
    </Card>
  )
}

/* ---------------- Progress ---------------- */
export function Progress({ value, tone = 'azure', className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn('h-2 rounded-full bg-sunken overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all duration-700', toneBg[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 7, tone = 'ok', children }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sunken)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className={cn('transition-all duration-700', toneText[tone])} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

/* ---------------- Switch ---------------- */
export function Switch({ checked, onCheckedChange, label, disabled, id }: { checked: boolean; onCheckedChange: (v: boolean) => void; label?: string; disabled?: boolean; id?: string }) {
  return (
    <SwitchP.Root id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={label}
      className="relative h-7 w-12 shrink-0 rounded-full bg-line-strong data-[state=checked]:bg-ok transition-colors disabled:opacity-50">
      <SwitchP.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </SwitchP.Root>
  )
}

/* ---------------- Dialog & Sheet ---------------- */
export function Dialog({ open, onOpenChange, title, description, children, footer, wide }: { open: boolean; onOpenChange: (v: boolean) => void; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <DialogP.Root open={open} onOpenChange={onOpenChange}>
      <DialogP.Portal>
        <DialogP.Overlay className="fixed inset-0 z-50 bg-navy/30 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <DialogP.Content className={cn('fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-h-[88vh] overflow-auto rounded-2xl bg-surface p-6 shadow-[var(--shadow-pop)] border border-line', wide ? 'max-w-3xl' : 'max-w-lg')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogP.Title className="font-display text-[22px] font-semibold text-ink">{title}</DialogP.Title>
              {description && <DialogP.Description className="mt-1 text-sm text-ink-2">{description}</DialogP.Description>}
            </div>
            <DialogP.Close className="rounded-lg p-1.5 text-ink-3 hover:bg-sunken" aria-label="Close"><X className="size-5" /></DialogP.Close>
          </div>
          <div className="mt-5">{children}</div>
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </DialogP.Content>
      </DialogP.Portal>
    </DialogP.Root>
  )
}

export function Sheet({ open, onOpenChange, title, description, children, width = 480 }: { open: boolean; onOpenChange: (v: boolean) => void; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; width?: number }) {
  return (
    <DialogP.Root open={open} onOpenChange={onOpenChange}>
      <DialogP.Portal>
        <DialogP.Overlay className="fixed inset-0 z-50 bg-navy/20" />
        <DialogP.Content className="fixed right-0 top-0 z-50 h-full max-w-[100vw] overflow-auto bg-surface border-l border-line shadow-[var(--shadow-pop)]" style={{ width }}>
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface/95 backdrop-blur px-6 py-5">
            <div>
              <DialogP.Title className="text-lg font-semibold text-ink">{title}</DialogP.Title>
              {description && <DialogP.Description className="mt-0.5 text-sm text-ink-2">{description}</DialogP.Description>}
            </div>
            <DialogP.Close className="rounded-lg p-1.5 text-ink-3 hover:bg-sunken" aria-label="Close"><X className="size-5" /></DialogP.Close>
          </div>
          <div className="px-6 py-5">{children}</div>
        </DialogP.Content>
      </DialogP.Portal>
    </DialogP.Root>
  )
}

/* ---------------- Tabs ---------------- */
export function Tabs({ tabs, value, onValueChange, className }: { tabs: { value: string; label: React.ReactNode; count?: number }[]; value: string; onValueChange: (v: string) => void; className?: string }) {
  return (
    <TabsP.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsP.List className="inline-flex gap-1 rounded-xl bg-sunken p-1">
        {tabs.map((t) => (
          <TabsP.Trigger key={t.value} value={t.value}
            className="rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-ink-2 data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm transition-colors">
            {t.label}{t.count !== undefined && <span className="ml-1.5 text-ink-3 num">{t.count}</span>}
          </TabsP.Trigger>
        ))}
      </TabsP.List>
    </TabsP.Root>
  )
}

/* ---------------- Tooltip ---------------- */
export function Tip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipP.Provider delayDuration={200}>
      <TooltipP.Root>
        <TooltipP.Trigger asChild>{children}</TooltipP.Trigger>
        <TooltipP.Portal>
          <TooltipP.Content sideOffset={6} className="z-50 max-w-xs rounded-lg bg-navy px-3 py-2 text-xs text-white shadow-lg">{content}</TooltipP.Content>
        </TooltipP.Portal>
      </TooltipP.Root>
    </TooltipP.Provider>
  )
}

/* ---------------- Empty state ---------------- */
export function Empty({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-azure-50 text-azure">{icon ?? <ShieldCheck className="size-6" />}</div>
      <div className="font-semibold text-ink">{title}</div>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------------- Misc ---------------- */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[12px] text-ink-2', className)}>{children}</span>
}
export function Due({ children, tone = 'muted' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 text-xs font-medium', toneText[tone])}><Clock3 className="size-3.5" />{children}</span>
}
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-line', className)} />
}
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label-caps">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}
export const inputCls = 'w-full h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/20'
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, 'h-auto min-h-24 py-2', props.className)} />
}
export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} className={cn(inputCls, 'pr-8', props.className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
