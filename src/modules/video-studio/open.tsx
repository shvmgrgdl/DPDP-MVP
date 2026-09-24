import * as React from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { addLocalVideo, isVideoFile } from './store'

/** "Open a video file…": the file stays in this browser as an object URL and opens in the studio (live face detection). */
export function useOpenVideo() {
  const navigate = useNavigate()
  const ref = React.useRef<HTMLInputElement>(null)
  const onFiles = React.useCallback((files: FileList | File[] | null | undefined) => {
    const file = files ? Array.from(files)[0] : undefined
    if (!file) return
    if (!isVideoFile(file)) {
      toast.error('That file isn’t a video', { description: 'Choose an MP4 or WebM file.' })
      return
    }
    const lv = addLocalVideo(file)
    navigate(`/video/${lv.id}`)
  }, [navigate])
  const input = (
    <input ref={ref} type="file" className="hidden" aria-hidden tabIndex={-1}
      accept="video/mp4,video/webm,video/quicktime,.mp4,.m4v,.webm,.mov"
      onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
  )
  const open = React.useCallback(() => ref.current?.click(), [])
  return { open, input, onFiles }
}
