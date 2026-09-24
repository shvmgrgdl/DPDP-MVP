import type { LucideIcon } from 'lucide-react'
import { FileSearch, PenLine, Trash2, UserPlus, MessageSquareWarning, Undo2, ImageOff } from 'lucide-react'
import type { Lang, PrivacyRequest, RequestStatus, RequestType } from '@/data/types'
import type { Tone } from '@/design/ui'
import { DEMO_NOW } from '@/lib/utils'

export const REQUEST_TYPES: RequestType[] = ['access', 'correction', 'erasure', 'nomination', 'grievance', 'withdrawal', 'photo-removal']

export const REQUEST_TYPE_META: Record<RequestType, { label: string; short: string; icon: LucideIcon }> = {
  access: { label: 'Data summary (access)', short: 'Access', icon: FileSearch },
  correction: { label: 'Correction', short: 'Correction', icon: PenLine },
  erasure: { label: 'Erasure', short: 'Erasure', icon: Trash2 },
  nomination: { label: 'Nomination', short: 'Nomination', icon: UserPlus },
  grievance: { label: 'Grievance', short: 'Grievance', icon: MessageSquareWarning },
  withdrawal: { label: 'Withdraw permission', short: 'Withdrawal', icon: Undo2 },
  'photo-removal': { label: 'Photo removal', short: 'Photo removal', icon: ImageOff },
}

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  new: { label: 'New', tone: 'info' },
  verifying: { label: 'Verifying identity', tone: 'info' },
  'in-progress': { label: 'In progress', tone: 'warn' },
  'waiting-parent': { label: 'Waiting on parent', tone: 'muted' },
  resolved: { label: 'Resolved', tone: 'ok' },
  closed: { label: 'Closed', tone: 'muted' },
}

export const CHANNEL_LABEL: Record<PrivacyRequest['channel'], string> = {
  'parent-app': 'Parent app', 'privacy-centre': 'Privacy Centre', email: 'Email', office: 'Office (walk-in / phone)',
}

export const OPEN_STATUSES: RequestStatus[] = ['new', 'verifying', 'in-progress', 'waiting-parent']

/** "On track" vs the 7-day internal target. Legal max is LEGAL.grievanceMaxDays (90 days) and is shown separately. */
export function trackStatus(r: PrivacyRequest): { label: string; tone: Tone } {
  if (r.status === 'resolved') return { label: 'Resolved', tone: 'ok' }
  if (r.status === 'closed') return { label: 'Closed', tone: 'muted' }
  const days = Math.round((new Date(r.targetAt).getTime() - new Date(DEMO_NOW).getTime()) / 86400000)
  if (days < 0) return { label: 'Past target', tone: 'risk' }
  if (days <= 2) return { label: 'Due soon', tone: 'warn' }
  return { label: 'On track', tone: 'ok' }
}

/** Best-effort parse of "shows X, should be Y" out of a correction summary — a starting point, always editable. */
export function guessCorrection(summary: string): { field: string; before: string; after: string } {
  const m = summary.match(/shows\s+([^,]+),\s*should be\s+([^)]+)\)?/i)
  const field = /date of birth/i.test(summary) ? 'Date of birth' : /name/i.test(summary) ? 'Name spelling' : ''
  if (!m) return { field, before: '', after: '' }
  return { field, before: m[1].trim(), after: m[2].replace(/[.)]+$/, '').trim() }
}

interface TemplateCtx { child: string; guardian: string; school: string; contact: string; summary: string }

const TEMPLATES: Record<RequestType, Record<Lang, (c: TemplateCtx) => string>> = {
  access: {
    en: (c) => `Dear ${c.guardian},\n\nAs requested, please find attached a summary of the personal data ${c.school} holds about ${c.child} — what we collect, why, and which vendors it is shared with.\n\nIf anything is unclear, just reply to this message or write to ${c.contact}.\n\n— ${c.school}`,
    hi: (c) => `प्रिय ${c.guardian},\n\nआपके अनुरोध अनुसार, ${c.school} के पास ${c.child} से जुड़े जिस डेटा का उपयोग होता है, उसका सारांश संलग्न है — क्या इकट्ठा होता है, क्यों, और किन वेंडरों के साथ साझा होता है।\n\nकोई प्रश्न हो तो इसी संदेश का उत्तर दें या ${c.contact} पर लिखें।\n\n— ${c.school}`,
  },
  correction: {
    en: (c) => `Dear ${c.guardian},\n\nWe have corrected ${c.child}'s record as you requested (${c.summary}). The updated record is now reflected in our systems.\n\nIf you notice anything else that needs fixing, please let us know.\n\n— ${c.school}`,
    hi: (c) => `प्रिय ${c.guardian},\n\nआपके अनुरोध अनुसार ${c.child} का रिकॉर्ड ठीक कर दिया गया है (${c.summary})। अद्यतन जानकारी अब हमारे सिस्टम में दर्ज है।\n\nकोई अन्य त्रुटि दिखे तो हमें बताएं।\n\n— ${c.school}`,
  },
  erasure: {
    en: (c) => `Dear ${c.guardian},\n\nWe have reviewed your request to delete ${c.child}'s data. Academic and admission records must be retained under education rules, so those stay on file. Everything else that is not legally required has been removed.\n\n— ${c.school}`,
    hi: (c) => `प्रिय ${c.guardian},\n\nहमने ${c.child} का डेटा हटाने का अनुरोध देखा है। शिक्षा नियमों के तहत शैक्षणिक व प्रवेश रिकॉर्ड रखना आवश्यक है, इसलिए वे सुरक्षित रहेंगे। शेष डेटा जो कानूनी रूप से आवश्यक नहीं था, हटा दिया गया है।\n\n— ${c.school}`,
  },
  nomination: {
    en: (c) => `Dear ${c.guardian},\n\nWe have recorded your nominee for ${c.child}'s account, as requested, for use in the unfortunate event of your death or incapacity.\n\n— ${c.school}`,
    hi: (c) => `प्रिय ${c.guardian},\n\nआपके अनुरोध अनुसार ${c.child} के खाते हेतु नामांकित व्यक्ति दर्ज कर लिया गया है।\n\n— ${c.school}`,
  },
  grievance: {
    en: (c) => `Dear ${c.guardian},\n\nThank you for raising this with us. Here is what we found and what we have done: ${c.summary}.\n\nIf you are not satisfied with this response, you may escalate to the Data Protection Board.\n\n— ${c.school}`,
    hi: (c) => `प्रिय ${c.guardian},\n\nहमें सूचित करने हेतु धन्यवाद। हमने पाया और यह कार्रवाई की: ${c.summary}।\n\nयदि आप इस उत्तर से संतुष्ट नहीं हैं, तो आप डेटा संरक्षण बोर्ड में शिकायत कर सकते हैं।\n\n— ${c.school}`,
  },
  withdrawal: {
    en: (c) => `Dear ${c.guardian},\n\nWe have updated ${c.child}'s photo & video choices as requested. Any live posts affected by this change have been queued for takedown.\n\n— ${c.school}`,
    hi: (c) => `प्रिय ${c.guardian},\n\n${c.child} की फ़ोटो/वीडियो अनुमतियाँ आपके अनुरोध अनुसार अपडेट कर दी गई हैं। इससे प्रभावित कोई भी लाइव पोस्ट हटाने हेतु सूचीबद्ध कर दी गई है।\n\n— ${c.school}`,
  },
  'photo-removal': {
    en: (c) => `Dear ${c.guardian},\n\nThe photo of ${c.child} you flagged has been taken down and will not be reused. Thank you for letting us know.\n\n— ${c.school}`,
    hi: (c) => `प्रिय ${c.guardian},\n\nआपके द्वारा बताई गई ${c.child} की तस्वीर हटा दी गई है और दोबारा उपयोग नहीं होगी। सूचित करने के लिए धन्यवाद।\n\n— ${c.school}`,
  },
}

export function replyTemplate(type: RequestType, lang: Lang, ctx: TemplateCtx): string {
  return TEMPLATES[type][lang](ctx)
}
