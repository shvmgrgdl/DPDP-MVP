import { create } from 'zustand'
import type { Lang } from '@/data/types'

/** Module-local UI state for the parent app: which family is active and the language toggle. */
interface ParentUIState {
  guardianId: string | null
  lang: Lang
  setGuardian: (id: string) => void
  setLang: (l: Lang) => void
}

export const useParentUI = create<ParentUIState>((set) => ({
  guardianId: null,
  lang: 'en',
  setGuardian: (id) => set({ guardianId: id }),
  setLang: (l) => set({ lang: l }),
}))
