import * as React from 'react'
import type { Lang } from '@/data/types'
import { useParentUI } from './state'

export function useLang() {
  return useParentUI((s) => s.lang)
}

/** Renders `hi` (with lang="hi" so it picks up the Devanagari font) when the toggle is set to Hindi, else `en`. */
export function Bi({ en, hi }: { en: React.ReactNode; hi: React.ReactNode }) {
  const lang = useLang()
  return lang === 'hi' ? <span lang="hi">{hi}</span> : <>{en}</>
}

/** Plain-string variant for places JSX can't go (aria-label, alt, title). */
export function tr(lang: Lang, en: string, hi: string) {
  return lang === 'hi' ? hi : en
}

export function LangToggle({ className }: { className?: string }) {
  const lang = useLang()
  const setLang = useParentUI((s) => s.setLang)
  return (
    <div className={`inline-flex items-center rounded-full bg-sunken p-0.5 text-[12px] font-semibold ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`rounded-full px-2.5 py-1 transition-colors ${lang === 'en' ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}
      >
        English
      </button>
      <button
        type="button"
        lang="hi"
        onClick={() => setLang('hi')}
        className={`rounded-full px-2.5 py-1 transition-colors ${lang === 'hi' ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}
      >
        हिन्दी
      </button>
    </div>
  )
}
