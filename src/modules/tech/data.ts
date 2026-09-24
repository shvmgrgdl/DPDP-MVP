export const PHOTO_STEPS = [
  { title: 'Upload', body: 'The photographer uploads through a time-bound link during the event window — no app install, no access to their photo library.' },
  { title: 'Face detection', body: 'Every face in the photo is located automatically, on our servers, within minutes of upload.' },
  { title: 'Roster matching', body: "Detected faces are matched to the class roster using a school-scoped template — never compared against anything outside the school." },
  { title: 'Permission check', body: "For the destination you pick, the permission engine checks each matched child's current choice." },
  { title: 'Blur or hold', body: 'Children without permission are blurred automatically where that is allowed, or the photo is held back where it is not.' },
  { title: 'Publish', body: 'A person confirms the batch in Publish Guard before anything goes out — the system never posts on its own.' },
  { title: 'Evidence', body: 'The decision for every face, on every photo, is written to the evidence ledger with a timestamp.' },
  { title: 'If a choice changes', body: 'A later withdrawal is checked against everything already published, and any live post that is no longer allowed is flagged for takedown.' },
]

export const WEBHOOKS = [
  { event: 'permission.updated', desc: 'A parent changed a choice' },
  { event: 'publication.takedown_requested', desc: 'A live post needs removal' },
  { event: 'incident.opened', desc: 'A new incident was logged' },
  { event: 'request.received', desc: 'A new parent request arrived' },
  { event: 'evidence.appended', desc: 'A new tamper-evident record was added' },
]

export const API_SAMPLE = `GET /v1/assets/AST-2043/decision?dest=instagram

{
  "asset_id": "AST-2043",
  "destination": "instagram",
  "verdict": "needs-blur",
  "fixable": true,
  "reason": "2 children will be blurred automatically",
  "faces": [
    { "face_id": "AST-2043-f0", "student_ref": "STU-5B01", "state": "ok", "reason": "Parent allowed this use" },
    { "face_id": "AST-2043-f1", "student_ref": "STU-5B07", "state": "blocked", "reason": "Parent withdrew this permission" },
    { "face_id": "AST-2043-f2", "student_ref": null, "state": "unknown", "reason": "Not matched to any student" }
  ],
  "evidence_id": "EV-2026-0924-5123"
}`
