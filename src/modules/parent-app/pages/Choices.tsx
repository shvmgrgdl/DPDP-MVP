import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { History } from 'lucide-react'
import { Card, Button, Switch, Dialog, Avatar } from '@/design/ui'
import { useApp } from '@/store/app'
import { pkey } from '@/data/seed'
import { MEDIA_PURPOSES } from '@/data/reference'
import type { MediaPurposeKey, PermissionStatus, Student } from '@/data/types'
import { useActiveFamily } from '../family'
import { Bi } from '../i18n'

type ChoiceMap = Record<string, Record<MediaPurposeKey, boolean>>

function deriveFromStore(children: Student[], permissions: ReturnType<typeof useApp.getState>['permissions']): ChoiceMap {
  const init: ChoiceMap = {}
  for (const child of children) {
    const row = {} as Record<MediaPurposeKey, boolean>
    for (const p of MEDIA_PURPOSES) row[p.key] = permissions[pkey(child.id, p.key)]?.status === 'granted'
    init[child.id] = row
  }
  return init
}

export default function Choices() {
  const { guardian, children } = useActiveFamily()
  const permissions = useApp((s) => s.permissions)
  const [pending, setPending] = useState<ChoiceMap>(() => deriveFromStore(children, permissions))
  const [confirmTarget, setConfirmTarget] = useState<{ child: Student; purpose: MediaPurposeKey } | null>(null)

  useEffect(() => {
    setPending(deriveFromStore(children, permissions))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardian.id, permissions])

  const committed = useMemo(() => deriveFromStore(children, permissions), [children, permissions])

  const handleToggle = (child: Student, purpose: MediaPurposeKey, next: boolean) => {
    const wasGranted = committed[child.id]?.[purpose]
    if (!next && wasGranted) {
      setConfirmTarget({ child, purpose })
      return
    }
    setPending((p) => ({ ...p, [child.id]: { ...p[child.id], [purpose]: next } }))
  }

  const confirmWithdraw = () => {
    if (!confirmTarget) return
    const { child, purpose } = confirmTarget
    setPending((p) => ({ ...p, [child.id]: { ...p[child.id], [purpose]: false } }))
    setConfirmTarget(null)
  }

  const isDirty = (child: Student) => MEDIA_PURPOSES.some((p) => !!pending[child.id]?.[p.key] !== !!committed[child.id]?.[p.key])

  const save = (child: Student) => {
    let takedowns = 0
    for (const p of MEDIA_PURPOSES) {
      const wasGranted = committed[child.id]?.[p.key]
      const next = !!pending[child.id]?.[p.key]
      if (next === wasGranted) continue
      const status: PermissionStatus = next ? 'granted' : wasGranted ? 'withdrawn' : 'denied'
      const res = useApp.getState().setPermission(child.id, p.key, status, { via: 'parent-app', by: guardian.id })
      takedowns += res.takedowns.length
    }
    toast.success(`${child.name}'s choices saved`)
    if (takedowns > 0) {
      toast(`We've asked the school to take down ${takedowns} post${takedowns > 1 ? 's' : ''} that included ${child.name}`)
    }
  }

  const confirmPurpose = confirmTarget ? MEDIA_PURPOSES.find((p) => p.key === confirmTarget.purpose)! : null

  return (
    <div className="space-y-6">
      <div>
        <div className="label-caps"><Bi en="Choices" hi="पसंद" /></div>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink"><Bi en="Your choices" hi="आपकी पसंद" /></h1>
        <p className="mt-1 text-[13px] text-ink-2"><Bi en="Change what's shared, any time." hi="जो साझा होता है उसे कभी भी बदलें।" /></p>
      </div>

      {children.map((child) => (
        <div key={child.id} className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar name={child.name} size={28} />
            <div className="text-[14px] font-semibold text-ink">{child.name}</div>
          </div>

          {MEDIA_PURPOSES.map((p) => (
            <Card key={p.key} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink"><Bi en={p.label} hi={p.labelHi ?? p.label} /></div>
                  <div className="mt-0.5 text-[12px] leading-snug text-ink-3"><Bi en={p.example} hi={p.exampleHi ?? p.example} /></div>
                </div>
                <Switch checked={!!pending[child.id]?.[p.key]} onCheckedChange={(v) => handleToggle(child, p.key, v)} label={p.label} />
              </div>
            </Card>
          ))}

          <Button size="lg" className="w-full" disabled={!isDirty(child)} onClick={() => save(child)}>
            <Bi en="Save choices" hi="पसंद सहेजें" />
          </Button>
        </div>
      ))}

      <Link to="/parent/history" className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-semibold text-azure">
        <History className="size-4" />
        <Bi en="View change history" hi="बदलावों का इतिहास देखें" />
      </Link>

      <Dialog
        open={!!confirmTarget}
        onOpenChange={(v) => { if (!v) setConfirmTarget(null) }}
        title={confirmPurpose ? <Bi en={`Turn off "${confirmPurpose.label}"?`} hi={`"${confirmPurpose.labelHi ?? confirmPurpose.label}" बंद करें?`} /> : ''}
        description={<Bi en="This stops future use. The school will take down posts it controls." hi="यह भविष्य में उपयोग बंद कर देगा। स्कूल अपने नियंत्रण वाली पोस्ट हटा देगा।" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmTarget(null)}><Bi en="Cancel" hi="रद्द करें" /></Button>
            <Button variant="danger" onClick={confirmWithdraw}><Bi en="Turn off" hi="बंद करें" /></Button>
          </>
        }
      />
    </div>
  )
}
