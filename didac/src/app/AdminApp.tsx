import * as React from 'react'
import { LogOut } from 'lucide-react'
import { useDemo } from '../store'
import { Admin } from '../screens/Admin'
import { Btn, LangPicker, ProtoTag } from '../ui'
import { t } from '../i18n'

export function AdminApp() {
  const s = useDemo()
  const [photo, setPhoto] = React.useState('P1')
  React.useEffect(() => { s.setViewer('admin') }, [])
  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-6xl p-3 md:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="eyebrow">{t("School admin app")}</div><h1 className="text-xl font-bold">{t("Sunrise Public School · Media workspace")}</h1></div><div className="flex items-center gap-2"><LangPicker compact /><ProtoTag /><Btn variant="outline" onClick={() => s.setRole(null)}><LogOut className="size-4" /> {t("Switch app")}</Btn></div></div>
        <Admin focusPhoto={photo} onFocus={setPhoto} />
      </div>
    </div>
  )
}
