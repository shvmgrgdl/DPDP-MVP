import * as React from 'react'
import { Lock } from 'lucide-react'
import { sha256 } from '@/lib/utils'
import { BrandMark } from './AppShell'

/** Demo access gate (keeps the link private-ish; not a security boundary — the app is static and synthetic). */
const HASH = 'a1639d851ad05f6c2bfcb391addd6bf15bee67e53bb47fda37f43c2a09776800'
const KEY = 'sdo-access'

const ok = () => { try { return localStorage.getItem(KEY) === HASH } catch { return false } }

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(ok)
  const [pw, setPw] = React.useState('')
  const [err, setErr] = React.useState(false)
  if (open || import.meta.env.DEV) return <>{children}</>
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sha256(pw.trim()) === HASH) { try { localStorage.setItem(KEY, HASH) } catch { /* private mode */ } setOpen(true) }
    else setErr(true)
  }
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <form onSubmit={submit} className="card w-full max-w-sm p-8 text-center">
        <div className="flex justify-center"><BrandMark size={44} /></div>
        <h1 className="mt-4 font-display text-2xl font-semibold">School DPDP OS</h1>
        <p className="mt-1 text-sm text-ink-2">Private demo. Enter the access password.</p>
        <label className="mt-6 block text-left">
          <span className="label-caps">Password</span>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input type="password" autoFocus value={pw} onChange={(e) => { setPw(e.target.value); setErr(false) }}
              className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/20" />
          </div>
        </label>
        {err && <p className="mt-2 text-left text-sm text-risk">That password isn’t right.</p>}
        <button type="submit" className="mt-5 h-11 w-full rounded-lg bg-azure text-sm font-semibold text-white hover:bg-azure-600">Open demo</button>
        <p className="mt-4 text-[11px] text-ink-3">All data in this demo is synthetic.</p>
      </form>
    </div>
  )
}
