import { useShallow } from 'zustand/react/shallow'
import { useApp } from './app'
import { ROLE, type Ability } from '@/roles/roles'
import type { EngineCtx } from '@/engine/permission'

export const useRoleDef = () => ROLE[useApp((s) => s.role)]
export const useCan = (a: Ability) => ROLE[useApp((s) => s.role)].abilities.includes(a)
/** Engine context (students, guardians, permissions, notices) — pass to engine functions. */
export const useCtx = (): EngineCtx =>
  useApp(useShallow((s) => ({ students: s.students, guardians: s.guardians, permissions: s.permissions, notices: s.notices })))
export const useStudent = (id?: string | null) => useApp((s) => (id ? s.students.find((x) => x.id === id) : undefined))
export const useGuardian = (id?: string | null) => useApp((s) => (id ? s.guardians.find((x) => x.id === id) : undefined))
export const useAsset = (id?: string) => useApp((s) => s.assets.find((a) => a.id === id))
export const useEventAssets = (eventId?: string) => useApp(useShallow((s) => s.assets.filter((a) => !eventId || a.eventId === eventId)))
