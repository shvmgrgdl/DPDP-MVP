import fs from 'fs'; import { execSync } from 'child_process'
import { parse } from '@babel/parser'
const all = JSON.parse(fs.readFileSync('didac/src/locales/_all_keys.json', 'utf8'))
// keys that only occur in the staff-only Team screen stay English
const keysIn = (src) => { const s = new Set(); const ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] }); const v = (n) => { if (!n || typeof n.type !== 'string') return; if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && ['t', 'tx'].includes(n.callee.name) && n.arguments[0]?.type === 'StringLiteral') s.add(n.arguments[0].value); for (const k of Object.keys(n)) { if (['loc', 'start', 'end', 'extra'].includes(k)) continue; const c = n[k]; Array.isArray(c) ? c.forEach(v) : c && typeof c.type === 'string' && v(c) } }; v(ast.program); return s }
const team = keysIn(fs.readFileSync('didac/src/screens/Team.tsx', 'utf8'))
const others = new Set(); for (const f of ['App.tsx', 'ui.tsx', 'data.ts', 'app/Launcher.tsx', 'app/ParentApp.tsx', 'app/AdminApp.tsx', 'app/GalleryApp.tsx', 'app/PhotographerApp.tsx', 'screens/Admin.tsx', 'screens/Demo.tsx', 'screens/Gallery.tsx', 'screens/Home.tsx', 'screens/Info.tsx', 'screens/OnePager.tsx', 'screens/Pilot.tsx', 'screens/Security.tsx', 'screens/Story.tsx', 'screens/Zoom.tsx']) keysIn(fs.readFileSync('didac/src/' + f, 'utf8')).forEach((k) => others.add(k))
const store = new Set(JSON.parse(fs.readFileSync('didac/src/locales/_keys_store.json', 'utf8')))
const skip = new Set([...team].filter((k) => !others.has(k) && !store.has(k)))
const have = fs.existsSync('didac/src/locales/hi.json') ? JSON.parse(fs.readFileSync('didac/src/locales/hi.json', 'utf8')) : {}
const keys = all.filter((k) => !skip.has(k) && !(process.argv[2] === 'supplement' && k in have))
if (process.argv[2] === 'supplement') { fs.writeFileSync('didac/src/locales/_supplement.json', JSON.stringify(keys, null, 1)); console.log('supplement keys', keys.length); process.exit(0) }
fs.writeFileSync('didac/src/locales/_translate_keys.json', JSON.stringify(keys, null, 1))
const n = 4; const size = Math.ceil(keys.length / n); for (let i = 0; i < n; i++) fs.writeFileSync(`didac/src/locales/_chunk${i + 1}.json`, JSON.stringify(keys.slice(i * size, (i + 1) * size), null, 1))
// Hindi hints from the checkpoint (original hand-written pairs)
const old = execSync('git show HEAD:didac/src/app/ParentApp.tsx').toString(); const hints = {}
const ast = parse(old, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
const conv = (a) => { if (a.type === 'StringLiteral') return a.value; if (a.type === 'TemplateLiteral') return a.quasis.map((q, i) => q.value.cooked + (i < a.expressions.length ? `{${i}}` : '')).join(''); return null }
const v = (x) => { if (!x || typeof x.type !== 'string') return; if (x.type === 'CallExpression' && x.callee.name === 't' && x.arguments.length >= 2) { const e = conv(x.arguments[0]), h = conv(x.arguments[1]); if (e && h) hints[e] = h } for (const k of Object.keys(x)) { if (['loc', 'start', 'end', 'extra'].includes(k)) continue; const c = x[k]; Array.isArray(c) ? c.forEach(v) : c && typeof c.type === 'string' && v(c) } }
v(ast.program); fs.writeFileSync('didac/src/locales/_hints_hi.json', JSON.stringify(hints, null, 1))
console.log('translate', keys.length, 'skipped(team)', skip.size, 'chunks', n, 'size', size, 'hindi hints', Object.keys(hints).length)
