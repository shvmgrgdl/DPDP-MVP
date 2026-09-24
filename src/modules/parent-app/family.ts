import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useApp } from '@/store/app'
import { useParentUI } from './state'

/** The two demo families this module offers in the switcher, resolved by HEROES studentIds (per FOUNDATION). */
const FAMILY_HEROES = ['Diya Patel', 'Kabir Singh'] as const

export function useFamilyOptions() {
  // Select the raw (reference-stable) slices, then derive — never build fresh wrapper
  // objects inside a zustand selector: useShallow only compares one level deep, so a
  // selector that maps into new {guardian, student} objects never looks "unchanged"
  // and trips React's getSnapshot-must-be-cached guard.
  const students = useApp((s) => s.students)
  const guardians = useApp((s) => s.guardians)
  return useMemo(
    () =>
      FAMILY_HEROES.map((name) => {
        const student = students.find((x) => x.hero && x.name === name)!
        const guardian = guardians.find((g) => g.studentIds.includes(student.id))!
        return { guardian, student }
      }),
    [students, guardians],
  )
}

/** Currently active guardian + their children, defaulting to Sunita Patel (Diya's mother). */
export function useActiveFamily() {
  const options = useFamilyOptions()
  const selected = useParentUI((s) => s.guardianId)
  const fallbackId = options[0].guardian.id
  const guardian = useApp((s) => s.guardians.find((g) => g.id === (selected ?? fallbackId))) ?? options[0].guardian
  const children = useApp(useShallow((s) => s.students.filter((st) => guardian.studentIds.includes(st.id))))
  return { guardian, children, options }
}
