# Media pipeline

The demo never runs face AI on its own media at runtime. Everything is prepared offline and stored in `src/data/media-manifest.json`. The seed (`src/data/seed/index.ts`) turns that into assets, faces and students.

## Files
| Path | Role |
|---|---|
| `public/media/events/<event>/*.jpg` | Event photos (annual-day, sports-day, science-fair, classroom) |
| `public/media/upload-samples/*.jpg` + `index.json` | 4 held-back photos for the upload demo |
| `public/media/video/*.mp4` + `index.json` | Clips (MP4/H.264) |
| `src/data/media-manifest.json` | Per photo: normalised face boxes `[x,y,w,h]`, `person` cluster, `main`, `adult`, `g` (F/M). Per video: tracks with `[t,x,y,w,h]` frames at 4 fps |
| `public/media/descriptors.json` | Mean face descriptor per person (used only by the optional live upload matcher) |
| `scripts/face-labels.json` | Hand-checked gender/adult labels and dropped non-faces, by face index |
| `public/models/face-api/` | Models for offline tooling and the optional live-upload screen |

## How names are assigned (seed)
1. Faces are clustered into persons (same child across photos). The most frequent persons become the 10 hero students of Class 5B (e.g. Diya, Kabir, Zoya), **matched by gender**.
2. Other persons map to students from Classes 3–8 of the same gender.
3. **A child appears at most once per photo.** A duplicate match becomes a different classmate.
4. The name must match the face's hand-checked gender (`g`).
5. About 1 in 4 unclustered faces stays **Unknown**, so the "Check faces" review flow has real work.
6. Faces labelled `adult` become "Adult / visitor" (non-student).

## Refreshing after changing media
```bash
npm run dev &                                     # tooling needs the dev server
SKIP_VIDEO=1 WORKERS=4 node scripts/annotate.mjs  # photos: detect + cluster (~3 min, 4 workers)
node scripts/video_tracks.mjs                     # videos: extract frames (ffmpeg via imageio-ffmpeg), detect, track
```
Then re-check genders and adults:
1. Build a contact sheet of face crops.
2. Update `scripts/face-labels.json` and apply it to the manifest. The indices follow manifest order.
3. Bump `DATA_VERSION` in `src/data/seed/index.ts` so browsers reseed.

Needs Python `imageio-ffmpeg` (`pip install --user imageio-ffmpeg`) for the video step, and the globally installed Playwright Chromium.

## Swapping to AI-generated media
Drop new files into the same folders with the same naming, run the two scripts, re-label, and bump `DATA_VERSION`. Change the media caption in the Demo Director from "licensed stock" to "AI-generated".

## Blur rendering
- **Photos (UI):** `PhotoFaces` in `src/design/media.tsx` draws rings or blur patches from the boxes, with object-cover math via `coverBox`.
- **Photos (export):** `src/modules/publish-guard/blur.ts` renders real pixel blur on a canvas (soft, pixelate, sticker, solid) for downloads and zips.
- **Videos:** `src/modules/video-studio/render.ts` interpolates track boxes per frame and blurs them in real pixels during playback and export.
