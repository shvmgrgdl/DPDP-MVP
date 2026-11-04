import fs from 'fs'
import { parse } from '@babel/parser'
const file = 'didac/src/store.ts'; let src = fs.readFileSync(file, 'utf8')
const ast = parse(src, { sourceType: 'module', plugins: ['typescript'] }); const edits = []; const keys = new Set()
const L = (s) => /\p{L}/u.test(s.replace(/\{\d+\}/g, ''))
const visit = (n) => {
  if (!n || typeof n.type !== 'string') return
  if (n.type === 'ObjectProperty' && n.key.name === 'detail' && !n.computed) {
    const v = n.value
    if (v.type === 'StringLiteral' && L(v.value)) { keys.add(v.value); edits.push({ start: n.start, end: n.end, text: `...D(${JSON.stringify(v.value)})` }) }
    else if (v.type === 'TemplateLiteral') {
      let tpl = ''; v.quasis.forEach((q, i) => { tpl += q.value.cooked + (i < v.expressions.length ? `{${i}}` : '') })
      if (L(tpl)) { keys.add(tpl); edits.push({ start: n.start, end: n.end, text: `...D(${JSON.stringify(tpl)}${v.expressions.length ? `, [${v.expressions.map((e) => src.slice(e.start, e.end)).join(', ')}]` : ''})` }) }
    }
  }
  if (n.type === 'ObjectProperty' && n.key.name === 'action' && !n.computed) { const c = (x) => { if (x?.type === 'StringLiteral') keys.add(x.value); if (x?.type === 'ConditionalExpression') { c(x.consequent); c(x.alternate) } }; c(n.value) }
  if (n.type === 'ObjectProperty' && n.key.name === 'actor') { const c = (x) => { if (x?.type === 'StringLiteral') keys.add(x.value) }; c(n.value) }
  for (const k of Object.keys(n)) { if (['loc', 'start', 'end', 'extra'].includes(k)) continue; const c = n[k]; Array.isArray(c) ? c.forEach(visit) : c && typeof c.type === 'string' && visit(c) }
}
visit(ast.program)
edits.sort((a, b) => a.start - b.start); const kept = []; for (const e of edits) { const l = kept[kept.length - 1]; if (!l || e.start >= l.end) kept.push(e) }
for (const e of kept.reverse()) src = src.slice(0, e.start) + e.text + src.slice(e.end)
src = src.replace("const genesis =", "const D = (dt: string, dv: (string | number)[] = []) => ({ detail: dt.replace(/\\{(\\d+)\\}/g, (_, i) => String(dv[+i])), dt, dv })\nconst genesis =")
src = src.replace("detail: string; app: string;", "detail: string; dt?: string; dv?: (string | number)[]; app: string;")
fs.writeFileSync(file, src); fs.writeFileSync('didac/src/locales/_keys_store.json', JSON.stringify([...keys].sort(), null, 1)); console.log('store keys', keys.size, 'edits', kept.length)
