// Finds t("…{n}…") calls that have no vars argument (placeholders would render raw)
import fs from 'fs'; import path from 'path'
import { parse } from '@babel/parser'
const walk = (d, o = []) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? (f !== 'locales' && walk(p, o)) : /\.tsx?$/.test(f) && o.push(p) } return o }
let n = 0
for (const f of walk('didac/src')) { const src = fs.readFileSync(f, 'utf8'); const ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
  const v = (x) => { if (!x || typeof x.type !== 'string') return; if (x.type === 'CallExpression' && x.callee.name === 't' && x.arguments[0]?.type === 'StringLiteral' && /\{\d+\}/.test(x.arguments[0].value) && x.arguments.length < 2) { n++; console.log(`${f.replace('didac/src/', '')}:${x.loc.start.line}  ${x.arguments[0].value.slice(0, 90)}`) } for (const k of Object.keys(x)) { if (['loc', 'start', 'end', 'extra'].includes(k)) continue; const c = x[k]; Array.isArray(c) ? c.forEach(v) : c && typeof c.type === 'string' && v(c) } }
  v(ast.program) }
console.log('affected', n)
