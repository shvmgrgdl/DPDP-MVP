import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Images, Download, Trash2 } from 'lucide-react'
import { Card, Button, Dialog, Empty } from '@/design/ui'
import { PhotoFaces } from '@/design/media'
import { useApp } from '@/store/app'
import { useCtx } from '@/store/hooks'
import { assetsOfStudent } from '@/engine/permission'
import { LEGAL } from '@/data/reference'
import type { MediaAsset, Student } from '@/data/types'
import { addDays, cn } from '@/lib/utils'
import { useActiveFamily } from '../family'
import { Bi, tr, useLang } from '../i18n'
import { galleryBlurIds, downloadWatermarkedPhoto } from '../photo'
import type { EngineCtx } from '@/engine/permission'

function PhotoDetail({ asset, child, guardianId, schoolShort, ctx, onClose }: { asset: MediaAsset; child: Student; guardianId: string; schoolShort: string; ctx: EngineCtx; onClose: () => void }) {
  const lang = useLang()
  const [busy, setBusy] = useState(false)
  const blurIds = useMemo(() => galleryBlurIds(ctx, asset, child.id), [ctx, asset, child.id])

  const download = async () => {
    setBusy(true)
    try {
      await downloadWatermarkedPhoto(asset, blurIds, `Private · ${schoolShort}`)
    } finally {
      setBusy(false)
    }
  }

  const requestRemoval = () => {
    const at = new Date().toISOString()
    const id = useApp.getState().addRequest({
      type: 'photo-removal',
      guardianId,
      studentId: child.id,
      channel: 'parent-app',
      receivedAt: at,
      dueAt: addDays(at, LEGAL.grievanceMaxDays),
      targetAt: addDays(at, 7),
      ownerId: 'U-OFFICE',
      status: 'new',
      summary: `Remove ${child.name} from photo ${asset.id}.`,
    })
    toast.success(tr(lang, `Removal requested · ${id}`, `हटाने का अनुरोध भेजा गया · ${id}`))
    onClose()
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }} title={<Bi en="Photo" hi="तस्वीर" />}>
      <PhotoFaces asset={asset} aspect={asset.w / asset.h} blurIds={blurIds} blurStyle="soft" />
      <p className="mt-2 text-[11.5px] text-ink-3"><Bi en="Other children here are blurred unless their family allows the private gallery." hi="यहां मौजूद अन्य बच्चे धुंधले हैं जब तक उनका परिवार निजी गैलरी की अनुमति न दे।" /></p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<Download className="size-4" />} onClick={download} disabled={busy}>
          <Bi en="Download" hi="डाउनलोड करें" />
        </Button>
        <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={requestRemoval}>
          <Bi en="Request removal" hi="हटाने का अनुरोध" />
        </Button>
      </div>
    </Dialog>
  )
}

export default function Photos() {
  const { guardian, children } = useActiveFamily()
  const [activeId, setActiveId] = useState<string | undefined>(children[0]?.id)
  useEffect(() => {
    if (!children.some((c) => c.id === activeId)) setActiveId(children[0]?.id)
  }, [children, activeId])
  const child = children.find((c) => c.id === activeId) ?? children[0]

  const assets = useApp((s) => s.assets)
  const school = useApp((s) => s.school)
  const ctx = useCtx()
  const lang = useLang()
  const [openAsset, setOpenAsset] = useState<MediaAsset | null>(null)

  const myAssets = useMemo(() => (child ? assetsOfStudent(assets, child.id) : []), [assets, child])

  return (
    <div className="space-y-5">
      <div>
        <div className="label-caps"><Bi en="Photos" hi="तस्वीरें" /></div>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink"><Bi en="Private photos" hi="निजी तस्वीरें" /></h1>
        <p className="mt-1 text-[13px] text-ink-2"><Bi en="Visible only to your family." hi="केवल आपके परिवार को दिखाई देता है।" /></p>
      </div>

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={cn('rounded-full px-3 py-1.5 text-[12.5px] font-semibold', c.id === activeId ? 'bg-navy text-white' : 'bg-sunken text-ink-2')}
            >
              {c.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {!child || myAssets.length === 0 ? (
        <Card className="p-0">
          <Empty
            icon={<Images className="size-6" />}
            title={tr(lang, 'No photos yet', 'अभी कोई तस्वीर नहीं')}
            body={tr(lang, `We'll add ${child?.name ?? 'your child'}'s event photos here as they're shared.`, `${child?.name ?? 'आपके बच्चे'} की कार्यक्रम तस्वीरें साझा होते ही यहां जुड़ जाएंगी।`)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {myAssets.map((a) => {
            const blurIds = galleryBlurIds(ctx, a, child.id)
            return (
              <button key={a.id} type="button" onClick={() => setOpenAsset(a)} className="block text-left">
                <PhotoFaces asset={a} aspect={1} blurIds={blurIds} blurStyle="soft" />
              </button>
            )
          })}
        </div>
      )}

      {openAsset && child && (
        <PhotoDetail asset={openAsset} child={child} guardianId={guardian.id} schoolShort={school.shortName} ctx={ctx} onClose={() => setOpenAsset(null)} />
      )}
    </div>
  )
}
