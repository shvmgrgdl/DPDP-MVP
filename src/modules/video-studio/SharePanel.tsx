import * as React from 'react'
import { CircleAlert, CircleCheck, Download, Globe, LoaderCircle, RotateCcw, ShieldCheck, Users } from 'lucide-react'
import { Button, Card, Chip, Divider, Progress, Switch, Tip } from '@/design/ui'
import { EvidenceLink, type BlurStyle } from '@/design/media'
import { InstagramIcon, YoutubeIcon } from '@/design/brand-icons'
import { cn } from '@/lib/utils'
import { DEST_CHOICES, DEST_PHRASE, type Lane } from './lanes'
import { fmtBytes } from './media'
import type { DestChoice } from './types'

const DEST_ICON: Record<DestChoice, React.ReactNode> = {
  instagram: <InstagramIcon className="size-4" />,
  website: <Globe className="size-4" />,
  youtube: <YoutubeIcon className="size-4" />,
  'private-gallery': <Users className="size-4" />,
}

const STYLES: { key: BlurStyle; label: string; swatch: React.ReactNode }[] = [
  { key: 'soft', label: 'Soft blur', swatch: <span className="block size-full rounded-full bg-[radial-gradient(circle_at_40%_35%,#e9d7c3,#b99c86_55%,#8f7a6d)] blur-[1.5px]" /> },
  {
    key: 'pixel', label: 'Pixelate',
    swatch: <span className="grid size-full grid-cols-3 overflow-hidden rounded-md">{['#c9a88f', '#e2c7ae', '#a88a76', '#e8d2bd', '#b9977f', '#d6b89f', '#9c806e', '#cfb096', '#e0c4ab'].map((c, i) => <span key={i} style={{ background: c }} />)}</span>,
  },
  {
    key: 'sticker', label: 'Sticker',
    swatch: <span className="flex size-full items-center justify-center rounded-full bg-[#fcd34d]"><svg viewBox="0 0 24 24" className="size-[65%] text-[#8a5300]" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2z" /></svg></span>,
  },
  { key: 'solid', label: 'Solid', swatch: <span className="block size-full rounded-full bg-[#2b3445]" /> },
]

export type ExportState =
  | { phase: 'idle' }
  | { phase: 'running'; progress: number }
  | { phase: 'done'; url: string; fileName: string; size: number; evidenceId: string; blurred: number; hasAudio: boolean }
  | { phase: 'error'; message: string }

export function SharePanel({
  dest, setDest, lanes, blurEveryone, setBlurEveryone, outlines, setOutlines, style, setStyle,
  exportState, onExport, onCancel, onDownload, onReset, exportBlock, canExport, onBlurUnknown,
}: {
  dest: DestChoice
  setDest: (d: DestChoice) => void
  lanes: Lane[]
  blurEveryone: boolean
  setBlurEveryone: (v: boolean) => void
  outlines: boolean
  setOutlines: (v: boolean) => void
  style: BlurStyle
  setStyle: (s: BlurStyle) => void
  exportState: ExportState
  onExport: () => void
  onCancel: () => void
  onDownload: () => void
  onReset: () => void
  exportBlock: string | null
  canExport: boolean
  onBlurUnknown: () => void
}) {
  const total = lanes.length
  const blurred = lanes.filter((l) => l.blur).length
  const counts = {
    allowed: lanes.filter((l) => l.tone === 'ok').length,
    notAllowed: lanes.filter((l) => l.tone === 'blocked' && l.reason !== 'Protected child').length,
    protectedKids: lanes.filter((l) => l.reason === 'Protected child').length,
    unknown: lanes.filter((l) => l.tone === 'unknown').length,
  }
  const unknownShown = lanes.filter((l) => l.tone === 'unknown' && !l.blur).length
  const running = exportState.phase === 'running'

  return (
    <Card className="p-5">
      <div className="label-caps">Sharing to</div>
      <div className="mt-2.5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Destination">
        {DEST_CHOICES.map((d) => (
          <button key={d.key} type="button" role="radio" aria-checked={dest === d.key} disabled={running} onClick={() => setDest(d.key)}
            className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors disabled:opacity-50',
              dest === d.key ? 'border-azure bg-azure-50 text-azure ring-1 ring-azure' : 'border-line-strong bg-surface text-ink-2 hover:bg-sunken')}>
            <span className={cn('flex size-7 items-center justify-center rounded-lg', dest === d.key ? 'bg-white text-azure' : 'bg-sunken text-ink-2')}>{DEST_ICON[d.key]}</span>
            {d.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-[#fbfaf7] p-4 ring-1 ring-inset ring-line">
        {total ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[34px] font-semibold leading-none text-ink num">{blurred}</span>
              <span className="text-[14px] text-ink-2">of {total} {total === 1 ? 'face' : 'faces'} will be blurred {DEST_PHRASE[dest]}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {counts.allowed > 0 && <Chip tone="ok" size="sm">{counts.allowed} allowed</Chip>}
              {counts.notAllowed > 0 && <Chip tone="warn" size="sm">{counts.notAllowed} no permission</Chip>}
              {counts.protectedKids > 0 && <Chip tone="risk" size="sm">{counts.protectedKids} protected</Chip>}
              {counts.unknown > 0 && <Chip tone="info" size="sm">{counts.unknown} not recognised</Chip>}
            </div>
          </>
        ) : (
          <p className="text-[13.5px] text-ink-2">Faces will be listed here once they are found. Anyone without permission is blurred automatically.</p>
        )}
        <p className="mt-3 text-[12.5px] leading-snug text-ink-3">Faces are tracked frame by frame and blurred before anything leaves the school.</p>
      </div>

      {unknownShown > 0 && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-info-bg p-3 text-[12.5px] text-info">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            {unknownShown} unrecognised {unknownShown === 1 ? 'face is' : 'faces are'} not blurred. Blur {unknownShown === 1 ? 'it' : 'them'}, or confirm who it is in Media Safe first.
            <button type="button" onClick={onBlurUnknown} className="ml-1 font-semibold underline underline-offset-2">Blur {unknownShown === 1 ? 'it' : 'them'}</button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <ToggleRow title="Blur everyone without permission" body="Also hides faces we couldn’t match to a student." checked={blurEveryone} onChange={setBlurEveryone} disabled={running} />
        <ToggleRow title="Show face outlines" body="Soft outlines to check the tracking. Never included in the export." checked={outlines} onChange={setOutlines} />
      </div>

      <div className="mt-5">
        <div className="label-caps">Blur style</div>
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {STYLES.map((s) => (
            <button key={s.key} type="button" onClick={() => setStyle(s.key)} disabled={running} aria-pressed={style === s.key}
              className={cn('flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11.5px] font-semibold transition-colors disabled:opacity-50',
                style === s.key ? 'border-azure bg-azure-50 text-azure ring-1 ring-azure' : 'border-line-strong text-ink-2 hover:bg-sunken')}>
              <span className="size-7">{s.swatch}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Divider className="my-5" />
      <ExportBox state={exportState} onExport={onExport} onCancel={onCancel} onDownload={onDownload} onReset={onReset} block={exportBlock} canExport={canExport} destWhere={DEST_PHRASE[dest]} />
    </Card>
  )
}

function ToggleRow({ title, body, checked, onChange, disabled }: { title: string; body: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{title}</div>
        <div className="text-[12.5px] text-ink-3">{body}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} label={title} disabled={disabled} />
    </div>
  )
}

function ExportBox({ state, onExport, onCancel, onDownload, onReset, block, canExport, destWhere }: {
  state: ExportState
  onExport: () => void
  onCancel: () => void
  onDownload: () => void
  onReset: () => void
  block: string | null
  canExport: boolean
  destWhere: string
}) {
  if (state.phase === 'running') {
    return (
      <div aria-live="polite">
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="inline-flex items-center gap-2 font-semibold text-ink"><LoaderCircle className="size-4 animate-spin text-azure" />Exporting protected video</span>
          <span className="num text-ink-2">{Math.round(state.progress * 100)}%</span>
        </div>
        <Progress value={state.progress * 100} className="mt-2.5" />
        <p className="mt-2 text-[12.5px] text-ink-3">The video plays through once while the protected copy is recorded. Keep this tab open.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={onCancel}>Cancel</Button>
      </div>
    )
  }
  if (state.phase === 'done') {
    return (
      <div className="rounded-xl bg-ok-bg p-4" aria-live="polite">
        <div className="flex items-start gap-2.5">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-ok" />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ok">Protected video ready</div>
            <div className="mt-0.5 truncate text-[12.5px] text-ink-2" title={state.fileName}>{state.fileName}</div>
            <div className="text-[12.5px] text-ink-2">{fmtBytes(state.size)} · {state.blurred} {state.blurred === 1 ? 'face' : 'faces'} blurred{state.hasAudio ? ' · with sound' : ''}</div>
            <div className="mt-1.5 text-[12.5px] text-ink-2">Recorded in the evidence log: <EvidenceLink id={state.evidenceId} /></div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" icon={<Download className="size-4" />} onClick={onDownload}>Download again</Button>
          <Button size="sm" variant="secondary" icon={<RotateCcw className="size-4" />} onClick={onReset}>Make another</Button>
        </div>
      </div>
    )
  }
  const disabled = !!block || !canExport
  const button = (
    <Button size="lg" className="w-full" icon={<ShieldCheck className="size-5" />} onClick={onExport} disabled={disabled}>
      Export protected video
    </Button>
  )
  return (
    <div>
      {state.phase === 'error' && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-risk-bg p-3 text-[12.5px] text-risk"><CircleAlert className="mt-0.5 size-4 shrink-0" />{state.message}</div>
      )}
      {disabled ? <Tip content={!canExport ? 'Your role can’t export media. Ask the marketing team.' : block}><span className="block">{button}</span></Tip> : button}
      <p className="mt-2.5 text-[12.5px] leading-snug text-ink-3">
        {block ?? `Makes a new WebM file for use ${destWhere}, with faces hidden in the pixels. The original stays untouched.`}
      </p>
    </div>
  )
}
