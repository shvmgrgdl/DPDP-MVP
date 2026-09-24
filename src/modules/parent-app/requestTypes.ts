import type { RequestType } from '@/data/types'

export const PARENT_REQUEST_TYPES: { key: Extract<RequestType, 'access' | 'correction' | 'erasure' | 'nomination' | 'grievance'>; en: string; hi: string; example: string }[] = [
  { key: 'access', en: 'Data summary', hi: 'डेटा सारांश', example: 'See what information the school holds about your child.' },
  { key: 'correction', en: 'Correct something', hi: 'सुधार करें', example: 'Fix a wrong name, date of birth or other detail.' },
  { key: 'erasure', en: 'Delete data', hi: 'डेटा हटाएं', example: 'Ask the school to delete data it no longer needs.' },
  { key: 'nomination', en: 'Nominate someone', hi: 'किसी को नामांकित करें', example: 'Choose someone to act for you if you are unavailable.' },
  { key: 'grievance', en: 'Raise a complaint', hi: 'शिकायत दर्ज करें', example: 'Tell us if something went wrong so we can fix it.' },
]

/** Display labels for every request type, including the ones raised from dedicated flows (Choices, Photos). */
export const REQUEST_TYPE_LABEL: Record<RequestType, { en: string; hi: string }> = {
  access: { en: 'Data summary', hi: 'डेटा सारांश' },
  correction: { en: 'Correction', hi: 'सुधार' },
  erasure: { en: 'Delete data', hi: 'डेटा हटाना' },
  nomination: { en: 'Nomination', hi: 'नामांकन' },
  grievance: { en: 'Complaint', hi: 'शिकायत' },
  withdrawal: { en: 'Withdrawal', hi: 'वापसी' },
  'photo-removal': { en: 'Photo removal', hi: 'तस्वीर हटाना' },
}
