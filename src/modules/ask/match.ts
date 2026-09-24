import Fuse from 'fuse.js'
import { INTENTS, type Intent } from './intents'

interface Phrase { id: string; text: string }
const phrases: Phrase[] = INTENTS.flatMap((i) => i.examples.map((text) => ({ id: i.id, text })))
const fuse = new Fuse(phrases, { keys: ['text'], includeScore: true, threshold: 0.4, ignoreLocation: true, minMatchCharLength: 3 })

/** Offline intent router: exact phrase match first, then fuzzy (fuse.js). Returns undefined → fallback / route to desk. */
export function matchIntent(query: string): Intent | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  const exact = INTENTS.find((i) => i.examples.some((ex) => ex.toLowerCase() === q))
  if (exact) return exact
  const hits = fuse.search(query)
  const best = hits[0]
  if (!best || (best.score ?? 1) > 0.45) return undefined
  return INTENTS.find((i) => i.id === best.item.id)
}

export function suggestionChips(n = 6): { id: string; label: string }[] {
  const picks = ['instagram-annual-day', 'need-dpo', 'due-this-week', 'kabir-permissions', 'cctv-retention', 'withdraw-effect']
  return picks.slice(0, n).map((id) => ({ id, label: INTENTS.find((i) => i.id === id)!.examples[0] }))
}

export function allQuestions(): { id: string; label: string }[] {
  return INTENTS.map((i) => ({ id: i.id, label: i.examples[0] }))
}
