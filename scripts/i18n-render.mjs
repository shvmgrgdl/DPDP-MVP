// Pass 2: inside `[tx('…'), …].map(cb)` wrap rendered string params with t(), and rename params that shadow t.
import fs from 'fs'; import path from 'path'
import { parse } from '@babel/parser'
const walkFiles = (d, out = []) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? (f !== 'locales' && walkFiles(p, out)) : /\.tsx$/.test(f) && out.push(p) } return out }
const isTx = (x) => x && x.type === 'CallExpression' && x.callee.name === 'tx'
const unwrap = (x) => { while (x && (x.type === 'TSAsExpression' || x.type === 'ParenthesizedExpression' || x.type === 'TSNonNullExpression')) x = x.expression; return x }
for (const file of walkFiles('didac/src')) {
  let src = fs.readFileSync(file, 'utf8'); const orig = src
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
  const edits = []
  const handle = (call) => {
    const arr = unwrap(call.callee.object); if (!arr || arr.type !== 'ArrayExpression') return
    const cb = call.arguments[0]; if (!cb || !/Function/.test(cb.type)) return
    const wrapIdx = new Set(); let self = false
    for (const el of arr.elements) { if (isTx(el)) self = true; else if (el && el.type === 'ArrayExpression') el.elements.forEach((x, i) => isTx(x) && wrapIdx.add(i)) }
    const p0 = cb.params[0]; const names = new Set()
    if (self && p0?.type === 'Identifier') names.add(p0.name)
    if (p0?.type === 'ArrayPattern') p0.elements.forEach((e, i) => e?.type === 'Identifier' && wrapIdx.has(i) && names.add(e.name))
    // shadowing: any param/binding named t inside the pattern
    const shadow = (p0?.type === 'Identifier' && p0.name === 't') || (p0?.type === 'ArrayPattern' && p0.elements.some((e) => e?.name === 't'))
    const visit = (n, parent) => {
      if (!n || typeof n.type !== 'string') return
      if (n.type === 'Identifier' && n.name === 't' && shadow) { const callee = parent?.type === 'CallExpression' && parent.callee === n; if (!callee && !(parent?.type === 'MemberExpression' && parent.property === n && !parent.computed) && !(parent?.type === 'ObjectProperty' && parent.key === n && !parent.computed)) edits.push({ start: n.start, end: n.end, text: 'tt' }) }
      if (n.type === 'JSXExpressionContainer' && (parent.type === 'JSXElement' || parent.type === 'JSXFragment')) {
        const e = unwrap(n.expression)
        if (e?.type === 'Identifier' && names.has(e.name)) edits.push({ start: n.expression.start, end: n.expression.end, text: `t(${e.name === 't' ? 'tt' : e.name})` })
      }
      for (const k of Object.keys(n)) { if (['loc', 'start', 'end', 'extra'].includes(k)) continue; const c = n[k]; Array.isArray(c) ? c.forEach((x) => visit(x, n)) : c && typeof c.type === 'string' && visit(c, n) }
    }
    visit(cb, call)
  }
  const find = (n) => { if (!n || typeof n.type !== 'string') return; if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property.name === 'map') handle(n); for (const k of Object.keys(n)) { if (['loc', 'start', 'end', 'extra'].includes(k)) continue; const c = n[k]; Array.isArray(c) ? c.forEach(find) : c && typeof c.type === 'string' && find(c) } }
  find(ast.program)
  edits.sort((a, b) => a.start - b.start); const kept = []; for (const e of edits) { const l = kept[kept.length - 1]; if (!l || e.start >= l.end) kept.push(e) }
  for (const e of kept.reverse()) src = src.slice(0, e.start) + e.text + src.slice(e.end)
  if (src !== orig) { fs.writeFileSync(file, src); console.log('render-wrapped', file, kept.length) }
}
