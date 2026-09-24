import * as React from 'react'
import { Routes, Route, Link } from 'react-router'
import { toast } from 'sonner'
import { Send, Sparkles, ArrowUpRight, LifeBuoy } from 'lucide-react'
import { PageHeader, Card, Button } from '@/design/ui'
import { useApp } from '@/store/app'
import { ROLE } from '@/roles/roles'
import { LEGAL } from '@/data/reference'
import { nowIso } from '@/lib/utils'
import { matchIntent, suggestionChips, allQuestions } from './match'
import type { AskAnswer } from './intents'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  text?: string
  answer?: AskAnswer
  typing?: boolean
  forQuestion?: string
}

let seq = 1
const mkId = (p: string) => `${p}${seq++}`

function Bubble({ m, onSend }: { m: ChatMsg; onSend: (q: string) => void }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-[14px] leading-relaxed text-white">{m.text}</div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-azure-50 text-azure"><Sparkles className="size-3.5" /></div>
      <div className="max-w-[85%] space-y-2">
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3">
          {m.typing ? (
            <div className="flex gap-1 py-1.5">
              {[0, 120, 240].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          ) : (
            <div className="space-y-1.5 text-[14px] leading-relaxed text-ink">
              {m.text && <p>{m.text}</p>}
              {m.answer?.lines.map((l, i) => <p key={i} className={l.startsWith('•') ? 'text-ink-2' : ''}>{l}</p>)}
            </div>
          )}
        </div>
        {!m.typing && m.answer && (m.answer.sources.length > 0 || m.forQuestion) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {m.answer.sources.map((s) => (
              <Link key={s.to} to={s.to} className="inline-flex items-center gap-1 rounded-full bg-azure-50 px-2.5 py-1 text-[12px] font-semibold text-azure hover:bg-azure-100">
                {s.label} <ArrowUpRight className="size-3" />
              </Link>
            ))}
            {m.forQuestion && (
              <button type="button" onClick={() => onSend(m.forQuestion!)}
                className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:bg-sunken">
                <LifeBuoy className="size-3" /> Send to privacy desk
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AskPage() {
  const role = useApp((s) => s.role)
  const addExpertRequest = useApp((s) => s.addExpertRequest)
  const [messages, setMessages] = React.useState<ChatMsg[]>([
    { id: 'welcome', role: 'assistant', text: "Hi, I'm the DPDP assistant. Ask about permissions, requests, retention, or anything else in your privacy programme." },
  ])
  const [input, setInput] = React.useState('')
  const endRef = React.useRef<HTMLDivElement>(null)
  const timerRef = React.useRef<number | undefined>(undefined)

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages])
  React.useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])

  const ask = (raw: string) => {
    const text = raw.trim()
    if (!text) return
    const userMsg: ChatMsg = { id: mkId('u'), role: 'user', text }
    const typingId = mkId('t')
    setMessages((m) => [...m, userMsg, { id: typingId, role: 'assistant', typing: true }])
    setInput('')
    const intent = matchIntent(text)
    timerRef.current = window.setTimeout(() => {
      setMessages((m) => m.map((mm) => {
        if (mm.id !== typingId) return mm
        if (intent) return { ...mm, typing: false, answer: intent.run(), forQuestion: text }
        return { ...mm, typing: false, forQuestion: text, answer: { lines: ["I'm not fully sure about that one yet — let's get this to a person on the privacy desk."], sources: [] } }
      }))
    }, 600 + Math.random() * 450)
  }

  const sendToDesk = (question: string) => {
    const meId = ROLE[role].person
    addExpertRequest({
      kind: 'managed-desk', title: question.length > 120 ? question.slice(0, 120) + '…' : question, status: 'requested',
      partner: 'School DPDP OS privacy team', attachments: [],
      messages: [{ at: nowIso(), from: meId, text: `From Ask: “${question}”` }],
    })
    toast.success("Sent to the privacy desk — they'll follow up.")
  }

  const chips = suggestionChips(6)
  const more = allQuestions().filter((q) => !chips.some((c) => c.id === q.id)).slice(0, 8)
  const started = messages.some((m) => m.role === 'user')

  return (
    <div>
      <PageHeader eyebrow="Ask" title="Ask anything" subtitle="Answered live from your school's data. For anything final, we'll bring in a person." />
      <Card className="flex h-[640px] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m) => <Bubble key={m.id} m={m} onSend={sendToDesk} />)}
          {!started && (
            <div>
              <div className="label-caps mb-2">Try asking</div>
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <button key={c.id} type="button" onClick={() => ask(c.label)}
                    className="rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-2 hover:border-azure hover:text-azure">
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {more.map((q) => (
              <button key={q.id} type="button" onClick={() => ask(q.label)} className="rounded-full px-2.5 py-1 text-[11.5px] font-medium text-ink-3 hover:bg-sunken hover:text-azure">
                {q.label}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about permissions, requests, retention…"
              className="h-11 flex-1 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink placeholder:text-ink-3 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/20" />
            <Button type="submit" icon={<Send className="size-4" />} disabled={!input.trim()}>Ask</Button>
          </form>
          <p className="mt-2 text-[11px] leading-snug text-ink-3">{LEGAL.disclaimer} Answers here are guidance, not a final legal determination.</p>
        </div>
      </Card>
    </div>
  )
}

export default function Module() {
  return (
    <Routes>
      <Route path="*" element={<AskPage />} />
    </Routes>
  )
}
