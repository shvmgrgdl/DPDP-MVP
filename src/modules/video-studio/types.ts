import type { DestinationKey, FaceInstance, MediaAsset, VideoTrack } from '@/data/types'

/** [tSeconds, x, y, w, h] with x/y/w/h normalised 0..1 (same as VideoTrack.frames). */
export type Frame = [number, number, number, number, number]

/** Where a video in the library came from. */
export type Origin = 'library' | 'folder' | 'local'

export interface VideoEntry {
  id: string
  title: string
  src: string
  origin: Origin
  asset?: MediaAsset
  eventId?: string
  capturedAt?: string
  duration?: number
  w?: number
  h?: number
  /** Pre-computed face tracks (from the media manifest). Undefined = run live detection in the browser. */
  tracks?: VideoTrack[]
  fileName?: string
  size?: number
}

/** A face track as the studio uses it, whichever way it was produced. */
export interface SourceTrack {
  id: string
  studentId: string | null
  frames: Frame[]
  /** The asset's face record (carries staff review status) when the video is a library asset. */
  face?: FaceInstance
  thumb?: string
}

/** A track found by live detection. */
export interface LiveTrack {
  id: string
  studentId: string | null
  personId: string | null
  distance: number | null
  frames: Frame[]
  score: number
  thumb?: string
}

export type ScanStatus = 'starting' | 'scanning' | 'done' | 'error'

export interface ScanState {
  status: ScanStatus
  progress: number // 0..1
  tracks: LiveTrack[]
  samples: number
  duration: number
  backend?: string | null
  error?: string
  ms?: number
}

export interface LocalVideo {
  id: string
  name: string
  url: string
  size: number
  type: string
  addedAt: string
}

export type DestChoice = Extract<DestinationKey, 'instagram' | 'website' | 'youtube' | 'private-gallery'>
