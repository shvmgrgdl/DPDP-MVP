import * as React from 'react'
import { Lock, ShieldCheck, KeyRound, Fingerprint, ScanSearch, Eye, Download, AlertTriangle, CheckCircle2, Server, FileLock2, Database, ScrollText } from 'lucide-react'
import { useDemo, verifyChain } from '../store'
import { Btn, Chip, PhotoView, wmTime } from '../ui'
import { fakeHex, KEY_ID, kb } from '../lib/fake'
import { saveCopies } from '../lib/actions'
import { Zoom } from './Zoom'

interface Obj { name: string; kind: 'photo' | 'record'; size: number; photoId?: string; sample?: string }

/** Appearance of the production security design. Nothing here stores real data. */
export function SecurityPanel() {
  const s = useDemo()
  const [peek, setPeek] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<{ name: string; pct: number; mode: 'decrypt' | 'tamper' } | null>(null)
  const [tamper, setTamper] = React.useState<string | null>(null)
  const [zoom, setZoom] = React.useState<string | null>(null)
  const [record, setRecord] = React.useState<string | null>(null)
  const [sel, setSel] = React.useState('')
  const [scan, setScan] = React.useState<{ pct: number; done: boolean } | null>(null)
  const https = typeof location !== 'undefined' && location.protocol === 'https:'
  const objs: Obj[] = [
    ...s.photos.map((p) => ({ name: `media/${p.id}.jpg`, kind: 'photo' as const, size: p.id === 'P5' || p.id === 'P6' ? 612000 : 318000, photoId: p.id })),
    { name: 'records/guardian-choices', kind: 'record', size: 4200, sample: JSON.stringify({ guardian: 'G-4K7Q', album: true, internal: false, public: false, notice: 'v1.2', lang: 'hi' }, null, 1) },
    { name: 'records/audit-log', kind: 'record', size: 1800 + s.audit.length * 420, sample: JSON.stringify(s.audit.slice(-1).map((a) => ({ n: a.n, actor: a.actor, action: a.action, hash: a.hash.slice(0, 16) + '…' })), null, 1) },
    { name: 'records/login-credentials', kind: 'record', size: 960, sample: '{ "G-4K7Q": "argon2id$v=19$m=65536…" }   ← salted hash only; no plain passwords' },
  ]
  const run = (name: string, mode: 'decrypt' | 'tamper', after: () => void) => {
    setBusy({ name, pct: 0, mode }); setTamper(null)
    let pct = 0; const id = setInterval(() => { pct += 12; setBusy({ name, pct: Math.min(pct, 100), mode }); if (pct >= 100) { clearInterval(id); setBusy(null); after() } }, 110)
  }
  const downloads = s.audit.filter((a) => a.action === 'Downloaded photo' && a.trace)
  const hit = downloads.find((d) => String(d.n) === sel) ?? downloads[0]
  React.useEffect(() => { if (!sel && downloads[0]) setSel(String(downloads[0].n)) }, [downloads.length])
  const runScan = () => { s.logEvent('Leak trace checked', `Scanned a copy; watermark matched to audit entry #${hit?.n}.`, hit?.photoId, hit?.trace); setScan({ pct: 0, done: false }); let pct = 0; const id = setInterval(() => { pct += 10; setScan({ pct, done: pct >= 100 }); if (pct >= 100) clearInterval(id) }, 140) }
  const cards: [React.ReactNode, string, string, string][] = [
    [<Server key="a" className="size-5" />, 'In transit', 'TLS 1.3 · HSTS', https ? 'This connection is HTTPS' : 'Production serves HTTPS only'],
    [<FileLock2 key="b" className="size-5" />, 'At rest', 'AES-256-GCM', 'Per-object keys, unique IV per file'],
    [<KeyRound key="c" className="size-5" />, 'Keys', 'Per-school key', `ID ${KEY_ID} · rotated every 90 days`],
    [<Fingerprint key="d" className="size-5" />, 'Integrity', verifyChain(s.audit) ? 'Audit chain verified' : 'Chain broken', `${s.audit.length} entries, each sealed to the last`],
  ]
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gold-50 p-3 text-sm"><Chip tone="gold">Prototype</Chip><span className="text-ink-2">Shows the production security design. This demo holds only synthetic data — nothing real is stored or encrypted here.</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([i, a, b, c]) => <div key={a} className="card p-4"><div className="mb-2 flex items-center gap-2 text-gold">{i}<span className="eyebrow">{a}</span></div><div className="font-bold">{b}</div><div className="mt-0.5 text-xs text-ink-3">{c}</div><div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ok"><CheckCircle2 className="size-3.5" /> Active</div></div>)}</div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand px-4 py-3"><div className="flex items-center gap-2 font-bold"><Database className="size-4 text-gold" /> Encrypted vault</div><Chip tone="ok"><Lock className="size-3" /> {objs.length} objects · all encrypted</Chip></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-xs text-ink-3"><th className="p-3">Object</th><th className="p-3">Size</th><th className="p-3">Cipher · IV</th><th className="p-3">Status</th><th /></tr></thead>
          <tbody>{objs.map((o) => (
            <React.Fragment key={o.name}>
              <tr className="border-t border-line">
                <td className="p-3 font-mono text-xs font-semibold">{o.name}</td>
                <td className="p-3 text-xs text-ink-2">{kb(o.size)} → {kb(o.size + 28)}</td>
                <td className="p-3 font-mono text-[11px] text-ink-3">AES-256-GCM · {fakeHex(o.name, 12).replace(/ /g, '').slice(0, 24)}</td>
                <td className="p-3"><Chip tone="ok"><Lock className="size-3" /> Encrypted</Chip></td>
                <td className="whitespace-nowrap p-3 text-right">
                  <Btn variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => setPeek(peek === o.name ? null : o.name)}><Eye className="size-3.5" /> {peek === o.name ? 'Hide' : 'Raw'}</Btn>
                  <Btn variant="outline" className="min-h-8 px-2 text-xs" disabled={!!busy} onClick={() => run(o.name, 'decrypt', () => { s.logEvent('Decrypted for viewing', `${o.name} decrypted in a protected session (demo).`, o.photoId); if (o.photoId) setZoom(o.photoId); else setRecord(o.name) })}>Decrypt</Btn>
                  <Btn variant="ghost" className="min-h-8 px-2 text-xs text-risk" disabled={!!busy} onClick={() => run(o.name, 'tamper', () => { setTamper(o.name); s.logEvent('Tamper test run', `${o.name}: altered copy rejected by authentication check (demo).`, o.photoId) })}>Tamper test</Btn>
                </td>
              </tr>
              {(peek === o.name || (busy && busy.name === o.name) || tamper === o.name || record === o.name) && (
                <tr><td colSpan={5} className="bg-navy px-4 py-3 text-white">
                  {busy?.name === o.name ? <div><div className="font-mono text-[11px] text-gold">{busy.mode === 'decrypt' ? 'Decrypting with school key…' : 'Flipping one bit in a copy and verifying…'}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-gold transition-all" style={{ width: `${busy.pct}%` }} /></div><div className="mt-2 break-all font-mono text-[10px] text-white/50">{fakeHex(o.name + busy.pct, 40)}</div></div>
                  : tamper === o.name ? <div className="flex items-start gap-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#ff8a7a]" /><div><b>Authentication tag mismatch</b><div className="text-xs text-white/70">One altered bit was detected and the file was refused. Data that has been changed in storage cannot be opened.</div></div></div>
                  : record === o.name ? <div><div className="mb-1 font-mono text-[11px] text-gold">Decrypted preview</div><pre className="overflow-x-auto font-mono text-[11px] text-white/85">{o.sample}</pre><button type="button" className="mt-1 text-[11px] underline" onClick={() => setRecord(null)}>Close</button></div>
                  : <div><div className="mb-1 font-mono text-[11px] text-gold">Raw stored bytes (what an attacker would see)</div><div className="break-all font-mono text-[10px] leading-relaxed text-white/60">{fakeHex(o.name, 144)}</div></div>}
                </td></tr>)}
            </React.Fragment>))}</tbody>
        </table></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 font-bold"><ScanSearch className="size-4 text-gold" /> Trace a leaked copy</div>
          <p className="text-sm text-ink-2">Every photo on screen carries the viewer’s school-issued ID, the live time and a trace ID. Downloaded copies carry it too. If a photo turns up where it shouldn’t, the mark points to who had it open, and when.</p>
          <div className="mt-3 space-y-2">
            {downloads.length === 0 ? <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sand p-3 text-sm"><span className="text-ink-2">No copies downloaded yet.</span><Btn variant="outline" className="min-h-9 text-xs" onClick={() => { s.setChild('S2'); void saveCopies(['P2']) }}><Download className="size-4" /> Simulate a guardian download</Btn></div> : (<>
              <label className="block text-xs font-semibold text-ink-3">Copy found outside the app (pick the download it came from)
                <select className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-2 text-sm" value={sel} onChange={(e) => { setSel(e.target.value); setScan(null) }}>{downloads.map((d) => <option key={d.n} value={d.n}>#{d.n} · {d.photoId} · {d.trace}</option>)}</select></label>
              <Btn variant="gold" onClick={runScan} disabled={!!scan && !scan.done}><ScanSearch className="size-4" /> Scan watermark</Btn></>)}
            {scan && <div className="rounded-xl border border-line bg-white p-3 text-sm">{!scan.done ? <><div className="font-mono text-[11px] text-ink-3">Reading visible and embedded marks…</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full bg-gold transition-all" style={{ width: `${scan.pct}%` }} /></div></> : hit && <div className="pop"><div className="mb-1 flex items-center gap-1.5 font-bold text-ok"><CheckCircle2 className="size-4" /> Watermark found</div><dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs"><dt className="text-ink-3">Viewer</dt><dd className="font-mono">{hit.actor}</dd><dt className="text-ink-3">Photo</dt><dd>{hit.photoId}</dd><dt className="text-ink-3">Time</dt><dd>{wmTime(new Date(hit.t).getTime())}</dd><dt className="text-ink-3">Trace</dt><dd className="font-mono">{hit.trace}</dd><dt className="text-ink-3">Audit entry</dt><dd>#{hit.n} · {hit.hash.slice(0, 12)}…</dd></dl><p className="mt-2 text-[11px] text-ink-3">The ID resolves to a family only in the school’s own records.</p></div>}</div>}
          </div>
          <p className="mt-3 text-[11px] text-ink-3">Shown as a simulation. Watermarks make a leak traceable; they can’t stop a screenshot or a photo of a screen.</p>
        </div>
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck className="size-4 text-gold" /> What a viewer sees</div>
          <PhotoView photo={s.photos[0]} students={s.students} mode="admin" blurRestricted />
          <ul className="mt-3 space-y-1.5 text-xs text-ink-2">{['Live clock refreshes every second, so a screenshot is time-stamped.', 'Uses the school-issued ID, not a name — the school resolves it if needed.', 'Right-click, drag and long-press save are disabled on photos.', 'Every open, download and share is added to the audit log.'].map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" />{t}</li>)}</ul>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-2 flex items-center gap-2 font-bold"><KeyRound className="size-4 text-gold" /> Access and key controls</div>
        <ul className="grid gap-2 text-sm text-ink-2 md:grid-cols-2">{['Role-based access: parents see only their child, photographers upload to one event, staff see what their role needs.', 'Two-person approval for bulk exports of photos or records.', 'Keys are held separately from data; rotation every 90 days and on staff change.', 'Hosting region chosen by the school; backups encrypted with the same controls.', 'Failed sign-ins are logged; five failures lock the account until the school reissues the login.', 'Vendor and photographer access expires automatically after the event.'].map((t) => <li key={t} className="flex gap-2"><Lock className="mt-0.5 size-3.5 shrink-0 text-gold" />{t}</li>)}</ul>
      </div>
      {zoom && <Zoom photoId={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}

export function Security() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6"><div className="eyebrow mb-2">Security</div><h2 className="text-2xl font-bold tracking-tight md:text-3xl">Encrypted, watermarked, fully logged</h2><p className="mt-2 max-w-2xl text-[15px] text-ink-2">How photos and records are protected, and how a leak could be traced. Try the vault, the tamper test and the leak trace.</p></div>
      <SecurityPanel />
    </section>
  )
}

export function AuditLog() {
  const s = useDemo()
  const [q, setQ] = React.useState(''); const [who, setWho] = React.useState('all'); const [act, setAct] = React.useState('all')
  const actions = [...new Set(s.audit.map((a) => a.action))].sort()
  const rows = s.audit.filter((a) => (who === 'all' || a.actor.toLowerCase().startsWith(who)) && (act === 'all' || a.action === act) && (!q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase()))).slice().reverse()
  const ok = verifyChain(s.audit)
  const exp = (kind: 'json' | 'csv') => {
    s.logEvent('Audit log exported', `${rows.length} entries exported as ${kind.toUpperCase()}.`)
    const body = kind === 'json' ? JSON.stringify(s.audit, null, 2) : [['n', 'time', 'actor', 'app', 'language', 'session', 'action', 'photo', 'trace', 'detail', 'hash'], ...s.audit.map((a) => [a.n, a.t, a.actor, a.app, a.lang, a.sid, a.action, a.photoId ?? '', a.trace ?? '', a.detail, a.hash])].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: kind === 'json' ? 'application/json' : 'text/csv' })); a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.${kind}`; a.click()
  }
  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-ink-2"><ScrollText className="size-4 text-gold" /> Every sign-in, choice, review, view, download and export is recorded and chained to the one before.</div>
        <Chip tone={ok ? 'ok' : 'risk'}>{ok ? `Chain verified · ${s.audit.length} entries` : 'Chain broken'}</Chip>
      </div>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input className="h-10 rounded-xl border border-line bg-white px-3 text-sm" placeholder="Search the log" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Actor" className="h-10 rounded-xl border border-line bg-white px-2 text-sm" value={who} onChange={(e) => setWho(e.target.value)}><option value="all">All actors</option><option value="guardian">Guardians</option><option value="school">School admin</option><option value="photographer">Photographer</option><option value="system">System</option><option value="unknown">Unknown</option></select>
        <select aria-label="Action" className="h-10 rounded-xl border border-line bg-white px-2 text-sm" value={act} onChange={(e) => setAct(e.target.value)}><option value="all">All actions</option>{actions.map((a) => <option key={a}>{a}</option>)}</select>
        <Btn variant="outline" className="min-h-10 text-xs" onClick={() => exp('csv')}><Download className="size-4" /> CSV</Btn>
        <Btn variant="outline" className="min-h-10 text-xs" onClick={() => exp('json')}><Download className="size-4" /> JSON</Btn>
      </div>
      <ol className="max-h-[460px] space-y-2 overflow-auto">
        {rows.map((a) => (
          <li key={a.n} className="rounded-xl border border-line bg-white p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-1"><span className="font-semibold">#{a.n} · {a.action}{a.photoId ? ` · ${a.photoId}` : ''}</span><span className="text-xs text-ink-3">{wmTime(new Date(a.t).getTime())}</span></div>
            <div className="text-xs text-ink-2">{a.actor} — {a.detail}</div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-ink-3"><span className="rounded bg-sand px-1.5 py-0.5">app: {a.app}</span><span className="rounded bg-sand px-1.5 py-0.5">lang: {a.lang}</span><span className="rounded bg-sand px-1.5 py-0.5">session {a.sid}</span>{a.trace && <span className="rounded bg-gold-50 px-1.5 py-0.5 text-gold">trace {a.trace}</span>}<span className="font-mono">{a.hash.slice(0, 20)}…</span></div>
          </li>))}
        {rows.length === 0 && <li className="p-4 text-sm text-ink-3">No entries match.</li>}
      </ol>
      <p className="mt-3 text-xs text-ink-3">This is a readiness record, not a compliance certificate. Exports are themselves logged.</p>
    </div>
  )
}
