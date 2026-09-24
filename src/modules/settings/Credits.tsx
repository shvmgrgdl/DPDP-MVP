import * as React from 'react'
import { Card, SectionTitle } from '@/design/ui'
import { useApp } from '@/store/app'

function loadAssetSources(): string {
  try {
    const files = import.meta.glob('/docs/*.md', { query: '?raw', eager: true }) as unknown as Record<string, { default: string }>
    const key = Object.keys(files).find((k) => k.toLowerCase().endsWith('asset_sources.md'))
    return key ? files[key].default : ''
  } catch {
    return ''
  }
}

const isTableRule = (t: string) => /^\|?[\s:|-]+\|?$/.test(t) && t.includes('-')
const splitRow = (t: string) => t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

/** Bold (**text**) and bare URLs → links. Kept intentionally simple — no full Markdown parser. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/\S+)/g).filter(Boolean)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={`${keyPrefix}-${i}`} className="text-ink">{p.slice(2, -2)}</strong>
    if (/^https?:\/\//.test(p)) return <a key={`${keyPrefix}-${i}`} href={p} target="_blank" rel="noreferrer" className="text-azure hover:underline">{p}</a>
    return <React.Fragment key={`${keyPrefix}-${i}`}>{p}</React.Fragment>
  })
}

function SimpleMarkdown({ md }: { md: string }) {
  const lines = md.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const t = lines[i].trim()
    if (!t) { i++; continue }
    if (t.startsWith('# ')) { blocks.push(<h3 key={i} className="mt-4 font-display text-lg font-semibold text-ink first:mt-0">{t.slice(2)}</h3>); i++; continue }
    if (t.startsWith('## ')) { blocks.push(<h4 key={i} className="mt-4 text-sm font-semibold text-ink first:mt-0">{t.slice(3)}</h4>); i++; continue }
    if (t.startsWith('- ') || t.startsWith('* ')) { blocks.push(<div key={i} className="flex gap-2 pl-1">•<span>{renderInline(t.slice(2), `l${i}`)}</span></div>); i++; continue }
    if (t.startsWith('|')) {
      const header = splitRow(t)
      let j = i + 1
      if (j < lines.length && isTableRule(lines[j].trim())) j++
      const rows: string[][] = []
      while (j < lines.length && lines[j].trim().startsWith('|')) { rows.push(splitRow(lines[j].trim())); j++ }
      blocks.push(
        <div key={i} className="my-2 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
            <thead><tr className="bg-sunken">{header.map((h, hi) => <th key={hi} className="border-b border-line px-3 py-2 text-left font-semibold text-ink-2">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line last:border-0">
                  {r.map((c, ci) => <td key={ci} className="px-3 py-1.5 align-top text-ink-2">{renderInline(c, `r${ri}c${ci}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      i = j
      continue
    }
    blocks.push(<p key={i}>{renderInline(t, `p${i}`)}</p>)
    i++
  }
  return <div className="space-y-2 text-sm text-ink-2">{blocks}</div>
}

export default function Credits() {
  const caption = useApp((s) => s.school.mediaCaption)
  const md = React.useMemo(loadAssetSources, [])
  return (
    <Card className="p-6">
      <SectionTitle>Image credits</SectionTitle>
      {md ? <SimpleMarkdown md={md} /> : (
        <p className="text-sm text-ink-2">{caption}. A full source list will appear here once published.</p>
      )}
    </Card>
  )
}
