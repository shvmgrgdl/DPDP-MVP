/** Plain-language "About this page" copy for school owners. Longest matching route prefix wins. */
export interface Explain { title: string; what: string; why: string; you: string }

export const EXPLAIN: Record<string, Explain> = {
  '/home': {
    title: 'Your school at a glance',
    what: 'One screen showing how well your school meets India’s data protection law across 8 areas, what needs your decision, and what your team is handling.',
    why: 'Under the DPDP Act the school is responsible for every child’s personal data, including photos. This page shows the status and the proof behind it, without a confusing score.',
    you: 'Look at anything marked “Needs your decision”. Everything else is with your team or with us.',
  },
  '/home/areas': {
    title: 'One area in detail',
    what: 'The individual obligations in this area, who owns each one, and the evidence that it is done.',
    why: 'If a parent or the Data Protection Board ever asks, this is your answer, with proof attached.',
    you: 'Nothing, unless an item says “Action due”. Then the named owner takes care of it.',
  },
  '/reports': {
    title: 'Trustee report',
    what: 'A printable summary for your board or trustees.',
    why: 'Shows the governing body that privacy is being managed, which is good governance and useful evidence.',
    you: 'Print or save as PDF before your trustee meeting.',
  },
  '/readiness': {
    title: 'Readiness check',
    what: 'A short set of yes/no questions about how your school works (CCTV, buses, photographers, apps). From your answers we work out what the law asks of you.',
    why: 'Schools get useful exemptions, for example for attendance, safety CCTV and bus tracking. We apply them so you don’t collect unnecessary consent forms.',
    you: 'Answer once during onboarding (about 10 minutes). We turn the result into a plan.',
  },
  '/privacy': {
    title: 'Notices & parent permissions',
    what: 'The privacy notice parents receive (English and Hindi), the purposes you use data for, and which parents have given which permissions.',
    why: 'The law requires a clear notice and verifiable parent consent for children’s data used beyond core schooling, such as photos on social media.',
    you: 'Approve new notice versions. The office sends reminders to parents who haven’t set their choices yet.',
  },
  '/parent': {
    title: 'What parents see',
    what: 'The parent’s phone app: verify once, read a short notice, and choose purpose by purpose. For example: “yes to the class gallery, no to Instagram”.',
    why: 'Consent must be specific, informed and as easy to withdraw as to give. Every change is recorded with a timestamp.',
    you: 'Nothing. Parents do this themselves, and the school’s systems update instantly.',
  },
  '/media/upload/portal': {
    title: 'Photographer access',
    what: 'The only screen an outside photographer sees: a time-limited upload link, with no names and no downloads.',
    why: 'Vendors who handle children’s photos must be controlled. Nothing stays on their phones or cards.',
    you: 'Nothing. The link expires on its own after the event.',
  },
  '/media/upload': {
    title: 'Adding event photos',
    what: 'Photos from an event arrive here. Each face is matched to the school roster and checked against that child’s parent’s choices.',
    why: 'You can’t check hundreds of photos by hand. This makes every photo safe by default.',
    you: 'Upload, or let the photographer’s link do it.',
  },
  '/media/review': {
    title: 'Faces we couldn’t recognise',
    what: 'Faces the system couldn’t match to a student. It never guesses, so a person confirms them.',
    why: 'Guessing wrong could publish a child whose parent said no. Unknown means “held back until checked”.',
    you: 'Your media team spends a minute here after each event.',
  },
  '/media/photos': {
    title: 'Why a photo is allowed or blurred',
    what: 'Every face in the photo, and the exact reason it can or can’t be shown for the chosen use (Instagram, website, print…).',
    why: 'This is your proof. For any child you can show the parent’s choice, when it was given, and the notice they saw.',
    you: 'Tap a face to see the proof. Use “Blur & share” to publish safely.',
  },
  '/media/students': {
    title: 'One child’s photos',
    what: 'Every photo of this child, where each was published, and what their parents allow.',
    why: 'Permission follows the child. If a parent changes their mind, every photo updates.',
    you: 'Useful when a parent calls the office with a question.',
  },
  '/media': {
    title: 'Media Safe: school photos & videos',
    what: 'All school event photos in one private library. Each one is automatically checked against every parent’s choices.',
    why: 'Children’s photos are personal data. Posting a child whose parent said no is the most common, and most visible, privacy mistake schools make.',
    you: 'Your marketing team works here. Nothing leaves without passing the check.',
  },
  '/publish/blur': {
    title: 'Blur studio',
    what: 'Children without permission are blurred automatically, so the rest of the photo can still be used.',
    why: 'You keep your best event photos without exposing any child whose parent said no.',
    you: 'Pick a style, compare before and after, and download.',
  },
  '/publish/live': {
    title: 'Posts that are live',
    what: 'Everything the school has published, and any post that must come down because a parent changed their mind.',
    why: 'When a parent withdraws permission, the school must stop using the photo in channels it controls.',
    you: 'Your media team takes down flagged posts; each takedown is recorded.',
  },
  '/publish': {
    title: 'Publish Guard: “Can we post this?”',
    what: 'Choose where photos are going (Instagram, website, brochure…). The system sorts them into ready, fixed with blur, and held back.',
    why: 'Different uses need different permissions. A parent may allow the yearbook but not paid ads.',
    you: 'Your team exports only the safe set. An evidence file comes with it.',
  },
  '/video': {
    title: 'Video Studio',
    what: 'Faces are followed through the video, and children without permission are blurred frame by frame.',
    why: 'Annual Day and sports videos carry the same risk as photos, and they’re much harder to check by hand.',
    you: 'Play a clip, check who is blurred, and export a protected copy.',
  },
  '/requests': {
    title: 'Parent requests',
    what: 'Parents can ask what data you hold, correct it, delete it, or complain. Each request has an owner and a due date.',
    why: 'These are legal rights under DPDP, and grievances must be answered within set timelines.',
    you: 'The office handles these; you only see anything overdue.',
  },
  '/trust/incidents': {
    title: 'Breach room',
    what: 'If data is lost or leaked (a stolen laptop, a wrong email), this guides the team step by step.',
    why: 'Every breach must be reported to affected parents and to the Data Protection Board, with a detailed report within 72 hours.',
    you: 'Be informed. We and our partners help run the response.',
  },
  '/trust': {
    title: 'Trust Centre: vendors, security, retention',
    what: 'Every app and vendor that touches student data, the security basics in place, how long data is kept, and staff training.',
    why: 'The school stays responsible even when a vendor holds the data, and data shouldn’t be kept longer than needed.',
    you: 'Nothing day to day. Items marked “Action due” have owners.',
  },
  '/evidence': {
    title: 'Evidence vault',
    what: 'A permanent, tamper-proof record of every privacy decision and action at the school.',
    why: 'If you are ever questioned, this shows exactly what was done, when and by whom, and that nothing was altered later.',
    you: 'Export an audit pack whenever an auditor, lawyer or the board asks.',
  },
  '/experts': {
    title: 'Experts on call',
    what: 'Our managed privacy desk, plus empanelled lawyers, cyber-security firms and independent auditors.',
    why: 'You shouldn’t have to become a privacy expert. Specialists handle the hard parts, inside this same system.',
    you: 'Click “Request” whenever you want a professional opinion.',
  },
  '/ask': {
    title: 'Ask a question',
    what: 'Ask in plain English, for example “Can we post Sports Day on Instagram?”. Answers use your school’s own data.',
    why: 'Quick answers for staff, without waiting for a meeting.',
    you: 'Anything legal-sounding is passed to our privacy desk and counsel.',
  },
  '/settings': {
    title: 'Settings',
    what: 'School details, staff and roles, languages and connected systems.',
    why: 'Only the right people should see student data. Roles control that.',
    you: 'Set up once, with our team.',
  },
  '/tech': {
    title: 'Under the hood (for your IT team)',
    what: 'How the system is built, secured and hosted, and how face data is handled.',
    why: 'Your IT head can check the technical safeguards the law expects.',
    you: 'Share this page with your IT person.',
  },
  '/guide': {
    title: 'DPDP in 2 minutes',
    what: 'The law explained in plain words for school owners.',
    why: 'So you can talk about it confidently with parents, staff and trustees.',
    you: 'Read once; come back to the glossary when a term is unclear.',
  },
}

export function explainFor(path: string): Explain | undefined {
  const key = Object.keys(EXPLAIN).filter((k) => path === k || path.startsWith(k + '/')).sort((a, b) => b.length - a.length)[0]
  return key ? EXPLAIN[key] : undefined
}
