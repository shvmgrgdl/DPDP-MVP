"""Instant dummy media manifest (no face detection). Plausible face boxes + recurring persons.
Run: python3 scripts/dummy_manifest.py"""
import json, os, struct, random, glob, datetime
random.seed(2026)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def jpeg_size(p):
    with open(p, 'rb') as f:
        d = f.read()
    i = 2
    while i < len(d):
        if d[i] != 0xFF: i += 1; continue
        m = d[i+1]
        if m in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', d[i+5:i+9]); return w, h
        L = struct.unpack('>H', d[i+2:i+4])[0]; i += 2 + L
    return 1600, 1067
def mp4_duration(p):
    d = open(p, 'rb').read(); i = d.find(b'mvhd')
    if i < 0: return 12.0
    ver = d[i+4]
    if ver == 1: ts, dur = struct.unpack('>IQ', d[i+24:i+36])
    else: ts, dur = struct.unpack('>II', d[i+16:i+24])
    return round(dur / ts, 2) if ts else 12.0
TITLES = {'annual-day': ['Stage performance', 'Dance recital', 'Costume parade', 'Prize giving', 'Backstage', 'Finale'],
          'sports-day': ['Relay race', 'March past', 'Team huddle', 'Finish line', 'Medal moment'],
          'science-fair': ['Project demo', 'Lab corner', 'Judges visit', 'Robotics table'],
          'classroom': ['Morning class', 'Group work', 'Reading corner', 'Art period', 'Assembly']}
PERSONS = [f'p{i:03d}' for i in range(1, 19)]
WEIGHTS = [10, 9, 8, 7, 6, 6, 3, 4, 5, 5, 3, 3, 2, 2, 2, 2, 1, 1]
assets = []
for ev in ['annual-day', 'sports-day', 'science-fair', 'classroom']:
    files = sorted(glob.glob(os.path.join(ROOT, 'public/media/events', ev, '*.jpg')))
    for k, f in enumerate(files):
        w, h = jpeg_size(f)
        n = random.choice([1, 2, 3, 3, 4, 4, 5])
        fw = random.uniform(0.07, 0.11) if n > 1 else random.uniform(0.14, 0.2)
        fh = fw * w / h * 1.15
        y0 = random.uniform(0.18, 0.32)
        xs = [0.5 - fw / 2] if n == 1 else [0.12 + i * (0.76 - fw) / (n - 1) for i in range(n)]
        people = random.sample(PERSONS, k=n, counts=None) if False else []
        pool = PERSONS[:]
        while len(people) < n:
            p = random.choices(pool, weights=WEIGHTS[:len(pool)])[0]
            if p not in people: people.append(p)
        faces = []
        for i, x in enumerate(xs):
            box = [round(min(max(x + random.uniform(-0.02, 0.02), 0.01), 0.98 - fw), 4), round(y0 + random.uniform(-0.05, 0.08), 4), round(fw * random.uniform(0.9, 1.1), 4), round(fh, 4)]
            face = {'box': box, 'person': people[i], 'score': round(random.uniform(0.86, 0.99), 4)}
            faces.append(face)
        if n >= 3 and random.random() < 0.28: faces[-1]['person'] = None  # unknown face → "Check faces"
        if n >= 4 and random.random() < 0.3: faces[0]['adult'] = True; faces[0]['person'] = None  # teacher / parent
        big = max(range(len(faces)), key=lambda i: faces[i]['box'][2])
        if n == 1 or random.random() < 0.35: faces[big]['main'] = True
        stem = os.path.splitext(os.path.basename(f))[0]
        assets.append({'id': stem, 'event': ev, 'src': f'/media/events/{ev}/{os.path.basename(f)}', 'w': w, 'h': h,
                       'title': TITLES[ev][k % len(TITLES[ev])], 'faces': faces})
videos = []
VEV = {'sports-day-kabaddi': 'sports-day', 'playground-running': 'classroom', 'school-ceremony-assembly': 'annual-day'}
for f in sorted(glob.glob(os.path.join(ROOT, 'public/media/video', '*.mp4'))):
    stem = os.path.splitext(os.path.basename(f))[0]
    dur = mp4_duration(f); fps = 5
    tracks = []
    for t_i, person in enumerate(['p001', 'p002', None][: 3]):
        x0, y0 = 0.15 + t_i * 0.28, random.uniform(0.2, 0.35); dx = random.uniform(-0.12, 0.12)
        frames = []
        steps = int(dur * fps)
        for s in range(steps + 1):
            t = s / fps
            frames.append([round(t, 2), round(x0 + dx * t / max(dur, 1), 4), round(y0 + 0.02 * ((s % 10) / 10), 4), 0.09, 0.16])
        tracks.append({'trackId': f'{stem}-t{t_i+1}', 'person': person, 'frames': frames})
    titles = {'sports-day-kabaddi': 'Kabaddi final', 'playground-running': 'Playground run', 'school-ceremony-assembly': 'Assembly highlights'}
    videos.append({'id': stem, 'event': VEV.get(stem, 'annual-day'), 'src': f'/media/video/{os.path.basename(f)}', 'w': 1280, 'h': 720,
                   'duration': dur, 'fps': fps, 'title': titles.get(stem, stem), 'tracks': tracks})
out = {'version': 1, 'generatedAt': datetime.datetime.utcnow().isoformat() + 'Z', 'dummy': True, 'assets': assets, 'videos': videos}
json.dump(out, open(os.path.join(ROOT, 'src/data/media-manifest.json'), 'w'), indent=1)
vi = [v['src'] for v in videos]
json.dump(vi, open(os.path.join(ROOT, 'public/media/video/index.json'), 'w'))
print(len(assets), 'photos', sum(len(a['faces']) for a in assets), 'faces', len(videos), 'videos')
